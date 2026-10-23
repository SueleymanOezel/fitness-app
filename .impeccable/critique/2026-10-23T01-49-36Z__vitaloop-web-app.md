---
target: "Live-App mobile (390 px), Re-Audit nach PRs #109-#114"
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-23T01-49-36Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review · B: Detektor + Overlay), nacheinander wegen gemeinsamem Playwright-Browser, isoliert. Live-App, 390×844, Fixture. Stand nach PRs #109–#114. Vergleich: 23.10. früher 26/40.

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 3 | Pausen-Leiste, „Satz 2 von 3 · Letztes Mal“ stark; Anpassen-Modus erklärt nicht, was wo erscheint |
| 2 | Sprache | 3 | Klar; Legende „Aufw./RIR“ unter der Karte statt am Begriff |
| 3 | Kontrolle | 3 | Esc, „Anderes Produkt“, +30 s; ✕ des Sheets erst unten sichtbar |
| 4 | Konsistenz | 2 | Bereichsfarbe nur in Graphen: kcal-Ring + Makro-Balken Mint, Bauchumfang Mint; Primär nur bei einer Mahlzeit |
| 5 | Fehlervermeidung | 2 | „Löschen“ neben „Aktivieren“, „Konto löschen“ nahe „Speichern“, ↑/↓ ohne sichtbaren Bezug |
| 6 | Wiedererkennen | 3 | Zuletzt gegessen + „wie zuletzt“; Historie ohne Volumen/Top-Satz |
| 7 | Effizienz | 3 | Schnellmengen, Stepper; kein „Satz wiederholen“, kein „wie gestern“ |
| 8 | Minimalismus | 3 | Ruhig; Profil 2177 px ein Formular |
| 9 | Fehlerbehebung | 2 | Login-Fehler nur an einem Feld, kein Fokus; Leerzustände „Gewicht über Kalorien“/„Fotos“ ohne Hinweis |
| 10 | Hilfe | 2 | Inline-Hinweise gut; 1RM/Volumen/MET unerklärt |
| **Gesamt** | | **26/40** | **Acceptable** |

## Design Specificity Verdict
Eigener Charakter jetzt sichtbar (Barlow-Versalien, kondensierte Zahlen, Muskel-Silhouetten, Sprache). Innen weiter gleichförmige Kartenstapel; Bereichsfarbe nur halb umgesetzt. Detektor: CLI 1 False Positive (broken-image BodyPhotosPage.tsx:82, Kommentar); Overlay 0 Funde auf 8 Seiten, 1 Fund im offenen Eintrags-Sheet: Placeholder „z. B. Haferflocken“ #90919a auf #414249 = 3,2:1. Positivkontrolle angeschlagen.

## Priority Issues
- [P1] Bereichsfarbe inkonsistent (kcal-Ring, Makro-Balken, Bauchumfang in Mint). (colorize)
- [P2] Destruktive Aktionen nah an Primären (Plan löschen/aktivieren, Konto löschen/Speichern), ↑/↓ ohne sichtbaren Bezug. (harden)
- [P2] Hub-Seiten gleichförmig; Link-Karten ~340 px über den Daten. (layout)
- [P2] Anpassen-Modus: unklar, dass die Häkchen das Bereichs-Dashboard steuern, nicht die Analyse-Seite; „Fertig“/„Dashboard anpassen“ wirken nicht wie Buttons. (clarify)
- [P3] Login-Fehler je Feld + Fokus; Placeholder-Kontrast 3,2:1. (harden)
Zusätzlich vom Nutzer gemeldet: Nav-Tab springt beim Tippen (elastisches Tap-Feedback), angemeldet bleiben nach App-Schließen.

## Persona Red Flags
Casey: Leiste verdeckt Kopf der nächsten Übung; Aufwärmsatz-Checkbox 24 px. Jordan: 2414 kcal nur im Aufklapper erklärt, 1RM/Volumen unerklärt, ↑/↓ kryptisch. Sam: Passwortfeld nicht invalid markiert, kein Fokuswechsel, Sheet-✕ als letztes Element.

## Minor Observations
Rekorde-Namen brechen dreizeilig; fehlender Bild-Platzhalter verschiebt Zeile; doppelte „Diese Woche“-Überschrift auf Home; Mahlzeiten-Hinweis im Profil zu laut; verschachtelter Scrollbereich im Sheet; Bindestrich statt Minus auf der Änderungsrate-Achse; Mahlzeit-Chips als ganze Karte.

## Questions to Consider
- Warum leihen sich die Hub-Seiten nicht das „ein aktives Ding, Rest ruhig“-Prinzip der Session?
- Braucht es eine 9er-Checkliste, oder reichen „Kurz gesagt“ + ein von der App gewählter Graph?
- Wo zeigt Home, dass das heutige Training das Essensziel verändert hat?
