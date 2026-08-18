# Fitness & Ernährungs-App – Architektur & Sicherheitskonzept

## 1. Grundidee

PWA (Progressive Web App), kombiniert MyFitnessPal (Ernährung) und Alpha Progression (Training). Läuft über Browser-Link, installierbar als App-Icon auf iOS/Android/Windows, kein App-Store nötig, kein Apple Developer Account nötig.

Design-Anspruch: modern, clean, simpel, hohe Interaktivität, schnelle Klickwege ohne unnötige Komplexität, übersichtliches Frontend.

## 2. Tech-Stack (final)

| Bereich | Wahl | Begründung |
|---|---|---|
| Frontend | React + Vite | Bekannt, großes Ökosystem, gute PWA-Unterstützung |
| Backend/DB | Supabase (Postgres) | Relational, Row-Level-Security, Auth eingebaut, kostenlos im Start |
| Barcode-Daten | Open Food Facts API | Offen, kostenlos, Millionen Produkte |
| Foto-Analyse | Gemini API | Bilderkennung + Texterkennung (OCR) für Nährwerttabellen, kostenloses Kontingent |
| Hosting | Firebase Hosting oder Supabase-eigenes Hosting | Kostenlos, PWA-fähig |
| Health-Sync | Apple Shortcuts-Automatisierung | Kein natives HealthKit möglich in PWA, daher Workaround über Shortcuts |


## 3. Übungsdatenbank (Trainingsbereich)

Für den Trainingsbereich wird keine eigene Übungsdatenbank von Grund auf gepflegt, sondern eine bestehende offene Quelle importiert:

**Gewählte Lösung: free-exercise-db**
- Gemeinfreier (Public Domain) Datensatz mit über 800 Übungen inklusive Bildern
- Liegt als einfache JSON-Datei vor (kein eigener API-Server nötig)
- Enthält pro Übung: Name, Kategorie/Mechanik (z. B. isoliert/zusammengesetzt), benötigtes Equipment, primäre und sekundäre beanspruchte Muskelgruppen, Schwierigkeitsgrad, Bild
- Einmaliger Import in eine eigene Supabase-Tabelle (`exercises`), danach volle Kontrolle, keine Abhängigkeit von einem externen Dienst, keine Rate-Limits

**Alternative (verworfen für Start): wger**
- Vollständiges, selbst hostbares Open-Source-Trainings- und Ernährungssystem mit eigener REST-API, tausende Übungen mit Bildern und mehrsprachigen Anleitungen
- Nachteil: erfordert eigenen Docker-Betrieb eines zusätzlichen Dienstes neben Supabase, mehr Infrastruktur-Aufwand
- Könnte später als Ergänzung interessant sein, falls mehr Übungen/Sprachen gebraucht werden

**Vorgehen:**
1. JSON-Datensatz von free-exercise-db einmalig herunterladen
2. Import-Skript schreiben, das die Daten in die `exercises`-Tabelle in Supabase schreibt
3. Trainingspläne referenzieren dann per Fremdschlüssel auf `exercises.id`
4. Nutzer kann zusätzlich eigene Übungen anlegen (eigener Eintrag mit `created_by`-Feld, analog zur Ernährungs-Community-Datenbank)


## 3a. Kalorienberechnung Training & Ernährungsfoto-Erkennung

### Kalorienverbrauch beim Training

Es gibt keine spezielle "Kalorien-Datenbank" für Training, sondern eine wissenschaftlich etablierte Standardformel, basierend auf sogenannten **MET-Werten** (Metabolic Equivalent of Task).

**Prinzip:**
- Jede Aktivität/Übung hat einen MET-Wert (z. B. Krafttraining allgemein liegt bei etwa 3 bis 6, je nach Intensität)
- Formel: Kalorien = MET-Wert × Körpergewicht in Kilogramm × Trainingsdauer in Stunden
- MET-Werte stammen aus dem frei zugänglichen **Compendium of Physical Activities** (gepflegt von Arizona State University), das für hunderte Aktivitäten dokumentierte Werte liefert

**Umsetzung für unsere App:**
1. MET-Werte pro Übungskategorie einmalig erfassen und in der `exercises`-Tabelle (aus free-exercise-db-Import) ergänzen, z. B. gruppiert nach Übungstyp (Kraft leicht/mittel/schwer, Ausdauer etc.)
2. Bei Abschluss eines Satzes/einer Session: Formel serverseitig anwenden mit Nutzergewicht (aus Körper-Dashboard) und gemessener Dauer
3. Zusätzlich kann Gewicht × Wiederholungen als Trainingsvolumen-Kennzahl erfasst werden (für Fortschrittsanzeige), auch wenn das nicht direkt in die Kalorienformel einfließt

**Kein externer API-Call nötig** – die MET-Werte werden einmalig recherchiert/erfasst und liegen in der eigenen Datenbank, die Berechnung ist reine Mathematik im eigenen Backend.

### Foto-Erkennung von Nahrungsmitteln

Recherche-Ergebnis: Es gibt keine wirklich gute, kostenlose und offene Bilderkennungs-Datenbank speziell für Nahrungsmittel-Fotos mit verlässlicher Kalorienschätzung. Die meisten Optionen sind entweder wissenschaftliche Forschungsdatensätze ohne fertige API, oder kommerzielle Dienste mit Kosten.

**Bestätigte Entscheidung:** Bei der bereits gewählten Lösung bleiben – Gemini API für die Foto-Analyse nutzen, da sie sowohl allgemeine Bilderkennung (Mahlzeit schätzen) als auch Texterkennung (Etiketten lesen) abdeckt, ohne dass eine zusätzliche Datenbank oder ein separater Dienst nötig ist.

**Priorisierung (Update):** Die Gemini-Foto-Funktionen (Mahlzeiten-Analyse und Etiketten-OCR) werden als "Luxus"-Feature zurückgestellt und erst in einer späteren Phase eingebaut. Für den Start hat oberste Priorität:
1. Barcode-Scan über Open Food Facts
2. Falls Produkt nicht gefunden wird: einfaches manuelles Eingabeformular für Name und Nährwerte, ganz ohne KI, Eintrag landet direkt in der eigenen/Community-Produktdatenbank

## 4. App-Struktur: vier Bereiche mit eigenem Dashboard

Die App gliedert sich in vier Hauptbereiche, jeder mit eigenem Dashboard:

1. **Home-Dashboard** – zentraler Einstiegspunkt
2. **Trainings-Dashboard** – Pläne, Live-Sessions
3. **Ernährungs-Dashboard** – Kalorien, Mahlzeiten
4. **Körper-Dashboard** – Fortschrittsfotos, Umfänge, Körperverlauf

### 4.1 Home-Dashboard

- Begrüßung mit Namen des Nutzers
- Monatsübersicht als Kalender: zeigt an, welche Tage Trainingstage und welche Ruhetage (Restdays) waren/sind
- Anzeige des aktuellen Tages: heute Trainingstag oder Restday
- Kalorienübersicht: wie viele Kalorien heute schon verbraucht/gegessen wurden, wie viele noch offen sind
- Schnellzugriff-Kacheln/Buttons: direkt in Trainingsbereich (z. B. „Training starten") oder Ernährungsbereich springen
- Übersicht, welcher Trainingsplan aktuell aktiv ist

### 4.2 Trainings-Dashboard

**Trainingsplan-Verwaltung**
- Eigene Trainingspläne erstellen
- Mehrere Trainingspläne anlegen und zwischen ihnen wechseln (z. B. alte Pläne behalten, neuen aktivieren)
- Aktuell aktiven Plan bearbeiten
- Übersicht/kleiner Kalender: wann der nächste Trainingstag ansteht, zumindest der aktuelle Tag sichtbar
- „Training starten"-Button direkt vom Dashboard aus

**Live-Trainingsmodus**
- Beim Start werden alle Übungen des heutigen Plans aufgelistet (z. B. Bankdrücken oben in der Liste)
- Klick auf eine Übung öffnet ein Fenster/Overlay mit:
  - Allen Sätzen der Übung
  - Feld zum Eintragen der Wiederholungen pro Satz (z. B. „10" eintragen und Satz abschließen)
  - Automatisch startender Pausen-Timer nach Satzabschluss
  - Pausenzeit vorher einstellbar (z. B. 90 Sekunden, 1 Minute, 2 Minuten), zählt automatisch runter
- Nach Abschluss eines Satzes springt die App zum nächsten Satz/zur nächsten Übung
- Trainingsdaten (Gewicht × Wiederholungen) werden erfasst, daraus wird automatisch der ungefähre Kalorienverbrauch der Einheit berechnet
- Referenz für UI/UX-Stil: Alpha Progression

### 4.3 Ernährungs-Dashboard

- Mahlzeiten eintragen per:
  - Barcode-Scan → Abfrage Open Food Facts
  - Foto vom Essen (ohne Etikett) → Gemini schätzt Kalorien/Makros
  - Foto vom Nährwertetikett bei unbekanntem Produkt → Gemini liest Werte per OCR aus, landet in eigener Datenbank
- Community-Datenbank: von Nutzern erfasste Produkte landen in zentraler Supabase-Tabelle (`created_by`-Feld), Basis für spätere Verifizierung
- Tagesübersicht: gegessene Kalorien, offene Kalorien, Makros
- Referenz für UI/UX-Stil: MyFitnessPal

### 4.4 Körper-Dashboard

- Basis-Werte: Größe, Gewicht, Alter (einmalig/bei Bedarf aktualisierbar)
- Täglicher Fortschritt eintragbar (Gewicht etc.)
- Körperfotos hochladen zur visuellen Verlaufsdokumentation
- Umfangsmessungen erfassbar (alle optional einzeln eintragbar):
  - Bauchumfang
  - Beinumfang
  - Armumfang
  - Rückenumfang
  - Brustumfang
- Verlaufsprotokoll/Chart über Zeit, ähnlich MyFitnessPal/Alpha Progression Körperverlauf-Feature


## 4a. UI/UX-Konzept (Vorschlag)

Erkenntnis aus der Recherche zu bestehenden Apps: Ein häufiger Kritikpunkt an etablierten Apps wie MyFitnessPal ist ein überladenes, wenig intuitives Interface. Genau das soll hier vermieden werden – Fokus auf Klarheit statt Informationsdichte.

### Navigationsstruktur

Untere Tab-Leiste mit vier Haupt-Icons, passend zu den vier Bereichen:
- Home (Haus-Symbol)
- Training (Hantel-Symbol)
- Ernährung (Teller/Gabel-Symbol)
- Körper (Verlaufs-/Chart-Symbol)

Jeder Tab führt direkt zum jeweiligen Dashboard, maximal ein bis zwei Klicks bis zur eigentlichen Aktion (z. B. Barcode scannen oder Satz eintragen).

### Farbschema-Idee

- Neutrale, helle Basis (Weiß/sehr helles Grau) als Hintergrund, damit Inhalte und Fotos nicht erschlagen wirken
- Eine kräftige Akzentfarbe für Aktionen und aktive Zustände (z. B. ein sattes Grün oder Blau – bewusst nicht zu verspielt, eher "seriös-modern")
- Zurückhaltende Sekundärfarben zur Unterscheidung der vier Bereiche (z. B. dezente Farbcodierung pro Tab), ohne dass es bunt/unruhig wirkt
- Klare, große Typografie, wenig Text, viel Weißraum

### Home-Dashboard – Aufbau von oben nach unten
1. Begrüßung mit Namen
2. Kompakte Kalorien-Fortschrittsanzeige (z. B. Ring- oder Balkendiagramm: verbraucht vs. Ziel)
3. Kalender-Streifen (aktuelle Woche sichtbar, antippbar für Monatsansicht), farblich markiert nach Trainingstag/Restday
4. Karte "Aktueller Trainingsplan" mit Start-Button
5. Kleine Schnellzugriffs-Kacheln für Barcode-Scan und manuellen Ernährungseintrag

### Trainings-Dashboard – Aufbau
1. Auswahl/Anzeige des aktiven Plans oben, Wechsel-Möglichkeit über Dropdown oder Karten-Swipe
2. Liste der Übungen des heutigen Trainingstags als Karten (Name, Zielsätze, Bild aus Übungsdatenbank)
3. Klick auf Karte öffnet Vollbild-Overlay: große Eingabefelder für Wiederholungen/Gewicht, Pausen-Timer prominent in der Mitte, "Satz abschließen"-Button groß und leicht erreichbar (Daumen-Zone)

### Ernährungs-Dashboard – Aufbau
1. Tagesübersicht oben (verbrauchte/offene Kalorien, Makros als kleine Balken)
2. Liste der heutigen Mahlzeiten, chronologisch
3. Großer, gut erreichbarer Scan-Button (Barcode-Icon) als Haupt-Call-to-Action
4. Fallback-Option "Manuell hinzufügen" klar sichtbar, aber nicht dominant

### Körper-Dashboard – Aufbau
1. Aktuelles Gewicht groß oben, mit Trendpfeil (steigend/fallend)
2. Verlaufsdiagramm (Liniendiagramm) für Gewicht über Zeit
3. Kachel-Übersicht der letzten Umfangsmessungen
4. Fortschrittsfoto-Galerie, chronologisch, mit Möglichkeit zum direkten Vergleich zweier Zeitpunkte

**Nächster Schritt:** Du erstellst eigene Mockups/Skizzen basierend auf diesem Grundgerüst, und wir gehen die dann gemeinsam durch und passen sie an.

## 5. Apple Health Integration

**Grundproblem:** Eine PWA hat aus Sicherheitsgründen keinen direkten Zugriff auf Apple HealthKit – das ist grundsätzlich technisch gesperrt, unabhängig vom Umsetzungsweg.

**Gewählte Lösung (Phase 1, ohne Kosten/Developer Account):**
- Apple **Shortcuts**-App nutzen, um eine Automatisierung zu bauen
- Diese Automatisierung wird als eigenes Icon auf den Homescreen gelegt (fühlt sich an wie eine normale App)
- Ablauf beim Antippen des Icons:
  1. Shortcut liest aktuelle Health-Daten aus (z. B. Schritte, weitere Health-Metriken)
  2. Sendet die Daten per Web-Request an die Supabase-Datenbank (z. B. an einen definierten API-Endpunkt)
  3. Öffnet danach automatisch die Web-App im Browser
- Dadurch sind die Daten aktualisiert, sobald die App geöffnet wird, ohne spürbare Wartezeit für den Nutzer
- Alternative/Ergänzung: zeitbasierte Automatisierung (z. B. stündlich), da iOS Hintergrund-Automatisierungen aus Akku-Gründen nicht in kürzeren Abständen zuverlässig zulässt

**Spätere Option (Phase 4+, mit Aufwand):**
- Nativer Wrapper um die Web-App via **Capacitor**, um echten HealthKit-Zugriff zu bekommen
- Erfordert Apple Developer Account und App-Store-artige Distribution
- Erstmal zurückgestellt, Shortcuts-Lösung reicht für den Start

## 6. REST-API-Grundstruktur (Entwurf, detailliert nach Bereich)

Alle Endpunkte laufen hinter Supabase Row-Level-Security, jeder Request mit gültigem JWT im Header. Bereich für Bereich aufgeschlüsselt:

### 6.1 Auth & Nutzerprofil

```
POST   /auth/signup                       → Registrierung
POST   /auth/login                        → Login, gibt JWT zurück
POST   /auth/refresh                      → Token erneuern
POST   /auth/logout                       → Session beenden
GET    /profile                           → eigenes Profil abrufen (Name, Alter, Größe etc.)
PATCH  /profile                           → Profil aktualisieren
DELETE /profile                           → Account löschen
```

### 6.2 Ernährungsbereich

```
GET    /products/barcode/:code            → Produkt per Barcode suchen (Open Food Facts Proxy + eigene DB)
GET    /products/search?q=...             → Volltextsuche in eigener Produkt-DB
POST   /products                          → neuer Community-Produkteintrag (z. B. aus OCR-Ergebnis)
GET    /products/:id                      → Einzelnes Produkt abrufen
PATCH  /products/:id                      → Produkt korrigieren (z. B. Community-Verifizierung)

POST   /ai/analyze-meal-photo             → Foto einer Mahlzeit an Gemini zur Kalorienschätzung
POST   /ai/extract-nutrition-label        → Foto eines Nährwertetiketts an Gemini (OCR-Extraktion)

POST   /food-entries                      → Mahlzeit/Eintrag speichern (verweist auf products.id oder Freitext)
GET    /food-entries?date=YYYY-MM-DD      → Einträge eines Tages abrufen
GET    /food-entries?range=...            → Einträge über Zeitraum (für Statistiken)
PATCH  /food-entries/:id                  → Eintrag bearbeiten (z. B. Menge anpassen)
DELETE /food-entries/:id                  → Eintrag löschen

GET    /nutrition/daily-summary?date=...  → Tagesübersicht: verbrauchte/offene Kalorien, Makros
```

### 6.3 Trainingsbereich

```
GET    /exercises                         → Übungen aus importierter free-exercise-db abrufen
GET    /exercises/:id                     → Einzelne Übung (Muskeln, Equipment, Bild)
GET    /exercises/search?q=...            → Übungssuche (z. B. nach Muskelgruppe/Equipment)
POST   /exercises                         → eigene Übung anlegen (Community-Eintrag, created_by)

GET    /workout-plans                     → alle eigenen Trainingspläne abrufen
POST   /workout-plans                     → neuen Trainingsplan erstellen
GET    /workout-plans/:id                 → Plan-Details inkl. Übungsliste
PATCH  /workout-plans/:id                 → Plan bearbeiten (Übungen, Reihenfolge, Sätze, Zielwiederholungen)
DELETE /workout-plans/:id                 → Plan löschen
PATCH  /workout-plans/:id/activate        → Plan als aktuell aktiven Plan setzen

POST   /workout-sessions                  → neue Live-Trainingseinheit starten (Referenz auf workout-plan)
GET    /workout-sessions/:id              → laufende/abgeschlossene Session abrufen
PATCH  /workout-sessions/:id/sets         → einzelnen Satz eintragen (Wiederholungen, Gewicht, Pausenzeit)
PATCH  /workout-sessions/:id/sets/:setId  → einzelnen Satz nachträglich bearbeiten
PATCH  /workout-sessions/:id/complete     → Session abschließen, Gesamtkalorien berechnen lassen
GET    /workout-sessions?range=...        → Trainingshistorie über Zeitraum (für Kalender-Ansicht)
DELETE /workout-sessions/:id              → Session löschen
```

### 6.4 Körperbereich

```
POST   /body-metrics                      → Tageseintrag speichern (Gewicht, Umfänge)
GET    /body-metrics?range=...            → Verlaufsdaten über Zeitraum abrufen (für Chart)
PATCH  /body-metrics/:id                  → Eintrag korrigieren
DELETE /body-metrics/:id                  → Eintrag löschen

POST   /body-photos                       → Fortschrittsfoto hochladen
GET    /body-photos?range=...             → Fortschrittsfotos über Zeitraum abrufen (für Vergleich)
DELETE /body-photos/:id                   → Foto löschen
```

### 6.5 Health-Sync (Apple Shortcuts)

```
POST   /health-sync                       → Health-Daten aus Shortcuts-Automatisierung empfangen (Schritte etc.)
GET    /health-sync/latest                → letzten Sync-Stand abrufen (für Dashboard-Anzeige)
```

### 6.6 Home-Dashboard (aggregierende Endpunkte)

```
GET    /dashboard/home                    → gebündelte Übersicht: heutiger Kalorienstand, Trainingsstatus des Tages, aktiver Plan
GET    /dashboard/calendar?month=...      → Monatsübersicht: Trainingstage vs. Restdays
```

## 7. OWASP Top 10 (2025) – Checkliste

| # | Kategorie | Relevanz für unsere App | Gegenmaßnahme |
|---|---|---|---|
| A01 | Broken Access Control (inkl. BOLA/BFLA) | Hoch – jeder Nutzer darf nur eigene Daten sehen/ändern | Supabase Row-Level-Security auf jeder Tabelle, Ownership-Check pro Query |
| A02 | Security Misconfiguration | Hoch – neue Kategorie auf Platz 2 | Keine Default-Configs, Supabase-Keys sauber trennen (anon vs. service_role), CSP-Header setzen |
| A03 | Software Supply Chain Failures | Mittel–Hoch – npm-Dependencies | `npm audit`, Dependabot/Renovate, Lockfile committen, nur vertrauenswürdige Pakete |
| A04 | Cryptographic Failures | Mittel – Passwörter, Tokens | Supabase Auth übernimmt Hashing, keine eigenen Krypto-Implementierungen, HTTPS überall |
| A05 | Injection | Mittel – SQL/NoSQL, XSS | Supabase-Client nutzt parametrisierte Queries, React escaped standardmäßig, trotzdem Input-Validierung serverseitig |
| A06 | Insecure Design | Mittel | Threat-Modeling vor Feature-Bau, Rate-Limiting auf Auth- und Health-Sync-Endpunkte |
| A07 | Identification & Authentication Failures | Hoch | Supabase Auth, MFA optional aktivierbar, sichere Session-Verwaltung |
| A08 | Data Integrity Failures | Niedrig–Mittel | Signierte JWTs, keine ungeprüften Deserialisierungen |
| A09 | Security Logging & Alerting Failures | Mittel | Supabase-Logs aktivieren, kritische Events (Login-Fehlversuche, Datenzugriffe) protokollieren und Alerts einrichten |
| A10 | Mishandling of Exceptional Conditions | Mittel – neue Kategorie | Fehler nicht "fail open", saubere Error-Handling-Strategie, keine sensiblen Infos in Fehlermeldungen |

## 8. Testing-Strategie

**Statisch (SAST):**
- Semgrep CE – kostenlos, Open Source, React/TypeScript-Support, CI/CD-Integration (GitHub Actions)
- `npm audit` / Dependabot für Dependency-Scans (Supply Chain)

**Dynamisch (DAST):**
- OWASP ZAP – kostenlos, Open Source, Standard-Tool für Web-Apps, Docker-Image für CI/CD verfügbar
- Hinweis: ZAP hat Schwächen bei SPA/React-Apps (AJAX-Spider), daher API-Endpunkte zusätzlich direkt gegen die OpenAPI-Spec scannen

**Empfehlung:** Beide Tools in GitHub Actions einbinden, Scan bei jedem Pull Request auf `main`.

## 9. Phasenplan

**Phase 1 – Grundgerüst & Security-Basis**
- Projekt-Setup (React + Vite, Supabase-Projekt)
- Auth-Flow (Signup/Login/Refresh)
- Datenbankschema mit Row-Level-Security
- CI/CD-Pipeline mit Semgrep + ZAP
- Home-Dashboard-Grundgerüst

**Phase 2 – Ernährungsbereich**
- Barcode-Scan + Open Food Facts Integration
- Eigene Produkt-DB + Community-Tabelle
- Manuelles Eingabeformular für unbekannte Produkte (ohne KI)
- Ernährungs-Dashboard (Tagesübersicht, Einträge)
- Gemini-Integration (Foto-Analyse, Etikett-OCR) als späteres Zusatzfeature, nicht in Erstversion

**Phase 3 – Trainingsbereich**
- Trainingsplan-Erstellung, Trainings-Dashboard
- Live-Session-Modus mit Pausen-Timer
- Satz-/Wiederholungs-Tracking, nachträgliche Bearbeitung
- Kalorienberechnung aus Trainingsdaten

**Phase 4 – Körperbereich & Health-Integration**
- Körper-Dashboard (Umfänge, Gewicht, Fotos, Verlauf)
- Apple Shortcuts-Automatisierung für Health-Sync
- Optional später: nativer Capacitor-Wrapper für echtes HealthKit

**Phase 5 – Härtung & Feinschliff**
- Vollständiger OWASP-Durchlauf
- Penetration-Test-Runde (manuell + ZAP Active Scan)
- PWA-Feinschliff (Offline-Fähigkeit, Install-Prompt)


## 10. Datenbankschema (Grundgerüst)

Relationale Struktur in Supabase/Postgres, gegliedert nach Bereichen. Jede Tabelle hat zusätzlich Standardfelder wie id, created_at, und wo relevant user_id für Row-Level-Security.

### Nutzer & Profil

**users / profiles**
- id
- name
- alter
- groesse
- aktuelles_gewicht (Referenzwert, wird auch in body_metrics fortgeschrieben)

### Ernährungsbereich

**products** (Community-Datenbank)
- id
- name
- barcode
- kalorien
- eiweiss
- fett
- kohlenhydrate
- created_by (user_id, wer den Eintrag angelegt hat)

**food_entries**
- id
- user_id
- product_id (Verweis auf products)
- menge
- zeitpunkt

### Trainingsbereich

**exercises** (importiert aus free-exercise-db + eigene Community-Einträge)
- id
- name
- kategorie / mechanik
- equipment
- muskelgruppen_primaer
- muskelgruppen_sekundaer
- bild_url
- met_wert (für Kalorienberechnung)
- created_by (nullable, nur bei eigenen Einträgen gesetzt)

**workout_plans**
- id
- user_id
- name
- aktiv (boolean, welcher Plan gerade aktiv ist)

**workout_plan_exercises** (Übungen innerhalb eines Plans)
- id
- workout_plan_id
- exercise_id
- reihenfolge
- ziel_saetze
- ziel_wiederholungen
- pausenzeit_sekunden

**workout_sessions** (eigentliche Trainingsdurchläufe)
- id
- user_id
- workout_plan_id
- gestartet_am
- beendet_am
- gesamt_kalorien (berechnet)

**workout_session_sets** (einzelne Sätze innerhalb einer Session)
- id
- workout_session_id
- exercise_id
- satz_nummer
- gewicht
- wiederholungen
- abgeschlossen_am

### Körperbereich

**body_metrics**
- id
- user_id
- datum
- gewicht
- bauchumfang
- beinumfang
- armumfang
- ruckenumfang
- brustumfang

**body_photos**
- id
- user_id
- datum
- foto_url

### Kalender

**day_status** (freie Zuordnung Trainingstag/Restday pro Tag, unabhängig von tatsächlichen Sessions, frei vom Nutzer wählbar)
- id
- user_id
- datum
- status (Trainingstag / Restday)

Das Home-Dashboard liest für die Kalenderansicht sowohl day_status (geplanter/gewählter Status) als auch workout_sessions (tatsächlich durchgeführtes Training) aus, um Plan und Realität gegenüberzustellen.

### Health-Sync

**health_sync_data**
- id
- user_id
- schritte
- weitere_health_metriken (je nach Bedarf erweiterbar)
- synced_at


## 10a. Projekt-Setup & Konventionen

- **Sprache:** TypeScript durchgehend (Frontend und ggf. Backend-Funktionen), für mehr Typsicherheit passend zum Sicherheitsanspruch
- **Node-Version:** aktuelle LTS-Version des Nutzers, keine feste alte Version vorgeschrieben
- **Namenskonvention:** Englisch, React-Standardkonventionen (z. B. kebab-case für Dateinamen, PascalCase für Komponenten)
- **Secrets-Handling:** Alle API-Keys (Supabase, Gemini) ausschließlich in .env-Datei, diese wird über .gitignore niemals ins Repository gepusht, .env.example als Vorlage ohne echte Werte im Repo

## 11. Offene Punkte für nächstes Gespräch

- Datenbankschema im Detail (Tabellen, Felder, Relationen) für alle vier Bereiche
- Genaue Gemini-Prompts für Foto-Analyse und OCR
- UI/UX-Grundstruktur der vier Dashboards im Detail
- Konkrete Kalorienberechnungsformel für Training (Gewicht × Wiederholungen × Übungstyp)
