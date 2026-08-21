# Design: Mahlzeiten-Abschnitte

**Stand:** 2026-08-20
**Status:** entworfen, noch nicht umgesetzt

## Ausgangslage

Die Eintragsseite listet alle Einträge eines Tages in einer flachen Liste. Wann etwas gegessen wurde, steht nur im Zeitstempel und ist beim Überfliegen nicht erkennbar. Üblich — und vom Nutzer gewünscht — ist eine Gliederung nach Mahlzeiten: Frühstück, Mittagessen, Abendessen, Snacks, dazu eigene Abschnitte.

## Ziele

1. Einträge nach Mahlzeiten gliedern, mit Kalorien je Abschnitt.
2. Beim Erfassen ergibt sich der Abschnitt daraus, in welchem Abschnitt „Hinzufügen" getippt wurde — kein zusätzliches Auswahlfeld im Erfassungs-Flow.
3. Abschnittsnamen frei wählbar, vier vorbelegt, bis zu zwei weitere.
4. Bestehende Einträge ohne Zuordnung bleiben sichtbar und lassen sich nachträglich einsortieren.

## Nicht-Ziele

- Unterschiedliche Abschnittsnamen an unterschiedlichen Tagen.
- Mehr als sechs Abschnitte, Sortieren per Drag-and-drop, Abschnitte mit festen Zeitfenstern.
- Automatische Zuordnung nach Uhrzeit.
- Portionen statt Gramm — eigenes Folgevorhaben.

## Datenmodell

Sechs feste Slots, nummeriert 1 bis 6. Die Nummer steht am Eintrag, die Namen stehen im Profil.

**Migration `0003_meal_sections.sql`:**

| Änderung | Zweck |
| --- | --- |
| `profiles.mahlzeit_1_name text not null default 'Frühstück'` | vorbelegt |
| `profiles.mahlzeit_2_name text not null default 'Mittagessen'` | vorbelegt |
| `profiles.mahlzeit_3_name text not null default 'Abendessen'` | vorbelegt |
| `profiles.mahlzeit_4_name text not null default 'Snacks'` | vorbelegt |
| `profiles.mahlzeit_5_name text` | optional, `null` = nicht in Benutzung |
| `profiles.mahlzeit_6_name text` | optional, `null` = nicht in Benutzung |
| `food_entries.mahlzeit smallint check (mahlzeit between 1 and 6)` | Zuordnung, nullable |

Keine neue Tabelle, keine neue RLS-Policy: Beide Tabellen sind bereits über `profiles_select_own`/`food_entries_all_own` abgesichert, und die Spalten erben diesen Schutz.

**Warum stabile Slot-Nummern statt eines Arrays.** Läge die Reihenfolge in einem `text[]`, wäre die Zuordnung die Position im Array. Entfernt der Nutzer den dritten Abschnitt, rutschen alle folgenden eine Position hoch, und sämtliche Einträge zeigen anschließend auf den falschen Abschnitt — eine stille Datenverfälschung ohne Fehlermeldung. Bei festen Nummern überlebt die Zuordnung jedes Umbenennen und jedes Leeren.

**Warum `mahlzeit` nullable ist.** Alle heute bestehenden Einträge haben keine Zuordnung. Ein `not null` mit Default würde sie pauschal in einen Abschnitt einsortieren, in dem sie nie waren. Stattdessen erscheinen sie in einer Gruppe „Ohne Zuordnung", die nur sichtbar ist, solange sie Einträge enthält.

## Abschnittsnamen lesen und schreiben

`useProfile` liefert die sechs Namensfelder wie die übrigen Profilspalten mit. Eine Funktion in `src/lib/meal-sections.ts` bildet daraus die Liste der aktiven Abschnitte:

```
mealSections(profile) → { slot: number; name: string }[]
```

Enthalten sind alle Slots mit nicht-leerem Namen, aufsteigend nach Slot. Ein Slot mit leerem Namen ist nicht in Benutzung.

Sonderfall: Enthält ein Slot ohne Namen noch Einträge, muss er trotzdem angezeigt werden — sonst verschwänden Einträge aus der Ansicht, ohne gelöscht zu sein. Dafür gibt es eine zweite Funktion, die zusätzlich die belegten Slots berücksichtigt:

```
visibleSections(profile, entries) → { slot: number | null; name: string }[]
```

Sie liefert die aktiven Abschnitte, ergänzt um benannte Platzhalter für belegte Slots ohne Namen (`Abschnitt 5`) und — nur wenn nicht leer — die Gruppe für Einträge ohne Zuordnung (`slot: null`, Name „Ohne Zuordnung"). Die Gruppe steht am Ende.

## Eintragsseite

`/nutrition/entries` gruppiert nach `visibleSections`. Jede Gruppe zeigt Namen, die Kalorien-Summe ihrer Einträge und darunter die Einträge selbst, gefolgt von „+ Hinzufügen". Der Button öffnet den bestehenden Erfassungs-Flow und setzt beim Anlegen `mahlzeit` auf den Slot der Gruppe.

Leere aktive Abschnitte bleiben sichtbar, damit ihr „+ Hinzufügen" erreichbar ist. Die Gruppe „Ohne Zuordnung" hat keinen Hinzufügen-Button — dort landet nichts Neues.

## Dashboard

`/nutrition` zeigt weiterhin die Tagesbilanz und darunter je aktivem Abschnitt eine Zeile mit Namen und Kalorien, die in die Eintragsseite verlinkt. Der bisherige Erfassungs-Flow entfällt dort: Ein Eintrag braucht einen Abschnitt, und den gibt es nur dort, wo die Abschnitte stehen.

## Profilseite

Ein Abschnitt „Mahlzeiten" mit sechs Namensfeldern, gespeichert über denselben „Speichern"-Knopf wie die übrigen Profildaten. Leerer Name heißt: Abschnitt wird nicht angezeigt.

Namen werden auf 40 Zeichen begrenzt — sie stehen als Überschrift in einer Liste, längere Namen brechen das Layout, und ein Abschnittsname braucht nicht mehr.

Die vier vorbelegten Namen sind `not null`. Leert der Nutzer eines dieser Felder, setzt das Formular vor dem Speichern den Standardnamen wieder ein, statt einen leeren Titel zu schreiben — die Datenbank wehrt das zwar auch ab, aber eine abgelehnte Speicherung wäre für den Nutzer eine schlechtere Antwort als ein wiederhergestellter Name. Slots 5 und 6 dürfen leer bleiben.

## Eintrag bearbeiten

`FoodEntryEditForm` bekommt ein Auswahlfeld für den Abschnitt, gefüllt aus `mealSections` plus „Ohne Zuordnung". Damit lässt sich ein falsch einsortierter Eintrag umhängen — und die Alt-Einträge ohne Zuordnung nachträglich zuordnen. Das Feld schreibt `mahlzeit` in den bestehenden `EntryPatch`.

## Komponenten

| Datei | Änderung |
| --- | --- |
| `supabase/migrations/0003_meal_sections.sql` | neu — Spalten und CHECK-Constraint |
| `src/lib/meal-sections.ts` | neu — `mealSections`, `visibleSections` |
| `src/hooks/use-profile.ts` | `Profile` um die sechs Namensfelder erweitert |
| `src/hooks/use-food-entries.ts` | `mahlzeit` laden, `addEntry` nimmt den Slot entgegen, `EntryPatch` um `mahlzeit` erweitert |
| `src/pages/NutritionEntriesPage.tsx` | gruppiert nach Abschnitten, je Gruppe ein Erfassungs-Flow |
| `src/components/FoodEntryList.tsx` | rendert die Einträge einer Gruppe statt aller |
| `src/components/FoodEntryEditForm.tsx` | Auswahlfeld für den Abschnitt |
| `src/pages/NutritionPage.tsx` | Abschnitts-Zeilen mit Kalorien statt Erfassungs-Flow |
| `src/pages/ProfilePage.tsx` | Sektion „Mahlzeiten" mit sechs Namensfeldern |

## Fehlerbehandlung

Unverändert zum bestehenden Verhalten: Fehlgeschlagene Schreibvorgänge werfen, werden sichtbar gemeldet, und das Formular bleibt offen. Ein `mahlzeit`-Wert außerhalb 1–6 kann über die Oberfläche nicht entstehen; die CHECK-Constraint ist die zweite Schicht.

## Tests

- `mealSections` liefert nur Slots mit Namen, aufsteigend; leere Slots fehlen.
- `visibleSections` ergänzt einen belegten Slot ohne Namen als Platzhalter und hängt „Ohne Zuordnung" nur an, wenn solche Einträge existieren.
- Die Eintragsseite gruppiert Einträge korrekt und zeigt je Abschnitt die Summe `kalorien × menge / 100`.
- „+ Hinzufügen" in einem Abschnitt legt den Eintrag mit dessen Slot an — geprüft für zwei verschiedene Abschnitte, damit ein fest verdrahteter Slot auffällt.
- Ein Eintrag ohne Zuordnung erscheint in der Gruppe am Ende, nicht in Abschnitt 1.
- Das Bearbeiten-Formular hängt einen Eintrag auf einen anderen Abschnitt um.
- Die Profilseite speichert die sechs Namen; ein geleerter Pflicht-Slot fällt auf den Default zurück.
- Migration `0003`: Spaltennamen, Defaults und die CHECK-Constraint, analog zu den bestehenden Migrationstests.

## Folgevorhaben

1. **Portionen statt Gramm.** Produkte bekommen eine Portionsdefinition, Einträge speichern die Portionsanzahl.
2. **Reihenfolge der Abschnitte ändern.** Heute ist sie durch die Slot-Nummer festgelegt. Eine freie Sortierung bräuchte ein zusätzliches Positionsfeld — erst sinnvoll, wenn jemand die Reihenfolge wirklich vermisst.
