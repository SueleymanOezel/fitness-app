# Phase 4 – Körperbereich (Design)

Datum: 2026-08-24
Status: abgestimmt, Grundlage für den Implementierungsplan

## 1. Ziel

Der Körperbereich ist bis heute eine Platzhalterseite. Die drei Tabellen `body_metrics`, `body_photos` und `health_sync_data` stehen seit Phase 1, keine Zeile Anwendungscode fasst sie an. Diese Phase gibt Gewicht, Umfängen, Körperfettanteil und Fortschrittsfotos eine Oberfläche.

## 2. Abgrenzung

**Enthalten:** Erfassen, Ansehen, Korrigieren und Löschen von Körperwerten und Fotos.

**Nicht enthalten, mit Begründung:**

- **Graphen.** Sie kommen gebündelt in Phase 5 mit Recharts. Würde Phase 4 eine eigene Verlaufsdarstellung bauen, entstünde sie zweimal.
- **Health-Sync über Apple Shortcuts.** Der Sync braucht einen von außen erreichbaren Endpunkt mit einem Token, das im Shortcut liegt — ein eigenes Sicherheitsthema, das eine eigene Runde verdient. `health_sync_data` bleibt in dieser Phase unberührt.
- Einheitenumrechnung, Zielgewicht mit Fortschrittsbalken, Foto-Vergleich nebeneinander, BMI. Alles nachrüstbar, nichts davon nötig, damit der Bereich funktioniert.

## 3. Datenmodell

An `body_metrics` und `body_photos` ändert sich **nichts**. Beide Tabellen samt RLS stammen aus `0001_initial_schema.sql`, `koerperfettanteil` kam mit `0005_analysis_fields.sql` dazu.

Neu ist allein der Speicherort für Fotos, siehe Abschnitt 7.

### Ein Eintrag pro Tag

`body_metrics` trägt `unique (user_id, datum)`. Das Erfassen ist deshalb ein **Upsert auf `(user_id, datum)`**, kein blindes Insert: Wer sich zweimal am selben Tag wiegt, korrigiert den Tag, statt einen Constraint-Fehler zu sehen.

Alle Messwerte sind einzeln optional. Ein Eintrag nur mit Umfängen und ohne Gewicht ist gültig, ebenso umgekehrt. Ein Eintrag, in dem **kein einziger** Wert gesetzt ist, wird abgelehnt — er hätte keine Aussage und würde nur den Verlauf verstopfen.

## 4. Seiten und Routen

Nach der Projektregel „Dashboards zeigen nur das Wichtigste, Detaillisten gehören auf eigene Unterseiten":

| Route | Inhalt |
|---|---|
| `/body` | Dashboard: die Werte des neuesten Eintrags mit dessen Datum, dazu die Veränderung gegenüber dem vorherigen Eintrag als Zahl (`−0,8 kg seit 17.08.`). Knopf „Heute eintragen", Links auf die beiden Unterseiten. |
| `/body/entries` | Verlauf als Liste, absteigend nach Datum, mit Korrigieren und Löschen. |
| `/body/photos` | Fotos als Zeitleiste, nach Datum gruppiert, mit Hochladen und Löschen. |

Die Veränderungsanzeige vergleicht je Messwert mit dem **letzten Eintrag, in dem dieser Wert gesetzt war** — nicht stur mit dem vorherigen Datum. Sonst zeigt ein Tag, an dem nur das Gewicht erfasst wurde, für alle Umfänge eine Veränderung gegen `null`.

## 5. Erfassungsformular

Ein Formular für alle Werte eines Tages: Datum (Vorbelegung heute), Gewicht, Bauch-, Bein-, Arm-, Rücken- und Brustumfang, Körperfettanteil.

- Zahlenfelder mit `step="any"` — sämtliche betroffenen Spalten sind `numeric`. Ohne das Attribut nimmt der Browser `step="1"`, wertet `82,5` als `stepMismatch` und bricht ohne `noValidate` den kompletten Submit ab. Genau dieser Fehler stand seit Phase 1 im Profil und wurde erst in PR #25 gefunden.
- Plausibilitätsgrenzen vor dem Schreiben, analog zu `parseNutrients`: Gewicht 20–500 kg, Umfänge 10–300 cm, Körperfettanteil 0–100 %. Der Check-Constraint auf `koerperfettanteil` ist die zweite Verteidigungslinie, nicht die erste — eine abgelehnte Zeile käme sonst als unverständlicher Datenbankfehler zurück.
- Ein leeres Feld bedeutet „nicht gemessen" und wird als `null` geschrieben. `Number('')` ist `0`, nicht „unbekannt" — dieselbe Falle wie im Ernährungsbereich.

## 6. Gewicht schreibt ins Profil durch

Der Teil mit dem meisten Fehlpotenzial, deshalb ausführlich.

`profiles.aktuelles_gewicht` speist zwei Rechnungen: das Kalorienziel über Mifflin-St-Jeor (`src/lib/nutrition-goal.ts`) und den Kalorienverbrauch beim Trainingsabschluss über die MET-Formel (`src/lib/workout-calories.ts`). Bliebe der Wert stehen, während der Körperbereich eine eigene Gewichtshistorie führt, rechnete die App dauerhaft mit einem veralteten Gewicht, ohne dass es irgendwo auffällt.

**Regel:** `profiles.aktuelles_gewicht` trägt das Gewicht des Eintrags mit dem **neuesten Datum**, in dem ein Gewicht gesetzt ist — nicht das des zuletzt bearbeiteten Eintrags.

Daraus folgt:

| Aktion | Wirkung auf das Profil |
|---|---|
| Heutigen Eintrag mit Gewicht speichern | Profil bekommt dieses Gewicht |
| Einen drei Wochen alten Eintrag korrigieren | Profil bleibt unverändert — der neueste Eintrag ist ein anderer |
| Den neuesten Eintrag löschen | Profil fällt auf den Eintrag davor zurück |
| Einen Eintrag ohne Gewicht speichern | Profil unverändert |
| Alle Einträge mit Gewicht gelöscht | Profil wird auf `null` gesetzt |

Umgesetzt als eine Funktion, die nach jedem Schreiben und jedem Löschen in `body_metrics` läuft: neuesten Eintrag mit gesetztem Gewicht lesen, Wert ins Profil schreiben. Die naheliegende Abkürzung — beim Speichern einfach das gerade eingegebene Gewicht ins Profil schreiben — ist genau der Fehler, den die Regel verhindert.

Das Feld im Profil bleibt weiterhin von Hand änderbar. Es ist dann schlicht der nächste Schreiber; der nächste Körpereintrag überschreibt es wieder.

## 7. Fortschrittsfotos

### Speicherort

Eigener Supabase-Storage-Bucket `body-photos`, **nicht öffentlich**. Ablagepfad `{user_id}/{uuid}.{ext}`.

Die Policies auf `storage.objects` prüfen, dass der erste Pfadabschnitt der eigenen Nutzer-ID entspricht, über `(storage.foldername(name))[1] = auth.uid()::text`.

Je eine Policy für `select`, `insert` und `delete`, jeweils `to authenticated`. Kein `update` — ein Foto wird ersetzt, indem man es löscht und neu hochlädt.

Körperfotos sind das Sensibelste in der ganzen Anwendung. Ein öffentlicher Bucket wäre hier fahrlässig und lässt sich später nicht folgenlos zurückdrehen: Was einmal über eine geratene URL erreichbar war, ist möglicherweise bereits abgerufen worden.

### Anzeige

`body_photos.foto_url` speichert den **Objektpfad**, nicht eine URL. Der Spaltenname stammt aus Phase 1 und ist irreführend; er wird nicht umbenannt, weil eine Migration für einen Namen den Aufwand nicht wert ist. Der Plan hält das an der Nutzungsstelle als Kommentar fest.

Angezeigt wird über kurzlebige signierte Links, die beim Laden der Seite gebündelt erzeugt werden (`createSignedUrls`), Laufzeit eine Stunde. Sie stehen nie in der Datenbank.

### Verkleinern vor dem Hochladen

Ein iPhone-Foto sind 3–5 MB, der kostenlose Speicher umfasst 1 GB — ungedrosselt wäre er nach gut 200 Fotos voll. Vor dem Hochladen wird deshalb auf maximal 1600 px lange Kante verkleinert und als JPEG mit Qualität 0,8 kodiert. Das erledigt `createImageBitmap` plus `<canvas>`, ohne neue Abhängigkeit.

**Testbarkeit:** jsdom implementiert kein Canvas, die Umkodierung ist dort nicht ausführbar. Die Größenrechnung wird deshalb als reine Funktion herausgezogen (`fitWithin(breite, hoehe, max)`) und einzeln getestet; die Canvas-Anbindung bleibt eine dünne, ungetestete Schicht darum. Das ist eine bewusste Entscheidung, keine Lücke aus Versehen.

### Reihenfolge beim Hochladen und Löschen

**Hochladen:** erst die Datei, dann die Datenbankzeile. Schlägt die Zeile fehl, wird die bereits hochgeladene Datei wieder entfernt — sonst bliebe eine Datei ohne Eintrag liegen, die niemand je sieht und die trotzdem Platz belegt.

**Löschen:** erst die Datei, dann die Zeile. Diese Reihenfolge ist die bessere, weil ein Wiederholungsversuch dann folgenlos ist: Das Entfernen einer nicht mehr vorhandenen Datei meldet keinen Fehler. In der umgekehrten Reihenfolge hinterließe ein Fehlschlag eine Zeile ohne Datei, also ein sichtbar kaputtes Bild in der Zeitleiste.

## 8. Migration `0006_body_photos_bucket.sql`

Legt den Bucket an und setzt seine Policies. Sonst nichts. Der Insert in `storage.buckets` läuft mit `on conflict (id) do nothing`, damit ein wiederholter Lauf nichts umwirft.

## 9. Fehlerbehandlung

Wie im übrigen Projekt:

- `supabase-js` wirft nicht, sondern liefert den Fehler im Ergebnis zurück. Jeder Schreibvorgang prüft ihn und meldet sichtbar; ein stumm verschluckter Fehler war in Phase 2 und 3 jeweils ein Review-Fund.
- Rohe Datenbank- und RLS-Meldungen erscheinen nie in der Oberfläche.
- Zahlenfelder schreiben bei `blur`, nicht pro Tastendruck.
- Alle neuen Hooks tragen den `requestId`-Guard gegen Antworten in falscher Reihenfolge und gegen State-Änderungen nach dem Unmount.

## 10. Tests

Gezielt auf die Stellen, an denen es klemmen kann:

1. Die Durchschreibe-Regel in allen fünf Fällen aus der Tabelle in Abschnitt 6, insbesondere „alter Eintrag korrigiert lässt das Profil in Ruhe" und „neuesten Eintrag gelöscht lässt das Profil zurückfallen".
2. Upsert auf denselben Tag ersetzt, statt einen Fehler zu werfen.
3. Ein Eintrag ohne jeden gesetzten Wert wird abgelehnt.
4. Plausibilitätsgrenzen weisen ab, ohne zu schreiben.
5. `fitWithin` als reine Funktion, inklusive der Fälle „Bild kleiner als das Maximum" (unverändert) und Hoch- gegen Querformat.
6. Ein fehlgeschlagener Upload hinterlässt keine Datenbankzeile; eine fehlgeschlagene Zeile hinterlässt keine Datei.
7. Die Veränderungsanzeige vergleicht mit dem letzten Eintrag, in dem der jeweilige Wert gesetzt war.

## 11. Offene Punkte für später

- **Health-Sync über Apple Shortcuts** als eigene Runde nach dieser Phase. Der Nutzer verwendet ein iPhone, der Weg ist damit gangbar.
- **Graphen** zum Körperbereich in Phase 5: Gewichtsverlauf mit geglätteter Trendlinie, Umfänge im Verlauf, Änderungsrate, Gewicht über Kalorien, Fotos als Zeitleiste.
