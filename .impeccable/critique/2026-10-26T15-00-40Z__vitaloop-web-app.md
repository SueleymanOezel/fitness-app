---
target: Re-Audit Live-App vitaloop.web.app 390 px
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-26T15-00-40Z
slug: vitaloop-web-app
---
# Re-Audit VitaLoop (Live-App, 390 px, 27.10.2026)

Method: dual-agent (A: Design-Review-Agent · B: Detektor-Agent)

## Design Health Score: 30/40 (Good), vorher 29

| # | Heuristik | Score | Kernbefund / was für 4 fehlt |
|---|---|---|---|
| 1 | Systemstatus | 3 | Kein Hinweis, dass das Erststart-Gewicht mitgespeichert wurde |
| 2 | Sprache | 3 | „Abstand zum Bedarf“, „KW 43/26“, H1 „HOME“ englisch |
| 3 | Kontrolle | 3 | Laufende Session nicht verwerfbar |
| 4 | Konsistenz | 3 | kcal mit/ohne Tausenderpunkt; „Diese Woche“ doppelt; Dialogtitel mal in, mal über der Karte |
| 5 | Fehlervermeidung | 3 | Keine Plausibilitätswarnung (725 kg); Erststart-Bereiche erst nach „Weiter“ |
| 6 | Wiedererkennen | 3 | Wochenleiste Training ohne Datum |
| 7 | Effizienz | 3 | „Training wie letztes Mal“, „Satz wie Satz 1“ fehlen |
| 8 | Ästhetik | 3 | Link-Listen-Karte Training, leere Wochenleiste, Karte-in-Karte im Schnell-Dialog |
| 9 | Fehlerbehebung | 3 | Erststart-Fehler nicht feldgenau (kein aria-invalid/Fokus) |
| 10 | Hilfe | 3 (vorher 2) | „?“ oben nur allgemein; „Noch nicht genug Daten“ ohne Schwelle |

## Design-Specificity-Verdict
Kern spezifisch (Muskel-Silhouette, RIR-Chips, „Letztes Mal“, „Ziel inkl. Training“, „Von gestern“, Aktivitätsraster), Hülle austauschbar (Karte-in-Karte, Ring + Zahl, Link-Liste, Versalien-H1).
Detektor: CLI 1 Fund broken-image BodyPhotosPage.tsx:82 (Fehlalarm). Browser 6 Seiten: 5 sauber, /body ai-color-palette für H2 „Gewicht“ #e283d6 (bewusste Bereichsfarbe Körper; passt aber zu A: Label-Farben ohne erkennbare Regel).

## Stärken
1. Live-Session als Gym-Werkzeug (kein Tap-Ziel < 44 px, Timer unten, Vibration).
2. Ehrliche Zahlen (1RM geschätzt + Formel, Ziel-Aufschlüsselung, Trends mit Bezugsdatum).
3. A11y-Grundlagen (Titel je Route, Fokus auf main, Kontrast ≥ 4,9:1).

## Priority Issues
- [P1] Dialoge ohne zugänglichen Namen, Fokus fällt beim Erststart-Schrittwechsel auf BODY (Dialog.tsx, ErststartDialog.tsx) → aria-labelledby, h2 fokussieren, aria-invalid. /impeccable harden
- [P2] Nullen-Wand nach Onboarding („0 von 1“ ohne Plan, streak.ts Default 1; leerer Ring; „Noch nicht genug Daten“ ohne Schwelle) → /impeccable onboard
- [P2] Zahlen/Texte uneinheitlich (kcal-Format, „Drei kurze Schritte“ vs. „1 von 2“, „Diese Woche“ doppelt) → /impeccable clarify
- [P2] Laufende Session nicht verwerfbar → „Training verwerfen“ mit Bestätigung. /impeccable harden
- [P3] Training-Hub generisch (Link-Karte, Wochenleiste ohne Datum) → /impeccable layout

## Persona Red Flags
- Casey: Zurück/„?“ oben; Inline-Link „Im Profil neu wählen“ 125×17 px; „Graphen auswählen“ klein oben.
- Jordan: „0 von 1“ ohne Plan; „KW 43/26“; leere Graphen ohne Schwelle; „Registrieren“ nur Textlink.
- Sam: Dialoge ohne Namen, Fokus auf BODY; doppelte „?“ auf der Trainingsanalyse; aria-pressed an Erststart-Chips ungeprüft.

## Minor Observations
Rotstichige Übungsfotos; Raster-Labels ≈ 9 px; Pausen-Timer verdeckt nächste Übungsüberschrift halb; Aktivitäts-Hinweis rot umrandet wie ein Fehler; Login-Leerraum ungleich. Fixture-Artefakte aussortiert (Ziel inkl. 1255 Training, „Läuft seit 8 h“, nicht persistierte Zähler).

## Questions to Consider
1. Warum drei getrennte Kacheln auf Home statt einer verbundenen Aussage?
2. Braucht Training den Vier-Link-Hub?
3. Warum erscheint das live berechnete Tagesziel nach dem Erststart nie wieder so deutlich?
