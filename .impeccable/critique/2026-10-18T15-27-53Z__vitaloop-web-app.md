---
target: Live-App mobile (390 px), Re-Audit nach Block 1-4
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-18T15-27-53Z
slug: vitaloop-web-app
closed: true
---
Method: dual-agent (A: Design-Review im Live-Browser · B: Detector CLI + Overlay im Live-Browser). Mobile 390×844, Live-App https://vitaloop.web.app mit künstlicher Session und gemockten Supabase-Daten (Nutzer mit aktivem Plan, Historie, offener Session, Mahlzeiten, 7 Gewichtswerten). Vergleich: 13.10.2026 16/40.

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 2 | Pausen-Timer gut; Session-Kopf nur „Training“ (kein Tag, keine Dauer); offene Session auf Home/Training unsichtbar, kein „Fortsetzen“ |
| 2 | Sprache/Realwelt | 2 | Streak zählt Kalendertage → 3×/Woche zeigt „Noch kein Trainingstag.“; Epley-Wert als PR ohne „geschätzt“; Eigengewicht-PR „0,0 kg“ |
| 3 | Kontrolle/Freiheit | 2 | Löschen jetzt bestätigt; „Training abschließen“ sofort, ohne Rückfrage/Undo |
| 4 | Konsistenz | 2 | Dezimalpunkt in Session/Körperliste („72.5“, „82.4“) neben „82,4“; Login/Account/Logout englisch; Satz in Session Tabelle, in Historie Formularkarte |
| 5 | Fehlervermeidung | 2 | „Satz abschließen“ und „Training abschließen“ gleich aussehend übereinander; Löschen-Dialog fokussiert die destruktive Taste |
| 6 | Wiedererkennen | 1 | Gewicht/Wdh. starten leer statt vom letzten Satz; keine zuletzt genutzten Produkte |
| 7 | Effizienz | 1 | Kein „wie letzter Satz“, keine ±-Stepper, keine Produktsuche per Name |
| 8 | Ästhetik/Minimalismus | 3 | Ruhig, einheitlich; Plan-Detail lange Formularwand, Profil 14 Felder |
| 9 | Fehlerbehebung | 2 | 404 und Login-Fehler jetzt gut; „Weiter“ im Assistenten ohne Hinweis gesperrt; versehentliches Abschließen nicht rückgängig |
| 10 | Hilfe | 2 | Gute Leerzustände; RIR, Ziel-Delta, MET unerklärt; kein „Passwort vergessen?“ |
| **Gesamt** | | **19/40** | **Poor (oberer Rand)** |

## Design Specificity Verdict
Eigene Handschrift an Stellen (Duotone-Icons, Muskel-Silhouetten, Kalorien-Ring „1501 kcal übrig“, RIR als Frage), der Rest ist das gleiche Muster auf jeder Seite (H1, graue Karten, Link-Liste, Chart-Karte). Die Gym-Szene, eigentlich der Kern, ist die schwächste: zugeklappte Übungen, leere Felder, zwei fast gleiche Lila-Buttons. Detector: 1 Fund im Code (False Positive, Kommentar in BodyPhotosPage.tsx:84), 3 im Live-Overlay: Danger-Button-Text #f27a6b auf #414249 = 3,7:1 (Session „Entfernen“, Profil „Konto löschen“), Recharts-Legende „Gewicht“ #4f6ca5 auf #23242b = 3,0:1.

## Priority Issues
- [P0] Live-Session nicht einhändig zwischen Sätzen nutzbar: Übungen zugeklappt, Felder leer, Kopf ohne Tag/Dauer, „Training abschließen“ sticky direkt unter „Satz abschließen“, ohne Rückfrage. Fix: aktuelle Übung aufklappen, Felder vom letzten Satz vorbelegen + ±-Stepper, Kopf „Tag A – Drücken · 32 min“, Abschließen sekundär/am Ende mit Bestätigung. (harden, shape)
- [P1] Ernährung ohne Wiederholen: kein „Zuletzt/Häufig“, keine Namenssuche; „Suchen“ am Barcode-Feld lädt zu Namenssuche ein; Dialog ohne Titel. (shape)
- [P1] Irreführende Zahlen: Kalendertag-Streak bestraft den eigenen 3×-Plan; PR ohne „geschätzt“; Eigengewicht-PR 0,0 kg; Dezimalpunkte. (clarify, polish)
- [P2] Rückblick-Seiten sind Formulare: Historie-Detail ohne Datum/Tag, jeder Satz eine editierbare Karte; offene Session ohne „Fortsetzen“; Plan-Detail sehr lang. (distill, layout)
- [P2] Kontrast und Ziele: Danger-Text 3,7:1 (AA verfehlt), Recharts-Legende 3,0:1, RIR-Chips < 44 px breit, destruktive Taste im Fokus, „Abbrechen“ klebt an „Satz löschen“, Körper-Dialog fokussiert Datum statt Gewicht. (harden, audit)

## Persona Red Flags
- Casey (einhändig im Gym): zugeklappte Karten, leere Felder, sticky Abschließen neben Satz-Button, kein +30 s / Überspringen am Timer.
- Jordan (neu): Plan-Assistent endet in leerem Editor ohne Übungsvorschläge; RIR/Ziel-Delta unerklärt; kein „Passwort vergessen?“; „Login/Account/Einloggen/anmelden“ gemischt.
- Sam (Barrierefreiheit): Danger-Text 3,7:1, Placeholder ~3,2:1, Dialoge ohne Überschrift, Fokus auf destruktiver Taste.

## Minor Observations
Trainingsfrequenz-Graph mit einem Balken „2026-KW42“; „Ø 913 kcal“ in Wochen-Kurzform mehrdeutig; Profil „Logout“ englisch, „Konto löschen“ nah daran; Einträge-Liste besteht überwiegend aus Bearbeiten/Löschen-Buttons; „Löschen“ neben „Aktivieren“ in Plänen.

## Nicht bewertet / Fixture-Artefakte
Historie-Reihenfolge (Mock ignoriert Sortierung, App sortiert absteigend), „Verbrauch 0 kcal“/„159 Minuten“ auf dem Abschluss-Screen und der leere Editor nach dem Assistenten stammen aus dem Mock. Nicht geprüft: echte Lade-/Fehlerzustände, Kamera-Scanner, Registrierung.

## Questions to Consider
- Warum öffnet die Session nicht direkt mit dem nächsten, vorbelegten Satz?
- Wen belohnt der Streak, wenn er den eigenen 3×-Plan bestraft?
- Warum sagt der Abschluss-Screen nicht, wie das Training das heutige Kalorienbudget verändert?
