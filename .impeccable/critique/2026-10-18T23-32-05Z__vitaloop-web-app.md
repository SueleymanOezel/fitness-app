---
target: Live-App mobile (390 px), Re-Audit nach Fixes 1-5 + Polish
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-18T23-32-05Z
slug: vitaloop-web-app
---
Method: dual-agent (A: ad9a63a6176407521 · B: a16e6f61a4ab397b8), nacheinander wegen gemeinsamem Playwright-Browser, isoliert. Live-App https://vitaloop.web.app, 390×844 (kurz 1280 px), Fixture `.playwright-mcp/critique-fixture.js`. Stand: nach Fixes 1–5 (PRs #95–#100), Nav-Größe (#98) und Polish (#101). Vergleich: 18.10. abends 23/40.

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 3 | Pausen-Leiste, „Satz 2 von 3“, Inline-Validierung gut; „Pause vorbei“ verschwindet nach 6 s, keine Bestätigung nach „Hinzufügen“ |
| 2 | Sprache/Realwelt | 3 | RIR erklärt; „Session löschen“, „Wochen-Kurzform“, „Aktivitätsraster“, krumme Ticks |
| 3 | Kontrolle/Freiheit | 3 | Bestätigungen, Korrektur; kein Undo, Zurück als Textlink unten |
| 4 | Konsistenz | 2 | Zurück Pfeil oben (Session) vs. Textlink unten; „Session“/„Training“; −/+ nur beim Satz |
| 5 | Fehlervermeidung | 2 | Sticky „Satz abschließen“ überdeckt in der Pause die RIR-Chips; „Löschen“ = „Aktivieren“ |
| 6 | Wiedererkennen | 3 | Zuletzt gegessen, Vorbelegung; Werte vom letzten Mal ab Satz 2 nicht sichtbar |
| 7 | Effizienz | 2 | Kein „wie gestern“, kein Satz wiederholen, kein Tag-Wechsel bei Einträgen |
| 8 | Ästhetik/Minimalismus | 3 | Ruhig; Link-Listen doppeln die beschriftete Nav, Checkbox je Chart-Karte |
| 9 | Fehlerbehebung | 3 | Deutsche Texte, abgelaufener Link, 404; generisches „Das hat nicht geklappt“ |
| 10 | Hilfe | 2 | RIR-Legende, Ziel-Delta-Hinweis; Herkunft der 2414 kcal unerklärt |
| **Gesamt** | | **26/40** | **Acceptable** (vorher 23) |

## Design Specificity Verdict
Teilweise eigen (Muskel-Silhouetten, RIR-Frage, „zuletzt 70 kg × 8 · +2,5 kg“, Duotone-Icons), Gerüst austauschbar (Titel + Kartenstapel + Lila-Pillen, System-Font); „verbunden statt getrennt“ kaum sichtbar. Detector: CLI 1 False Positive (broken-image BodyPhotosPage.tsx:84, `<img>` im Kommentar); Browser-Overlay 0 Funde auf /, /training/session/s4, /nutrition, /body/analyse, /profile und im Dialog „Eintrag bearbeiten“; Positivkontrolle (1,5:1) schlug auf Seite und im Dialog an. Live-CSP blockt das Overlay, nur im Test-Tab umgangen.

## Priority Issues
- [P1] Während der Pause überdeckt der sticky „Satz abschließen“ die RIR-Chips (Button y 693–744, Chips 661–705, elementFromPoint trifft den Button) — Fehltipp loggt einen Satz. Eingeführt mit PR #95. Fix: Inhalt um die Leistenhöhe polstern oder Pausen-Leiste + Satz-Button zu einer festen Bottom-Bar. (adapt, harden)
- [P1] Werte vom letzten Mal fehlen beim Loggen ab Satz 2 („Letztes Training“ nur vor dem ersten Satz). Fix: „Letztes Mal: 70 × 8 · RIR 1“ immer unter „Satz N von M“. (clarify)
- [P2] Navigation/Aktions-Hierarchie uneinheitlich: Zurück unten vs. Pfeil oben, zwei Zurück im Assistenten, vier Primär-Buttons im Plan-Editor, „Löschen“ wie „Aktivieren“. (distill, layout)
- [P2] „Verbunden“ unsichtbar: „Ziel 2414 kcal“ ohne Aufschlüsselung, Home/Analyse ohne bereichsübergreifende Aussage. Fix: Grundbedarf + Training − Ziel-Delta, Wochenaussage auf Home. (shape, clarify)
- [P2] Analyse: Checkbox je Karte, leere Karten einzeln, „Kraftverlauf“ ohne Einheit, Desktop einspaltig. Fix: „Dashboard anpassen“-Modus, leere Graphen bündeln, Einheit im Titel, ab 1024 px zwei Spalten. (layout, adapt)

## Persona Red Flags
- Casey: RIR-Chips in der Pause halb verdeckt; Aufwärmsatz-Checkbox 20 px; „−“ ganz außen; rotes „Entfernen“ unter dem Satz-Button.
- Jordan: „Aktivitätsraster“, „Wochen-Kurzform“, „Session“, „Auf dem Dashboard zeigen“ unklar; 2414 kcal unerklärt; Makro-Balken wirken wie Ziel-Fortschritt; „Registrieren“ grau.
- Sam: RIR-Buttons ohne radiogroup-Label; mehrere unsichtbare „Schließen“-Buttons; Raster 14 px, Bedeutung nur über Farbe; Nav-Labels 11 px.

## Minor Observations
„Heute eintragen“ auch bei vorhandenem Eintrag; keine kcal-Vorschau im Mengen-Dialog; Produktname nicht als Titel im Bearbeiten-Dialog; keine Speicher-Rückmeldung im Plan-Editor; verschachtelte Scrollbereiche im Eintrags-Sheet; deaktiviertes „Weiter“ kontrastschwach; Historie nur Datum + kcal; Abschluss-Dauer auf ≥ 0 absichern; Home-Link-Liste doppelt die Nav.

## Nicht bewertet / Fixture-Artefakte
Sortierung, Datumsfilter, Dauer/kcal auf dem Abschluss-Screen, nicht erscheinende Einträge. Nicht testbar: Lade-/Fehlerzustände, Kamera, Foto-Upload, Registrierung/E-Mail, Google-Login, iOS Safari, Vibration, Screenreader.

## Questions to Consider
- Warum ist Home eine Summe von Bereichskarten statt einer Wochenaussage über alle Bereiche?
- Braucht die Live-Session Scrollen, oder füllt die aktuelle Übung den Screen?
- Muss ein neuer Rekord in denselben grauen Kacheln stattfinden wie „0 kcal“?
