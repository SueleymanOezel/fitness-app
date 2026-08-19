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
5. Härtung & Feinschliff (vollständiger OWASP-Durchlauf, Penetration-Tests, PWA-Feinschliff)

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

**Aktueller Stand:** Phase 1 und Phase 2 sind gemerged, deployed und manuell verifiziert. Nächster Schritt: Phase 3 (Trainingsbereich) — Spec/Plan dafür noch zu erstellen (`superpowers:brainstorming` → `superpowers:writing-plans`). Vorher bzw. dabei zu berücksichtigen: der Ernährungsbereich soll in Dashboard + eigene Unterseiten aufgeteilt werden (siehe „UI-Struktur" unten).

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

**Bekannte Einschränkung:** Der Kamera-Scan liest auf Laptop-Webcams unzuverlässig (Fixfokus, zu wenig Pixel für einen EAN-13 → `ChecksumException`). Optik-, kein Code-Problem; ein belastbarer Test braucht die Handykamera mit Autofokus und dafür HTTPS im Dev-Setup. `TRY_HARDER` **nicht** wieder aktivieren — es lässt die 1D-Reader jeden Frame rotiert erneut lesen und wirft dabei in `@zxing/browser` 0.2.1 „Could not create a Canvas element.", was jeden Frame vor dem Dekodieren killt.

## CI-Pipeline — war seit Phase 1 wirkungslos (behoben)

Der Workflow filterte auf `pull_request: branches: [main]`, der Default-Branch ist aber `master`. Er hat deshalb **nie** ausgelöst — weder bei PR #7 (Phase 1) noch bei PR #8 (Phase 2). Semgrep, npm audit, ZAP und die Testsuite waren tote Konfiguration; beide Phasen sind ohne CI-Nachweis auf `master` gelandet, Migration `0002` wurde ungeprüft auf Produktion angewendet. Behoben mit PR #9 (Merge-Commit `b2fdef7`).

Der erste echte Lauf deckte sofort drei Dinge auf, die lokal unsichtbar waren:
- Semgrep: alle Actions hingen an veränderlichen Tags (`@v4`) → jetzt auf 40-stellige Commit-SHAs gepinnt (Version im Trailing-Kommentar, Dependabot aktualisiert die SHAs weiterhin).
- ZAP: Scan war sauber (`FAIL-NEW: 0, PASS: 60`), der Job scheiterte am Artefakt-Upload — `action-baseline@v0.12.0` nutzt die abgeschaltete Artifact-API v3 → auf v0.15.0 gehoben.
- Zwei Test-Schwächen: eine synchrone Assertion auf State, der außerhalb von `act()` gesetzt wird (bestand lokal, fiel in CI um), und zwei Mocks ohne Promise, an denen `.catch()` warf (vitest meldete die Tests als bestanden und ließ den Run trotzdem durchfallen).

**Merke:** `.claude/` ist git-ignored, aber vitest globbt Worktree-Kopien trotzdem mit — nach dem Mergen einer Phase den Worktree entfernen, sonst laufen doppelte, veraltete Testdateien mit.
