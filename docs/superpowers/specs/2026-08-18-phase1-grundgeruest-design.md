# Phase 1: Grundgerüst & Security-Basis — Design

Status: approved by user, ready for implementation planning
Bezug: `CLAUDE.md`, `docs/fitness-app-architektur.md` (Abschnitte 6, 7, 9, 10, 10a)

## Ziel

Fundament der App aufsetzen: Projekt-Skeleton, Supabase-Anbindung mit Auth
und Row-Level-Security, vollständiges Basis-Datenbankschema, CI/CD mit
Semgrep (SAST) und OWASP ZAP (DAST). Kein Feature-Inhalt aus Phase 2+
(kein Barcode-Scan, keine Trainingspläne, keine Körper-Tracking-UI —
nur leere Platzhalter-Seiten für die vier Bereiche).

## Out of scope (explizit nicht Phase 1)

- Barcode-Scan, Ernährungs-Logik, Trainingspläne, Live-Session, Körper-Tracking-UI
- Gemini-Foto-Analyse
- free-exercise-db-Import (Tabelle `exercises` wird angelegt, aber leer)
- PWA-Manifest / Service Worker / Offline-Fähigkeit (laut Phasenplan Phase 5)
- Apple-Shortcuts-Integration
- Docker/lokale Supabase-Instanz
- E2E-Tests

## 1. Projektstruktur & Tooling

- Scaffold: `npm create vite@latest . -- --template react-ts`
- Paketmanager: npm
- Neue Abhängigkeiten:
  - `@supabase/supabase-js` (Supabase-Client)
  - `react-router-dom` (Routing)
  - `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (Tests, dev-only)
- Kein CSS-Framework, kein PWA-Plugin, keine Auth-UI-Library (eigenes schlankes Formular)

Verzeichnisstruktur:
```
src/
  lib/
    supabase.ts        # Supabase-Client, Env-Validierung
  hooks/
    use-session.ts      # liefert aktuelle Auth-Session + loading state
  components/
    protected-route.tsx # redirect zu /login wenn keine Session
    bottom-nav.tsx      # 4-Tab-Navigation
  pages/
    login-page.tsx      # Signup + Login Formular
    home-page.tsx        # Platzhalter
    training-page.tsx    # Platzhalter
    nutrition-page.tsx   # Platzhalter
    body-page.tsx         # Platzhalter
  App.tsx               # Router-Setup
supabase/
  migrations/
    0001_initial_schema.sql
.github/
  workflows/
    ci.yml
  dependabot.yml
.env.example
.env                    # gitignored
```

## 2. Supabase-Anbindung & Auth

- `src/lib/supabase.ts`: erstellt den Client mit `import.meta.env.VITE_SUPABASE_URL`
  und `import.meta.env.VITE_SUPABASE_ANON_KEY`. Wirft beim Modul-Load einen
  Fehler mit klarer Meldung, falls eine der beiden Variablen fehlt (fail-fast,
  keine stillen Fehler — OWASP A10).
- Nur der `anon`-Key wird im Frontend verwendet. Der `service_role`-Key wird
  in Phase 1 nirgends gebraucht und taucht in keinem Client-Code auf (OWASP A02).
- `useSession`-Hook: abonniert `supabase.auth.onAuthStateChange`, liefert
  `{ session, loading }`.
- `ProtectedRoute`: rendert Children nur bei vorhandener Session, sonst
  Redirect nach `/login`. Während `loading` wird nichts gerendert (kein
  Flackern zur Login-Seite).
- `LoginPage`: ein Formular mit Umschalter Signup/Login (E-Mail + Passwort,
  clientseitige Basis-Validierung: beide Felder nicht leer, Passwort min. 8
  Zeichen). Ruft `supabase.auth.signUp` / `supabase.auth.signInWithPassword`.
  Fehler von Supabase werden als Text unter dem Formular angezeigt, keine
  internen Details geloggt.
- Nach Login: Redirect zu `/` (Home-Platzhalter mit `BottomNav`).

## 3. .env / .gitignore

`.env.example`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

`.gitignore` (Vite-Standard + Ergänzung): `node_modules`, `dist`, `.env`,
`.env.local`. `.env.example` bleibt getrackt.

## 4. Datenbankschema

Eine Migration `supabase/migrations/0001_initial_schema.sql`, enthält alle
Tabellen aus Abschnitt 10 der Architektur-Doku. Jede Tabelle:
`id uuid primary key default gen_random_uuid()` (außer `profiles`, siehe
unten), `created_at timestamptz not null default now()`, RLS aktiviert.

**profiles** — `id` = FK auf `auth.users.id` (1:1, kein eigener uuid-default),
`name`, `alter`, `groesse`, `aktuelles_gewicht`.
Trigger `handle_new_user` auf `auth.users` (AFTER INSERT) legt automatisch
eine leere `profiles`-Zeile an (Standard-Supabase-Pattern, vermeidet
Client-Race-Conditions).
Policy: `select`/`update` nur wo `id = auth.uid()`. Kein `insert`/`delete`
für Nutzer (übernimmt der Trigger / Cascade von `auth.users`).

**products** (Community) — `name`, `barcode`, `kalorien`, `eiweiss`, `fett`,
`kohlenhydrate`, `created_by uuid references auth.users`.
Policy: `select` für alle authentifizierten Nutzer offen; `insert` mit
Check `created_by = auth.uid()`; `update`/`delete` nur wo
`created_by = auth.uid()`.

**food_entries** — `user_id`, `product_id references products`, `menge`,
`zeitpunkt`. Policy: alle Operationen nur wo `user_id = auth.uid()`.

**exercises** (Community + späterer Import) — `name`, `kategorie`,
`equipment`, `muskelgruppen_primaer`, `muskelgruppen_sekundaer`,
`bild_url`, `met_wert numeric`, `created_by uuid references auth.users`
(nullable). Gleiches Policy-Muster wie `products`.

**workout_plans** — `user_id`, `name`, `aktiv boolean default false`.
Policy: alle Operationen nur wo `user_id = auth.uid()`.

**workout_plan_exercises** — `workout_plan_id references workout_plans`,
`exercise_id references exercises`, `reihenfolge`, `ziel_saetze`,
`ziel_wiederholungen`, `pausenzeit_sekunden`. Kein eigenes `user_id`.
Policy: `exists (select 1 from workout_plans wp where wp.id =
workout_plan_id and wp.user_id = auth.uid())` für alle Operationen.

**workout_sessions** — `user_id`, `workout_plan_id references
workout_plans`, `gestartet_am`, `beendet_am`, `gesamt_kalorien numeric`.
Policy: `user_id = auth.uid()`.

**workout_session_sets** — `workout_session_id references
workout_sessions`, `exercise_id references exercises`, `satz_nummer`,
`gewicht`, `wiederholungen`, `abgeschlossen_am`. Kein eigenes `user_id`.
Policy analog `workout_plan_exercises`, Join über `workout_sessions`.

**body_metrics** — `user_id`, `datum`, `gewicht`, `bauchumfang`,
`beinumfang`, `armumfang`, `ruckenumfang`, `brustumfang`. Policy:
`user_id = auth.uid()`.

**body_photos** — `user_id`, `datum`, `foto_url`. Policy:
`user_id = auth.uid()`.

**day_status** — `user_id`, `datum`, `status text check (status in
('trainingstag', 'restday'))`. Policy: `user_id = auth.uid()`.

**health_sync_data** — `user_id`, `schritte int`, `weitere_health_metriken
jsonb`, `synced_at timestamptz`. Policy: `user_id = auth.uid()`.

Alle Fremdschlüssel `on delete cascade` wo die Kind-Zeile ohne die
Eltern-Zeile keinen Sinn ergibt (z. B. `workout_session_sets` →
`workout_sessions`).

Migration wird manuell per `supabase link` + `supabase db push` gegen das
vom Nutzer neu angelegte Supabase-Projekt angewendet (kein Docker, keine
lokale Postgres-Instanz).

## 5. CI/CD-Grundgerüst

`.github/workflows/ci.yml`, Trigger: `pull_request` gegen `main`.

Jobs (sequentiell oder parallel, alle müssen grün sein):
1. **build-test**: `npm ci`, `tsc --noEmit`, `npm run lint`, `npm run test`
2. **semgrep**: offizielle Semgrep GitHub Action, Configs `p/react`,
   `p/typescript`, `p/owasp-top-ten`
3. **npm-audit**: `npm audit --audit-level=high` (Supply-Chain-Check,
   OWASP A03)
4. **zap-baseline**: baut die App (`npm run build`), startet
   `npm run preview` im Hintergrund, führt
   `zaproxy/action-baseline` gegen `http://localhost:4173` aus

`.github/dependabot.yml`: wöchentliche Updates für `npm` und
`github-actions` Ecosystem.

Hinweis: Branch-Protection-Regel (Required Checks) muss der Nutzer manuell
in den GitHub-Repo-Einstellungen aktivieren, sobald das Repo auf GitHub
existiert — das kann diese Pipeline-Konfiguration nicht selbst setzen.

## 6. Tests (Phase 1)

Unit-Tests (Vitest + React Testing Library):
- `protected-route.test.tsx`: rendert Children bei vorhandener Session,
  redirected bei fehlender Session
- `supabase-client.test.ts`: Modul wirft beim Import, wenn Env-Vars fehlen
- `login-page.test.tsx`: Validierungsfehler bei leeren Feldern / zu kurzem
  Passwort, kein Aufruf von `supabase.auth.*` bei ungültiger Eingabe

Manueller dynamischer Test (vom Nutzer nach Implementierung durchzuführen,
da ein echtes Supabase-Projekt + Zugangsdaten nötig sind):
1. Dev-Server starten, `.env` mit echten Supabase-Werten befüllen
2. Signup mit neuer E-Mail → Login-Redirect zu `/`
3. Vier Tabs sichtbar und klickbar (Platzhalter-Inhalt)
4. Logout → Redirect zu `/login`
5. In Supabase-Dashboard prüfen: `profiles`-Zeile wurde automatisch für den
   neuen Nutzer angelegt

## Offene Punkte für den Nutzer (nicht Teil der Implementierung)

- Supabase-Projekt muss vom Nutzer neu angelegt werden (siehe Frage 1),
  Werte dann in `.env` eintragen
- GitHub-Repo muss vom Nutzer angelegt und der lokale Git-Remote gesetzt
  werden, damit die CI/CD-Pipeline tatsächlich läuft
