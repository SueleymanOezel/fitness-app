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

**Aktuelle Phase:** Phase 1 – Grundgerüst & Security-Basis — **gemerged und deployed, offen ist nur noch die Manual-Verification-Checkliste**

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

## Phase 2 – Ernährungsbereich (in Arbeit)

- Spec: `docs/superpowers/specs/2026-08-18-phase2-ernaehrungsbereich-design.md`
- Plan: `docs/superpowers/plans/2026-08-18-phase2-ernaehrungsbereich-plan.md` (14 Tasks)
- Umsetzung läuft per Subagent-Driven-Development in isoliertem Worktree: `.claude/worktrees/phase-2-ernaehrungsbereich`, Branch `worktree-phase-2-ernaehrungsbereich`
- Ledger/Fortschritt der Task-Ausführung: `.superpowers/sdd/2026-08-18-phase2-ernaehrungsbereich-plan/progress.md` (nur im Worktree, git-ignored — enthält alle Rulings/Fix-Runden im Detail)
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

**Nächste Schritte (noch offen):**
1. Finale Whole-Branch-Review (stärkstes Modell) über den gesamten Phase-2-Diff, Findings ggf. in EINER gebündelten Fix-Runde beheben
2. SDD-Workspace löschen (`.superpowers/sdd/2026-08-18-phase2-ernaehrungsbereich-plan`)
3. `superpowers:finishing-a-development-branch` aufrufen — Push/PR-Entscheidung analog Phase 1 (nicht direkt auf `master` pushen, Branch pushen + PR öffnen, CI abwarten, mergen)
4. Nach Merge: Wiki (`fitness-app.wiki`) und `docs/domaenenmodell.md` final synchron halten (siehe Memory `project-wiki-and-domain-model`)
5. Manual-Verification-Checkliste aus der Plan-Datei mit dem Nutzer durchgehen (echte Kamera, echter Barcode, echte Supabase-Instanz)
