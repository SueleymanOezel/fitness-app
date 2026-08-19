# Design: Einträge und Produkte bearbeiten

**Stand:** 2026-08-19
**Status:** entworfen, noch nicht umgesetzt

## Ausgangslage

Nach Phase 2 lässt sich an einem erfassten Eintrag nur die Menge ändern — und das über ein Zahlenfeld ohne Beschriftung, das erst beim Verlassen speichert. Im manuellen Test wurde diese Möglichkeit schlicht nicht gefunden. Zeitpunkt und Produktzuordnung sind gar nicht änderbar, und ein Produkt mit falschen Nährwerten bleibt dauerhaft falsch: Ein Tippfehler beim manuellen Anlegen oder ein fehlerhafter Wert aus Open Food Facts verfälscht die Tagesbilanz bei jeder weiteren Verwendung.

## Ziele

1. Menge, Zeitpunkt und Produkt eines Eintrags nachträglich ändern.
2. Nährwerte eines Produkts korrigieren, ohne fremde Daten zu beschädigen.
3. Die Bearbeitungsmöglichkeit sichtbar machen, statt sie in einem unbeschrifteten Feld zu verstecken.

## Nicht-Ziele

- Mahlzeiten-Abschnitte (Frühstück, Mittagessen …) — eigenes Folgevorhaben.
- Portionsgrößen statt Gramm — eigenes Folgevorhaben, siehe „Folgevorhaben".
- Produkte löschen, Produkt-Änderungshistorie, Mehrfachauswahl.
- Einträge über mehrere Tage kopieren.

## Datenmodell

**Keine Migration.** `food_entries` und `products` bleiben unverändert; alle Ziele lassen sich mit dem bestehenden Schema erreichen.

## Produkt-Eigentum und Kopie-Regel

`products` ist eine geteilte Tabelle: Mehrere Nutzer verweisen auf dieselbe Zeile, und die INSERT-Policy erlaubt nur `created_by = auth.uid()`. Wer dort Werte ändert, ändert die Bilanz aller anderen mit — die Whole-Branch-Review aus Phase 2 hat das als offene Policy-Frage vermerkt.

Beim Speichern korrigierter Nährwerte entscheidet daher der Eigentümer:

| `created_by` des Produkts | Verhalten |
| --- | --- |
| aktueller Nutzer | Produkt direkt aktualisieren, `barcode` bleibt erhalten |
| anderer Nutzer | Kopie anlegen mit `barcode: null` und `created_by` = aktueller Nutzer, Eintrag auf die Kopie umhängen |
| `null` | wie fremdes Produkt behandeln (fail-safe) |

Der Fall „eigenes Produkt" deckt heute praktisch alles ab, weil auch per Barcode gecachte Zeilen den `created_by` des ersten Scanners tragen. Dadurch bleibt der Barcode am korrigierten Produkt und ein späterer Scan liefert die korrigierten Werte.

Die Kopie trägt bewusst **keinen** Barcode: Auf `products.barcode` liegt ein globaler Unique-Index (`products_barcode_unique`), zwei Zeilen mit demselben Barcode sind unmöglich. Bekannte Folge: Wird das Produkt eines *anderen* Nutzers korrigiert, liefert ein späterer Scan desselben Barcodes wieder das unkorrigierte Original. Das wird in Kauf genommen, weil der Fall bei einem Einzelnutzer nicht auftritt und die Alternative — Unique-Index auf `(barcode, created_by)` — eine Migration und eine Vorrangregel im Lookup erfordert.

Zuständig ist `src/lib/product-edit.ts` mit einer Funktion, die Produkt, Änderungen und Nutzer-ID entgegennimmt und das zu verwendende Produkt zurückgibt — aktualisiert oder neu angelegt. Der Aufrufer hängt den Eintrag anschließend darauf um.

## Validierung

Die Nährwert-Validierung liegt heute als `parseNutrients` in `ManualProductForm` und prüft plausible Bereiche (Kalorien 0–900, Makros 0–100 je 100 g). Sie wandert nach `src/lib/nutrients.ts` und wird von beiden Formularen genutzt, damit die Grenzen nicht auseinanderlaufen.

Die Menge wird wie im Erfassungsdialog geprüft: größer als 0 und endlich. `Number('')` ergibt 0, nicht `NaN` — ein Guard, der ausschließlich auf `NaN` prüft, lässt die 0 durch und hat in Phase 2 bereits zu Datenverlust geführt.

## Eintrag bearbeiten

`useFoodEntries` ersetzt `updateEntryMenge(entryId, menge)` durch `updateEntry(entryId, patch)` für `menge`, `zeitpunkt` und `product_id`. Wie die übrigen Schreibpfade wirft die Funktion bei einem abgelehnten Update, statt den Fehler zu verschlucken: supabase-js liefert Fehler als Rückgabewert und nicht als Exception, ungeprüft sähe jedes fehlgeschlagene Speichern nach Erfolg aus.

Der Zeitpunkt wird als `datetime-local` bearbeitet. Dieses Eingabefeld liefert lokale Zeit ohne Zeitzone, gespeichert wird `timestamptz` — die Umrechnung erfolgt explizit über die lokalen Datumsbestandteile, nicht über String-Manipulation an der ISO-Darstellung. Dieselbe Verwechslung von UTC und lokaler Zeit hat in Phase 2 die Tagesgrenze in `todayRange()` verschoben.

Wird ein Eintrag auf einen anderen Tag datiert, verschwindet er aus der Heute-Liste. Das ist beabsichtigt: Eine Tagesansicht, die Einträge anderer Tage zeigt, wäre inkonsistent.

## Produkt tauschen

Die Produktsuche steckt heute in `AddEntryFlow`: Barcode scannen, Nummer eintippen, manuell anlegen. Sie wird als `ProductPicker` herausgelöst, die ein gefundenes oder angelegtes Produkt zurückgibt. `AddEntryFlow` und das Bearbeiten-Formular nutzen dieselbe Komponente; ohne diesen Schritt existierte die Suche zweimal im Code.

## Komponenten

| Datei | Änderung |
| --- | --- |
| `src/lib/nutrients.ts` | neu — Nährwert-Validierung, aus `ManualProductForm` extrahiert |
| `src/lib/product-edit.ts` | neu — aktualisieren oder Kopie anlegen, je nach Eigentümer |
| `src/components/ProductPicker.tsx` | neu — Produktsuche, aus `AddEntryFlow` extrahiert |
| `src/components/FoodEntryEditForm.tsx` | neu — Formular für Menge, Zeitpunkt, Produkt, Nährwerte |
| `src/components/FoodEntryList.tsx` | Zeile zeigt Werte an, „Bearbeiten" klappt das Formular auf |
| `src/components/AddEntryFlow.tsx` | nutzt `ProductPicker` |
| `src/components/ManualProductForm.tsx` | nutzt `nutrients.ts` |
| `src/hooks/use-food-entries.ts` | `updateEntry` statt `updateEntryMenge` |
| `src/pages/NutritionEntriesPage.tsx` | reicht `updateEntry` durch |

Die Liste zeigt je Eintrag Produktname, Menge und Kalorien sowie die Schaltflächen „Bearbeiten" und „Löschen". Das Formular ersetzt beim Aufklappen die Anzeige und schließt bei „Speichern" oder „Abbrechen".

## Fehlerbehandlung

Ein fehlgeschlagenes Speichern zeigt eine Meldung und stellt die gespeicherten Werte wieder her, statt die eingegebenen stehen zu lassen — ein Wert auf dem Bildschirm, der nicht in der Datenbank steht, ist schlimmer als eine Fehlermeldung. Rohe Datenbankmeldungen erscheinen nicht in der Oberfläche.

## Tests

- Eigenes Produkt wird aktualisiert, der Barcode bleibt erhalten.
- Fremdes Produkt erzeugt eine Kopie ohne Barcode, der Eintrag wird umgehängt, das Original bleibt unverändert.
- Produkt ohne `created_by` wird wie ein fremdes behandelt.
- Implausible Nährwerte und eine Menge von 0 werden vor dem Schreiben abgelehnt.
- Der Zeitpunkt überlebt die Umrechnung zwischen lokaler Zeit und `timestamptz`, geprüft mit fixierter Zeitzone an einer Tagesgrenze.
- `updateEntry` wirft bei einem abgelehnten Update; das Formular zeigt den Fehler und stellt die alten Werte wieder her.
- Die Liste zeigt „Bearbeiten" und klappt das Formular auf.

## Folgevorhaben

1. **Mahlzeiten-Abschnitte.** Feste Slots statt frei definierbarer Liste: vier vorbelegte, bis zu zwei weitere, Namen frei wählbar und für alle Tage gleich. Ein Slot-Feld am Eintrag und die Namen in den Profildaten genügen — keine eigene Tabelle, keine Sortier- und Löschregeln. Dieses Modell hat sich in etablierten Ernährungs-Tracking-Apps durchgesetzt.
2. **Portionen statt Gramm.** Produkte bekommen eine Portionsdefinition (Bezeichnung und Gramm), Einträge speichern die Portionsanzahl. Das beschleunigt das Erfassen erheblich, ändert aber Produktmodell sowie jeden Erfassungs- und Bearbeitungspfad und gehört deshalb in ein eigenes Vorhaben.
3. **Unique-Index auf `(barcode, created_by)`**, falls die App mehrere Nutzer bekommt — dann liefert ein Scan die eigene korrigierte Version statt der geteilten.
