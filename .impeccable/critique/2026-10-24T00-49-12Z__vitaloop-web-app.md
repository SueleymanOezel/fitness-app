---
target: VitaLoop Live-App (Re-Audit nach Runde Gym/Farbe/Dialog/Profil)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-24T00-49-12Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review-Agent · B: Detektor-Agent), Live-App 390×844, Fixture-Session

## Design Health Score
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | 3 | Pausentimer, „1/3“, „kcal übrig“ gut |
| 2 | Übereinstimmung mit der realen Welt | 3 | „Ziel-Delta“, „Dashboard anpassen“, „Heute bearbeiten“ sind Technik-/Mischsprache |
| 3 | Nutzerkontrolle und Freiheit | 3 | Bestätigungen mit Fokus auf „Abbrechen“; „Training abschließen“ ist endgültig, wird aber angesagt |
| 4 | Konsistenz und Standards | 2 | Lila für Links, Plannamen, Mahlzeitnamen, Chips und Daten („+2,5 kg“); vier Seiten heißen nur „Analyse“ |
| 5 | Fehlervermeidung | 3 | „Training abschließen“ mit demselben Häkchen-Icon wie „Satz abschließen“, direkt darüber |
| 6 | Wiedererkennen statt Erinnern | 3 | „Zuletzt gegessen“, „Letztes Mal“, Vorbelegung; Übungs-Auswahl der Analyse weit weg vom Graphen |
| 7 | Flexibilität und Effizienz | 2 | Home-Karten nicht antippbar, kein Schnell-Eintrag |
| 8 | Ästhetik und Minimalismus | 3 | Ruhig; Linklisten-Karten auf jeder Bereichsseite, Ketten leerer Graph-Karten |
| 9 | Fehler erkennen und beheben | 3 | Unverändert zum letzten Lauf (Problem + „Erneut versuchen“); im Test nicht erreichbar |
| 10 | Hilfe und Dokumentation | 2 | Gute Inline-Hilfen, keine Führung für Neue (Plan-Assistent Schritt 1 ohne Hinweis) |
| **Gesamt** | | **27/40** | **Acceptable** |

## Design Specificity Verdict
A: Fachlich eigenständig (Live-Session, Ergebnis-Screen mit Vergleich, ehrliche Daten), visuell eher Vorlage: gleichförmige dunkle Karten, Versalien-Titel, Lila-Linklisten auf jeder Bereichsseite; Bereichsfarben fast nur in Graphen.
Detektor: CLI 1 Treffer `broken-image` BodyPhotosPage.tsx:82 = Fehlalarm (dynamisches src, Null-Fall abgefangen). Browser auf 9 Seiten/Zuständen, inkl. erstmals offener Eintrags-Dialog und /body/analyse: 1 echter Fund, `low-contrast` am Placeholder „z. B. Haferflocken“ 3,2:1 (#90919a auf #414249, Rezept `placeholder:text-text-muted` in ui-classes.ts:63), betrifft alle Felder mit Placeholder.

## Priority Issues
- [P1] Home ist eine Sackgasse: Gewicht-, Kalorien- und Wochen-Karte nicht antippbar, kein Schnell-Eintrag; Morgen- und Nach-dem-Essen-Szene brauchen Tab-Wechsel + Button. Fix: Karten antippbar (zum Bereich), Sekundäraktionen „Gewicht eintragen“ / „Eintrag hinzufügen“ mit denselben Dialogen. `/impeccable layout`.
- [P2] Lila noch nicht nur Aktion: Ergebnis-Screen zeigt „+2,5 kg“ in `text-accent-text` (bestätigt, WorkoutSessionPage.tsx:563) statt Training-Mint; Linklisten-Zeilen (`LinkListCard`, `linkClass`) überall Lila. Fix: Deltas in Bereichsfarbe; Linkzeilen neutral mit Chevron (Design-Entscheidung). `/impeccable colorize`.
- [P2] Session-Abschluss: „Training abschließen“ nutzt dasselbe `save`-Icon wie „Satz abschließen“ und liegt beim Scrollen ans Ende direkt darüber; nach dem Abschließen landet der Fokus auf BODY statt auf „Training abgeschlossen“. Fix: eigenes Icon + Abstand, Fokus auf die H1 des Ergebnis-Screens. `/impeccable harden`.
- [P2] Analyse-Seiten: vier gleiche Titel „Analyse“, Übungs-Auswahl weit weg vom Kraftverlauf, Leerkarten ohne „ab wann“. Fix: „Training · Analyse“ usw., Auswahl in die Graph-Karte, Leerzustände mit Bedingung. `/impeccable clarify`.
- [P2] Placeholder-Kontrast 3,2:1 (Detektor). Fix: Placeholder-Farbe auf ≥4,5:1 auf surface-raised. `/impeccable polish`.

## Notes
- Kein echter Fehler: „fester Fußbereich 126 px überdeckt die nächste Übungskarte“ beim Scrollen ist Eigenschaft einer festen Leiste; am Seitenende bleiben 18–29 px frei (gemessen).
- Fixture-Effekte aussortiert: „seit 0 min“ (Fixture-Start in der Zukunft), Historie aufsteigend (order ignoriert), Satzzähler/Volumen nach dem Loggen.
- Nicht geprüft: Was die 3 `[role=status]`-Elemente auf /body/analyse sind (Fotos/Storage mit [] gemockt).

## Persona Red Flags
- Casey: Home-Karten reagieren nicht; Profil nur über Icon oben rechts; „Löschen“ in Plänen gleich laut wie „Aktivieren“.
- Sam: Fokus nach Abschluss auf BODY; erster Fokus im Eintrags-Dialog ist ein Chip.
- Jordan: RIR/1RM/Ziel-Delta; Übungssuche ohne sichtbares Label; Plan-Assistent Schritt 1 ohne Ausblick.
- Owner im Gym: „Training abschließen“ mit gleichem Icon direkt über dem Haupt-Button.

## Minor Observations
„HOME“ englisch ohne Datum; „nicht beendet“ bei laufendem Training in der Historie; Dialog mit „Abbrechen“ und zusätzlichem ×; Makro-Balken ohne Ziel; Umfänge mal mit, mal ohne Delta; Profil-Karte „Ziel“ mit Feld „Ziel“.

## Questions to Consider
1. Warum zeigt Home drei getrennte Kacheln statt eines verbundenen Satzes („Heute 412 kcal trainiert, Ziel +412“)?
2. Braucht jede Bereichsseite eine Linkliste, oder reicht eine Sekundärnavigation?
3. Ist ein lila „+2,5 kg“ das Gefühl, mit dem man das Gym verlässt?
