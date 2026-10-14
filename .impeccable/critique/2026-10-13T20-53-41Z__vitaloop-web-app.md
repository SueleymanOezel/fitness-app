---
target: gesamte App mobile
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 7
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-13T20-53-41Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review · B: Detector/Messung/Perf/Security) + C: End-to-End mit echten Daten. Mobile only, Viewport 425×1128 (Chrome-Minimum, 390 nicht erreichbar).

## Design Health Score (Nielsen)
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Systemstatus | 2 | „Lädt…“-Text statt Skeletons; Historie „— – — – nicht beendet“; Training-läuft-Zustand unsichtbar |
| 2 | Sprache/Realwelt | 2 | „kcal verbraucht“ für Gegessenes; englische Übungsnamen in Historie/Graphen; en-US-Dezimalpunkte |
| 3 | Kontrolle/Freiheit | 2 | Löschen ohne Bestätigung/Undo; geloggte Sätze in der Session nicht korrigierbar |
| 4 | Konsistenz | 1 | Zwei Input-, drei Button-Generationen; Karte-in-Karte; Abstände 0–40 px; Überschriften mal zentriert, mal links |
| 5 | Fehlervermeidung | 1 | „22,5“ kg wird still verworfen; −5 Wdh. gespeichert; leerer Satz akzeptiert; Datum-Edit dupliziert Körpereintrag |
| 6 | Wiedererkennen | 2 | 31 Filter-Chips ungruppiert; keine zuletzt genutzten Produkte/Übungen |
| 7 | Effizienz | 1 | 873 Übungen ungevirtualisiert; „Eigene Übung anlegen“ nach ~110 Bildschirmen; keine Produktsuche |
| 8 | Ästhetik/Minimalismus | 2 | Wand aus Leerzustands-Karten; gestapelte zentrierte Textlinks |
| 9 | Fehlerbehebung | 1 | Training ohne Profilgewicht nicht abschließbar, ohne Link zum Beheben; 404 = schwarzer Bildschirm; rohe englische Supabase-Fehler beim Login |
| 10 | Hilfe | 2 | RIR, Ziel-Delta, 1RM-Schätzung unerklärt |
| **Gesamt** | | **16/40** | **Poor** |

## Audit-Score (technisch)
Accessibility 3 · Performance 2 · Responsive 3 · Theming 3 · Implementation Integrity 2 (B: 3, auf 2 korrigiert wegen A/C-Befund Base-Layer-Mischsystem) = **13/20 (Acceptable)**.

## Priority Issues
- [P0] Training ohne Profilgewicht nicht abschließbar (WorkoutSessionPage.tsx:293) — Nutzerkonto hat kein Gewicht → erstes Training hängt.
- [P0] Dezimalkomma verwirft Gewicht still (Number("22,5") → NaN → null), kein inputMode.
- [P1] Zwei Designsysteme parallel: `@layer base`-Übergangsregeln (Rand, 6px Radius, 4px Margin, zentrierte li, Inline-Labels) auf Profil, Plan-Editor, Historie-Detail, Dialogen, Session-Formular vs. Phase-6-Klassen.
- [P1] Gleiche Farbe auf gleicher Farbe: Chips, Secondary-Buttons, verschachtelte Karten unsichtbar in Karten.
- [P1] Typografie: globale line-height 145 % vererbt als 23,2 px → h1 36 px mit 23 px Zeilenhöhe.
- [P1] Abstands-Rhythmus kaputt (0 px zwischen Sektionen, Überlappung „Training starten“/„Meine Pläne“).
- [P1] Übungskatalog 873 Zeilen ohne Virtualisierung (5.4k DOM-Knoten, Renderer-Freeze, 750-px-Bilder auf 48 px).
- [P1] Unbekannte Routen = leerer Bildschirm; Löschen ohne Bestätigung; Körper-Datum-Edit erzeugt Duplikat.
- [P1] Englische Übungsnamen in Historie, /training-Graphen, Analyse-Dropdown/PR-Liste.

## Security
Keine P0/P1. Gut: CSP, HSTS, XFO, RLS auf allen 14 Tabellen, privater Foto-Bucket, publishable Key, Delete-Account-Funktion korrekt. P2: SECURITY-DEFINER-Funktionen für anon/authenticated ausführbar, `rls_auto_enable` außerhalb der Migrationen. P3: HIBP-Passwortschutz aus, kein COOP, delete-account 400 statt 401.

## Performance
Entry-Chunk 207 KB brotli (fast alle Seiten), Assets nur 1 h gecacht (statt immutable), HTML 1 h → alter Build bis 1 h nach Deploy; kein Manifest/Service-Worker (keine echte PWA); doppelte Supabase-Requests (profiles/workout_sessions je 2×), Wasserfall ~490 ms auf /training; Advisors: 19× auth_rls_initplan, 6 unindizierte FKs.
