# Domänenmodell & ERD

Lebendes Dokument — bei jeder neuen Migration (`supabase/migrations/*.sql`) hier nachziehen, damit Diagramm und Domänenbeschreibung immer den tatsächlichen DB-Stand widerspiegeln. Quelle der Wahrheit ist die jeweils neueste Migration; dieses Dokument ist die menschenlesbare Projektion davon.

## Bereiche

- **Nutzer & Profil** — `profiles`, 1:1 mit Supabase Auth (`auth.users`)
- **Ernährung** — `products` (Community-Datenbank), `food_entries`
- **Training** — `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_sessions`, `workout_session_sets`
- **Körper** — `body_metrics`, `body_photos`
- **Kalender** — `day_status`
- **Health-Sync** — `health_sync_data`

Jede Tabelle (außer `profiles`, das per Trigger `handle_new_user` automatisch angelegt wird) hat Row-Level-Security: Nutzer sehen/ändern ausschließlich eigene Zeilen (`user_id = auth.uid()`), mit Ausnahme der geteilten Community-Tabellen `products` und `exercises` (für alle authentifizierten Nutzer lesbar, aber nur vom Ersteller änderbar).

## ERD

```mermaid
erDiagram
    profiles ||--o{ food_entries : "erstellt"
    profiles ||--o{ products : "erstellt (created_by)"
    profiles ||--o{ exercises : "erstellt (created_by)"
    profiles ||--o{ workout_plans : "besitzt"
    profiles ||--o{ workout_sessions : "besitzt"
    profiles ||--o{ body_metrics : "besitzt"
    profiles ||--o{ body_photos : "besitzt"
    profiles ||--o{ day_status : "besitzt"
    profiles ||--o{ health_sync_data : "besitzt"

    products ||--o{ food_entries : "referenziert"

    exercises ||--o{ workout_plan_exercises : "referenziert"
    exercises ||--o{ workout_session_sets : "referenziert"

    workout_plans ||--o{ workout_plan_exercises : "enthält"
    workout_plans ||--o{ workout_sessions : "wird durchgeführt in"

    workout_sessions ||--o{ workout_session_sets : "enthält"

    profiles {
        uuid id PK "= auth.users.id"
        text name
        int alter
        numeric groesse
        numeric aktuelles_gewicht
        string geschlecht
        string aktivitaetslevel
        string ziel
        numeric ziel_delta_kcal
        numeric taegliches_kalorienziel
        string mahlzeit_1_name
        string mahlzeit_2_name
        string mahlzeit_3_name
        string mahlzeit_4_name
        string mahlzeit_5_name
        string mahlzeit_6_name
    }

    products {
        uuid id PK
        text name
        text barcode
        numeric kalorien
        numeric eiweiss
        numeric fett
        numeric kohlenhydrate
        uuid created_by FK
    }

    food_entries {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        numeric menge
        timestamptz zeitpunkt
        int mahlzeit
    }

    exercises {
        uuid id PK
        text name
        text kategorie
        text equipment
        text_array muskelgruppen_primaer
        text_array muskelgruppen_sekundaer
        numeric met_wert
        uuid created_by FK
    }

    workout_plans {
        uuid id PK
        uuid user_id FK
        text name
        boolean aktiv
    }

    workout_plan_exercises {
        uuid id PK
        uuid workout_plan_id FK
        uuid exercise_id FK
        int reihenfolge
        int ziel_saetze
        int ziel_wiederholungen
        int pausenzeit_sekunden
    }

    workout_sessions {
        uuid id PK
        uuid user_id FK
        uuid workout_plan_id FK
        timestamptz gestartet_am
        timestamptz beendet_am
        numeric gesamt_kalorien
    }

    workout_session_sets {
        uuid id PK
        uuid workout_session_id FK
        uuid exercise_id FK
        int satz_nummer
        numeric gewicht
        int wiederholungen
        timestamptz abgeschlossen_am
    }

    body_metrics {
        uuid id PK
        uuid user_id FK
        date datum
        numeric gewicht
        numeric bauchumfang
        numeric beinumfang
        numeric armumfang
        numeric ruckenumfang
        numeric brustumfang
    }

    body_photos {
        uuid id PK
        uuid user_id FK
        date datum
        text foto_url
    }

    day_status {
        uuid id PK
        uuid user_id FK
        date datum
        text status
    }

    health_sync_data {
        uuid id PK
        uuid user_id FK
        int schritte
        jsonb weitere_health_metriken
        timestamptz synced_at
    }
```

## Fachliche Notizen

- `products` und `exercises` sind geteilte Community-Tabellen (kein `user_id`-Owner-Filter beim Lesen), `created_by` markiert nur, wer den Eintrag ursprünglich angelegt hat.
- `day_status` (geplanter Status) und `workout_sessions` (tatsächlich durchgeführtes Training) sind bewusst getrennt — das Home-Dashboard gleicht Plan gegen Realität ab.
- `body_metrics` und `day_status` haben je einen `unique (user_id, datum)`-Constraint — pro Nutzer und Tag genau ein Eintrag.
- `profiles.geschlecht/aktivitaetslevel/ziel/ziel_delta_kcal` speisen die Mifflin-St-Jeor-Berechnung des Kalorienziels (`src/lib/nutrition-goal.ts`); `taegliches_kalorienziel` überschreibt die Berechnung, wenn gesetzt. `products.barcode` hat seit Phase 2 einen Unique-Index für nicht-null-Werte (`products_barcode_unique`).
- `profiles.mahlzeit_1_name` bis `_6_name` benennen sechs feste Mahlzeiten-Slots; `food_entries.mahlzeit` verweist als stabile Nummer 1–6 darauf und ist `null`, solange ein Eintrag keinem Abschnitt zugeordnet ist. Bewusst keine Array-Positionen: Beim Entfernen eines Abschnitts würden sonst alle nachfolgenden Einträge still auf den falschen Abschnitt zeigen.
- Quelle: `supabase/migrations/0001_initial_schema.sql` (Stand Phase 2 + Mahlzeiten-Abschnitte, inkl. `0003_meal_sections.sql`).
