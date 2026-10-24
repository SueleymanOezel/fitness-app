---
target: VitaLoop Live-App (Re-Audit nach Runde Home/Farbe/Abschluss/Analyse/Placeholder)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-24T02-04-17Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review-Agent · B: Detektor-Agent), Live-App 390×844, Fixture-Session

## Design Health Score
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | 3 | Timer, „1/3“, „Training läuft“; Speichern-Feedback nach dem Satz nur über die Pausenleiste |
| 2 | Übereinstimmung mit der realen Welt | 3 | „Session löschen“, „Dashboard anpassen“, „Ziel-Delta“ |
| 3 | Nutzerkontrolle und Freiheit | 3 | Bestätigungen mit Abbrechen; kein Rückgängig nach einem Satz |
| 4 | Konsistenz und Standards | 2 | Gewicht-Kachel mit Navigations-Chevron öffnet einen Dialog; Lila auch für Auswahlzustände (Zeitraum, Mahlzeit-Chip) und den Pausen-Countdown |
| 5 | Fehlervermeidung | 3 | Stepper, „LÖSCHEN“-Bestätigung, klare Abschluss-Warnung |
| 6 | Wiedererkennen statt Erinnern | 3 | „Zuletzt gegessen“, „Letztes Mal“, Vorbelegung |
| 7 | Flexibilität und Effizienz | 2 | Kein „Satz wie zuletzt“, keine Favoriten |
| 8 | Ästhetik und Minimalismus | 3 | „Diese Woche“ doppelt auf Home; Linklisten auf Bereichsseiten |
| 9 | Fehler erkennen und beheben | 3 | Unverändert zum letzten Lauf; im Test kaum erreichbar |
| 10 | Hilfe und Dokumentation | 2 | RIR-Erklärung steht unter allen Übungen, weit weg von der Frage |
| **Gesamt** | | **27/40** | **Acceptable** |

## Design Specificity Verdict
A: Überwiegend eigenständig (versale Display-Schrift, Duotone-Icons, Bereichsfarben konsequent bis in die Charts, Gym-Sprache). Generisch: Karten-Unterseiten, Linklisten im Settings-Stil, vier gleich große Stat-Kacheln auf dem Ergebnis-Screen; Übungsfotos mit rotem Studio-Hintergrund als Fremdkörper.
Detektor: CLI nur der bekannte Fehlalarm `broken-image` BodyPhotosPage.tsx:82. Browser auf 10 Seiten/Zuständen inkl. offenem Eintrags-Dialog, Analyse-Seiten und Login: **0 Funde**, der Placeholder-Kontrast (3,2:1) ist behoben.

## Priority Issues
- [P1] Kalorienlogik unklar: „So entsteht dein Ziel“ sagt „Tagesbedarf enthält Alltag und Training im Schnitt“, darunter steht unkommentiert „Heute beim Training verbraucht …“, das Ziel bleibt gleich. Darf man zurückessen? Fix: eine Zeile Klartext („schon im Tagesbedarf enthalten“). `/impeccable clarify`.
- [P1] Home: „Diese Woche“ zweimal (Kachel + Karte); Gewicht-Kachel trägt „›“ wie Navigation, öffnet aber einen Dialog. Fix: Wochen-Kachel und -Karte zusammenlegen; Gewicht-Kachel mit „+“ statt „›“. `/impeccable distill`.
- [P2] Seitentitel: `document.title` ist auf allen Routen „VitaLoop“ (bestätigt, nirgends gesetzt) — Screenreader hören Seitenwechsel nicht. Fix: Titel je Route („Training · VitaLoop“). `/impeccable harden`.
- [P2] Lila noch für Zustände: gewählte Zeitraum-/Mahlzeit-Chips und der Pausen-Countdown-Balken (wirkt wie Überlappung). Fix: Auswahl neutral-hell mit Rand/Häkchen, Countdown in Training-Mint. `/impeccable colorize`.
- [P2] Ergebnis-Screen: vier gleiche Kacheln dominieren, „+2,5 kg zum letzten Mal“ klein darunter. Fix: Fortschritt/Vergleich als Hero, Dauer und kcal kompakt. `/impeccable delight`.

## Notes
- Bewusst so: „Eintrag hinzufügen“ ist auf Home sekundär (eine Primäraktion je Screen), auf /nutrition primär.
- Fehlbefund: Makro-Farbe „Fett“ (#ffdcb0) hat 11,9:1 auf der Karte, nicht „schwächster Kontrast“.
- Fixture-Effekte: „seit 0 min“, 1255 kcal Training heute (Zeitfilter ignoriert), Zähler nach dem Loggen.

## Persona Red Flags
- Casey: Zurück-Pfeil oben links; „Dashboard anpassen“ kleiner Textlink oben.
- Sam: kein Seitentitel je Route; leere Überschriften im zugeklappten „Mehr Graphen“ (zu prüfen).
- Jordan: „RIR“ in der Tabelle, Erklärung weit unten; „Ziel-Delta“, „Session“, „Dashboard“.
- Owner im Gym: Seite springt nach „Satz abschließen“ zum nächsten Formular, die Satz-Tabelle verschwindet aus dem Blick.

## Minor Observations
„Session löschen“ → „Training löschen“; Login „Einloggen“ vs. „Mit Google anmelden“, Fehler ohne Feldbezug; „VERLAUF“ ohne Bereich; Profil zeigt Bottom-Nav und Zurück-Pfeil; Analyse: „Mittagessen“-Label fehlt in Kalorien je Abschnitt, 1RM-Gerade aus 2 Punkten, Rekorde-Tabelle dreizeilig.

## Questions to Consider
1. Warum ist das Wiegen eine Kachel mit „›“ und kein Ein-Tap-Button?
2. Gehören Historie, Einträge und Verlauf als Vorschau an die Daten statt in eine Linkliste?
3. Ist der Ergebnis-Screen Quittung oder Belohnung?
