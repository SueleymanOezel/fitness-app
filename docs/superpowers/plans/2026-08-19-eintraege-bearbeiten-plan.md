# Einträge und Produkte bearbeiten — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menge, Zeitpunkt und Produkt eines Eintrags nachträglich ändern, und Nährwerte eines Produkts korrigieren, ohne fremde Daten zu beschädigen.

**Architecture:** Zwei neue Bibliotheksmodule (Nährwert-Validierung, Produkt-Speicherung mit Eigentümerregel) tragen die Logik. Die Produktsuche wird aus `AddEntryFlow` als wiederverwendbare Komponente herausgelöst und vom neuen Bearbeiten-Formular mitgenutzt. Die Eintragsliste zeigt Werte an und klappt das Formular über eine beschriftete Schaltfläche auf.

**Tech Stack:** React 19 + TypeScript, Vite 8, Vitest 4 mit jsdom + Testing Library, Supabase (postgrest-js), React Router 7.

**Spec:** `docs/superpowers/specs/2026-08-19-eintraege-bearbeiten-design.md`

## Global Constraints

- **Keine Migration.** `food_entries` und `products` bleiben unverändert.
- **Keine Drittanbieter-Produktnamen** in Code, Kommentaren, Doku oder Commit-Messages.
- Code und Bezeichner englisch, Oberflächentexte deutsch. Dateien kebab-case, Komponenten PascalCase.
- Schreibpfade werfen bei Fehlern. supabase-js liefert Fehler als Rückgabewert statt als Exception; ungeprüft sieht jedes fehlgeschlagene Speichern nach Erfolg aus.
- Mengen- und Nährwertprüfung nie allein über `Number.isNaN`: `Number('')` ergibt `0`, nicht `NaN`.
- Nährwertgrenzen: Kalorien 0–900, Makros 0–100 je 100 g. Namen auf `MAX_NAME_LENGTH` (200) gekürzt.
- Vor jedem Commit: `npm test`, `npm run lint`, `npx tsc -b --noEmit` müssen grün sein.
- TDD: erst der fehlschlagende Test, Fehlschlag beobachten, dann die minimale Implementierung.

---

### Task 1: Nährwert-Validierung als eigenes Modul

`parseNutrients` steckt heute in `ManualProductForm` und wird ab Task 5 von einem zweiten Formular gebraucht. Zwei Kopien würden auseinanderlaufen.

**Files:**
- Create: `src/lib/nutrients.ts`
- Create: `src/lib/nutrients.test.ts`
- Modify: `src/components/ManualProductForm.tsx` (Funktion entfernen, importieren)

**Interfaces:**
- Consumes: nichts
- Produces: `parseNutrients(raw: NutrientInput): Nutrients | null`, `type Nutrients = { kalorien: number; eiweiss: number | null; fett: number | null; kohlenhydrate: number | null }`, `type NutrientInput = Record<'kalorien' | 'eiweiss' | 'fett' | 'kohlenhydrate', string>`

- [ ] **Step 1: Write the failing test**

`src/lib/nutrients.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseNutrients } from './nutrients'

describe('parseNutrients', () => {
  it('parses plausible values', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '10', fett: '5', kohlenhydrate: '30' })).toEqual({
      kalorien: 250,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 30,
    })
  })

  it('keeps empty macros as null', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '', fett: '', kohlenhydrate: '' })).toEqual({
      kalorien: 250,
      eiweiss: null,
      fett: null,
      kohlenhydrate: null,
    })
  })

  it('rejects a negative calorie value', () => {
    expect(parseNutrients({ kalorien: '-300', eiweiss: '', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects calories above 900 per 100 g', () => {
    expect(parseNutrients({ kalorien: '1e21', eiweiss: '', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects a macro above 100 g per 100 g', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '150', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects missing calories', () => {
    // Number('') is 0, not NaN — an isNaN-only guard would let this through.
    expect(parseNutrients({ kalorien: '', eiweiss: '10', fett: '', kohlenhydrate: '' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/nutrients.test.ts`
Expected: FAIL mit `Failed to resolve import "./nutrients"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/nutrients.ts`:

```ts
export type Nutrients = {
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

export type NutrientInput = Record<'kalorien' | 'eiweiss' | 'fett' | 'kohlenhydrate', string>

/**
 * products is a shared table — a typo'd -300 or 1e21 would poison everyone's
 * totals, so implausible values never reach the database. Empty macros stay null,
 * missing calories reject the whole set.
 */
export function parseNutrients(raw: NutrientInput): Nutrients | null {
  const parse = (value: string, max: number) => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined
  }

  const kalorien = parse(raw.kalorien, 900)
  const eiweiss = parse(raw.eiweiss, 100)
  const fett = parse(raw.fett, 100)
  const kohlenhydrate = parse(raw.kohlenhydrate, 100)

  if (kalorien == null || eiweiss === undefined || fett === undefined || kohlenhydrate === undefined) {
    return null
  }
  return { kalorien, eiweiss, fett, kohlenhydrate }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/nutrients.test.ts`
Expected: PASS, 6 Tests

- [ ] **Step 5: Use it in ManualProductForm**

In `src/components/ManualProductForm.tsx` die lokale Funktion `parseNutrients` samt ihrem Doc-Kommentar **löschen** (aktuell Zeilen 12–32) und stattdessen importieren:

```tsx
import { parseNutrients } from '../lib/nutrients'
```

Der Aufruf in `handleSubmit` bleibt unverändert.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: alle Tests grün, insbesondere `src/components/ManualProductForm.test.tsx` unverändert bestanden

- [ ] **Step 7: Commit**

```bash
git add src/lib/nutrients.ts src/lib/nutrients.test.ts src/components/ManualProductForm.tsx
git commit -m "refactor: extract nutrient validation into its own module"
```

---

### Task 2: Produkt speichern nach Eigentümerregel

**Files:**
- Create: `src/lib/product-edit.ts`
- Create: `src/lib/product-edit.test.ts`

**Interfaces:**
- Consumes: `Product` aus `src/lib/product-lookup.ts` (`{ id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate }`), `Nutrients` aus Task 1
- Produces: `saveProductEdit(product: EditableProduct, patch: ProductPatch, userId: string): Promise<Product>`, `type EditableProduct = { id: string; created_by: string | null }`, `type ProductPatch = Nutrients & { name: string }`

- [ ] **Step 1: Write the failing test**

`src/lib/product-edit.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }))

const patch = { name: 'Haferflocken', kalorien: 350, eiweiss: 13, fett: 7, kohlenhydrate: 59 }

describe('saveProductEdit', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates the product in place when it belongs to the user', async () => {
    const updated = { id: 'p1', barcode: '4001234567890', ...patch }
    const builder = createQueryBuilder({ data: updated })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit({ id: 'p1', created_by: 'u1' }, patch, 'u1')

    expect(result).toEqual(updated)
    expect(builder.update).toHaveBeenCalledWith(patch)
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('copies the product instead of overwriting when it belongs to someone else', async () => {
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit({ id: 'p1', created_by: 'someone-else' }, patch, 'u1')

    expect(result).toEqual(copy)
    // The shared row must stay untouched, and the copy carries no barcode:
    // products_barcode_unique is global, two rows cannot share one.
    expect(builder.update).not.toHaveBeenCalled()
    expect(builder.insert).toHaveBeenCalledWith({ ...patch, barcode: null, created_by: 'u1' })
  })

  it('treats a product without an owner as someone else\'s', async () => {
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    await saveProductEdit({ id: 'p1', created_by: null }, patch, 'u1')

    expect(builder.insert).toHaveBeenCalled()
    expect(builder.update).not.toHaveBeenCalled()
  })

  it('throws when the write is rejected instead of reporting success', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'denied' } }))

    const { saveProductEdit } = await import('./product-edit')
    await expect(saveProductEdit({ id: 'p1', created_by: 'u1' }, patch, 'u1')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/product-edit.test.ts`
Expected: FAIL mit `Failed to resolve import "./product-edit"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/product-edit.ts`:

```ts
import { supabase } from './supabase'
import type { Product } from './product-lookup'
import type { Nutrients } from './nutrients'

export type EditableProduct = { id: string; created_by: string | null }
export type ProductPatch = Nutrients & { name: string }

const PRODUCT_COLUMNS = 'id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate'

/**
 * products is shared: several users can point at the same row, so a correction
 * must not rewrite someone else's data. Own rows are updated in place — which
 * keeps the barcode attached, so a later scan returns the corrected values.
 * Other people's rows are copied; the copy carries no barcode because
 * products_barcode_unique is global.
 */
export async function saveProductEdit(
  product: EditableProduct,
  patch: ProductPatch,
  userId: string,
): Promise<Product> {
  if (product.created_by === userId) {
    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', product.id)
      .select(PRODUCT_COLUMNS)
      .maybeSingle()
    if (error || !data) throw new Error('product update failed')
    return data as Product
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...patch, barcode: null, created_by: userId })
    .select(PRODUCT_COLUMNS)
    .maybeSingle()
  if (error || !data) throw new Error('product copy failed')
  return data as Product
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/product-edit.test.ts`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/product-edit.ts src/lib/product-edit.test.ts
git commit -m "feat: save product edits without overwriting shared rows"
```

---

### Task 3: Eintrag allgemein aktualisieren

Die Abfrage lädt heute weder `product_id` noch `products.created_by`. Beides braucht das Bearbeiten: das eine zum Umhängen, das andere für die Eigentümerregel aus Task 2.

**Files:**
- Modify: `src/hooks/use-food-entries.ts`
- Modify: `src/hooks/use-food-entries.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `updateEntry(entryId: string, patch: EntryPatch): Promise<void>` mit `type EntryPatch = { menge?: number; zeitpunkt?: string; product_id?: string }`; erweiterter `FoodEntry`-Typ mit `product_id: string | null` und `products.id`, `products.barcode`, `products.created_by`. `updateEntryMenge` entfällt.

- [ ] **Step 1: Write the failing test**

In `src/hooks/use-food-entries.test.ts` den Test `'rejects instead of reporting success when a write fails'` unverändert lassen und danach einfügen:

```ts
  it('updates several fields of an entry in one write', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateEntry('e1', {
      menge: 200,
      zeitpunkt: '2026-08-19T06:30:00.000Z',
      product_id: 'p2',
    })

    expect(builder.update).toHaveBeenCalledWith({
      menge: 200,
      zeitpunkt: '2026-08-19T06:30:00.000Z',
      product_id: 'p2',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'e1')
  })

  it('loads the fields the edit form needs', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // product_id for remapping, created_by to decide update-vs-copy.
    const selected = builder.select.mock.calls[0][0] as string
    expect(selected).toContain('product_id')
    expect(selected).toContain('created_by')
  })
```

Im selben Test-File `updateEntryMenge` im vorhandenen Fehlerfall-Test durch `updateEntry` ersetzen:

```ts
    await expect(result.current.updateEntry('e1', { menge: 200 })).rejects.toThrow()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-food-entries.test.ts`
Expected: FAIL — `result.current.updateEntry is not a function`

- [ ] **Step 3: Write minimal implementation**

In `src/hooks/use-food-entries.ts` den Typ erweitern:

```ts
export type FoodEntry = {
  id: string
  menge: number
  zeitpunkt: string
  product_id: string | null
  products: {
    id: string
    name: string
    barcode: string | null
    created_by: string | null
    kalorien: number
    eiweiss: number | null
    fett: number | null
    kohlenhydrate: number | null
  } | null
}

export type EntryPatch = { menge?: number; zeitpunkt?: string; product_id?: string }
```

Die Abfrage in `reload` erweitern:

```ts
      .select(
        'id, menge, zeitpunkt, product_id, products(id, name, barcode, created_by, kalorien, eiweiss, fett, kohlenhydrate)',
      )
```

`updateEntryMenge` ersetzen:

```ts
  async function updateEntry(entryId: string, patch: EntryPatch) {
    const { error } = await supabase.from('food_entries').update(patch).eq('id', entryId)
    if (error) throw new Error('update failed')
    await reload()
  }
```

Rückgabe anpassen:

```ts
  return { entries, loading, addEntry, updateEntry, deleteEntry }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-food-entries.test.ts`
Expected: PASS

- [ ] **Step 5: Keep the callers compiling**

`npx tsc -b --noEmit` meldet jetzt `updateEntryMenge` in `src/components/FoodEntryList.tsx` und `src/pages/NutritionEntriesPage.tsx`. Als Zwischenschritt in beiden auf `updateEntry` umstellen — in `FoodEntryList` die Prop umbenennen und den Aufruf in `commit` ersetzen:

```tsx
type Props = {
  entries: FoodEntry[]
  onUpdateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}
```

```tsx
    onUpdateEntry(entry.id, { menge: value }).catch(() => {
```

In `NutritionEntriesPage` und in `src/pages/NutritionEntriesPage.test.tsx` sowie `src/components/FoodEntryList.test.tsx` die Prop entsprechend umbenennen. Die Testerwartungen ändern sich mit:

```ts
    await waitFor(() => expect(result.updateEntry).toHaveBeenCalledWith('e1', { menge: 200 }))
```

- [ ] **Step 6: Run the full suite**

Run: `npm test && npx tsc -b --noEmit`
Expected: alles grün

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-food-entries.ts src/hooks/use-food-entries.test.ts src/components/FoodEntryList.tsx src/components/FoodEntryList.test.tsx src/pages/NutritionEntriesPage.tsx src/pages/NutritionEntriesPage.test.tsx
git commit -m "feat: update any entry field, and load what editing needs"
```

---

### Task 4: Produktsuche als eigene Komponente

**Files:**
- Create: `src/components/ProductPicker.tsx`
- Create: `src/components/ProductPicker.test.tsx`
- Modify: `src/components/AddEntryFlow.tsx`

**Interfaces:**
- Consumes: `findOrFetchProductByBarcode`, `isValidBarcode`, `BarcodeScanner`, `ManualProductForm`
- Produces: `<ProductPicker onPicked={(product: Product) => void} onCancel={() => void} />`

- [ ] **Step 1: Write the failing test**

`src/components/ProductPicker.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockFindOrFetch = vi.fn()
vi.mock('../lib/product-lookup', () => ({
  findOrFetchProductByBarcode: (barcode: string) => mockFindOrFetch(barcode),
}))

const mockOnDetected = { current: (_barcode: string) => {} }
vi.mock('./BarcodeScanner', () => ({
  default: ({ onDetected }: { onDetected: (barcode: string) => void }) => {
    mockOnDetected.current = onDetected
    return <div>Scanner</div>
  },
}))

vi.mock('./ManualProductForm', () => ({
  default: ({ onCreated }: { onCreated: (product: unknown) => void }) => (
    <button type="button" onClick={() => onCreated({ id: 'p9', name: 'Selbst angelegt' })}>
      Produkt speichern
    </button>
  ),
}))

const product = { id: 'p1', name: 'Gefundenes Produkt', barcode: '4001234567890', kalorien: 200 }

describe('ProductPicker', () => {
  beforeEach(() => {
    mockFindOrFetch.mockReset()
  })

  it('reports the product found for a typed barcode', async () => {
    mockFindOrFetch.mockResolvedValue(product)
    const onPicked = vi.fn()

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={onPicked} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), {
      target: { value: '4001234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(product))
  })

  it('reports a manually created product', async () => {
    const onPicked = vi.fn()

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={onPicked} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    await waitFor(() =>
      expect(onPicked).toHaveBeenCalledWith({ id: 'p9', name: 'Selbst angelegt' }),
    )
  })

  it('rejects a typed value that is not a barcode without looking it up', async () => {
    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('8–14 Ziffern')
    expect(mockFindOrFetch).not.toHaveBeenCalled()
  })

  it('falls back to the manual form when the barcode is unknown', async () => {
    mockFindOrFetch.mockResolvedValue(null)

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('4001234567890')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Produkt speichern' })).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/components/ProductPicker.test.tsx`
Expected: FAIL mit `Failed to resolve import "./ProductPicker"`

- [ ] **Step 3: Write minimal implementation**

`src/components/ProductPicker.tsx` — die Schritte `idle`, `scanning`, `looking-up` und `manual-entry` wandern unverändert aus `AddEntryFlow` hierher; nur das Ergebnis geht per `onPicked` nach außen statt in lokalen State:

```tsx
import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'
import { isValidBarcode } from '../lib/open-food-facts'

type Step = 'idle' | 'scanning' | 'looking-up' | 'manual-entry'

type Props = {
  onPicked: (product: Product) => void
  onCancel: () => void
}

export default function ProductPicker({ onPicked, onCancel }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined)
  const [typedBarcode, setTypedBarcode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDetected = useCallback(
    async (barcode: string) => {
      // The scanner also decodes QR codes; only a real product barcode is worth
      // a lookup and worth storing on a product row.
      if (!isValidBarcode(barcode)) {
        setScannedBarcode(undefined)
        setError('Kein gültiger Produkt-Barcode erkannt. Bitte manuell eintragen.')
        setStep('manual-entry')
        return
      }

      setStep('looking-up')
      const found = await findOrFetchProductByBarcode(barcode).catch(() => null)
      if (found) {
        onPicked(found)
        return
      }
      setScannedBarcode(barcode)
      setStep('manual-entry')
    },
    [onPicked],
  )

  // Typed instead of scanned: laptop webcams and worn packaging often never
  // resolve a code, and the digits are printed right under it.
  function handleTypedBarcode(event: FormEvent) {
    event.preventDefault()
    const entered = typedBarcode.replace(/\s/g, '')
    if (!isValidBarcode(entered)) {
      setError('Bitte die Ziffern unter dem Strichcode eingeben (8–14 Ziffern).')
      return
    }
    setError(null)
    setTypedBarcode('')
    handleDetected(entered)
  }

  if (step === 'scanning') {
    return <BarcodeScanner onDetected={handleDetected} onClose={() => setStep('idle')} />
  }

  if (step === 'looking-up') {
    return <p>Produkt wird gesucht…</p>
  }

  if (step === 'manual-entry') {
    return (
      <>
        {error && <p role="alert">{error}</p>}
        <ManualProductForm
          barcode={scannedBarcode}
          onCreated={onPicked}
          onCancel={() => setStep('idle')}
        />
      </>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setStep('scanning')}>
        Barcode scannen
      </button>
      <button type="button" onClick={() => setStep('manual-entry')}>
        Manuell hinzufügen
      </button>
      <form onSubmit={handleTypedBarcode}>
        <label>
          Barcode-Nummer eingeben
          <input
            inputMode="numeric"
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value)}
            placeholder="z. B. 8076809580144"
          />
        </label>
        <button type="submit">Suchen</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/components/ProductPicker.test.tsx`
Expected: PASS, 4 Tests

- [ ] **Step 5: Use it in AddEntryFlow**

`src/components/AddEntryFlow.tsx` behält nur noch Auswahl und Mengenbestätigung:

```tsx
import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import type { Product } from '../lib/product-lookup'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
}

export default function AddEntryFlow({ onAdd }: Props) {
  const [product, setProduct] = useState<Product | null>(null)
  const [menge, setMenge] = useState('100')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setProduct(null)
    setMenge('100')
    setError(null)
  }

  async function handleConfirmQuantity(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    setError(null)

    const value = Number(menge)
    if (menge.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError('Bitte eine Menge größer als 0 g angeben.')
      return
    }

    try {
      await onAdd(product.id, value)
      reset()
    } catch {
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
  }

  if (!product) {
    return <ProductPicker onPicked={setProduct} onCancel={reset} />
  }

  return (
    <form onSubmit={handleConfirmQuantity}>
      <p>{product.name}</p>
      <label>
        Menge (g)
        <input type="number" value={menge} onChange={(event) => setMenge(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Hinzufügen</button>
      <button type="button" onClick={reset}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: `src/components/AddEntryFlow.test.tsx` bleibt grün — die Tests bedienen dieselben Beschriftungen, die jetzt aus `ProductPicker` kommen. Schlägt ein Test fehl, weil er eine interne Struktur statt sichtbaren Verhaltens prüft, den Test auf das sichtbare Verhalten umstellen, nicht die Komponente.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProductPicker.tsx src/components/ProductPicker.test.tsx src/components/AddEntryFlow.tsx src/components/AddEntryFlow.test.tsx
git commit -m "refactor: extract product search into a reusable picker"
```

---

### Task 5: Lokale Zeit für das Zeitpunkt-Feld

`datetime-local` liefert lokale Zeit ohne Zonenangabe, gespeichert wird `timestamptz`. Dieselbe Verwechslung hat in Phase 2 die Tagesgrenze in `todayRange()` verschoben.

**Files:**
- Create: `src/lib/local-time.ts`
- Create: `src/lib/local-time.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `toLocalInputValue(iso: string): string`, `fromLocalInputValue(value: string): string`

- [ ] **Step 1: Write the failing test**

`src/lib/local-time.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fromLocalInputValue, toLocalInputValue } from './local-time'

// Minimal ambient type for the Node `process` global this test file relies on
// (to pin the timezone). The project's browser-only tsconfig has no @types/node.
declare const process: { env: Record<string, string | undefined> }

describe('local time conversion', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    // Pin a non-UTC zone so a UTC-based implementation cannot pass by accident.
    process.env.TZ = 'Europe/Berlin'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('shows a stored timestamp in local time', () => {
    // 06:30 UTC is 08:30 in Berlin summer time.
    expect(toLocalInputValue('2026-08-19T06:30:00.000Z')).toBe('2026-08-19T08:30')
  })

  it('stores a locally entered time as UTC', () => {
    expect(fromLocalInputValue('2026-08-19T08:30')).toBe('2026-08-19T06:30:00.000Z')
  })

  it('survives a round trip across the day boundary', () => {
    // 00:30 local on the 19th is still the 18th in UTC — the case that broke
    // todayRange() in Phase 2.
    const iso = fromLocalInputValue('2026-08-19T00:30')
    expect(iso).toBe('2026-08-18T22:30:00.000Z')
    expect(toLocalInputValue(iso)).toBe('2026-08-19T00:30')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/local-time.test.ts`
Expected: FAIL mit `Failed to resolve import "./local-time"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/local-time.ts`:

```ts
const pad = (value: number) => String(value).padStart(2, '0')

/** `timestamptz` → the value a `datetime-local` input expects, in local time. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * `datetime-local` → ISO. Built from the local calendar parts rather than by
 * appending a zone to the string: the input carries no offset, and guessing one
 * shifts every entry near a day boundary onto the wrong day.
 */
export function fromLocalInputValue(value: string): string {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/local-time.test.ts`
Expected: PASS, 3 Tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/local-time.ts src/lib/local-time.test.ts
git commit -m "feat: convert between stored timestamps and local input values"
```

---

### Task 6: Bearbeiten-Formular

**Files:**
- Create: `src/components/FoodEntryEditForm.tsx`
- Create: `src/components/FoodEntryEditForm.test.tsx`

**Interfaces:**
- Consumes: `FoodEntry`, `EntryPatch` (Task 3), `saveProductEdit` (Task 2), `parseNutrients` (Task 1), `toLocalInputValue`/`fromLocalInputValue` (Task 5), `ProductPicker` (Task 4)
- Produces: `<FoodEntryEditForm entry={FoodEntry} userId={string} onSave={(entryId: string, patch: EntryPatch) => Promise<void>} onClose={() => void} />`

- [ ] **Step 1: Write the failing test**

`src/components/FoodEntryEditForm.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FoodEntry } from '../hooks/use-food-entries'

const mockSaveProductEdit = vi.fn()
vi.mock('../lib/product-edit', () => ({
  saveProductEdit: (...args: unknown[]) => mockSaveProductEdit(...args),
}))

vi.mock('./ProductPicker', () => ({
  default: ({ onPicked }: { onPicked: (product: unknown) => void }) => (
    <button type="button" onClick={() => onPicked({ id: 'p2', name: 'Anderes Produkt' })}>
      Anderes Produkt wählen
    </button>
  ),
}))

const entry: FoodEntry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-19T06:30:00.000Z',
  product_id: 'p1',
  products: {
    id: 'p1',
    name: 'Testprodukt',
    barcode: '4001234567890',
    created_by: 'u1',
    kalorien: 100,
    eiweiss: 1,
    fett: 2,
    kohlenhydrate: 3,
  },
}

describe('FoodEntryEditForm', () => {
  beforeEach(() => {
    mockSaveProductEdit.mockReset()
    mockSaveProductEdit.mockImplementation(async (_product, patch) => ({ id: 'p1', ...patch }))
  })

  it('fills the form with the stored values', async () => {
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm entry={entry} userId="u1" onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)
    expect(screen.getByLabelText('Kalorien (kcal)')).toHaveValue(100)
  })

  it('saves amount and nutrients together', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockSaveProductEdit).toHaveBeenCalledWith(
      { id: 'p1', created_by: 'u1' },
      expect.objectContaining({ kalorien: 120, name: 'Testprodukt' }),
      'u1',
    )
    expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 }))
  })

  it('remaps the entry when the product is swapped', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Anderes Produkt wählen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ product_id: 'p2' })),
    )
    // A swapped product is not the one whose nutrients this form was editing.
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
  })

  it('rejects an amount of zero without writing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    // Number('') is 0, not NaN — the guard has to catch it.
    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('größer als 0')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects implausible nutrients without writing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '-300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('plausible Werte')
    expect(onSave).not.toHaveBeenCalled()
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
  })

  it('reports a failed save instead of closing', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('denied'))
    const onClose = vi.fn()
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht gespeichert werden'),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/components/FoodEntryEditForm.test.tsx`
Expected: FAIL mit `Failed to resolve import "./FoodEntryEditForm"`

- [ ] **Step 3: Write minimal implementation**

`src/components/FoodEntryEditForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import { parseNutrients } from '../lib/nutrients'
import { saveProductEdit } from '../lib/product-edit'
import { fromLocalInputValue, toLocalInputValue } from '../lib/local-time'
import type { Product } from '../lib/product-lookup'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entry: FoodEntry
  userId: string
  onSave: (entryId: string, patch: EntryPatch) => Promise<void>
  onClose: () => void
}

export default function FoodEntryEditForm({ entry, userId, onSave, onClose }: Props) {
  const product = entry.products
  const [menge, setMenge] = useState(String(entry.menge))
  const [zeitpunkt, setZeitpunkt] = useState(toLocalInputValue(entry.zeitpunkt))
  const [swapped, setSwapped] = useState<Product | null>(null)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState(product?.name ?? '')
  const [kalorien, setKalorien] = useState(product?.kalorien?.toString() ?? '')
  const [eiweiss, setEiweiss] = useState(product?.eiweiss?.toString() ?? '')
  const [fett, setFett] = useState(product?.fett?.toString() ?? '')
  const [kohlenhydrate, setKohlenhydrate] = useState(product?.kohlenhydrate?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  if (picking) {
    return (
      <ProductPicker
        onPicked={(picked) => {
          setSwapped(picked)
          setPicking(false)
        }}
        onCancel={() => setPicking(false)}
      />
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const value = Number(menge)
    if (menge.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError('Bitte eine Menge größer als 0 g angeben.')
      return
    }

    const patch: EntryPatch = { menge: value, zeitpunkt: fromLocalInputValue(zeitpunkt) }

    if (swapped) {
      // The nutrients on screen belong to the product being replaced, so they
      // are not saved — the entry simply points at the chosen product now.
      patch.product_id = swapped.id
    } else if (product) {
      const nutrients = parseNutrients({ kalorien, eiweiss, fett, kohlenhydrate })
      if (!nutrients) {
        setError('Bitte plausible Werte pro 100 g eingeben (Kalorien 0–900 kcal, Makros 0–100 g).')
        return
      }

      try {
        const saved = await saveProductEdit(
          { id: product.id, created_by: product.created_by },
          { ...nutrients, name: name.trim() || product.name },
          userId,
        )
        // saveProductEdit returns a copy when the product belonged to someone
        // else; the entry has to follow it.
        if (saved.id !== product.id) patch.product_id = saved.id
      } catch {
        setError('Produkt konnte nicht gespeichert werden. Bitte erneut versuchen.')
        return
      }
    }

    try {
      await onSave(entry.id, patch)
      onClose()
    } catch {
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Menge (g)
        <input type="number" value={menge} onChange={(event) => setMenge(event.target.value)} />
      </label>
      <label>
        Zeitpunkt
        <input
          type="datetime-local"
          value={zeitpunkt}
          onChange={(event) => setZeitpunkt(event.target.value)}
        />
      </label>

      <p>{swapped ? swapped.name : (product?.name ?? 'Unbekanntes Produkt')}</p>
      <button type="button" onClick={() => setPicking(true)}>
        Anderes Produkt wählen
      </button>

      {!swapped && product && (
        <fieldset>
          <legend>Nährwerte pro 100 g</legend>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Kalorien (kcal)
            <input
              type="number"
              value={kalorien}
              onChange={(event) => setKalorien(event.target.value)}
            />
          </label>
          <label>
            Eiweiß (g)
            <input type="number" value={eiweiss} onChange={(event) => setEiweiss(event.target.value)} />
          </label>
          <label>
            Fett (g)
            <input type="number" value={fett} onChange={(event) => setFett(event.target.value)} />
          </label>
          <label>
            Kohlenhydrate (g)
            <input
              type="number"
              value={kohlenhydrate}
              onChange={(event) => setKohlenhydrate(event.target.value)}
            />
          </label>
        </fieldset>
      )}

      {error && <p role="alert">{error}</p>}
      <button type="submit">Speichern</button>
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/components/FoodEntryEditForm.test.tsx`
Expected: PASS, 7 Tests

- [ ] **Step 5: Commit**

```bash
git add src/components/FoodEntryEditForm.tsx src/components/FoodEntryEditForm.test.tsx
git commit -m "feat: add an edit form for amount, time, product and nutrients"
```

---

### Task 7: Liste zeigt Werte und öffnet das Formular

**Files:**
- Modify: `src/components/FoodEntryList.tsx`
- Modify: `src/components/FoodEntryList.test.tsx`
- Modify: `src/pages/NutritionEntriesPage.tsx`
- Modify: `src/pages/NutritionEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `FoodEntryEditForm` (Task 6), `EntryPatch` (Task 3)
- Produces: `<FoodEntryList entries userId onUpdateEntry onDelete />` — die Prop `userId: string` kommt neu hinzu und wird an das Formular durchgereicht.

- [ ] **Step 1: Write the failing test**

`src/components/FoodEntryList.test.tsx` — die Tests zum unsichtbaren Mengenfeld (`calls onUpdateEntry with the edited value once the input is left`, `never persists an intermediate or empty value while retyping the menge`, `restores the stored value and warns when the update is rejected`) **löschen**: Das Verhalten zieht ins Formular um und ist dort in Task 6 abgedeckt. Stattdessen:

```tsx
  it('shows the stored values without an input field', () => {
    render(
      <FoodEntryList
        entries={entries}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByText(/150 g/)).toBeInTheDocument()
    // The amount was silently editable before and nobody found it.
    expect(screen.queryByLabelText('Menge (g) für Testprodukt')).not.toBeInTheDocument()
  })

  it('opens the edit form on request and closes it again', () => {
    render(
      <FoodEntryList
        entries={entries}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByLabelText('Menge (g)')).not.toBeInTheDocument()
  })
```

Der Eintrag im Test-File braucht die neuen Felder:

```tsx
const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-19T06:30:00.000Z',
    product_id: 'p1',
    products: {
      id: 'p1',
      name: 'Testprodukt',
      barcode: null,
      created_by: 'u1',
      kalorien: 100,
      eiweiss: 1,
      fett: 2,
      kohlenhydrate: 3,
    },
  },
]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/components/FoodEntryList.test.tsx`
Expected: FAIL — die Zeile rendert noch ein Eingabefeld, und `Bearbeiten` existiert nicht

- [ ] **Step 3: Write minimal implementation**

`src/components/FoodEntryList.tsx` vollständig ersetzen:

```tsx
import { useState } from 'react'
import FoodEntryEditForm from './FoodEntryEditForm'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  userId: string
  onUpdateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

export default function FoodEntryList({ entries, userId, onUpdateEntry, onDelete }: Props) {
  if (entries.length === 0) {
    return <p>Noch keine Einträge heute.</p>
  }

  return (
    <ul>
      {entries.map((entry) => (
        <FoodEntryRow
          key={entry.id}
          entry={entry}
          userId={userId}
          onUpdateEntry={onUpdateEntry}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function FoodEntryRow({
  entry,
  userId,
  onUpdateEntry,
  onDelete,
}: { entry: FoodEntry } & Pick<Props, 'userId' | 'onUpdateEntry' | 'onDelete'>) {
  const [editing, setEditing] = useState(false)
  const [failed, setFailed] = useState(false)
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  const kalorien = entry.products ? Math.round((entry.products.kalorien * entry.menge) / 100) : null

  if (editing) {
    return (
      <li>
        <FoodEntryEditForm
          entry={entry}
          userId={userId}
          onSave={onUpdateEntry}
          onClose={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li>
      <span>{label}</span>
      {/* One template string per span: `{value} g` renders two text nodes and
          getByText(/150 g/) would not match across them. */}
      <span>{`${entry.menge} g`}</span>
      {kalorien != null && <span>{`${kalorien} kcal`}</span>}
      <button type="button" onClick={() => setEditing(true)}>
        Bearbeiten
      </button>
      <button
        type="button"
        onClick={() => {
          setFailed(false)
          onDelete(entry.id).catch(() => setFailed(true))
        }}
      >
        Löschen
      </button>
      {failed && <span role="alert">Änderung konnte nicht gespeichert werden.</span>}
    </li>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/components/FoodEntryList.test.tsx`
Expected: PASS

- [ ] **Step 5: Pass userId through the page**

In `src/pages/NutritionEntriesPage.tsx` die Prop ergänzen:

```tsx
        <FoodEntryList
          entries={entries}
          userId={userId}
          onUpdateEntry={updateEntry}
          onDelete={deleteEntry}
        />
```

Dazu `updateEntry` statt `updateEntryMenge` aus dem Hook destrukturieren. In `src/pages/NutritionEntriesPage.test.tsx` die Erwartung für das Ändern der Menge auf den neuen Weg umstellen:

```tsx
  it('changes an entry amount through the edit form', async () => {
    const result = await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateEntry).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 })),
    )
  })
```

Der Testeintrag in dieser Datei braucht dieselben neuen Felder wie in Step 1.

- [ ] **Step 6: Run the full suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: alles grün, Lint ohne Fehler **und ohne Warnungen**

- [ ] **Step 7: Commit**

```bash
git add src/components/FoodEntryList.tsx src/components/FoodEntryList.test.tsx src/pages/NutritionEntriesPage.tsx src/pages/NutritionEntriesPage.test.tsx
git commit -m "feat: show entry values and open an edit form on request"
```

---

### Task 8: Finale Verifikation

**Files:**
- Modify: `CLAUDE.md` (Status-Sektion)

- [ ] **Step 1: Run the full verification**

```bash
npm test
npm run lint
npx tsc -b --noEmit
npm run build
```

Alle vier müssen ohne Fehler und ohne Warnungen durchlaufen.

- [ ] **Step 2: Check for leftovers**

```bash
grep -rn "updateEntryMenge" src/ ; echo "(sollte leer sein)"
grep -rn "parseNutrients" src/components/ ; echo "(nur Imports, keine Definition)"
```

- [ ] **Step 3: Update the status section**

In `CLAUDE.md` unter „Status / Fortschritt" festhalten: Einträge und Produkte sind bearbeitbar, Spec und Plan verlinken, die Eigentümerregel in einem Satz nennen, und die beiden Folgevorhaben (Mahlzeiten-Slots, Portionen) als offen vermerken.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record entry and product editing"
```

- [ ] **Step 5: Manual verification (Nutzer, nach dem Merge)**

Diese Schritte brauchen die echte Instanz:

1. Auf `/nutrition/entries` bei einem Eintrag „Bearbeiten" öffnen — Menge, Zeitpunkt und Nährwerte sind vorbelegt.
2. Menge ändern, speichern → Liste und Tagesbilanz aktualisieren sich.
3. Kalorien eines selbst angelegten Produkts korrigieren, speichern, denselben Barcode erneut suchen → die korrigierten Werte erscheinen (das Produkt gehört dir, es wurde direkt aktualisiert).
4. Zeitpunkt auf gestern setzen, speichern → der Eintrag verschwindet aus der Heute-Liste.
5. „Anderes Produkt wählen", einen Barcode suchen, speichern → der Eintrag zeigt das neue Produkt, die Bilanz rechnet mit dessen Werten.
6. Menge auf 0 setzen und speichern → Fehlermeldung, nichts wird gespeichert.
