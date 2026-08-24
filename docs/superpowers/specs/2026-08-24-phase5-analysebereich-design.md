# Phase 5 – Analysebereich (Design)

Datum: 2026-08-24
Status: abgestimmt, Grundlage für zwei Implementierungspläne

## 1. Zweck

Fortschritt und Schwachstellen sollen ablesbar werden. Heute liegen Trainings-,
Ernährungs- und Körperdaten in der Datenbank, sichtbar ist aber immer nur der
jeweils aktuelle Stand. Ein Gewicht von 82,5 kg sagt nichts darüber, ob es
fällt; ein einzelner Trainingstag nichts über die Frequenz.

Phase 5 ergänzt je Bereich eine Analyse-Unterseite mit allen Graphen dieses
Bereichs und lässt den Nutzer auswählen, welche davon zusätzlich auf dem
Dashboard erscheinen.

## 2. Umfang

**Enthalten:** Training, Ernährung, Körper — 19 Graphen.

**Nicht enthalten: der Home-Bereich.** `HomePage.tsx` ist noch ein Platzhalter,
und die Tabelle `day_status` wird von keiner Stelle im Code beschrieben. Die
ursprünglich geplanten Graphen H1–H3 hätten damit weder ein Dashboard, auf dem
sie stehen könnten, noch Daten. Home-Dashboard und Trainingstag/Restday-Kalender
werden ein eigenes Vorhaben; erst danach ergeben H1–H3 Sinn.

### Die Graphen

**Training** (`/training/analyse`)

| ID | Titel | Rechnung |
|---|---|---|
| T1 | Trainingsfrequenz | Sessions je Kalenderwoche |
| T2 | Kraftverlauf je Übung | geschätztes 1RM nach Epley, bester Satz je Session |
| T3 | Volumen je Übung | Σ Gewicht × Wiederholungen je Session, ohne Aufwärmsätze |
| T4 | Bestes Satzgewicht je Übung | max. Gewicht je Session |
| T5 | Wiederholungsverlauf je Satz | Wiederholungen je Satznummer über die Zeit |
| T6 | Volumen je Muskelgruppe | Volumen auf `muskelgruppen_primaer` verteilt, ohne Aufwärmsätze |
| T7 | Dauer und Kalorien je Session | Minuten und `gesamt_kalorien` |
| T8 | Persönliche Rekorde | höchstes 1RM je Übung, als Liste mit Datum |

**Ernährung** (`/nutrition/analyse`)

| ID | Titel | Rechnung |
|---|---|---|
| E1 | Kalorien pro Tag gegen Ziel | Tagessumme, Ziel als Referenzlinie |
| E2 | Makro-Verteilung heute | Eiweiß/Fett/Kohlenhydrate als Anteile |
| E3 | Makro-Verlauf | dieselben drei über die Zeit |
| E4 | Kalorien je Mahlzeiten-Abschnitt | Summe je Abschnitt über den Zeitraum |
| E5 | Wochenschnitt | Kalorien je Kalenderwoche, gemittelt über Tage mit Einträgen |
| E6 | Kalorienbilanz | Aufnahme minus Trainingsverbrauch je Tag |

**Körper** (`/body/analyse`)

| ID | Titel | Rechnung |
|---|---|---|
| K1 | Gewichtsverlauf mit Trendlinie | Rohwerte plus zeitgewichteter EWMA |
| K2 | Umfänge im Verlauf | die fünf Umfänge, je eine Linie |
| K3 | Änderungsrate | kg pro Woche aus der Trendlinie |
| K4 | Gewicht über Kalorien | Gewichtsänderung gegen mittlere Kalorienaufnahme je Woche |
| K5 | Fortschrittsfotos als Zeitleiste | vorhandene Fotos nach Datum, mit Gewicht beschriftet |

## 3. Architektur

### Registry

`src/lib/analysis/registry.ts` hält je Graph einen Eintrag:

```ts
type ChartDef = {
  id: string            // 'T1', 'E1', …
  bereich: 'training' | 'nutrition' | 'body'
  titel: string
  Component: ComponentType<ChartProps>
}
```

Die Analyse-Seite und der Picker lesen beide aus `chartsFor(bereich)`. Damit
kann keiner von beiden einen Graphen kennen, den der andere nicht kennt, und ein
neuer Graph wird an genau einer Stelle eingetragen.

### Datenfluss

Pro Bereich **ein** zeitraum-bezogener Hook, nicht einer je Graph:
`useTrainingAnalysis`, `useNutritionAnalysis`, `useBodyAnalysis`, jeweils
`(userId, zeitraum)`. Ohne diese Bündelung feuert eine Analyse-Seite acht
parallele Abfragen für dieselben Daten.

Die bestehenden Hooks reichen dafür nicht: `useFoodEntries` lädt nur den
heutigen Tag, `useWorkoutHistory` die Sessions ohne ihre Sätze.

Drei Graphen greifen über ihren Bereich hinaus, und der Bereichs-Hook holt das
mit:

- **E6 (Kalorienbilanz)** braucht zusätzlich `gesamt_kalorien` der Sessions im
  Zeitraum — `useNutritionAnalysis` lädt sie mit.
- **K4 (Gewicht über Kalorien)** braucht die Tagessummen der Ernährung —
  `useBodyAnalysis` lädt sie mit.
- **K5 (Fotos)** braucht die Fotozeilen samt signierten Links; `useBodyAnalysis`
  nutzt dafür dieselbe Signierung wie `useBodyPhotos`.

`alles` als Zeitraum bedeutet: ab dem frühesten Datensatz des Bereichs, nicht
ab einem festen Datum.

Jede Graph-Komponente bekommt dieselbe Form — `{ data, zeitraum }` hinein, SVG
hinaus. Kein eigener Datenzugriff. Das macht sie in jsdom prüfbar und war der
Grund für die Wahl von Recharts.

### Rechnen getrennt von Zeichnen

Die Aggregation liegt in reinen Funktionen unter `src/lib/analysis/`
(`epley1RM`, `volumenJeMuskelgruppe`, `gewichtsTrend`, …). Dort liegt die
Testlast. Die Komponente wird nur darauf geprüft, dass sie das Ergebnis zeichnet
und beschriftet.

### Persistenz der Auswahl

Neue Spalte `profiles.analyse_auswahl jsonb` mit Vorgabe `["T1","E1","K1"]`,
Migration `0007`. Keine neue Tabelle, kein neuer Endpunkt.

Unbekannte IDs in der gespeicherten Liste werden beim Lesen verworfen: ein
später entfernter Graph darf das Dashboard nicht zerlegen.

### Code-Splitting

Die drei Analyse-Seiten werden per `React.lazy` nachgeladen. Der Gewinn ist auf
den Start beschränkt — Login und Home ziehen die rund 136 kB (gzip) von Recharts
nicht mehr mit. Da die Dashboards ab Werk je einen Graphen zeigen, ist die
Bibliothek beim ersten Dashboard-Besuch ohnehin geladen. Das ist bewusst so
abgewogen und keine Lücke.

## 4. Oberfläche

### Analyse-Seiten

Aufbau in allen drei Bereichen gleich:

1. Überschrift „Analyse"
2. Zeitraum-Umschalter: 30 Tage, 90 Tage, 1 Jahr, alles — Vorgabe 90 Tage
3. Alle Graphen des Bereichs untereinander, jeder mit Titel und dem Häkchen
   „Auf dem Dashboard zeigen"
4. Rücklink zum Bereich

Der Zeitraum ist Seitenzustand und wird nicht gespeichert.

### Picker

Kein eigener Screen. Das Häkchen sitzt am Graphen selbst — man entscheidet
dort, wo man ihn gerade ansieht, statt in einer Liste von 19 Titeln zu raten,
was sich hinter „T5 Wiederholungsverlauf je Satz" verbirgt. Es schreibt direkt
nach `profiles.analyse_auswahl`.

### Dashboards

Die angehakten Graphen erscheinen unter dem bestehenden Inhalt, dazu ein Link
„Analyse". Der Zeitraum ist dort **fest 90 Tage**, ohne Umschalter: ein
Dashboard mit Bedienelementen ist kein Dashboard mehr.

Reihenfolge ist die der Registry. Kein Umsortieren, kein Drag-and-drop.

### Übungsauswahl

T2 bis T5 beziehen sich auf je eine Übung. Über dem Graphen steht ein `select`,
vorbelegt mit der im Zeitraum am häufigsten trainierten Übung. Auf dem Dashboard
entfällt die Auswahl; dort gilt immer die häufigste Übung.

## 5. Randfälle und Genauigkeit

**Zu wenig Daten.** Jeder Graph prüft, ob er etwas zu zeigen hat, und schreibt
sonst einen Satz statt leerer Achsen — bei Linien ab zwei Punkten, bei Balken ab
einem. Ein leeres Koordinatensystem sieht aus wie ein Fehler.

**Ladefehler gehören dem Bereich.** Scheitert die Abfrage, steht eine Meldung
oben auf der Seite, nicht achtmal dieselbe zwischen den Graphen.

**Aufwärmsätze zählen nicht.** Jede Volumenrechnung filtert
`ist_aufwaermsatz`. Ohne das sind alle Volumen-Graphen systematisch zu hoch —
genau dafür wurde das Feld erfasst.

**Trendlinie K1.** Exponentiell gewichteter Mittelwert mit *zeitlicher*
Gewichtung, Halbwertszeit sieben Tage — nicht „letzte n Einträge". Man wiegt
mal täglich, mal vierzehntägig; eine Lücke von zwei Wochen darf nicht so viel
Gewicht behalten wie der Vortag. Tagesgewicht schwankt durch Wasser um ein bis
zwei Kilo, ungeglättet liest man Rauschen als Fortschritt.

**Tage sind lokale Tage.** `src/lib/local-time.ts` ist vorhanden; ein Eintrag um
23:50 gehört zu diesem Tag, nicht per UTC zum nächsten.

**Epley.** `1RM = Gewicht × (1 + Wiederholungen / 30)`. Sätze ohne Gewicht oder
ohne Wiederholungen fallen aus der Rechnung, nicht als 0.

## 6. Prüfung

Die reinen Funktionen tragen die Tests, mit Fixtures, bei denen eine naive
Umsetzung ein anderes Ergebnis liefert: Lücken in der Historie, ein einzelner
Datenpunkt, Aufwärmsätze zwischen Arbeitssätzen, ein Tag ohne Einträge
innerhalb des Zeitraums.

Je Graph kommt ein schlanker Test dazu, der prüft, dass die gerechneten Werte in
Achsenbeschriftung und Tooltip landen — nicht, wie das SVG innen aussieht.

## 7. Zuschnitt der Pläne

**Plan 1 – Fundament und drei Graphen.** Recharts samt `React.lazy`, die
Registry, Migration `0007` mit Picker und Persistenz, die drei Analyse-Seiten,
der Zeitraum-Umschalter, die drei bereichs-eigenen Hooks und genau die drei
Standard-Graphen T1, E1, K1.

Nach Plan 1 ist alles Riskante an echten Graphen bewiesen — Bundle-Splitting,
Registry-Schnittstelle, Persistenz — und die Funktion ist benutzbar.

**Plan 2 – die restlichen 16 Graphen.**

## 8. Bewusst offen

- **Bundle-Warnschwelle.** Nach Plan 1 wird erneut gemessen. Bleibt der
  Start-Chunk darüber, ist das ein Befund für die Härtungsphase und kein Grund,
  Plan 2 aufzuhalten.
- **`profiles_update_own` hat kein `with check`** (seit Phase 1). Wir ergänzen
  dort eine Spalte, ändern die Policy aber nicht — das gehört zum
  Policy-Durchgang der Härtungsphase, zusammen mit dem bekannten Befund zu
  `products_update_own`.
- Kein Export der Graphen als Bild, kein Teilen, kein Vergleich zweier
  Zeiträume nebeneinander.
