# Projekt: Fitness- und Ernährungs-App (PWA)

## Kurzbeschreibung

Progressive Web App, die Training und Ernährung kombiniert, angelehnt an MyFitnessPal (Ernährung) und Alpha Progression (Training). Installierbar über Browser-Link auf iOS, Android und Windows, kein App-Store nötig. Vollständige Details siehe docs/architektur.md im selben Verzeichnis.

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
