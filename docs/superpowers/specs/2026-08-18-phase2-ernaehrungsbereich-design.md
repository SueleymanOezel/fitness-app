# Phase 2 (Ernährungsbereich) Design

**Goal:** Nutzer können Mahlzeiten per Barcode-Scan oder manueller Eingabe erfassen, sehen eine Tagesübersicht ihrer Kalorien/Makros gegen ein Ziel, und können dieses Ziel entweder manuell setzen oder aus Profildaten berechnen lassen.

**Vorherige Phase:** Phase 1 (Grundgerüst & Security-Basis) ist gemerged und deployed — Auth, Routing, RLS-Basisschema inkl. `products`/`food_entries` existieren bereits (`supabase/migrations/0001_initial_schema.sql`).

**Referenzdokumente:** `docs/fitness-app-architektur.md` (Gesamtkonzept, §4.3 Ernährungs-Dashboard, §9 Phasenplan), `docs/domaenenmodell.md` (ERD, bei diesem Phase-2-Schema-Update mit fortzuschreiben).

## Out of Scope

- Gemini-Foto-Analyse/OCR für Mahlzeiten und Nährwertetiketten (spätere Phase, laut Architekturdoku explizit als "Luxus"-Feature zurückgestellt)
- Produkt-Verifizierung/Moderation-UI für Community-Einträge in `products`
- Home-Dashboard-Kalorienkachel (Home bleibt Platzhalter, siehe Phase 1)
- Wochen-/Zeitraum-Statistiken über `food_entries` (nur Tagesansicht)

## 1. Datenmodell-Ergänzung (Migration `0002`)

**`profiles`** — vier neue nullable Spalten:

| Spalte | Typ | Constraint |
|---|---|---|
| `geschlecht` | `text` | `check (geschlecht in ('maennlich','weiblich'))` |
| `aktivitaetslevel` | `text` | `check (aktivitaetslevel in ('sitzend','leicht','moderat','hoch','sehr_hoch'))` |
| `ziel` | `text` | `check (ziel in ('abnehmen','halten','zunehmen'))` |
| `ziel_delta_kcal` | `numeric` | `not null default 500` |
| `taegliches_kalorienziel` | `numeric` | nullable — manueller Override |

Bestehende RLS-Policies (`profiles_select_own`, `profiles_update_own`) decken die neuen Spalten automatisch mit ab, keine Policy-Änderung nötig.

**`products`** — ein neuer Constraint:

```sql
create unique index products_barcode_unique on public.products (barcode) where barcode is not null;
```

Ermöglicht `upsert(..., onConflict: 'barcode')` beim Cachen von Open-Food-Facts-Treffern, ohne Duplikate.

### 1a. Einheiten-Konvention (bisher nirgends festgelegt)

Weder das Phase-1-Schema noch die Architekturdoku legen fest, in welcher Einheit `products`-Nährwerte und `food_entries.menge` stehen — ohne das rechnet die Tagesübersicht falsch. Festlegung für Phase 2 (passend zum Open-Food-Facts-Standard):

- `products.kalorien/eiweiss/fett/kohlenhydrate` = Werte **pro 100 g**
- `food_entries.menge` = Menge des Eintrags **in Gramm**
- Tatsächliche Kalorien eines Eintrags = `products.kalorien × food_entries.menge / 100`

`ManualProductForm` beschriftet die Eingabefelder entsprechend ("pro 100 g"), der Mengen-Dialog fragt nach Gramm.

## 2. Datenfluss & Komponenten

```
NutritionPage (Route /nutrition, ersetzt den Phase-1-Platzhalter)
├── DailySummary          — verbraucht/Ziel/offen heute, Makro-Balken (Eiweiß/Fett/Kohlenhydrate)
├── CalorieGoalEditor      — Umschalter manuell/berechnet, Eingabefelder je Modus
├── FoodEntryList          — heutige Einträge (Produktname, Menge, Kalorien), Menge editierbar, löschbar
└── AddEntryFlow
    ├── BarcodeScanner     — Kamera-Overlay (@zxing/browser), liefert dekodierten Barcode-String
    │     → Lookup-Reihenfolge bei erkanntem Barcode:
    │        1. `products` lokal per `barcode` abfragen
    │        2. kein Treffer → Open Food Facts abfragen; Treffer wird per Upsert in `products` gecacht (`created_by = null`)
    │        3. kein Treffer irgendwo → ManualProductForm mit vorausgefülltem Barcode
    │     → Treffer/neu angelegtes Produkt → Mengen-Dialog → Insert in `food_entries`
    └── "Manuell hinzufügen"-Button — überspringt die Kamera, öffnet ManualProductForm ohne Barcode
         → gespeichertes Produkt bekommt `created_by = auth.uid()` (Community-Eintrag)
```

**Neue Dateien:**
- `src/lib/open-food-facts.ts` — `fetchProductByBarcode(barcode): Promise<OffProduct | null>`, Fetch gegen `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`, normalisiert auf `{ name, kalorien, eiweiss, fett, kohlenhydrate }`, `null` bei Nicht-gefunden/Netzwerkfehler (Fehler wird geloggt, nicht geworfen — UI fällt auf ManualProductForm zurück)
- `src/lib/nutrition-goal.ts` — `calculateCalorieGoal(profile): number | null` (reine Funktion, `null` wenn Pflichtfelder fehlen), Mifflin-St-Jeor + Aktivitätsfaktor + Ziel-Delta
- `src/hooks/use-food-entries.ts` — heutige Einträge für `auth.uid()` laden/anlegen/aktualisieren/löschen
- `src/hooks/use-profile.ts` — eigenes Profil laden/aktualisieren (für die neuen Ziel-Felder)
- `src/components/BarcodeScanner.tsx`, `src/components/DailySummary.tsx`, `src/components/CalorieGoalEditor.tsx`, `src/components/FoodEntryList.tsx`, `src/components/ManualProductForm.tsx`

**Barcode-Bibliothek:** `@zxing/browser` (neue Dependency) — ein Codepfad, funktioniert auf iOS Safari/Android/Windows gleichermaßen über `<video>` + Canvas-Frame-Sampling, kein Feature-Detection-Zweig für native Browser-APIs nötig.

## 3. Kalorienziel-Berechnung

Mifflin-St-Jeor-BMR (Standardformel):
- männlich: `10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter + 5`
- weiblich: `10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter − 161`

TDEE = BMR × Aktivitätsfaktor:

| `aktivitaetslevel` | Faktor |
|---|---|
| `sitzend` | 1.2 |
| `leicht` | 1.375 |
| `moderat` | 1.55 |
| `hoch` | 1.725 |
| `sehr_hoch` | 1.9 |

Ziel-Anpassung: `abnehmen` → TDEE − `ziel_delta_kcal`, `zunehmen` → TDEE + `ziel_delta_kcal`, `halten` → TDEE unverändert.

`taegliches_kalorienziel` (manueller Wert) überschreibt die Berechnung, wenn gesetzt. Fehlen für die Berechnung nötige Profilfelder (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel — `aktuelles_gewicht`/`groesse`/`alter` existieren bereits aus Phase 1), zeigt `CalorieGoalEditor` einen Hinweis "Profil vervollständigen" statt eines Ergebnisses; kein Crash, keine geschätzten Platzhalterwerte.

## 4. Testing-Strategie

- `nutrition-goal.ts`: vollständige Unit-Tests aller Formel-Pfade (beide Geschlechter, alle Aktivitätslevel, alle Ziel-Typen, fehlende Pflichtfelder → `null`, manueller Override gewinnt)
- `open-food-facts.ts`: `fetch` gemockt — Treffer, Nicht-gefunden (404/leere Antwort), Netzwerkfehler
- `use-food-entries.ts`, `use-profile.ts`: Supabase-Client gemockt, gleiches Muster wie `use-session.test.ts` aus Phase 1
- `BarcodeScanner`: `@zxing/browser` gemockt, nur Zustandsübergänge (Scanning → Decoded → Error) getestet — echte Kamera ist in CI nicht simulierbar
- Restliche Komponenten: React Testing Library, gleiches Muster wie Phase 1 (`LoginPage.test.tsx` etc.)

## 5. Sicherheitsanforderungen (Phase-1-Konventionen fortgeführt)

- Kein `service_role`-Key im Client-Code, nur `anon`
- Row-Level-Security auf allen neuen/geänderten Constraints unverändert aktiv, keine Policy wird gelockert
- Open-Food-Facts-Fetch läuft ohne Secrets/Keys (öffentliche API), keine Nutzerdaten werden dorthin gesendet — nur der eingescannte Barcode
- Manuelle Produkteingaben serverseitig durch bestehende Spalten-Constraints validiert (z. B. `kalorien not null`), zusätzlich clientseitige Validierung vor dem Insert
