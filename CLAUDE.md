# Projekt: Fitness- und Ernährungs-App (PWA)

## Kurzbeschreibung

Progressive Web App, die Training und Ernährung kombiniert. Installierbar über Browser-Link auf iOS, Android und Windows, kein App-Store nötig. Vollständige Details siehe docs/architektur.md im selben Verzeichnis.

## Tech-Stack

- Frontend: React + Vite, TypeScript
- Backend/Datenbank: Supabase (Postgres), inklusive Auth und Row-Level-Security
- Barcode-Daten: Open Food Facts API
- Übungsdatenbank: free-exercise-db (einmaliger Import in eigene Tabelle)
- Foto-Analyse (spätere Phase): Gemini API
- Hosting: Firebase Hosting oder Supabase Hosting

## Namenskonventionen

- Alles in Englisch
- Dateinamen: kebab-case (z. B. workout-session.ts)
- React-Komponenten: PascalCase (z. B. WorkoutSession.tsx)
- Standard-React-Projektstruktur verwenden

## Wettbewerber-Referenzen

Keine Namen von Drittanbieter-Apps/-Produkten (z. B. konkrete Konkurrenz-Apps aus Fitness/Ernährung) in Dokumentation, Code, Commit-Messages oder dem GitHub-Wiki erwähnen — bleibt intern zwischen Nutzer und Claude. In Docs stattdessen neutral umschreiben (z. B. "etablierte Ernährungs-Tracking-Apps").

## Secrets-Handling

- Alle API-Keys (Supabase, Gemini) ausschließlich in .env
- .env ist in .gitignore, wird niemals committet
- .env.example mit Platzhaltern im Repository pflegen

## App-Struktur

Vier Hauptbereiche, jeder mit eigenem Dashboard:
1. Home-Dashboard – Übersicht, Kalender, Kalorienstand
2. Trainings-Dashboard – Trainingspläne, Live-Session mit Pausen-Timer
3. Ernährungs-Dashboard – Barcode-Scan, manuelle Eingabe, später Foto-Analyse
4. Körper-Dashboard – Gewicht, Umfänge, Fortschrittsfotos

Details zu jedem Bereich, den Datenbanktabellen und der REST-API-Struktur stehen in docs/architektur.md.

## Arbeitsweise / Phasen

Das Projekt wird in klar getrennten Phasen entwickelt, nicht alles auf einmal:

1. Grundgerüst & Security-Basis (Setup, Auth, DB-Schema, CI/CD mit Semgrep und OWASP ZAP)
2. Ernährungsbereich (Barcode-Scan, manuelle Eingabe, Ernährungs-Dashboard)
3. Trainingsbereich (Trainingspläne, Live-Modus, Kalorienberechnung über MET-Werte)
4. Körperbereich & Health-Integration (Körper-Dashboard, Apple-Shortcuts-Sync)
5. Analysebereich (interaktive Graphen über alle Bereiche, konfigurierbare Dashboards) — nachträglich eingeschoben, siehe eigenen Abschnitt
6. Härtung & Feinschliff (vollständiger OWASP-Durchlauf, Penetration-Tests, PWA-Feinschliff)

Wichtig: Nach jeder Phase soll eine Zusammenfassung gegeben und Tests durchgeführt werden (statisch und dynamisch), bevor die nächste Phase begonnen wird. Nicht mehrere Phasen gleichzeitig anfangen.

## Sicherheitsanforderungen

- OWASP Top 10 (2025) durchgängig beachten, siehe Checkliste in docs/architektur.md
- Row-Level-Security auf allen Supabase-Tabellen
- Keine Secrets im Code, keine Secrets in Logs
- Automatisierte Tests: Semgrep (SAST) und OWASP ZAP (DAST) in CI/CD-Pipeline

## Referenzdokument

Das vollständige Architekturkonzept mit Datenbankschema, REST-API-Endpunkten pro Bereich, UI/UX-Konzept und OWASP-Checkliste liegt in docs/architektur.md. Bei Unklarheiten dort nachschlagen, bevor Annahmen getroffen werden.

## Status / Fortschritt (laufend aktuell halten)

Diese Sektion nach jedem abgeschlossenen Schritt aktualisieren, damit ein neuer Chat sofort weiß, was gemacht wurde und was als Nächstes ansteht.

**Aktueller Stand:** Phase 1, 2 und 3 sind gemerged, deployed und manuell gegen Produktion verifiziert; die kosmetischen Nacharbeiten am Layout ebenfalls (PR #22/#23, Merge-Commit `5b79651`). **Phase 4 (Körperbereich) ist gemerged und gegen Produktion verifiziert** (PR #26, Merge-Commit `63aced2`) — Details im eigenen Abschnitt weiter unten. Danach folgt der Analysebereich als Phase 5, Härtung rückt auf 6. Dazu gibt es eine Profilseite unter `/profile`, erreichbar über das Icon im Header. Der Ernährungsbereich hat eine eigene Eintragsliste unter `/nutrition/entries`, nach Mahlzeiten-Abschnitten gegliedert (PR #20, Merge-Commit `752587c`; Phase 3: PR #21, `7420145`).

**Mahlzeiten-Abschnitte (gemerged, alle 9 Tasks fertig):** Einträge auf `/nutrition/entries` sind nach Mahlzeiten gegliedert — sechs feste Slots, vier davon vorbelegt (Frühstück, Mittagessen, Abendessen, Snacks), die restlichen zwei optional und nur sichtbar, sobald sie einen Namen oder Einträge haben. Die Namen stehen im Profil unter „Mahlzeiten"; welchem Abschnitt ein Eintrag zugeordnet ist, ergibt sich daraus, in welchem Abschnitt er erfasst wurde. Alt-Einträge von vor der Migration stehen unter „Ohne Zuordnung" und lassen sich über „Bearbeiten" nachträglich einsortieren. Das Ernährungs-Dashboard zeigt die Kalorien je Abschnitt als Link zur Eintragsliste. Enthält Migration `0003_meal_sections.sql` (fügt nur Spalten hinzu; bestehende Zeilen bekommen `mahlzeit = null`). Spec: `docs/superpowers/specs/2026-08-20-mahlzeiten-abschnitte-design.md`, Plan: `docs/superpowers/plans/2026-08-20-mahlzeiten-abschnitte-plan.md`.

**Einträge und Produkte bearbeiten (Branch `feat-entry-editing`, Task 8 von 8 fertig):** Über einen „Bearbeiten"-Button in der Eintragsliste unter `/nutrition/entries` lassen sich bei einem Eintrag Menge, Zeitpunkt, das verknüpfte Produkt und dessen Nährwerte ändern. Eigentümerregel in einem Satz: Ein Produkt, das dem Nutzer gehört, wird direkt aktualisiert und behält seinen Barcode; ein fremdes Produkt wird kopiert (Kopie ohne Barcode) und der Eintrag auf die Kopie umgehängt — geschrieben wird nur, wenn sich Name oder Nährwerte tatsächlich geändert haben. Spec: `docs/superpowers/specs/2026-08-19-eintraege-bearbeiten-design.md`, Plan: `docs/superpowers/plans/2026-08-19-eintraege-bearbeiten-plan.md`.

Offene Folgevorhaben (noch nicht umgesetzt):
1. **Portionen statt reiner Gramm-Eingabe.**
2. **Trainingstag/Restday-Kalender** (Integration ins Home-Dashboard).
3. **Kalorienberechnung je Übung mit eigener Dauer** statt eines MET-Durchschnitts über die ganze Session.
4. **Schwierigkeitsgrad-Import** aus free-exercise-db (`level`-Feld wird beim Import derzeit verworfen).

## Phase 4 – Körperbereich (abgeschlossen)

**Stand:** Alle 11 Tasks umgesetzt und je einzeln reviewt, danach Whole-Branch-Review auf dem stärksten Modell, eine Fix-Welle und ein Scoped Re-Review — alle Findings adressiert, keine neue Breakage. Gemerged über PR #26 (Merge-Commit `63aced2`), Branch entfernt. Alle vier CI-Checks grün (build-test, Semgrep, npm audit, ZAP). **421 Tests grün**, Lint, `tsc -b --noEmit` und `npm run build` sauber (nur die bekannte Bundle-Größen-Warnung, gehört zu Phase 5).

**Was es jetzt gibt:** `/body` als Dashboard mit aktuellen Werten und Veränderung, `/body/entries` als Verlaufsliste mit Korrigieren und Löschen, `/body/photos` als Foto-Zeitleiste. Erfasst werden Gewicht, fünf Umfänge und Körperfettanteil, ein Eintrag je Tag (`upsert` auf `user_id, datum`). Fotos liegen im privaten Bucket `body-photos`, sichtbar nur über kurzlebige signierte Links.

**Manuelle Verifikation gegen Produktion: alle zehn Schritte grün.** Nachgewiesen wurden unter anderem: Kalorienziel folgt dem Gewicht (82,5 kg → 1672 kcal, Mifflin-St-Jeor); ein Eintrag mit *früherem* Datum lässt `profiles.aktuelles_gewicht` unverändert; das Löschen des neuesten Eintrags zieht es auf den verbliebenen zurück; Foto 3000×2000/547 kB kommt als 1600×1067/163 kB unter `body-photos/{user-id}/{uuid}.jpg` an, signierte URL liefert 200, derselbe Pfad ohne Signatur 400; nach dem Löschen ist die Datei auch im Bucket weg (`NoSuchKey`); Konsole ohne Fehler. Auch geprüft: „Heute eintragen" öffnet **vorbelegt**, wenn für den Tag schon Werte da sind (der Critical-Fund aus dem Schluss-Review).

**Migration `0006` ist mit dem Merge auf Produktion gelaufen.** Sie legt den privaten Bucket `body-photos` an, samt Policies je Nutzer und seit der Fix-Welle mit `file_size_limit` (5 MB) und `allowed_mime_types`. Es gibt keine lokale Supabase-Instanz, deshalb ist `0006_body_photos_bucket.test.ts` (Textvergleich je Policy-Block) die einzige Prüfung, die diese Migration je bekommt — beim Ändern mitziehen.

**Wiki:** synchronisiert und gepusht (`Domain-Model`, `Phase-4-Design-Spec`, `Phase-4-Implementation-Plan`, `Home`, `_Sidebar` — Commit `b4cabcf`).

**Drei Sachen, die beim Weiterbauen gelten:**
- **`ProfileWeightSyncError`.** `useBodyMetrics` wirft ihn, wenn der Eintrag geschrieben wurde, aber `profiles.aktuelles_gewicht` nicht nachgezogen werden konnte — auch, wenn schon das Lesen des neuesten Gewichts fehlschlägt. Wer den Hook benutzt, fängt ihn ab und meldet „gespeichert, aber Profilgewicht veraltet", niemals „nicht gespeichert". `BodyEntryForm` behandelt ihn als Erfolg und schließt; die sichtbare Meldung gehört auf die Seite, die den Hook hält.
- **Formulare für einen Tag müssen vorbelegen.** Der Upsert schreibt alle sieben Spalten. Ein leeres Formular auf einen Tag, der schon Werte hat, löscht sie still — genau dieser Fehler steckte im Dashboard und wurde in der Fix-Welle behoben (`entry={rows.find(...)}`).
- **Gewichtsgrenzen sind 30–300 kg**, in `src/lib/body-metrics.ts` und `ProfilePage.tsx` identisch. Die Spec nennt noch 20–500; das Spec-Dokument ist ein datierter Entwurfsstand und wurde bewusst nicht rückwirkend geändert.

**Bewusst offen gelassen** (vom Schluss-Review als „darf warten" eingestuft): `formatDate` steht wortgleich in drei Seiten; der `onSave`-Wrapper in `BodyPage` und `BodyEntriesPage` ist nahezu identisch; das Ändern des Datums beim Korrigieren kann einen anderen Eintrag desselben Tages überschreiben; das Profil-Update meldet nicht, wenn es null Zeilen trifft; `Number('0x50')` ergibt 80; Foto-Löschen ohne `busy`-Guard und ohne Bestätigen (Projektkonvention).

## Phase 5 – Analysebereich (Plan 1, 2a und 2b gemerged und verifiziert, Plan 2c umgesetzt und Merge ausstehend)

### Sofort-Einstieg für einen neuen Chat

**Alle vier Pläne (1, 2a, 2b, 2c) sind umgesetzt.** Alle 19 geplanten Graphen aus Training (T1–T8), Ernährung (E1–E6) und Körper (K1–K5) existieren im Code — der Analysebereich ist damit inhaltlich vollständig. Plan 2c läuft noch auf einem eigenen Branch/Worktree und ist weder gemerged noch gegen Produktion verifiziert; Plan 1, 2a und 2b sind gemerged und verifiziert.
1. Plan 2a: Gemerged über PR #33 (Merge-Commit `4df8a03`), Branch/Worktree entfernt. Alle 11 Tasks einzeln abgenommen, danach Whole-Branch-Review auf Opus (2 Critical, 2 Important, 2 kleinere Nachträge — alle in einer Fix-Welle behoben), Manuelle Verifikation 29.08.2026 abgeschlossen. Details siehe „Plan 2a" unten.
2. `TrainingChartList.tsx` ist der einzige Ort, an dem noch ein Trainingsgraph eingebunden wird, `NutritionChartList.tsx` das Analogon für Ernährung, `BodyChartList.tsx` das Analogon für Körper — jeweils Dashboard und Analyse-Seite, jeder Chart hinter `React.lazy`.
3. **Plan 2b (Ernährung, E2–E6) ist fertig: gemerged, Whole-Branch-Review clean nach einer Fix-Welle, manuelle Verifikation abgeschlossen.** Details im eigenen Abschnitt „Plan 2b" weiter unten.
4. **Der Plan-Text von Plan 2b war anfangs unvollständig** (nur Task 1 geschrieben, obwohl Ziel/File-Structure fünf Graphen versprachen) — wurde während der Umsetzung nach dem Vorbild von Plan 2c um die Tasks 2–8 ergänzt (Commit `96791a6` auf dem Feature-Branch, vor dem Merge). Für neue Pläne: vor dem Start prüfen, ob wirklich alle versprochenen Tasks existieren, nicht nur Task 1.
5. **Plan 2c (Körper, K2–K5) ist fertig: alle 8 Tasks umgesetzt, Task 8 (Abschluss) mit vollem grünen Lauf.** Details im eigenen Abschnitt „Plan 2c" weiter unten. **Noch offen:** Whole-Branch-Review, Merge und manuelle Verifikation gegen Produktion — dieser Branch ist noch nicht gemerged.

**Genau hier weitermachen:**
Kein Folge-Schritt für den Analysebereich explizit eingeplant — Plan 2c deckt den letzten offenen Bereich (Körper) ab. Vor dem nächsten Vorhaben zuerst diesen Branch review(en) und mergen (siehe „Plan 2c" unten für den Stand); danach PR-Nummer/Merge-Commit hier und im Wiki nachtragen.

**Noch aufzuräumen:** die synthetischen Daten aus der Plan-1-Verifikation stehen weiter in der Produktions-Datenbank (7 `body_metrics` 05.05.–27.08., 12 `workout_sessions` 15.05.–26.08., 30 `food_entries` 18.–27.08. auf ein einziges Produkt). Vor echtem Gebrauch löschen.

### Plan 2c – Körpergraphen (PR-Nummer/Merge-Commit nach dem Merge nachtragen)

Vier neue Graphen im Körperbereich: **K2** Umfänge im Verlauf (die fünf Umfänge aus `MEASUREMENT_FIELDS`, je eine `Line`), **K3** Änderungsrate (kg/Woche, gerechnet auf `gewichtsTrend` — derselben EWMA-Trendlinie, die K1 zeichnet, nicht auf den Rohgewichten), **K4** Gewicht über Kalorien (Wochenaggregate: mittlere Tagesaufnahme der Woche gegen Änderung des Wochenmittelgewichts, Punktwolke), **K5** Fortschrittsfotos als Zeitleiste (neuestes Foto oben, mit dem Gewicht **desselben** Tages beschriftet, ein Foto ohne Wiegung bleibt sichtbar und trägt kein Gewicht). Zusammen mit K1 (Plan 1) sind das jetzt **fünf** Körpergraphen, alle in `src/lib/analysis/registry.ts` angemeldet und über `BodyChartList.tsx` gerendert (ein `switch` über die Registry-IDs, analog zu `TrainingChartList`/`NutritionChartList`) — der einzige Ort, an dem noch ein Körpergraph eingebunden wird.

`useBodyAnalysis(userId, zeitraum)` (`src/hooks/use-body-analysis.ts`) lädt jetzt **drei** Quellen statt einer: `body_metrics` (die Messwerte), `food_entries` mit eingebettetem `products(kalorien)` (die Tagessummen für K4) und `body_photos` samt gebündelt signierten Links (die Zeitleiste für K5, dieselbe Signierung wie `useBodyPhotos`) — alle drei seitenweise paginiert und auf den Zeitraum begrenzt. Das Körper-Dashboard feuert deshalb **drei** Abfragen (plus ggf. eine `createSignedUrls`), sobald mindestens ein Körpergraph angehakt ist, unabhängig davon, welcher — anders als beim Training (zwei Graphen = zwei Abfragen): K4 braucht die Ernährung, K5 die Fotos, die übrigen drei Graphen lesen beide ungenutzt mit. Bewusste Entscheidung, im Plan-Ledger festgehalten (`.superpowers/sdd/2026-08-29-phase5-plan2c-koerpergraphen/progress.md`): den Hook nicht nach angehakten Graph-IDs zu verzweigen, weil er dann wissen müsste, welcher Graph welche Tabelle braucht.

Kein neues Hilfsmodul für dieses Plan: `seitenweiseLaden` liegt weiterhin in `src/lib/paged-query.ts`, die Wochenhilfsfunktionen `wochenStart`/`wochenLabel` weiterhin in `src/lib/analysis/wochen.ts` — beide bereits von Plan 2b dorthin extrahiert. Der ursprüngliche Plan-2c-Text sah eigene Module unter `src/lib/analysis/paged-query.ts` und `src/lib/analysis/woche.ts` vor; der Pre-Flight-Scan des Plans fand die schon vorhandenen Pfade und die Tasks 1 und 6 wurden entsprechend umgeleitet (siehe die Rulings im Ledger).

**Bundle nach Task 8** (`npm run build`, Worktree ohne `.env` — derselbe Sonderfall wie in Plan 2b, das komplette Barcode-Scanner-Subsystem fehlt deshalb im Entry-Chunk, keine echte Vergleichszahl zur `master`-Baseline): Entry-Chunk `dist/assets/index-BQ_mSZvT.js` 235,41 kB (75,48 kB gzip). Die vier neuen Körpergraphen liegen einzeln hinter `React.lazy` und sind winzig: `BodyMeasurementsChart` 1,02 kB, `WeightChangeRateChart` 0,96 kB, `WeightVsCaloriesChart` 12,34 kB (grösser, weil sie zusätzlich Streudiagramm-Bausteine zieht), `PhotoTimeline` 0,78 kB, dazu ein `body-charts`-Sammel-Chunk mit 1,87 kB für die reinen Rechenfunktionen. Recharts bleibt bestätigt in den gemeinsamen `CartesianChart`/`Bar`/`Line`/`Legend`/`ReferenceLine`-Chunks ausserhalb des Entry-Chunks. Kein neuer offener Punkt aus diesem Plan.

**Stand: 706 Tests grün** (98 Dateien), Lint ohne Fehler und Warnungen, `tsc -b --noEmit` sauber, `npm run build` erfolgreich. Keine Migration in diesem Plan. `docs/domaenenmodell.md` um die Körperanalyse-Notizen ergänzt (drei Abfragen statt einer, Fotolinks nie gespeichert, K5-Tagesmatch, K3 aus der K1-Trendlinie) und nach `../fitness-app.wiki/Domain-Model.md` gespiegelt — **die Wiki-Datei ist geschrieben, aber im Wiki-Repo weder committet noch gepusht**, das passiert erst nach dem Merge dieses Branches.

**Noch offen für diesen Plan:** Whole-Branch-Review, Fix-Welle falls nötig, Merge und die manuelle Verifikation gegen Produktion (Schritte im Brief unter „Manual Verification" — braucht eine Datenlage mit Vorzeichenwechsel über zwei Wochen und mindestens zwei Fotos, eines davon an einem eintragslosen Tag; die synthetischen Plan-1-Zeilen decken das nur teilweise ab).

### Plan 2b – Ernährungsgraphen (gemerged, PR #38)

Fünf neue Graphen im Ernährungsbereich: **E2** Makro-Verteilung heute (Eiweiß/Kohlenhydrate/Fett als Energie-Anteile, nicht Gramm-Anteile — sonst sähe ein fettreicher Tag ausgeglichen aus), **E3** Makro-Verlauf (dieselben drei über die Zeit, in Gramm statt Prozent), **E4** Kalorien je Mahlzeiten-Abschnitt (dieselbe Abschnitts-Logik wie die Eintragsliste, `visibleSections`: ein besetzter unbenannter Slot bleibt als „Abschnitt N" sichtbar, Unzugeordnetes läuft unter „Ohne Zuordnung"), **E5** Wochenschnitt (Kalorien je Kalenderwoche, gemittelt über Tage **mit** Eintrag statt über alle sieben Tage), **E6** Kalorienbilanz (Aufnahme minus Trainingsverbrauch je Tag, subtrahiert `gesamt_kalorien` der Sessions; ein Tag mit Session ohne Ernährungseintrag fällt weg, ein Tag mit Eintrag ohne Session zählt mit Verbrauch 0). Zusammen mit E1 (Plan 1) sind das jetzt **sechs** Ernährungsgraphen, alle in `src/lib/analysis/registry.ts` angemeldet und über `NutritionChartList.tsx` gerendert (ein `switch` über die Registry-IDs, analog zu `TrainingChartList`) — der einzige Ort, an dem noch ein Ernährungsgraph eingebunden wird.

`useNutritionAnalysis(userId, zeitraum)` liest neben den Einträgen (`food_entries` mit eingebettetem `products`) jetzt auch die Trainingskalorien mit (`workout_sessions`, nur `gestartet_am`/`gesamt_kalorien`, für E6) — zwei Abfragen, beide seitenweise paginiert, keine Beziehung zwischen den Tabellen, also kein Join. Das Ernährungs-Dashboard feuert deshalb **zwei** Abfragen, sobald mindestens ein Ernährungsgraph angehakt ist, unabhängig davon, welcher — E6 braucht die Sessions, die übrigen fünf lesen sie nur ungenutzt mit.

Zwei Hilfsmodule sind jetzt zwischen Training und Ernährung geteilt statt verdoppelt: `seitenweiseLaden` liegt seit diesem Plan in `src/lib/paged-query.ts` (vorher nur in `use-training-analysis.ts`), die Wochenhilfsfunktionen `wochenStart`/`wochenLabel` in `src/lib/analysis/wochen.ts` (vorher privat in `training-charts.ts`). Die Makro-Rechnung (`entryMakro`/`sumMakro`, Energie- statt Gramm-Anteile) liegt jetzt in `src/lib/entry-calories.ts` und wird von `DailySummary` und den Graphen E2/E3 gemeinsam benutzt statt einmal in `DailySummary` und einmal in `nutrition-charts.ts` zu stehen.

**Bundle nach Task 8** (`npm run build`): Ohne `.env` (Worktree-Default, da `.env` gitignored ist und von `git worktree add`/`git clone` nie mitkopiert wird) misst der Entry-Chunk nur 231,71 kB (74,53 kB gzip) — das ist kein echter Vergleichswert, sondern ein Build ohne `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, dem dadurch das komplette Barcode-Scanner-Subsystem (`@zxing/browser`/`@zxing/library`, erreichbar über `NutritionEntriesPage → AddEntryFlow → ProductPicker → BarcodeScanner`) fehlt. Mit echter `.env` (per Experiment gegengeprüft, inkl. Repro auf `master`) lauten die tatsächlich vergleichbaren Zahlen: `master`-Baseline 985,06 kB (268,52 kB gzip) → dieser Branch 987,48 kB (268,93 kB gzip), also **+2,42 kB / +0,41 kB gzip** — wächst kaum, wie erwartet, weil jeder neue Chart einzeln hinter `React.lazy` liegt. Recharts bleibt bestätigt außerhalb des Entry-Chunks (weiterhin in den gemeinsamen `CartesianChart`/`Bar`/`Line`/`Legend`/`ReferenceLine`-Chunks), die fünf neuen Ernährungsgraphen selbst sind winzig (0,72–1,06 kB je Komponente, dazu ein `nutrition-charts`-Sammel-Chunk mit 1,95 kB). Kein neuer offener Punkt aus diesem Plan; das Bundle bleibt aus den früheren Phasen über der Warnschwelle, gehört weiter in die Härtungsphase.

**Stand: 655 Tests grün** (93 Dateien), Lint ohne Fehler und Warnungen, `tsc -b --noEmit` sauber, `npm run build` erfolgreich. Keine Migration in diesem Plan. `docs/domaenenmodell.md` um die Ernährungsanalyse-Notizen (E2–E6, zwei Abfragen statt Join, geteilte Hilfsmodule) ergänzt — **Wiki bereits synchronisiert** (`Domain-Model`, neue Seite `Phase-5-Plan-2b-Ernaehrungsgraphen`, `Home`, `_Sidebar` — gepusht, Commit `decc790`).

**Whole-Branch-Review (Opus) und eine Fix-Welle abgeschlossen:** Verdict „Ready to merge? With fixes" — kein Critical, 2 Important (ein Test prüfte Achsentext statt gezeichneter Marken entgegen der Projekt-Konvention; ein Sechs-Graphen-Seitentest hatte zu knappes Timeout-Budget für kalten Cache), 3 Minor behoben (E3 fehlte der „geloeschtes Produkt überspringen"-Guard, den E1/E2 schon hatten; zwei Doku-Tippfehler). Scoped Re-Review bestätigte alle 5 Findings adressiert, keine neue Breakage. Gemerged über PR #38 (Squash-Merge), Branch und Worktree entfernt.

**Manuelle Verifikation gegen Produktion abgeschlossen** (04.09.2026, alle zehn Schritte grün): E2 zeigt Gramm-Labels exakt wie `DailySummary` (55/45/95 g), aber Energie- statt Gramm-Anteile (Fett ~40 % trotz nur 23 % Gramm-Anteil) — der entscheidende Spec-Fund. E4 summiert neue Einträge korrekt in ihre Abschnitte. **E6 bestätigt exakt: 1017 kcal Bilanz = 1025 kcal Aufnahme − 8 kcal einer echten Live-Session.** Dashboard feuert genau zwei Tabellenabfragen unabhängig vom angehakten Graphen; ohne Häkchen keine Analyseabfrage. `/login` lädt keinen Recharts-Chunk. Ein einmaliger Ladefehler beim allerersten Seitenaufruf war ein reproduzierbarer Kaltstart-Flake des Dev-Servers (zweiter Aufruf sofort fehlerfrei), kein Code-Bug. Testdaten (2 Einträge, 1 Session, 1 Plan) danach vollständig gelöscht.

### Plan 2a – Trainingsgraphen (gemerged, PR #33)

Sieben neue Graphen im Trainingsbereich: **T2** Kraftverlauf je Übung (geschätztes 1RM, Epley), **T3** Volumen je Übung, **T4** bestes Satzgewicht, **T5** Wiederholungen je Satz, **T6** Volumen je Muskelgruppe, **T7** Dauer und Kalorien je Session, **T8** persönliche Rekorde (Liste, kein Recharts). Zusammen mit T1 (Plan 1) sind das jetzt **acht** Trainingsgraphen, alle in `src/lib/analysis/registry.ts` angemeldet und über `TrainingChartList.tsx` gerendert (ein `switch` über die Registry-IDs). T2–T5 bekommen zusätzlich eine Übungsauswahl (`mitUebungsauswahl`), vorbelegt mit der am häufigsten trainierten Übung; auf dem Dashboard ausgeblendet.

`useTrainingAnalysis` liest `workout_sessions` und danach `workout_session_sets` über die Session-IDs im Zeitraum, mit `exercises(name, muskelgruppen_primaer)` eingebettet. Volumen wird bei zwei Muskelgruppen je zur Hälfte verteilt, nicht doppelt angerechnet. Aufwärmsätze zählen in keinem der neuen Graphen mit.

**Bundle nach Task 11** (`npm run build`): Entry-Chunk `dist/assets/index-BA_sHCOY.js` 984,53 kB (268,30 kB gzip) — praktisch unverändert gegenüber Plan 1 (977 kB), weil jeder neue Chart einzeln hinter `React.lazy` liegt (eigene Chunks von 0,26–1,34 kB je Komponente, dazu ein gemeinsamer `training-charts`-Chunk mit 4,08 kB). Recharts selbst bleibt in den gemeinsamen `CartesianChart`/`Bar`/`Line`/`Legend`-Chunks außerhalb des Entry-Chunks. Weiterhin über Vites Warnschwelle (500 kB) — bekannt, gehört in die Härtungsphase.

**Endstand nach Whole-Branch-Review, Fix-Welle und CI-Fix: 606 Tests grün** (85 Dateien), Lint ohne Fehler und Warnungen, `tsc -b --noEmit` sauber, `npm run build` erfolgreich. Die Sätze-Abfrage in `use-training-analysis.ts` paginiert jetzt (`.range()`, analog zu `use-exercises.ts`) und chunkt Session-IDs zu 100 je Anfrage — vorher lief sie ungechunkt und ungedeckelt, Risiko genau des Fehlers, der in Phase 3 schon einmal auftrat.

### Manuelle Verifikation Plan 2a (29.08.2026, alle zehn Schritte grün)

Der Account hatte keine Sätze (nur die synthetischen Plan-1-Sessions ohne `workout_session_sets`), deshalb testweise ein echter Plan mit zwei Übungen angelegt (Barbell Bench Press, drei Arbeitssätze plus ein Aufwärmsatz; Barbell Squat, ein Satz) und über eine echte Live-Session erfasst.

- Alle **acht** Graphen erscheinen auf `/training/analyse` mit Titel und Häkchen.
- **Der entscheidende Fix bestätigt:** T2, T3, T4, T5 zeigen die Übungsauswahl weiterhin, obwohl T2/T4/T5 wegen zu weniger Tage „Noch nicht genug Daten" melden — die Auswahl verschwindet nicht mehr mit dem Chart (Critical-Fund #1 des Schluss-Reviews). Umschalten auf die kaum trainierte Übung (Squat, ein Satz) und zurück funktioniert, keine Sackgasse.
- T3 (Volumen je Übung) und T6 (Volumen je Muskelgruppe) per Hover geprüft: Bankdrücken 1630 kg (Summe der drei Arbeitssätze, inklusive eines versehentlichen Duplikat-Satzes durch einen eigenen Fehlklick — der 40-kg-Aufwärmsatz ist korrekt **nicht** enthalten, sonst wären es 2030 kg). Muskelgruppen-Volumen: chest 1630 kg, quadriceps 500 kg, keine Überschneidung.
- T8 (persönliche Rekorde) zeigt beide Übungen korrekt nach höchstem geschätzten 1RM (Epley), nicht nach höchstem Gewicht: Bankdrücken 101,3 kg aus 80 kg × 8 (nicht aus 82,5 kg × 6, das nur 99,0 kg ergibt) — bestätigt, dass T8 wirklich rechnet statt nur das schwerste Gewicht zu übernehmen.
- Zwei Graphen angehakt (T3, T6), `/training` geöffnet: beide erscheinen ohne Zeitraum-Umschalter, dafür mit Übungsname im Titel („Volumen je Übung – Barbell Bench Press …", bestätigt Important-Fund #3). Netzwerkanalyse: genau zwei Abfragen (`workout_sessions`, `workout_session_sets`, beide paginiert mit `.range()`, je doppelt geloggt durch React-StrictMode im Dev-Modus — kein Produktionsverhalten).
- Alle Häkchen abgewählt, `/training` neu geladen: kein Graph, **keine** Analyseabfrage (nur die unabhängige Tag-Rotations-Abfrage lief weiter).
- `/login`: kein Recharts-Chunk im Netzwerk-Log. Konsole ohne Fehler oder Warnungen.
- Testdaten danach vollständig gelöscht (Session über „Session löschen", Plan über „Löschen" in Meine Pläne).

### Manuelle Verifikation Plan 1 (27.08.2026, alle neun Schritte grün)

- `profiles.analyse_auswahl` stand auf `["T1","E1","K1"]`; Dashboards zeigen die Graphen ohne Zeitraum-Knöpfe, die Analyseseiten mit.
- **Der entscheidende Schritt:** Häkchen bei E1 abgewählt → DB steht auf `["T1","K1"]`, Graph verschwindet vom Ernährungs-Dashboard und bleibt nach vollem Reload weg; wieder anhaken bringt ihn zurück. Die Auswahl liegt also wirklich im Profil.
- Ein Dashboard ohne angehakten Graphen feuert **keine** Analyseabfrage — nachgewiesen im Netzwerk-Log (nur die Tagesabfrage lief).
- Zeitraum: 30 Tage → `zeitpunkt=gte.2026-07-28`, „alles" → gar kein Filter; die Achse beim Gewichtsverlauf sprang von `01.08.–27.08.` auf `05.05.–27.08.`.
- E1 zeichnet die Ziel-Linie auf 1672 kcal, also auf `effectiveCalorieGoal(profile)`. T1 zeigt die Wochen korrekt mit Nulllücken (KW29 = 2, KW30/31 = 0, KW32–35 = 2).
- `React.lazy` greift: `/login` lädt keinen Recharts-Chunk, beim Wechsel auf ein Dashboard kommt `deps/recharts.js` mit 200. Konsole ohne Fehler und Warnungen.

**Testdaten:** Der Account hatte keine Historie (0 Zeilen `body_metrics`, 0 `workout_sessions`), deshalb wurden am 27.08.2026 **synthetische Daten in die Produktions-DB geschrieben**: 7 `body_metrics` (05.05.–27.08., 88,0 → 82,5 kg), 12 `workout_sessions` (15.05.–26.08.) und 30 `food_entries` (18.–27.08., alle auf das Produkt HARIBO CHERRY-COLA). Ein Alt-Eintrag mit `menge = 50000` (50 kg, 167.000 kcal, hat die Y-Achse von E1 gesprengt) wurde gelöscht. **Vor echtem Gebrauch aufräumen**, sonst verfälschen die erfundenen Zeilen jeden späteren Graphen.

**Zwei Randbeobachtungen ohne Befundcharakter:** `/login` ist auch eingeloggt erreichbar (kein Redirect aufs Dashboard); die Recharts-Einblendanimation braucht im Hintergrund-Tab einen zweiten Frame, Screenshots direkt nach dem Laden zeigen sonst ein leeres Koordinatensystem.

**Stand:** Plan 1 vollständig — alle 15 Tasks umgesetzt und je einzeln reviewt, danach Whole-Branch-Review auf dem stärksten Modell, eine Fix-Welle, ein Scoped Re-Review und zwei nachgezogene Rulings. Gemerged über PR #27 (Merge-Commit `5cd7b19`), Branch entfernt. **525 Tests grün**, Lint, `tsc -b --noEmit` und `npm run build` sauber.

**Zuschnitt gegenüber den Eckpunkten geändert: der Home-Bereich ist NICHT dabei.** `HomePage.tsx` ist ein Platzhalter und `day_status` wird von keiner Stelle beschrieben — H1–H3 hätten weder Dashboard noch Daten. Home-Dashboard und Trainingstag/Restday-Kalender werden ein eigenes Vorhaben. Phase 5 deckt Training, Ernährung und Körper ab: 19 Graphen, davon 3 in Plan 1.

**Was es jetzt gibt:** `/training/analyse`, `/nutrition/analyse`, `/body/analyse` mit Zeitraum-Umschalter (30/90/365/alles, Vorgabe 90) und je einem Graphen: T1 Trainingsfrequenz, E1 Kalorien pro Tag gegen Ziel, K1 Gewichtsverlauf mit Trendlinie. Ein Häkchen am Graphen heftet ihn ans Dashboard; die Auswahl liegt in `profiles.analyse_auswahl` (Migration `0007`). Dashboards zeigen fest 90 Tage ohne Umschalter und lösen **keine** Abfrage aus, solange nichts angehakt ist. **Plan 2** (die restlichen 16 Graphen) ist noch nicht geschrieben.

**Migration `0007` ist mit dem Merge auf Produktion gelaufen.** Sie fügt `profiles.analyse_auswahl jsonb not null default '["T1","E1","K1"]'` hinzu, sonst nichts; Policies bleiben unangetastet.

**Bundle:** Entry-Chunk 977 kB / 266 kB gzip — praktisch der Stand vor Recharts, weil die Chart-Komponenten an ihren Verwendungsstellen nachgeladen werden. Weiterhin über Vites Warnschwelle; das ist der Rest der App und gehört in die Härtungsphase.

**Fünf Dinge, die beim Weiterbauen gelten:**
- **Graph-Tests prüfen gezeichnete Marken, nie Achsentexte.** Recharts' Tick-Skipping ist eine Layout-Heuristik, die in jsdom anders ausfällt. Balken: Anzahl der Rechtecke. Linien: `M`/`L`-Befehle im `d` der Kurve — aber Achtung, `type="monotone"` liefert ab drei Punkten `M…C…C…`, die Zählung stimmt nur bei genau zwei.
- **Recharts zeichnet für einen Nullwert gar keine Marke**, und **verwirft eine `ReferenceLine` über dem Wertebereich der Y-Achse** — deshalb trägt E1 `ifOverflow="extendDomain"`. Ohne das sieht niemand seine Ziel-Linie, der unter dem Ziel isst.
- **Der `getBoundingClientRect`-Stub in `src/test-setup.ts` muss auf `recharts-responsive-container` begrenzt bleiben.** Pauschal belegt eine Legende die ganze Zeichenfläche und die Linien bleiben ohne Fehlermeldung leer.
- **Jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`.** Die Vorgabe von 1000 ms reicht auf einem belasteten Rechner nicht für den dynamischen Import — sonst flakt CI.
- **Das Kalorienziel kommt immer aus `effectiveCalorieGoal(profile)`, nie aus `taegliches_kalorienziel`.** Das Rohfeld ist im Normalfall leer; das Ziel wird gerechnet.

**Bewusst offen gelassen:** `chartsFor`/`CHARTS` werden noch nicht von den Seiten genutzt (die sechs Verwendungsstellen nehmen jetzt immerhin ID-Konstanten aus der Registry); drei aufeinanderfolgende Häkchen-Klicks innerhalb eines Schreibvorgangs können den mittleren verlieren; die Zeitraum-Untergrenze vergleicht ein lokales Datum gegen `timestamptz` (ein Teiltag am Fensteranfang); `useProfile` läuft auf der Ernährungs-Analyseseite doppelt; `useChartSelection` liegt in `ChartPicker.tsx` statt unter `src/hooks/`; `tagesLabel` steht doppelt.

**Ziel:** Interaktive Graphen über alle vier Bereiche, damit sich Fortschritt und Schwachstellen ablesen lassen.

**Entschieden:**
- **Bibliothek: Recharts.** Ausschlaggebend ist SVG-Rendering, nicht die Größe: unsere Tests laufen in jsdom, ein SVG-Chart lässt sich auf Achsen, Datenpunkte und Beschriftung prüfen, ein Canvas-Chart (Chart.js, ECharts) wäre dort eine leere Box und nur mockbar. ~136 kB gzip obendrauf, deshalb **Analyse-Seiten per `React.lazy`** nachladen — zieht das für die Härtungsphase vorgemerkte Code-Splitting vor.
- **Alle Graphen werden gebaut, keine Vorauswahl.** Je Bereich eine Unterseite `/analyse`, die alle Graphen dieses Bereichs zeigt. Das Dashboard zeigt nur die vom Nutzer angehakten — der Picker steuert die Startansicht, nicht die Verfügbarkeit. Passt zur Regel „Dashboards nur das Wichtigste".
- **Technik:** Registry, in der sich jeder Graph mit ID, Bereich, Titel und Komponente anmeldet. Die Auswahl des Nutzers ist eine Liste von IDs in einer `jsonb`-Spalte auf `profiles`. Keine neue Tabelle, kein Drag-and-drop-Framework.
- Umfang realistisch zwei Pläne, nicht einer.

**Geplante Graphen** (Nummern aus der Vorauswahl, für die Spec):
- Training: T1 Trainingsfrequenz · T2 Kraftverlauf je Übung (geschätztes 1RM, Epley) · T3 Volumen je Übung · T4 bestes Satzgewicht · T5 Wiederholungsverlauf je Satz · T6 Volumen je Muskelgruppe · T7 Dauer und Kalorien je Session · T8 persönliche Rekorde
- Ernährung: E1 Kalorien pro Tag gegen Ziel · E2 Makro-Verteilung heute · E3 Makro-Verlauf · E4 Kalorien je Mahlzeiten-Abschnitt · E5 Wochenschnitt · E6 Kalorienbilanz inkl. Trainingsverbrauch
- Körper: K1 Gewichtsverlauf mit geglätteter Trendlinie (exponentiell gewichteter Mittelwert — Tagesgewicht schwankt durch Wasser um 1–2 kg, ungeglättet liest man Rauschen als Fortschritt) · K2 Umfänge im Verlauf · K3 Änderungsrate kg/Woche · K4 Gewicht über Kalorien · K5 Fortschrittsfotos als Zeitleiste
- Home: H1 Aktivitätsraster aus `day_status` · H2 Wochen-Kurzform · H3 zwei Sparklines

**Die neuen Datenfelder sind umgesetzt** (Branch `feat-analysefelder`, Migration `0005_analysis_fields.sql`) — bewusst vor Phase 4, damit ab sofort Historie entsteht. Entschieden und gebaut:
- RIR-Skala **0–5** („wie viele hättest du noch geschafft", 0 = keine), nicht RPE — direkt beantwortbar ohne Umrechnen. Sechs Knöpfe im Live-Modus, nichts vorausgewählt, erneuter Tipp auf denselben Wert löscht ihn wieder.
- **Aufwärmsätze zählen nicht auf das Satzziel.** `satz_nummer` bleibt eine reine Reihenfolge-Nummer über alle Sätze; die Zählung „Satz 1 von 3" wird in der Oberfläche aus den Arbeitssätzen abgeleitet. Die Datenbank nummeriert nichts um.
- Nach einem gespeicherten Satz springt der Aufwärm-Schalter zurück auf „aus" — ein vergessener Schalter würde echte Sätze still als Aufwärmen ablegen, der teurere der beiden Fehler.
- Ballaststoffe, Zucker und **Salz (nicht Natrium)** aus Open Food Facts, dazu von Hand eingebbar in beiden Produktformularen.
- `koerperfettanteil` ist nur die Spalte; die Eingabe entsteht in Phase 4 mit dem Körperbereich.
- **Review-Nachlauf (Branch `fix-dezimalwerte`):** PR #24 wurde wieder vor der Review gemerged. Die Review danach fand drei Punkte, einer davon ein **Produktionsfehler seit Phase 1/2**: sämtliche `type="number"`-Felder hatten kein `step`, der Browser nimmt dann `step=1` und blockiert jeden Dezimalwert als `stepMismatch` — ohne `noValidate` bricht das den ganzen Submit ab, mit Browser-Tooltip statt unserer Meldung. Betroffen war nicht nur Salz (0,8 g), sondern auch **Größe und Gewicht im Profil** (82,5 kg) und die Menge beim Eintragen. Jetzt `step="any"` auf allen Feldern, die echt gebrochen sein dürfen; ohne `step` bleiben nur `Alter` und die Zielwerte im Plan-Editor (Sätze, Wiederholungen, Pause) — das sind die einzigen `integer`-Spalten unter den Zahlenfeldern. Dazu: die Fehlermeldung nannte nur „Makros", prüft aber inzwischen alle Gramm-Angaben; und die RIR-Korrektur in der Historie akzeptierte `2.6`, was Postgres als `smallint` still auf `3` gerundet hätte. Der Scoped Re-Review bestätigte alle drei Fixes ohne Regression und fand **denselben Rundungsfehler an vier Geschwisterfeldern** (Wiederholungen in der Satz-Korrektur sowie Sätze/Wiederholungen/Pause im Plan-Editor) — ebenfalls behoben. **Merke:** Die einzigen `integer`-Spalten hinter Zahlenfeldern sind `profiles.alter`, `workout_session_sets.wiederholungen`/`rir` und die drei Zielwerte; alles andere ist `numeric` und darf Nachkommastellen haben.
- Nebenbei aufgeräumt: die Spaltenliste für `products` stand an drei Stellen und wird jetzt aus `product-lookup.ts` geteilt; der Nährwert-Vergleich in der Produktbearbeitung läuft über die geparsten Schlüssel statt Feld für Feld, damit ein später ergänzter Nährwert nicht still aus der Prüfung fällt.

**Ursprüngliche Festlegung, alle vier vom Nutzer bestätigt** — gehören erfasst, *bevor* die abhängigen Graphen gebaut werden, sonst haben sie keine Historie:
- `workout_session_sets.rir` (Anstrengungsgrad je Satz, Feld im Live-Modus)
- `workout_session_sets.ist_aufwaermsatz` — **ohne diesen Schalter sind alle Volumen-Graphen systematisch zu hoch**, weil Aufwärmsätze mitzählen
- `body_metrics.koerperfettanteil`
- `products`: Ballaststoffe, Zucker, Salz, samt Übernahme aus Open Food Facts

## Phase 3 – Trainingsbereich (abgeschlossen)

- Spec: `docs/superpowers/specs/2026-08-21-phase3-trainingsbereich-design.md`
- Plan: `docs/superpowers/plans/2026-08-21-phase3-trainingsbereich-plan.md` (16 Tasks)
- PR #21 (`feat-phase3-trainingsbereich` → `master`) gemerged, Merge-Commit `7420145`. Alle 16 Tasks fertig, jeder Task ein Commit (`4961729`..`0098f65`), danach zwei Fix-Runden.
- Stand: **311/311 Tests grün**, Lint ohne Fehler und Warnungen, `tsc -b --noEmit` sauber, `npm run build` erfolgreich.

Umgesetzt: Übungsdatenbank importierbar (free-exercise-db, 873 Übungen, MET-Wert je Kategorie); Trainingspläne mit mehreren benannten Tagen (z. B. Push/Pull/Legs) samt Plan-Editor mit Umsortieren; automatische Tag-Rotation aus der zuletzt abgeschlossenen Session; Live-Trainingsmodus mit sofort gespeicherten Sätzen, Pausen-Timer über Zielzeitpunkt und automatischem Sprung zur nächsten Übung; Kalorienberechnung über die MET-Formel beim Abschließen; Trainingshistorie mit Detailansicht, nachträglicher Satz-Korrektur und Löschen. Routen: `/training`, `/training/plans`, `/training/plans/:planId`, `/training/exercises`, `/training/session/:sessionId`, `/training/history`, `/training/history/:sessionId`.

Migration `0004_training_days.sql`: legt `workout_plan_days` an, benennt `workout_plan_exercises` in `workout_plan_day_exercises` um (mit `workout_plan_day_id` statt `workout_plan_id`) und hängt `workout_sessions` ebenfalls an den Tag. Die Tabellen waren leer, deshalb keine Datenmigration — **vor dem Merge in Supabase gegenprüfen**, da die Migration bei Merge nach `master` automatisch auf Produktion läuft.

**Beim Umsetzen gefunden und abweichend vom Plan gelöst** (der Plan-Code hätte an mehreren Stellen nicht funktioniert):
- `upsert(..., { onConflict: 'name' })` im Import-Skript wäre gescheitert — `exercises.name` hat keinen Unique-Constraint. Stattdessen ersetzt das Skript den Import-Satz (erst `insert`, dann Löschen der alten Zeilen per ID in Chunks); ein Unique-Index auf `name` würde verhindern, dass zwei Nutzer dieselbe Übung anlegen.
- `import.meta.url === \`file://${process.argv[1]}\`` ist unter Windows immer falsch — `main()` wäre nie gelaufen.
- Rotation: die Abfrage nach der letzten Session filterte nicht auf beendete Sessions; Postgres sortiert `null` bei `desc` zuerst, eine abgebrochene Session hätte die Rotation dauerhaft verstellt. Jetzt `.not('beendet_am', 'is', null)`.
- Drei Seiten schrieben Zahlenfelder pro Tastendruck in die DB (Plan-Editor, Satz-Korrektur) — jetzt Draft mit Commit auf `blur`, wie im `CalorieGoalEditor`.
- Alle neuen Hooks haben den `requestId`-Guard (Out-of-order-Reloads, State nach Unmount), im Plan-Code fehlte er durchgängig.
- Fehlgeschlagene Writes wurden auf allen Seiten stumm geschluckt (unbehandelte Rejections) — jetzt überall sichtbare Meldung; ein fehlgeschlagener Satz startet keine Pause, ein fehlgeschlagenes Löschen navigiert nicht weg.
- Der Test-Helper des Plans (`async function PageUnderTest`) ist in React 19 nicht renderbar (3×), die Timer-Tests hingen unter eingefrorenen Fake-Timern, und der `PauseTimer` verstieß mit `Date.now()` im Render und Ref-Zuweisung im Render gegen zwei Lint-Regeln.

**Erledigt nach dem Merge:** Wiki synchronisiert (`Domain-Model`, `Phase-3-Design-Spec`, `Phase-3-Implementation-Plan`, `Home`, `_Sidebar` — gepusht, Commit `9c69ef3`), Branch `feat-phase3-trainingsbereich` lokal und remote entfernt.

**Übungsimport erledigt:** 873 Zeilen in `exercises`, alle mit gesetztem `met_wert`, `created_by = null`. Erneuter Import (falls der Datensatz je aktualisiert wird) über `npm run import-exercises` mit `SUPABASE_SERVICE_ROLE_KEY` und `VITE_SUPABASE_URL` in der Umgebung — der Key gehört **nicht** in den Chat, bewährt hat sich eine gitignorierte Datei (`.env.import.local`, greift über das `*.local`-Muster) plus `node --env-file=.env.import.local scripts/import-exercises.ts`, danach löschen.

**Migration `0004` ist auf Produktion angewendet** (automatisch beim Merge): `workout_plan_days` existiert, `workout_plan_exercises` ist weg (umbenannt), `workout_plan_day_exercises.workout_plan_day_id` vorhanden, `workout_sessions.workout_plan_day_id` vorhanden, Funktion `activate_workout_plan` vorhanden.

**Manual-Verification abgeschlossen, 9 von 9 Schritten grün** (Dev-Server gegen die Produktions-Supabase, per Browser durchgeklickt): Plan anlegen → zwei Tage → Übungen aus der importierten Bibliothek zuordnen → Zielwerte setzen (nach vollem Reload persistent) → aktivieren („aktiv"-Marker, läuft über `activate_workout_plan`) → `/training` schlägt Tag 1 vor → Session mit zwei Sätzen, Pausen-Timer zählt herunter, nach Ablauf automatischer Sprung → abschließen mit rechnerisch exakten 9 kcal (MET 5 × 135 kg × ~48 s) → Rotation springt auf Tag 2 → Historie zeigt Plan/Tag/Datum/kcal, Sätze mit Dezimalgewicht korrekt, Korrektur nach Reload persistent → Session löschen, Rotation fällt auf Tag 1 zurück → Gewicht im Profil geleert: „—" und deaktivierter Abschluss-Button. Konsole ohne Fehler und Warnungen. Testdaten (Plan und beide Sessions) danach wieder gelöscht.

**Dabei bestätigt, dass die Fixes aus den Review-Runden im echten Betrieb greifen:** Zielwerte schreiben erst beim Verlassen des Feldes, „nicht beendet" statt „0 kcal" bei unbeendeter Session, vollständige Übungsliste durch die Paginierung (letzter Eintrag alphabetisch vorhanden), Aktivierung als ein Statement.

**Kosmetische Funde aus der Verifikation (behoben; PR #22 gemerged, Merge-Commit `ba95507`; Review-Fixes in PR #23 offen):**
- Nach dem letzten Zielsatz zeigt das Formular jetzt „Alle Sätze erfasst" statt „Satz 3 von 2"; weitere Sätze bleiben erfassbar (`SetForm` in `src/pages/WorkoutSessionPage.tsx`, ein Test dazu).
- Basis-Layout in `src/index.css` ergänzt. Die App hat nirgends `className`, deshalb rein elementbasiert: Buttons, Eingaben und Links mindestens 44 px hoch, alleinstehende Links als eigene Zeile über die volle Breite, Listen ohne Bullets mit Trennlinie und Abstand, Bottom-Nav als sticky Leiste, `main` mit Innenabstand. Wirkt app-weit, nicht nur im Trainingsbereich. **Optisch noch nicht im Browser gegengeprüft.**
- Review fand fünf Findings, keine blockierende Korrektheitslücke (Commit `b637b1c`): 44 px Mindest**breite** für Links (das Profil-Emoji im Header war nur ~36 px breit), `env(safe-area-inset-bottom)` auf der Bottom-Nav (Home-Indicator verdeckte das untere Drittel der Tabs), `ziel_saetze = 0` ist erlaubt und hätte „Alle Sätze erfasst" vor dem ersten Satz gezeigt, `role="list"` auf allen neun `<ul>` (Safari nimmt einer Liste ohne Marker die Listensemantik), Zeilen-Selektor unabhängig von der Verschachtelung.
- Scoped Re-Review fand **zwei Nachzügler in den Fixes** (Commit `4fecea8`): die Null-Ziel-Prüfung gab es an zwei Stellen, `pauseOver` hatte den Guard nicht und wäre bei `ziel_saetze = 0` nach dem ersten Satz sofort weitergesprungen — jetzt ein `targetReached()` für beide; und `main a:not(li a)` war zu weit gefasst und hat den Link im Satz „Für ein Tagesziel Profil vervollständigen." umbrochen — Absatz-Links jetzt ausgenommen.
- **Achtung:** PR #22 wurde gemerged, während der Review noch lief — auf `master` liegt der Stand vor den Review-Fixes. Die drei Commits aus Review und Re-Review (`b637b1c`, `4fecea8`, `3c9cb52`) hängen am selben Branch `fix-training-layout` und liegen als **PR #23** vor. Erst nach dessen Merge ist der Bereich vollständig.
- Stand danach: 313/313 Tests grün, Lint sauber, Build erfolgreich.

**Merke für die Bedienung:** Die Profilseite speichert über den „Speichern"-Button, **nicht** bei `blur` — anders als die Zielwert- und Satzfelder im Trainingsbereich.

**Whole-Branch-Review und zwei Fix-Runden abgeschlossen** (Commits `799bc23`, `1e212d0`, `59c7449`): 12 Findings aus der Review behoben, danach hat der Scoped Re-Review **zwei High-Regressionen in den Fixes selbst** gefunden — beide behoben:
- Das Wiederaufnehmen einer offenen Session hatte keine Zeitgrenze und hebelte die Dauer-Korrektur wieder aus (Session von Montag am Freitag fortgesetzt → ~96 h, ~38 000 kcal). Jetzt 6-Stunden-Fenster.
- Das Löschen des alten Import-Satzes per ID-Liste hätte ~32 KB Query-String erzeugt (Gateway lehnt ab) — da der Insert vorher committet, wäre die Bibliothek dauerhaft **verdoppelt** worden. Jetzt 100er-Chunks, das ID-Lesen zusätzlich paginiert.

Ebenfalls erledigt: `on delete set null` auf `workout_sessions.workout_plan_day_id`, Unique-Index `(workout_plan_day_id, exercise_id)`, `activate_workout_plan()` als Postgres-Funktion (ein Statement statt zwei Writes), Paginierung mit Fehlerzustand in `useExercises`, kompensierende Writes mit eigener Fehlermeldung, ISO-Zeitstempel als geparste Instants statt als Strings.

**Bewusst offen gelassen (keine Fehler, sondern Entscheidungen):**
- Kein Rückfragen-Dialog vor dem Löschen von Plan oder Session.
- Bundle bei 968 kB (264 kB gzip), über Vites Warnschwelle — Code-Splitting gehört in Phase 5.
- Die Dauer einer Session läuft bis zum letzten Satz; eine Session ohne jeden Satz schreibt `0` statt `null` und erscheint in der Historie als „0 kcal" statt „nicht beendet".
- Übungen werden beim Wiederaufnehmen einer Session nur innerhalb von 6 Stunden fortgesetzt (`RESUME_WINDOW_HOURS` in `src/hooks/use-workout-session.ts`); danach beginnt eine neue Session, die alte bleibt als „nicht beendet" in der Historie stehen.

**Nach der Manual-Verification:** Phase 4 (Körperbereich & Health-Integration) — Spec und Plan dafür noch zu erstellen (`superpowers:brainstorming` → `superpowers:writing-plans`).

## UI-Struktur (gilt ab Phase 3)

Die vier Dashboards zeigen **nur das Wichtigste**. Detaillisten — Produkte, Übungen, Verlauf — gehören auf eigene Unterseiten je Bereich, nicht aufs Dashboard. Neue Bereiche von Anfang an so planen, statt später aufzubrechen.

Nachzuholen: `NutritionPage` zeigt aktuell Tagesübersicht, Ziel-Editor, Eintragsliste und Hinzufügen-Flow auf einer Seite; die Produkt-/Eintragsliste gehört auf eine eigene Seite.

## Phase 1 – Grundgerüst & Security-Basis (abgeschlossen)

- Spec: `docs/superpowers/specs/2026-08-18-phase1-grundgeruest-design.md`
- Plan: `docs/superpowers/plans/2026-08-18-phase1-grundgeruest-plan.md`
- PR #7 (`worktree-phase-1-grundgeruest` → `master`) gemerged, Merge-Commit `5cd0f69`. Feature-Branch lokal und remote gelöscht, Worktree entfernt.
- GitHub-Remote: `git@github.com:SueleymanOezel/fitness-app.git`, Default-Branch `master`, **gepusht**.
- Supabase-Projekt: `https://zqliubzvzbnaogqcmypg.supabase.co`, mit GitHub-Repo verbunden, "Deploy to production"-Toggle **aktiviert**, Production-Branch = `master` — DB-Migration wird ab jetzt bei Merge nach `master` automatisch angewendet.

**Task-Status (Plan hat 9 Tasks):**
- [x] Task 1: Projekt-Scaffold & Test-Tooling — fertig, Review approved (Commit `74a0257`)
- [x] Task 2: Supabase-Client mit Env-Validierung — fertig, Review approved (Commit `9dc9ac2`)
- [x] Task 3: useSession-Hook — fertig, Review approved (Commit `0c35565`)
- [x] Task 4: ProtectedRoute-Komponente — fertig, Review approved nach 1 Fix-Runde (Commit `23c6d2d`; behebt Root-Cause-Bug in Task 1's Test-Setup: globales `afterEach(cleanup)` in `src/test-setup.ts` fehlte, wichtig für Task 5/6)
- [x] Task 5: LoginPage — fertig, Review approved (Commit `b103a23`)
- [x] Task 6: Platzhalter-Dashboards, Navigation, Routing — fertig, Review approved (Commit `249ba6e`)
- [x] Task 7: Datenbank-Migration (Basisschema + RLS) — fertig, Review approved (Commit `c01c4b8`; Security-Review hat 3 konkrete Angriffsszenarien gegen die RLS-Policies durchgespielt, alle korrekt blockiert)
- [x] Task 8: CI/CD-Pipeline (Semgrep, npm audit, ZAP) + Dependabot — fertig, Review approved (Commit `7bfb16f`)
- [x] Task 9: Finale lokale Verifikation — fertig, Review approved (Commit `cefcef2`; build/lint/test alle grün, 20/20 Tests)

**Finale Whole-Branch-Review:** abgeschlossen (Verdict: "ready to merge with fixes"). Security-Kern bestätigt solide (kein service_role/Secrets im Code, RLS fail-closed auf allen 12 Tabellen, kein Push passiert, Build/Lint/Typecheck grün). 6 Important- und 9 ausgewählte Minor-Findings in EINER gebündelten Fix-Runde behoben (Commits `ec843ef`..`9b2a4c7`): Routing-Remount-Bug (geteilte Layout-Route mit `Outlet`), Signup-Dead-End bei aktivierter E-Mail-Bestätigung, CI-Trigger/Push-Flow-Mismatch (Manual-Verification-Schritt in der Plan-Datei jetzt auf PR-Flow statt Direct-Push-auf-main umgestellt), veraltete Semgrep-Action ersetzt, RLS-Policies gehärtet (Indizes, unique-Constraints, `auth.role()` durch `to authenticated` ersetzt), u.a.
Scoped Re-Review: alle 15 Findings ADDRESSED, keine neue Critical/Important-Regression. Aktueller Test-Stand: 23/23 Tests grün. Ein Minor-Finding geparkt (LoginPage-Login-Zweig zeigt bei einer theoretischen MFA-Response ohne Session keine Fehlermeldung — in der aktuellen reinen E-Mail/Passwort-Flow unerreichbar, nur relevant falls später MFA dazukommt).

**Phase 1 ist vollständig abgeschlossen**, inklusive Manual-Verification (Signup mit E-Mail-Bestätigung, Login, alle vier Dashboard-Tabs, Logout, `profiles`-Zeile via `handle_new_user`-Trigger — alles bestätigt funktionsfähig gegen die echte Produktions-Supabase-Instanz).

## Phase 2 – Ernährungsbereich (abgeschlossen)

- Spec: `docs/superpowers/specs/2026-08-18-phase2-ernaehrungsbereich-design.md`
- Plan: `docs/superpowers/plans/2026-08-18-phase2-ernaehrungsbereich-plan.md` (14 Tasks)
- Umgesetzt per Subagent-Driven-Development in isoliertem Worktree; PR #8 gemerged (Merge-Commit `2adc284`), Worktree und Branch danach entfernt, SDD-Workspace gelöscht.
- Neue Dependency: `@zxing/browser` (Kamera-Barcode-Scan)

**Task-Status (14 von 14 Tasks fertig, alle reviewed):**
- [x] Task 1: Migration `0002` (Kalorienziel-Felder + Barcode-Unique-Index) — Commit `55b7387`
- [x] Task 2: `lib/nutrition-goal.ts` (Mifflin-St-Jeor-Berechnung) — Commit `8f16c8f`
- [x] Task 3: `lib/open-food-facts.ts` (Barcode-Lookup) — Commit `61b0ce7` (1 Minor geparkt)
- [x] Task 4: `lib/product-lookup.ts` (lokaler Cache + OFF-Fallback) — Commit `6b23c06`
- [x] Task 5: `hooks/use-profile.ts` — Commit `21521d7`
- [x] Task 6: `hooks/use-food-entries.ts` — Commits `21521d7..4d95a20` (2 Fix-Runden: echter `react-hooks/set-state-in-effect`-Lint-Fehler behoben, echter UTC-vs-lokal-Tag-Grenze-Bug in `todayRange()` gefunden und behoben)
- [x] Task 7: `components/CalorieGoalEditor.tsx` — Commit `5143d4d`
- [x] Task 8: `components/DailySummary.tsx` — Commit `a312bdf`
- [x] Task 9: `components/FoodEntryList.tsx` — Commit `d7566db`
- [x] Task 10: `components/ManualProductForm.tsx` — Commit `ddef760`
- [x] Task 11: `components/BarcodeScanner.tsx` (+ `@zxing/browser`) — Commits `ddef760..c0c7eb4` (2 Fix-Runden: Vitest-Mock-Inkompatibilität sauber im Test statt mit Production-Workaround gelöst, unnötige Typ-Abweichung zurückgenommen)
- [x] Task 12: `components/AddEntryFlow.tsx` — Commits `c0c7eb4..ffde50a` (1 Fix-Runde: echter Dead-End-Bug behoben — `looking-up`-Status blieb bei Netzwerkfehler beim Barcode-Lookup hängen, kein Cancel möglich)
- [x] Task 13: `pages/NutritionPage.tsx` (Dashboard zusammengesetzt) — Commit `3df68f3`, alle 8 Cross-Task-Interfaces vom Reviewer unabhängig verifiziert
- [x] Task 14: Finale lokale Verifikation — fertig. `npm test` 76/76 grün (19 Dateien), `npm run lint` ohne Fehler, `npm run build` (tsc -b + vite build) erfolgreich. `docs/domaenenmodell.md` um die fünf neuen `profiles`-Spalten und den `products_barcode_unique`-Index ergänzt, Quellenzeile auf Stand Phase 2 gesetzt, nach `../fitness-app.wiki/Domain-Model.md` gespiegelt (Wiki noch **nicht** committet/gepusht).

**Finale Whole-Branch-Review:** abgeschlossen. Verdict zunächst "not ready" wegen **eines Critical**: `product-lookup.ts` setzte beim Cachen eines Open-Food-Facts-Treffers kein `created_by`, und die einzige INSERT-Policy auf `products` ist `created_by = auth.uid()` — jeder Scan eines noch nicht gecachten Produkts wäre von RLS abgelehnt worden und hätte den Nutzer ins manuelle Formular geworfen, obwohl die Nährwerte gerade abgerufen waren. Alle 76 Tests waren grün, weil die Mocks jeden Insert gelingen ließen. Dazu 8 Important (Barcode ungeprüft in die OFF-URL — der Scanner dekodiert auch QR-Codes; OFF-Nährwerte ungeprüft; Menge- und Kalorienziel-Feld schrieben pro Tastendruck in die DB, `Number('')` = 0 → Datenverlust; Kamera-Leak beim Unmount vor dem Start-Promise; ewiges "Lädt…" bei fehlender `profiles`-Zeile; fehlende Plausibilitätsprüfung vor dem Insert in die geteilte `products`-Tabelle) und 10 Minor.
Als solide bestätigt: keine Secrets, kein Logging, keine Drittanbieter-Namen, kein XSS/SQLi, Migration 0002 fail-closed, Mifflin-St-Jeor korrekt, Cross-File-Typen konsistent.

- Fix-Runde 1 (Commit `cd09414`): alle 15 Findings behoben, 10 neue Tests genau für die Pfade, die die Lücken verdeckt hatten.
- Scoped Re-Review: **15/15 ADDRESSED**, keine Regression durch die Fixes (Draft-States und requestId-Guards explizit gegengeprüft, `maybeSingle()`-Semantik gegen die installierte postgrest-Version verifiziert). Zwei Important-Residuen gefunden.
- Fix-Runde 2 (Commit `afb0d06`): beide Residuen behoben — supabase-js *resolved* statt zu werfen, dadurch wurden alle Schreibfehler stumm geschluckt (`AddEntryFlow`s Fehlerzweig war toter Code, ein fehlgeschlagenes Menge-Update ließ den getippten Wert stehen); Profil-Updates sind jetzt serialisiert (Blur + Klick auf "Berechnen lassen" feuerten zwei ungeordnete PATCHes).

**Stand:** 94/94 Tests grün, Lint ohne Fehler und ohne Warnungen, Build sauber.

**Offener Follow-up (bewusst nicht in Phase 2 gelöst):** Cache-Zeilen aus dem Barcode-Scan tragen jetzt den `created_by` des ersten Scanners. Zusammen mit `products_update_own` (aus Phase 1, ohne `with check`) heißt das: wer einen Barcode zuerst scannt, kann die Nährwerte dieses geteilten Produkts danach für alle ändern. Für Phase 5 (Härtung) vormerken — Policy-Design, kein Bugfix.

**Abgeschlossen nach dem Merge:** Wiki synchronisiert (`Domain-Model`, `Phase-2-Design-Spec`, `Phase-2-Implementation-Plan`, `Home`, `_Sidebar` — gepusht), Worktree/Branches entfernt, SDD-Workspace gelöscht.

**Manual-Verification abgeschlossen** (gegen die echte Produktionsinstanz): Kalorienziel berechnet sich korrekt aus dem Profil; Barcode-Lookup legt Produkt und Eintrag an; zweiter Lookup derselben Nummer kommt aus dem lokalen Cache; unbekannte Nummer führt ins manuelle Formular; implausible Werte (`-300` kcal) werden abgelehnt, ohne zu schreiben; Menge ändern und Eintrag löschen funktionieren; Summen stimmen (`kcal × Menge / 100`).

**Damit ist Phase 2 vollständig abgeschlossen.**

Dabei gefunden und in PR #11 behoben:
- Kamera-Vorschau blieb schwarz — StrictMode führt den Effect zweimal auf derselben Instanz aus, und zxing bindet jeden Reader an dasselbe `<video>`; die erste Session löste auf, nachdem die zweite das Element übernommen hatte, und riss es mit ihrem `stop()` ab. Sessions sind jetzt verkettet.
- Barcode-Nummer lässt sich eintippen (gleicher Lookup-Pfad wie der Scan) — genau damit wurde Phase 2 dann verifiziert.

**Kamera-Scan am Handy verifiziert:** Scan erkennt den Barcode und findet das Produkt. Auf Laptop-Webcams bleibt er unzuverlässig (Fixfokus, zu wenig Pixel für einen EAN-13 → `ChecksumException`) — Optik-, kein Code-Problem. `TRY_HARDER` **nicht** aktivieren: es lässt die 1D-Reader jeden Frame rotiert erneut lesen und wirft dabei in `@zxing/browser` 0.2.1 „Could not create a Canvas element.", was jeden Frame vor dem Dekodieren killt.

## Dev-Server am Handy testen

`npm run dev:mobile` — HTTPS mit selbstsigniertem Zertifikat, gebunden an `0.0.0.0` (nicht `host: true`, das bindet nur auf `::` und ist per IPv4 nicht erreichbar). `npm run dev` bleibt http auf localhost.

Voraussetzungen und typische Stolpersteine, alle real aufgetreten:
- **Nur einen Dev-Server gleichzeitig starten.** Zwei Vite-Instanzen teilen sich `node_modules/.vite`, die zweite optimiert die Dependencies neu und entwertet die gehashten URLs der ersten → im Browser MIME-Fehler („expected JavaScript, got text/html").
- **Firewall:** einmalig als Admin `New-NetFirewallRule -DisplayName "Vite dev 5173 (LAN)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private -RemoteAddress LocalSubnet`, und das WLAN-Profil muss `Private` sein.
- **VPN aus.** Das Uni-VPN pusht eine Route für `192.168.2.0/24` über sein eigenes Gateway mit Top-Metrik — Antwortpakete ans Handy verschwinden dann im VPN-Netz (Timeout). Die Adresskollision besteht, weil Uni- und Heimnetz denselben privaten Bereich nutzen.
- **Aktive Adresse prüfen:** `Get-NetIPAddress` — eine `Deprecated`-Adresse gehört zu einem getrennten Adapter und ist tot. PC am Kabel und Handy im WLAN ist kein Problem, solange beide im selben Subnetz hängen.
- Im Browser die URL mit `https://` eintippen; ohne Schema versucht er http, worauf der Mobile-Server nicht antwortet.

## CI-Pipeline — war seit Phase 1 wirkungslos (behoben)

Der Workflow filterte auf `pull_request: branches: [main]`, der Default-Branch ist aber `master`. Er hat deshalb **nie** ausgelöst — weder bei PR #7 (Phase 1) noch bei PR #8 (Phase 2). Semgrep, npm audit, ZAP und die Testsuite waren tote Konfiguration; beide Phasen sind ohne CI-Nachweis auf `master` gelandet, Migration `0002` wurde ungeprüft auf Produktion angewendet. Behoben mit PR #9 (Merge-Commit `b2fdef7`).

Der erste echte Lauf deckte sofort drei Dinge auf, die lokal unsichtbar waren:
- Semgrep: alle Actions hingen an veränderlichen Tags (`@v4`) → jetzt auf 40-stellige Commit-SHAs gepinnt (Version im Trailing-Kommentar, Dependabot aktualisiert die SHAs weiterhin).
- ZAP: Scan war sauber (`FAIL-NEW: 0, PASS: 60`), der Job scheiterte am Artefakt-Upload — `action-baseline@v0.12.0` nutzt die abgeschaltete Artifact-API v3 → auf v0.15.0 gehoben.
- Zwei Test-Schwächen: eine synchrone Assertion auf State, der außerhalb von `act()` gesetzt wird (bestand lokal, fiel in CI um), und zwei Mocks ohne Promise, an denen `.catch()` warf (vitest meldete die Tests als bestanden und ließ den Run trotzdem durchfallen).

**Merke:** `.claude/` ist git-ignored, aber vitest globbt Worktree-Kopien trotzdem mit — nach dem Mergen einer Phase den Worktree entfernen, sonst laufen doppelte, veraltete Testdateien mit.
