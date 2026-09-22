# GDPR-Konto-Löschung — Design

**Spec-Datum:** 22.09.2026

## Ziel

Bucket B, Punkt 2 aus dem Sicherheits-Fahrplan in `CLAUDE.md`: Es existiert noch kein „Konto löschen"-Flow, obwohl die App Gesundheitsdaten (Gewicht, Umfänge, Körperfettanteil, Trainingshistorie, Ernährungseinträge, Fortschrittsfotos) nach Art. 9 DSGVO speichert. Art. 17 DSGVO verlangt Löschung auf Anfrage „ohne unangemessene Verzögerung" — dieses Vorhaben baut ein echtes Self-Service „Konto löschen" in der App, kein manueller Support-Prozess.

## Ausgangslage

- Fast alle personenbezogenen Tabellen kaskadieren bereits sauber über `on delete cascade` auf `auth.users(id)`: `profiles`, `food_entries`, `workout_plans` (+ `workout_plan_days`/`workout_plan_day_exercises` via verschachtelte Kaskade auf `workout_plans.id`), `workout_sessions` (+ `workout_session_sets`/`workout_session_exercises`), `body_metrics`, `body_photos`, `day_status`, `health_sync_data` — geprüft gegen alle Migrationen bis `0012`.
- Zwei Ausnahmen: `products.created_by` und `exercises.created_by` referenzieren `auth.users(id)` **ohne** `on delete`-Klausel (Postgres-Default `NO ACTION`). Da beide Tabellen geteilte Community-Daten sind (siehe die RLS-Fix-Historie zu `products_update_own`/`products_delete_own`), würde ein Löschversuch für praktisch jeden aktiven Nutzer mit einer Fremdschlüssel-Verletzung scheitern, sobald er je einen Barcode gescannt (Cache-Insert in `products`) oder eine eigene Übung angelegt hat. Live gegen Produktion bestätigt: Constraint-Namen sind `products_created_by_fkey`/`exercises_created_by_fkey`.
- `auth.users` selbst kann kein Client löschen — das geht nur über die Supabase Admin API (`auth.admin.deleteUser`) mit dem `service_role`-Key, der nie im Client-Bundle stehen darf. Der einzige korrekte Ort dafür ist eine **Supabase Edge Function** — die erste in diesem Projekt (`mcp__supabase__list_edge_functions` bestätigt: aktuell keine vorhanden).
- Storage-Dateien (`body-photos/{userId}/{uuid}.jpg`, Bucket-Konstante `BODY_PHOTO_BUCKET` in `src/lib/body-photo-urls.ts`) hängen **nicht** an einer Postgres-Fremdschlüsselbeziehung — ein `on delete cascade` auf `body_photos`-Zeilen entfernt nur die DB-Zeilen, nicht die tatsächlichen Objekte im Storage-Bucket. Muss explizit aufgeräumt werden, wie es `use-body-photos.ts`s `deletePhoto` bereits für den Einzelfall tut (`supabase.storage.from(BODY_PHOTO_BUCKET).remove([pfad])`).
- **Werkzeug-Lücke:** Weder die Supabase-CLI noch Deno sind auf dieser Maschine installiert (geprüft). Der Supabase-MCP-Server ist bewusst `--read-only` (Bucket-A-Entscheidung) und hat kein Deploy-Tool für Edge Functions. Deployment und Ende-zu-Ende-Verifikation dieses Vorhabens können erst laufen, nachdem der Nutzer die Supabase-CLI installiert — analog zum bereits etablierten `firebase deploy`-Muster, bei dem produktionsverändernde Befehle vom Nutzer freigeschaltet/ausgeführt werden.
- Migrationen enden aktuell bei `0012`.

## Entscheidung 1: Sofortiges, endgültiges Löschen — kein Gnadenfrist-Modell

Nutzer-Entscheidung im Brainstorming: kein 30-Tage-Reaktivierungsfenster. Art. 17 DSGVO schreibt keine Gnadenfrist vor, nur „ohne unangemessene Verzögerung" — ein sofortiges Löschen erfüllt das direkter. Eine Gnadenfrist bräuchte einen wiederkehrenden Job (Supabase Cron o. ä.), den dieses Projekt aktuell nicht hat, plus einen „zur Löschung markiert"-Zustand überall dort, wo RLS/Login greift — bewusst nicht gebaut (YAGNI).

## Entscheidung 2: Migration 0013 — `on delete set null` für die beiden Community-Tabellen

```sql
alter table public.products
  drop constraint products_created_by_fkey,
  add constraint products_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.exercises
  drop constraint exercises_created_by_fkey,
  add constraint exercises_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;
```

Kein Cascade (würde die geteilte Zeile löschen und damit anderer Nutzer `food_entries.product_id`/`workout_plan_day_exercises.exercise_id`-Referenzen zerstören), kein `NO ACTION` (blockiert die Löschung). `set null` passt zur bereits etablierten Haltung aus dem RLS-Fix: `created_by` markiert nur, wer eine geteilte Zeile ursprünglich angelegt hat, nicht dauerhafte Autorenschaft — mit `created_by = null` bleibt die Zeile für alle anderen Nutzer unverändert nutzbar/sichtbar, ist aber (konsistent mit `products_update_own`/`products_delete_own`, die beide `created_by = auth.uid()` verlangen) von niemandem mehr bearbeit- oder löschbar. Kein Datenverlust für andere Nutzer.

## Entscheidung 3: Edge Function `delete-account`

Neu: `supabase/functions/delete-account/index.ts` (Deno). Ablauf:

1. Supabase verifiziert das JWT der eingehenden Anfrage automatisch auf Plattformebene (kein `--no-verify-jwt`) — die Funktion läuft nur, wenn ein gültiges Nutzer-Token mitgeschickt wurde.
2. Ein mit der `Authorization`-Header-JWT initialisierter Supabase-Client liest die eigene `user.id` über `auth.getUser()` — nie eine vom Aufrufer mitgeschickte ID vertrauen, sonst könnte ein Nutzer ein fremdes Konto löschen.
3. Ein zweiter Client, mit `SUPABASE_SERVICE_ROLE_KEY` (als Function-Secret gesetzt, nie im Client-Bundle, nie in `.env`), listet alle Objekte unter `body-photos/{userId}/` und entfernt sie (`storage.from('body-photos').list(userId)` → `remove(paths)`).
4. Derselbe Service-Role-Client ruft `auth.admin.deleteUser(userId)` — das triggert die Postgres-Kaskade für alle in „Ausgangslage" genannten Tabellen; `products`/`exercises` bleiben dank Entscheidung 2 unangetastet (nur `created_by` wird `null`).
5. Antwort: `{ ok: true }` bei Erfolg, `{ ok: false, error: string }` mit passendem Statuscode bei einem Fehler in Schritt 3 oder 4 (z. B. Storage-Fehler bricht den Ablauf ab, bevor `deleteUser` läuft — ein halb gelöschtes Konto mit noch vorhandenen Fotos ist der sicherere Fehlerzustand als ein gelöschtes Konto mit verwaisten Fotos, die niemand mehr referenzieren kann).

Kein Rückgabewert enthält jemals den Service-Role-Key oder andere Secrets.

## Entscheidung 4: Frontend-Flow

Neue Sektion unten in `src/pages/ProfilePage.tsx`, nach dem bestehenden Logout-Button (gleiche Stelle wie andere Konto-Aktionen). Ablauf:

1. Ein `buttonSecondaryClass`-Button „Konto löschen" öffnet ein `Dialog` (wiederverwendet, wie überall sonst in der App).
2. Dialog-Inhalt: Warnhinweis, der die Konsequenzen konkret benennt (alle Trainings-, Ernährungs-, Körperdaten und Fotos werden unwiderruflich gelöscht, der Login verschwindet), ein Texteingabefeld, und der eigentliche Löschen-Button — `disabled`, bis der eingegebene Text exakt `LÖSCHEN` entspricht (Nutzer-Entscheidung: Tippbestätigung statt Passwort-Reauth, da die App aktuell keinen Passwort-Reauth-Flow hat und Google-OAuth-Nutzer ohnehin kein App-Passwort besitzen).
3. Klick auf den aktivierten Löschen-Button ruft `supabase.functions.invoke('delete-account')` auf (der aktive Session-JWT wird vom Client automatisch mitgeschickt).
4. Erfolg (`ok: true`): die Session ist bereits ungültig (Konto existiert nicht mehr) — Weiterleitung zu `/login`, kein Toast nötig (die Seite ist eh weg).
5. Fehler: Meldung bleibt **inline im offenen Dialog** (Projekt-Konvention: Fehler, die auftreten können während ein Dialog offen bleibt, gehören inline, nie in einen Toast — der Dialog bleibt hier absichtlich offen, damit der Nutzer es erneut versuchen kann), Texteingabe und „LÖSCHEN"-Bestätigung bleiben erhalten, kein erneutes Eintippen nötig.

## Entscheidung 5: Test-Strategie

- **Migration:** dieselbe statische SQL-Text-Regex-Prüfung wie bei jeder anderen Migration dieses Projekts (keine lokale Supabase-Instanz vorhanden) — prüft `drop constraint`/`add constraint ... on delete set null` für beide Tabellen.
- **Frontend:** normales TDD/RTL, `supabase.functions.invoke` gemockt (analog zu `mockSaveProductEdit` u. ä. in bestehenden Tests). Fälle: Löschen-Button bleibt disabled bis exakter Text „LÖSCHEN", aktiviert sich bei exaktem Match, Erfolg navigiert zu `/login`, Fehler zeigt Inline-Meldung und behält den eingetippten Text.
- **Edge Function:** kein Vitest (Deno-Runtime). Die Funktion wird so geschrieben, dass die Admin-/Storage-Clients injizierbar sind (kein globaler Supabase-Import in der Kernlogik), damit eine `Deno.test`-Suite mit Fakes die Kernlogik prüfen kann (richtige `userId` aus dem JWT extrahiert, richtige Storage-Pfade entfernt, `deleteUser` mit der richtigen ID aufgerufen, Fehlerpfad bricht vor `deleteUser` ab). **Diese Tests können auf dieser Maschine nicht ausgeführt werden** (kein `deno` installiert) — sie werden trotzdem geschrieben (TDD-Prinzip, RED/GREEN wird dann beim ersten `deno test`-Lauf durch den Nutzer nachgeholt, nicht stillschweigend übersprungen), aber die Grün-Bestätigung fehlt bis dahin.
- **Echte Ende-zu-Ende-Verifikation** (ein Testkonto anlegen, Daten erzeugen, löschen, bestätigen dass Login/Daten/Fotos wirklich weg sind, geteilte Produkte/Übungen aber mit `created_by = null` erhalten bleiben) ist erst nach Installation der Supabase-CLI und `supabase functions deploy delete-account` möglich — kann nicht vorweggenommen werden.
- Volle bestehende Suite (`npm test`) + Lint + `tsc -b --noEmit` + `npm run build` bleiben wie immer Pflicht für den Frontend-/Migrations-Teil.

## Betroffene Dateien

- Neu: `supabase/migrations/0013_account_deletion_cascade.sql` + `.test.ts`
- Neu: `supabase/functions/delete-account/index.ts` (+ ggf. eine kleine `_shared`/lokale Datei für die injizierbare Kernlogik, falls sich das sauber trennen lässt) + `.test.ts` (Deno-Test, lokal nicht ausführbar)
- `src/pages/ProfilePage.tsx` (neue „Konto löschen"-Sektion + Dialog) + zugehörige Tests
- `docs/domaenenmodell.md` (Hinweis auf `on delete set null` bei `products.created_by`/`exercises.created_by`, analog zur bereits dokumentierten `products_update_own`-Notiz)

## Bewusst außen vor

- **Kein Gnadenfrist-/Reaktivierungsmodell** (Entscheidung 1).
- **Keine Passwort-Reauthentifizierung** — Tippbestätigung „LÖSCHEN" reicht (Entscheidung 4), passt auch für Google-OAuth-Nutzer ohne App-Passwort.
- **Kein automatisches Aufräumen verwaister, barcode-loser Produkte/Übungen**, die nach der Löschung `created_by = null` haben und von niemand sonst genutzt werden — dieselbe Alterungs-Eigenschaft, die geteilte Community-Daten in diesem Projekt schon immer hatten (keine Lösch-UI für `products`/`exercises` existiert), kein neues Problem dieses Vorhabens.
- **Kein Datenexport vor dem Löschen** (Art. 20 DSGVO, Recht auf Datenübertragbarkeit) — nicht angefragt, eigenes künftiges Vorhaben, falls gewünscht.
- **Keine Admin-Oberfläche** für eine manuelle Support-Löschung — mit dem Self-Service-Flow nicht mehr nötig für den Normalfall.
