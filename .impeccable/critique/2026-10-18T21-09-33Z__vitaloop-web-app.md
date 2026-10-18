---
target: Live-App mobile (390 px), Re-Audit nach Schritt 1-6
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-18T21-09-33Z
slug: vitaloop-web-app
closed: true
---
Method: dual-agent (A: a76a68e6b8ba857e6 · B: a38ea9be430df591f), nacheinander wegen gemeinsamem Playwright-Browser, isoliert. Live-App https://vitaloop.web.app, 390×844 (kurz 1280 px), künstliche Session + gemockte Supabase-Daten (`.playwright-mcp/critique-fixture.js`). Vergleich: Vormittag 18.10. 19/40. Stand: nach Re-Audit-Schritten 1–6 (PRs #89–#94).

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 2 | Keine Bestätigung nach Speichern von Mahlzeit/Gewicht; Pausen-Ende stumm |
| 2 | Sprache/Realwelt | 3 | Gute Gym-Sprache; „Session löschen“, „Ziel-Delta (kcal)“, Achsen „83.7“ |
| 3 | Kontrolle/Freiheit | 2 | Bestätigungen ja, Undo nirgends; anderen Plantag starten nicht möglich |
| 4 | Konsistenz | 2 | „Satz bearbeiten“ zeigt „72.5“ ohne −/+; Mahlzeit Chip vs. Select; Dialoge ohne Titel |
| 5 | Fehlervermeidung | 3 | Löschdialoge, LÖSCHEN, Validierung; rotes „Entfernen“ neben antippbarem Namen |
| 6 | Wiedererkennen | 3 | „Zuletzt gegessen“, „Letztes Training“; Nav nur Icons, Wochenstreifen ohne Legende |
| 7 | Effizienz | 2 | Stepper/Vorbelegung; keine Mahlzeit kopieren, Favoriten, Tag tauschen |
| 8 | Ästhetik/Minimalismus | 2 | Gleich gewichtete Karten; Training-Analyse 9 Graphen mit je Checkbox |
| 9 | Fehlerbehebung | 3 | Klare Texte; echte Fehlerzustände nicht testbar |
| 10 | Hilfe | 1 | Kein Onboarding; RIR, Ziel-Delta, Raster, Trends unerklärt |
| **Gesamt** | | **23/40** | **Acceptable** (vorher 19) |

## Design Specificity Verdict
Kern eigen (Live-Session mit 2,5-kg-Steppern, Vorbelegung, RIR-Frage, sticky Satz-Button, Abschließen unten mit Rückfrage; Muskel-Silhouetten; Duotone-Icons), Hülle austauschbar (gleicher Kartenstapel, system-ui, Link-Listen, Recharts im Werkszustand). Detector: CLI 1 Fund (broken-image BodyPhotosPage.tsx:84, False Positive), Browser-Overlay 0 Funde auf 5 Routen (Gegenprobe mit absichtlichen Fehlern schlug an; CSP blockt das Overlay live, nur im Test-Tab umgangen). Detector übersieht SVG-Achsentext #666 auf #23242b ≈ 2,7:1.

## Priority Issues
- [P1] Graphen im Recharts-Werkszustand: Achsen #666 2,7:1, Dezimalpunkte, krumme Ticks, keine Textzusammenfassung, Umfänge auf einer Achse, /home/analyse-Raster und Trends unbeschriftet. Fix: gemeinsames Chart-Theme (Tick text-muted, zahlDe-Formatter, runde Ticks), Satz-Zusammenfassung je Graph, Umfänge als Small Multiples, Raster mit Mo–So. (harden, clarify)
- [P1] Pausen-Ende stumm, Timer oben außer Daumenreichweite, „Satz abschließen“ nur 8 px über der Bottom-Nav. Fix: Timer + „+30 s“/„Überspringen“ in die Daumenzone, Ende mit Akzent-Puls + „Pause vorbei“ + vibrate, Nav in der Session ausblenden oder Abstand. (adapt, animate)
- [P2] Bearbeiten-Dialoge brechen mit Erfassungs-Mustern: SetEditDialog „72.5“ (String statt zahlDe), keine −/+; Eintrag bearbeiten ohne Titel mit 8 Nährwertfeldern; Körper-Dialog ohne Titel, Speichern unter dem Sichtbereich. Fix: ZahlFeld/zahlDe, Titel, Nährwerte einklappen, Aktionen sticky. (distill)
- [P2] Abschluss-Screen dünn: nur Dauer/kcal. Fix: Volumen, Sätze, Vergleich zum letzten Mal desselben Tages, nächster Plantag. (delight)
- [P2] Orientierung/Erklärung: Nav nur Icons, Home-Link-Liste doppelt, Zurück am Seitenende, Assistent ohne Schrittzahl, RIR/Aufw./Ziel-Delta unerklärt, Wochenstreifen ohne Legende. (clarify, onboard)

## Persona Red Flags
- Casey: Timer-Buttons bei y≈240; 8 px zwischen Satz-Button und Nav; Satz-Dialog oben + Tastatur; rotes „Entfernen“ neben Übungsname.
- Jordan: Login erklärt VitaLoop nicht, keine Passwortregeln vorab; Ziel-Delta/RIR/Aufw. unerklärt; Plan-Namen ohne „›“.
- Sam: Chart-Ticks 2,7:1, Graphen ohne Textalternative; Teilerfolg als roter Toast; native Spinner/Datei-Input.

## Minor Observations
Gleiches Play-Icon auf „Satz abschließen“ und „Fortsetzen“; „KW 41/26“ bricht in der Wochen-Kurzform um; kcal-Ring füllt Gegessenes unter „übrig“; Makros ohne Ziele; Hero „Gewicht (kg)“ über „82,4 kg“; 1280 px: breite Nav-Pille mit 4 Icons; 20+ „Auf dem Dashboard zeigen“-Checkboxen; Foto-Leerzustand mit nativem Datei-Input.

## Nicht bewertet / Fixture-Artefakte
Körper-Dialog aufgeklappt (Fixture-Eintrag hat Umfänge, gewollt); neue Sätze/Mahlzeiten erscheinen nicht (Mock); roter Toast vom gemockten RPC; „seit 15 h“, „0 kcal“. Nicht testbar: echte Lade-/Fehlerzustände, Kamera, Registrierung, Google-Login, Foto-Upload, iOS-Safari, Screenreader.

## Questions to Consider
- Warum ist die einzige bereichsübergreifende Seite die schwächste?
- Braucht die Live-Session die App-Navigation oder einen fokussierten Vollbild-Modus?
- Was sagt dir die App nach dem Training, was eine Tabelle nicht sagen würde?
