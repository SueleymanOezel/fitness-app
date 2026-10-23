---
target: "Live-App mobile (390 px), Re-Audit nach PRs #102-#108"
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-23T00-39-11Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review · B: Detektor + Overlay), nacheinander wegen gemeinsamem Playwright-Browser, isoliert. Live-App https://vitaloop.web.app, 390×844, Fixture `.playwright-mcp/critique-fixture.js`. Stand: nach PRs #102–#108. Vergleich: 18.10. 26/40.

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 3 | Pausen-Leiste mit aria-live, Toasts; Session-Akkordeon ohne aria-expanded, Home-Kachel „Wochen im Plan —“, Mengenfeld ohne Fokus |
| 2 | Sprache/Realwelt | 3 | Du-Form, RIR erklärt; „Dashboard“ Jargon, krumme Achsen-Ticks (88,4 / 89,25) |
| 3 | Kontrolle/Freiheit | 3 | Gute Bestätigungen; Mengen-Schritt mit „Abbrechen“ + ✕, kein Zurück zum Produkt |
| 4 | Konsistenz | 2 | Erster „Eintrag/Übung hinzufügen“ lila, weitere grau; Play-Icon für „Satz abschließen“; Profil ohne Zurück-Pfeil; „Dashboard anpassen“ wie Zeitraum-Chip |
| 5 | Fehlervermeidung | 3 | Bestätigungen, Stepper; Pausen-Leiste verdeckt RIR-Reihe beim Öffnen |
| 6 | Wiedererkennen | 3 | Zuletzt gegessen, „Letztes Mal“ je Satz, kcal-Vorschau; vier gleiche „Übung“-Auswahlen in Analyse |
| 7 | Effizienz | 2 | Keine Schnellmengen, kein „wie gestern“, kein Tag-Wechsel, Mengenfeld nicht fokussiert |
| 8 | Ästhetik/Minimalismus | 2 | Analyse 3944 px mit 9 gleichrangigen Graphen; Profil 2184 px Formular; Eintrags-Sheet ~14 Bedienelemente |
| 9 | Fehlerbehebung | 2 | Login-Fehler allgemein über dem Button, nicht am Feld; keine Passwortregeln vorab |
| 10 | Hilfe | 3 | „So entsteht dein Ziel“, Ziel-Delta-Hinweis, RIR-Legende; kein Einstieg für Neue |
| **Gesamt** | | **26/40** | **Acceptable** (unverändert) |

## Design Specificity Verdict
Interaktion und Texte produktspezifisch (Live-Session, „Letztes Mal … · RIR“, RIR-Frage, Zielaufschlüsselung, Muskel-Silhouetten); visuelle Hülle generisch (system-ui, gleiche rounded-3xl-Karten, Lila-Pillen, einheitliches Türkis in allen Graphen). Detektor: CLI 1 Fund = False Positive (broken-image BodyPhotosPage.tsx:82, `<img>` im Kommentar); Overlay 0 Funde auf /, /training/session/s4, /nutrition, /training/analyse, /training/plans/p1, /profile; Positivkontrolle (1,2:1) schlug an. CSP nur im Test-Tab per CDP `Page.setBypassCSP` umgangen.

## Priority Issues
- [P1] Pausen-Leiste (y 702–828) verdeckt beim Öffnen die RIR-Reihe (y≈693, 6/6 per elementFromPoint blockiert); erst Scrollen hilft. Fix: aktive Karte so scrollen, dass RIR über der Leiste endet, oder Pause in der Leiste kompakter (eine Zeile). (layout, harden)
- [P1] Analyse ist ein Graphen-Stapel ohne Aussage: 9 gleichrangige Karten, 4 separate Übungsauswahlen, krumme Ticks, „Bestes Satzgewicht“ ohne Einheit. Fix: 2–3 Satz-Erkenntnisse oben, eine gemeinsame Übungsauswahl, runde Ticks, Einheiten überall, Nebengraphen unter „Mehr“. (distill, typeset)
- [P2] Eintrags-Sheet: ~13 Wege auf einmal (Mahlzeit-Chips, Suche, Zuletzt, Scan, Manuell, Barcode-Feld), Fokus auf „Frühstück“, Mengenfeld ohne Autofokus, zwei Schließen-Elemente. Fix: Suche zuerst + Fokus, Barcode-Nummer hinter Scan, Mengenfeld fokussiert + Schnellmengen. (distill, clarify)
- [P2] Uneinheitliche Gewichtung/Icons: Primär-Stil nur beim ersten Abschnitt/Tag, Play-Icon für Satz, „Dashboard anpassen“ wie Chip, Profil ohne Zurück. (polish)
- [P2] Screenreader: 9× „Auf dem Dashboard zeigen“, 2× „Löschen“ ohne Planname, „Tag nach oben“ ohne Tagname, kein aria-expanded im Session-Akkordeon, Home ohne h2. (harden)

## Persona Red Flags
- Casey: RIR verdeckt in der Pause; rotes „Entfernen“ neben dem Kopf der zweiten Übung; ↑/↓ wirken wie Übung-verschieben.
- Jordan: Login ohne Nutzenversprechen; „Wochen im Plan —“; Ziel-Delta + 6 Mahlzeitennamen im Profil; kein „Fang mit einem Plan an“; Leerzustand nennt nicht, wie viele Tage nötig sind.
- Sam: doppelte Namen, fehlendes aria-expanded; Wochenstreifen nur über Farbe (Textalternative vorhanden); Login-Fehler ohne aria-invalid/describedby; kein Fokus im Mengen-Schritt.

## Minor Observations
Makro-Prozente summieren 101 %; Makro-Balken wirken wie Zielfortschritt; Historie „Ganzkörper 3x – Tag A – Drücken“; Profilgewicht doppelt zum Körpergewicht; Mahlzeiten-Hinweis im Profil größer als Labels; Anpassen-Modus zeigt volle Graphen statt kompakter Liste; RIR-Legende weit unten; Spin-Pfeile im Mengenfeld; Lazy-Thumbnails mit Lücken; Trainings-kcal neben, nicht in der Zielrechnung (wirkt wie „darf ich das essen?“).

## Nicht bewertet / Fixture-Artefakte
Kamera, Foto-Upload, Plan-Assistent, Übungskatalog, Abschluss-Screen, Reduced Motion, Tastatur-Reihenfolge, Ernährungs-/Körper-Analyse. Artefakte: „seit 0 min“, Satz erscheint nicht (Mock speichert nicht), Historie aufsteigend, 1255 kcal (Mock ignoriert gte), einmaliger Redirect auf /login.

## Questions to Consider
- Warum führt Home mit zwei Kennzahl-Kacheln (eine „—“) statt „Heute: Tag B – Ziehen, 3 Übungen, ~45 min“?
- Ist „verbunden“ wahr, wenn die Trainings-kcal nur eine Fußnote sind?
- Würde jemand sechs von neun Graphen vermissen, wenn drei Sätze sagen, ob man stärker, leichter, regelmäßiger wird?
