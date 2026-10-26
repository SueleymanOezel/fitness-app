---
target: Re-Audit Live-App vitaloop.web.app 390 px
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-25T23-26-52Z
slug: vitaloop-web-app
---
# Re-Audit VitaLoop (Live-App, 390 px, 26.10.2026)

Method: dual-agent (A: Design-Review-Agent · B: Detektor-Agent)

## Design Health Score: 29/40 (Good), vorher 27

| # | Heuristik | Score | Kernbefund / was für 4 fehlt |
|---|---|---|---|
| 1 | Systemstatus | 3 | document.title überall „VitaLoop“; Fokus bleibt nach Nav-Wechsel auf dem Nav-Link |
| 2 | Sprache | 3 | „Session löschen“, „Dashboard anpassen“, „Ziel-Delta“, „Volumen“ unerklärt; Ziel-Aufklapper Training „im Schnitt“ vs. „heute“ |
| 3 | Kontrolle | 3 | Kein Undo; X im ersten Schritt des Eintrags-Dialogs außerhalb des Viewports |
| 4 | Konsistenz | 3 | Verlauf 3 Namen, Löschen 4 Namen, Badge „aktiv“ = Button „Aktivieren“, Dialog-X unter der Karte (Dialog.tsx:122) |
| 5 | Fehlervermeidung | 3 | Abschluss-Dialog nennt offene Übungen nicht; Plan-Editor speichert unsichtbar per onBlur (TrainingPlanEditPage.tsx:327) |
| 6 | Wiedererkennen | 3 | Übungssuche ohne Placeholder; Tag-Pfeil ohne sichtbaren Bezug |
| 7 | Effizienz | 3 | Mahlzeit kopieren/Favoriten, „Satz wie vorher“ fehlen |
| 8 | Ästhetik | 3 | gleich gewichtete graue Karten, Versalien-H1 vs. Hauptzahl, Plan-Editor 2000 px |
| 9 | Fehlerbehebung | 3 | Fokus nach Login-Fehler am Button; Ladefehler ohne Ursache |
| 10 | Hilfe | 2 | kein Onboarding, kein Hilfe-Einstieg, Kennzahlen unerklärt |

## Design-Specificity-Verdict
Kern spezifisch (Live-Session, 3-Tap-Essensdialog, „So entsteht dein Ziel“), Hülle austauschbar: Bereichsfarben fast nur in der Nav, „verbunden statt getrennt“ im zugeklappten Aufklapper.
Detektor: CLI 1 Fund broken-image BodyPhotosPage.tsx:82 (Fehlalarm, dynamisches src mehrzeilig). Browser 6 Seiten (/, /training/session/s4, /nutrition + Dialog, /body, /training/analyse, /profile): 0 Funde.

## Stärken
1. Live-Session als Gym-Werkzeug (fester „Satz abschließen“, Stepper 44 px, Vorbelegung, Pause +30 s, Vibration).
2. Essen in 3 Taps.
3. Ehrliche Leerzustände, Graph-Textalternativen, aria-current, role=timer, Login aria-invalid.

## Priority Issues
- [P1] Kein Seitentitel je Route + kein Fokus nach Nav-Wechsel → AppLayout: Titel + H1-Fokus. /impeccable harden
- [P1] Kein Erststart für Fremde → 3-Schritt-Dialogfolge (Körper → Ziel live → Plan-Assistent/Später). /impeccable onboard
- [P1] Kein Undo (Essens-Eintrag, Satz) → Toast „Rückgängig“; Gegenposition: Dialoge bewusst in Block 3b gewählt. /impeccable harden
- [P2] Abschluss-Dialog ohne offene Übungen; Ergebnis-Screen ohne Höhepunkt („Sätze: 1 Satz“ doppelt, Zurück + Fertig). /impeccable clarify, /impeccable delight
- [P2] Bereichsfarbe/Verbindung unsichtbar (OpenSessionHero, Gewicht-Karte neutral; „+412 kcal durch Training“ fehlt). /impeccable colorize
- Weitere P2: Dialog-X oben rechts; Begriffe vereinheitlichen; Meine Pläne Badge/Löschen; Plan-Editor einklappen + „Gespeichert“; Login-Fehler-Fokus; Übungsanleitung (evtl. Fixture-Artefakt); Aufwärm-Checkbox 24 px.

## Persona Red Flags
- Casey: „Training abschließen“ ganz unten ohne Warnung; Pause + Button ~21 % Höhe; Satz-Korrektur nur via Bearbeiten → Löschen.
- Sam: kein Titel, keine Ansage nach Navigation, Login-Fehler-Fokus.
- Jordan: kein Erststart, Ziel erst nach Profil, Jargon, kein Hilfe-Einstieg.

## Minor Observations
„Wochen im Plan: 1“ ohne „von 8“; −0,3 kg doppelt formuliert; Makros ohne Ziel; leere Analyse-Graphen zwischen vollen; Aktivitätsraster Mo-Zeile versetzt; Pause-Leiste lila Streifen; Fotos natives File-Input; Login „Essen“ vs. „Ernährung“. Aussortiert: „Manifest fehlt“ (veraltete PRODUCT.md-Zeile), Fixture-Effekte.

## Questions to Consider
1. Woran erkennt man mit einem halben Blick den Bereich?
2. Warum fragt die App nach dem letzten Satz nicht selbst „abschließen?“
3. Was, wenn Home nur eine verbundene Aussage träfe?
