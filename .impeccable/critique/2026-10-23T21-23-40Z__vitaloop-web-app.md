---
target: VitaLoop Live-App (Re-Audit nach Runde Nav/Login/Training/Bereichsfarbe)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "url:https://vitaloop.web.app/"
timestamp: 2026-10-23T21-23-40Z
slug: vitaloop-web-app
---
Method: dual-agent (A: Design-Review-Agent · B: Detektor-Agent), Live-App 390×844, Fixture-Session

## Design Health Score
| # | Heuristik | Score | Kernproblem |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | 3 | Pausen-Timer, „Satz 2 von 3“ und Kalorien-Ring gut; die zweite Übung der Session zeigt keinen Fortschritt (0/3) |
| 2 | Übereinstimmung mit der realen Welt | 3 | Gym-Sprache sitzt; „Aufw.“, „Ziel-Delta“ für Einsteiger Fachsprache |
| 3 | Nutzerkontrolle und Freiheit | 2 | Löschen nur mit Bestätigung, nirgends Rückgängig; Dialoge mit „Abbrechen“ und zusätzlichem ×, uneinheitlich platziert |
| 4 | Konsistenz und Standards | 2 | Farbsystem: Wochenleiste „trainiert“ im Aktions-Lila statt Mint; Körper-Datenfarbe ist exakt das Aktions-Lila (#8766ed) |
| 5 | Fehlervermeidung | 3 | Vorbelegung + Stepper + Bestätigungen; Aufwärmsatz-Haken nur 24 px |
| 6 | Wiedererkennen statt Erinnern | 3 | „Letztes Mal“, „Zuletzt gegessen“, RIR-Legende stark |
| 7 | Flexibilität und Effizienz | 2 | Kein Schnell-Eintrag Gewicht auf Home (Morgen-Szene), keine „wie gestern“-Mahlzeit |
| 8 | Ästhetik und Minimalismus | 3 | Ruhig; /profile (15 Felder) und /training/analyse (lange Graph-Liste) überladen |
| 9 | Fehler erkennen und beheben | 3 | Die von A gefundenen Fehler stammten aus den Test-Daten; reale Meldungen nennen Problem + „Erneut versuchen“ |
| 10 | Hilfe und Dokumentation | 2 | Gute Inline-Hilfen, aber kein Onboarding, Übungen teils „Keine Anleitung hinterlegt.“ |
| **Gesamt** | | **26/40** | **Acceptable** |

## Design Specificity Verdict
**Bewertung A:** In den Kernmomenten für dieses Produkt geschrieben (Live-Session mit „Letztes Mal: 70 kg × 8 · RIR 2“, ±2,5-kg-Stepper, RIR-Frage in Du-Form, „So entsteht dein Ziel“, „≈ 1RM“). Die Hülle bleibt austauschbar: Versalien-Titel, die nur das Navi-Label wiederholen, gleichförmige Karten, „›“-Linklisten auf jeder Bereichsseite. Die versprochene Verbindung der drei Bereiche steht im Text, nicht in der Gestaltung.

**Detektor:** CLI über `src`: 1 Treffer, `broken-image` in `src/pages/BodyPhotosPage.tsx:82`. Fehlalarm: Das `<img>` hat ein dynamisches `src` und einen Alt-Text, der Null-Fall zeigt „Bild nicht verfügbar“. Browser-Overlay lief auf 6 Seiten (`/`, `/training`, `/training/session/s4`, `/nutrition`, `/body`, `/profile`) wirklich im Seitenkontext: 0 Befunde. Einschränkung: Gescannt wurde nur der sichtbare Startzustand, ohne Dialoge, Leer- und Fehlerzustände; kein Freibrief für Kontrast und Barrierefreiheit.

## Overall Impression
Die tägliche Erfassung ist stark, vor allem die Satz-Eingabe im Gym. Schwach sind die Ränder: Am unteren Rand der Session stapeln sich feste Leisten, das Farbsystem ist noch nicht durchgezogen, und zwei Formulare (Eintrag hinzufügen, Profil) zeigen zu viel auf einmal. Größte Chance: Farbe als Bereichs-Wegweiser konsequent machen, Lila nur für Aktionen.

## What's Working
1. Satz-Eingabe in der Live-Session: Stepper 44×47 px mit klaren aria-Labels, vorbelegt aus „Letztes Mal“, RIR in Alltagssprache.
2. Ehrliche, erklärte Zahlen: „So entsteht dein Ziel“, geschätztes 1RM mit Herkunft, „Kurz gesagt“.
3. Leerzustände mit Handlung: „Kein aktiver Plan“ + „Trainingsplan anlegen“, Historie leer + „Zum Training“.

## Priority Issues
- [P1] Feste Leisten überdecken das Seitenende der Session: Pausen-Leiste + fixiertes „Satz abschließen“ liegen über „Training abschließen“ am Seitenende (Daumenzone). Fix: Abstand am Seitenende an die echte Leistenhöhe (Pause + Button) koppeln; im echten Scrollen nachmessen. `/impeccable layout`.
- [P1] Farbsystem nicht durchgezogen: Wochenleiste „trainiert“ in `bg-accent` statt Training-Mint; Körper-Datenfarbe = Aktions-Lila (#8766ed). Fix: Wochenleiste Mint; eigener Körper-Violett-Ton oder bewusste Entscheidung Körper = Brand-Lila. `/impeccable colorize`.
- [P2] Dialog „Eintrag hinzufügen“ ~12 Optionen, Suche autofokussiert → iPhone-Tastatur verdeckt „Zuletzt gegessen“ und „Scannen“. Fix: ohne Autofokus, schnelle Wege oben. `/impeccable distill`.
- [P2] /profile als Mega-Formular (15 Felder, ein Speichern unten, „Konto löschen“ auf derselben Seite). Fix: Abschnitte, Live-Vorschau Tagesziel, „Konto löschen“ eigene Unterseite. `/impeccable distill`, dann `/impeccable layout`.
- [P3] Abschluss-Dialog warnt nur; Ergebnis-Screen existiert (#99), Dialog könnte Kurzbilanz zeigen. `/impeccable delight`.

## Persona Red Flags
- Casey: Aufwärmsatz-Haken 24 px; Leisten-Stapel am Session-Ende; Tastatur verdeckt schnelle Wege im Eintrags-Dialog; × beim Übungsdetail unter der Karte.
- Sam: Wochenleiste liest sieben Einzelzustände vor; Navi-Labels 11 px. Positiv: lang=de, Landmarken, Stepper-Labels, sichtbarer Fokus.
- Jordan: kein Onboarding; Kalorienziel braucht Profildaten ohne Hinweis; „RIR“/„Ziel-Delta“ erst spät erklärt; ohne Plan kein freies Training.
- Owner im Gym: nächste Übung leere Karte ohne Satzzähler, kein Gesamtfortschritt der Einheit.

## Minor Observations
- Seitentitel wiederholen nur das Navi-Label.
- /training/plans: „Löschen“ gleich gewichtet wie „Aktivieren“ (bekannt).
- /nutrition: Makro-Balken ohne Ziel.
- /body: leere Umfänge („—“) belegen Zeilen.
- „Heute bearbeiten“: Datumsfeld trotz „Heute“, alle Umfänge offen.
- Login: „Mit Google anmelden“ fast gleichwertig zur Hauptaktion.
- Detektor-Fehlalarm `broken-image` BodyPhotosPage.tsx:82 → Kandidat für ignore.md.

## Questions to Consider
1. Wo kommen Training, kcal und Gewicht in einem Bild zusammen?
2. Sollte Home nach Tageszeit umbauen (morgens Gewicht, mittags Mahlzeit, abends Rückblick)?
3. Was fehlt, wenn die „›“-Linklisten verschwinden und Unterseiten aus den Daten öffnen?
