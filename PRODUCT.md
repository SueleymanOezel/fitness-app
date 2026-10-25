# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primär der Entwickler/Eigentümer selbst als täglicher Nutzer; die App wird so gebaut, dass ein späterer öffentlicher Start möglich bleibt (Registrierung, Onboarding und Leerzustände müssen dann für Fremde funktionieren). Deutschsprachige Nutzer, die Krafttraining, Ernährung und Körperwerte gemeinsam verfolgen wollen.

## Product Purpose

VitaLoop ist eine mobile-first Progressive Web App, die Training, Ernährung und Körper-Tracking in einer App verbindet. Installierbar per Browser-Link auf iOS, Android und Windows, ohne App-Store. Erfolg heißt: Die tägliche Erfassung ist in wenigen Taps erledigt, und die Verbindung der drei Bereiche liefert Erkenntnisse, die getrennte Apps nicht liefern.

## Positioning

Beides zugleich: (1) Training, Ernährung und Körper sind verbunden statt in drei getrennten Apps — z. B. fließen Trainingskalorien (MET-basiert) und Körpergewicht in Tagesziel und Verbrauch ein; (2) schnell und ohne Ballast — keine Werbung, kein Abo, kein Social-Feed, kurze Klickwege.

## Operating Context

Vier reale Nutzungsszenen, alle auf dem Handy:
- **Im Gym während des Trainings:** Sätze zwischen den Sätzen loggen, oft einhändig, kurze Blicke, Pausen-Timer läuft.
- **Beim/nach dem Essen:** Mahlzeit schnell eintragen (Barcode-Scan über Open Food Facts oder manuell), Tagesstand prüfen.
- **Morgens:** Gewicht und Umfänge eintragen, Fortschritt ansehen; optional Fortschrittsfotos.
- **Abends/Wochenrückblick:** in Ruhe Analyse-Graphen über alle Bereiche ansehen.

## Capabilities and Constraints

- Bereiche: Home-Dashboard, Training (Pläne, Plan-Assistent, Live-Session mit Pausen-Timer, Historie, Übungskatalog mit ~873 Übungen aus free-exercise-db, eigene Übungen), Ernährung (Mahlzeiten-Abschnitte, Barcode-Scan, manuelle Produkte, Kalorienziel), Körper (Messwerte, Fortschrittsfotos), Analyse je Bereich, Profil.
- Stack: React + Vite + TypeScript, Tailwind 4, Supabase (Postgres, Auth, Row-Level-Security, Storage), Firebase Hosting (`vitaloop.web.app`). GSAP nur lazy geladen.
- Performance/Bundle-Größe ist eine explizit gewählte Priorität.
- Sicherheit: OWASP Top 10 (2025), RLS auf allen Tabellen, keine Secrets im Code.
- Begriffe: Satz, Wiederholungen (Wdh.), RIR (Wiederholungen in Reserve), Aufwärmsatz, 1RM (geschätzt nach Epley), Mahlzeiten-Abschnitt, Ziel-Delta.
- Offen/nicht gebaut: Foto-Analyse von Mahlzeiten (Gemini, spätere Phase), Health-Sync über Apple Shortcuts. Installierbar als PWA (Manifest + eigener Service Worker, offline lesbar); Offline-Schreiben ist nicht gebaut.

## Brand Commitments

- Name „VitaLoop“ und Logo sind fix.
- Bestehende Lila-/Türkis-Akzentfarben und dunkles Grundthema sind fix.
- Eigenes Icon-/Symbol-System (`vitaloop-symbol-system/`, duotone Lila/Türkis) ist verbindlich.
- Sprache Deutsch, Du-Form, informell.
- Keine Namen von Drittanbieter-/Konkurrenz-Apps in UI, Doku, Code oder Wiki.

## Evidence on Hand

Keine Testimonials, Nutzerzahlen oder Benchmarks — dürfen nicht erfunden werden. Vorhanden: Übungsbilder aus free-exercise-db (Public Domain), Produktdaten von Open Food Facts, App-Logo (`Logo.png` im Projektordner), Icon-System.

## Product Principles

1. **Erfassen in Sekunden:** Jede tägliche Erfassung (Satz, Mahlzeit, Gewicht) ist mit wenigen Taps und einhändig erledigt.
2. **Verbunden statt getrennt:** Bereiche sprechen miteinander; Daten aus einem Bereich wirken sichtbar im anderen.
3. **Ohne Ballast:** keine Werbung, kein Abo, kein Social-Kram, keine überflüssigen Seitenwechsel — Pop-ups statt Navigation für leichte Aktionen.
4. **Ehrliche Daten:** Werte werden nie still verworfen oder erfunden; Unsicherheit (z. B. geschätztes 1RM) wird benannt.
5. **Bereit für Fremde:** Leerzustände, Fehler und Onboarding funktionieren so, dass ein neuer Nutzer ohne Erklärung zurechtkommt.

## Accessibility & Inclusion

WCAG 2.2 AA als Ziel (Kontrast-Tokens sind darauf abgestimmt), Touch-Ziele mindestens 44 px, `prefers-reduced-motion` wird für jede Animation respektiert.
