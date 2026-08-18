# Phase 2 (Ernährungsbereich) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nutzer können Mahlzeiten per Kamera-Barcode-Scan (Open Food Facts) oder manueller Eingabe erfassen, sehen eine Tagesübersicht ihrer Kalorien/Makros gegen ein Ziel, und können das Ziel manuell setzen oder aus Profildaten berechnen lassen (Mifflin-St-Jeor).

**Architecture:** Reines Client-seitiges Feature, Supabase direkt vom Browser aus angesprochen (kein eigenes Backend, wie Phase 1). Open Food Facts wird per direktem `fetch` von der öffentlichen API abgefragt, Treffer werden in die lokale `products`-Tabelle gecacht. Barcode-Erkennung läuft über `@zxing/browser` (Video-Frame-Sampling), ein einziger Codepfad für alle Zielplattformen.

**Tech Stack:** React 19 + Vite + TypeScript (wie Phase 1), `@zxing/browser` (neu), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-phase2-ernaehrungsbereich-design.md`

## Global Constraints

- Einheiten-Konvention: `products.kalorien/eiweiss/fett/kohlenhydrate` sind Werte **pro 100 g**; `food_entries.menge` ist die Menge **in Gramm**; tatsächliche Kalorien eines Eintrags = `kalorien × menge / 100`.
- Out of Scope für diese Phase: Gemini-Foto-Analyse/OCR, Produkt-Verifizierung/Moderation-UI, Home-Dashboard-Änderungen, Wochen-/Zeitraum-Statistiken.
- Nur der `anon`/publishable Supabase-Key im Client-Code, nie `service_role`.
- Naming (aus `CLAUDE.md`): TS-Dateien kebab-case, React-Komponenten PascalCase, Bezeichner Englisch, DB-Spalten-/Wertenamen Deutsch (wie Phase 1: `alter`, `groesse`, `kalorien`, …).
- Keine Namen von Drittanbieter-Apps in Code/Kommentaren/Commit-Messages (siehe `CLAUDE.md` "Wettbewerber-Referenzen").
- Migrationen werden automatisch bei Merge nach `master` deployed (Supabase-GitHub-Integration ist seit Phase 1 aktiv) — keine manuelle DB-Aktion nötig, nur der PR-Merge.
- Nie `git push` automatisiert ausführen. Jeder Task endet mit einem lokalen Commit; Pushen ist ein separater, expliziter Schritt des Nutzers (wie in Phase 1).
- RLS bleibt auf allen bestehenden Tabellen unverändert aktiv; diese Phase legt keine neuen Tabellen an, nur neue Spalten/einen Index.

---

### Task 1: Migration `0002` — Kalorienziel-Felder & Barcode-Unique-Index

**Files:**
- Create: `supabase/migrations/0002_nutrition_profile_fields.sql`
- Create: `supabase/migrations/0002_nutrition_profile_fields.test.ts`

**Interfaces:**
- Produces: neue `profiles`-Spalten `geschlecht`, `aktivitaetslevel`, `ziel`, `ziel_delta_kcal`, `taegliches_kalorienziel`; neuer Unique-Index `products_barcode_unique` auf `products.barcode`.

- [ ] **Step 1: Write the failing test**

Create `supabase/migrations/0002_nutrition_profile_fields.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0002_nutrition_profile_fields.sql'),
  'utf-8',
)

describe('0002_nutrition_profile_fields.sql', () => {
  it('adds the calorie-goal columns to profiles', () => {
    expect(sql).toMatch(/add column geschlecht text/)
    expect(sql).toMatch(/add column aktivitaetslevel text/)
    expect(sql).toMatch(/add column ziel text/)
    expect(sql).toMatch(/add column ziel_delta_kcal numeric not null default 500/)
    expect(sql).toMatch(/add column taegliches_kalorienziel numeric/)
  })

  it('constrains geschlecht, aktivitaetslevel, and ziel to their allowed values', () => {
    expect(sql).toContain("check (geschlecht in ('maennlich', 'weiblich'))")
    expect(sql).toContain(
      "check (aktivitaetslevel in ('sitzend', 'leicht', 'moderat', 'hoch', 'sehr_hoch'))",
    )
    expect(sql).toContain("check (ziel in ('abnehmen', 'halten', 'zunehmen'))")
  })

  it('adds a unique index on products.barcode for non-null barcodes', () => {
    expect(sql).toContain(
      'create unique index products_barcode_unique on public.products (barcode) where barcode is not null',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- 0002_nutrition_profile_fields`
Expected: FAIL — `supabase/migrations/0002_nutrition_profile_fields.sql` does not exist (`ENOENT`).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0002_nutrition_profile_fields.sql`:

```sql
-- Phase 2: nutrition area additions — calorie-goal fields on profiles, barcode uniqueness on products.

alter table public.profiles
  add column geschlecht text check (geschlecht in ('maennlich', 'weiblich')),
  add column aktivitaetslevel text check (aktivitaetslevel in ('sitzend', 'leicht', 'moderat', 'hoch', 'sehr_hoch')),
  add column ziel text check (ziel in ('abnehmen', 'halten', 'zunehmen')),
  add column ziel_delta_kcal numeric not null default 500,
  add column taegliches_kalorienziel numeric;

create unique index products_barcode_unique on public.products (barcode) where barcode is not null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- 0002_nutrition_profile_fields`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_nutrition_profile_fields.sql supabase/migrations/0002_nutrition_profile_fields.test.ts
git commit -m "feat: add calorie-goal profile fields and products barcode unique index"
```

---

### Task 2: `lib/nutrition-goal.ts` — Kalorienziel-Berechnung

**Files:**
- Create: `src/lib/nutrition-goal.ts`
- Test: `src/lib/nutrition-goal.test.ts`

**Interfaces:**
- Produces: `export type CalorieGoalInput = { geschlecht: 'maennlich' | 'weiblich' | null; aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null; ziel: 'abnehmen' | 'halten' | 'zunehmen' | null; ziel_delta_kcal: number; aktuelles_gewicht: number | null; groesse: number | null; alter: number | null }`, `export function calculateCalorieGoal(input: CalorieGoalInput): number | null`, `export function effectiveCalorieGoal(input: CalorieGoalInput & { taegliches_kalorienziel: number | null }): number | null`
- Zero project dependencies — this module is standalone and pure.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/nutrition-goal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculateCalorieGoal, effectiveCalorieGoal } from './nutrition-goal'

const baseInput = {
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  aktuelles_gewicht: 80,
  groesse: 180,
  alter: 30,
}

describe('calculateCalorieGoal', () => {
  it('calculates TDEE for a male profile at "halten"', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    expect(calculateCalorieGoal(baseInput)).toBe(2759)
  })

  it('calculates TDEE for a female profile', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 1780 - 161 - 5 = wait see below
    const input = { ...baseInput, geschlecht: 'weiblich' as const }
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 800 + 1125 - 150 - 161 = 1614
    // TDEE = 1614 * 1.55 = 2501.7 -> rounds to 2502
    expect(calculateCalorieGoal(input)).toBe(2502)
  })

  it('subtracts ziel_delta_kcal when ziel is abnehmen', () => {
    const input = { ...baseInput, ziel: 'abnehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(2759 - 500)
  })

  it('adds ziel_delta_kcal when ziel is zunehmen', () => {
    const input = { ...baseInput, ziel: 'zunehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(2759 + 500)
  })

  it('applies the sitzend activity factor', () => {
    const input = { ...baseInput, aktivitaetslevel: 'sitzend' as const }
    expect(calculateCalorieGoal(input)).toBe(Math.round(1780 * 1.2))
  })

  it('returns null when geschlecht is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, geschlecht: null })).toBeNull()
  })

  it('returns null when aktivitaetslevel is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, aktivitaetslevel: null })).toBeNull()
  })

  it('returns null when ziel is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, ziel: null })).toBeNull()
  })

  it('returns null when a required body metric is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, aktuelles_gewicht: null })).toBeNull()
    expect(calculateCalorieGoal({ ...baseInput, groesse: null })).toBeNull()
    expect(calculateCalorieGoal({ ...baseInput, alter: null })).toBeNull()
  })
})

describe('effectiveCalorieGoal', () => {
  it('returns the manual value when taegliches_kalorienziel is set', () => {
    expect(effectiveCalorieGoal({ ...baseInput, taegliches_kalorienziel: 1800 })).toBe(1800)
  })

  it('falls back to the calculated value when taegliches_kalorienziel is null', () => {
    expect(effectiveCalorieGoal({ ...baseInput, taegliches_kalorienziel: null })).toBe(2759)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- nutrition-goal`
Expected: FAIL — `src/lib/nutrition-goal.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nutrition-goal.ts`:

```ts
export type CalorieGoalInput = {
  geschlecht: 'maennlich' | 'weiblich' | null
  aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null
  ziel: 'abnehmen' | 'halten' | 'zunehmen' | null
  ziel_delta_kcal: number
  aktuelles_gewicht: number | null
  groesse: number | null
  alter: number | null
}

const ACTIVITY_FACTORS: Record<NonNullable<CalorieGoalInput['aktivitaetslevel']>, number> = {
  sitzend: 1.2,
  leicht: 1.375,
  moderat: 1.55,
  hoch: 1.725,
  sehr_hoch: 1.9,
}

export function calculateCalorieGoal(input: CalorieGoalInput): number | null {
  const { geschlecht, aktivitaetslevel, ziel, ziel_delta_kcal, aktuelles_gewicht, groesse, alter } = input

  if (!geschlecht || !aktivitaetslevel || !ziel) return null
  if (aktuelles_gewicht == null || groesse == null || alter == null) return null

  const bmr =
    geschlecht === 'maennlich'
      ? 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter + 5
      : 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter - 161

  const tdee = bmr * ACTIVITY_FACTORS[aktivitaetslevel]

  if (ziel === 'abnehmen') return Math.round(tdee - ziel_delta_kcal)
  if (ziel === 'zunehmen') return Math.round(tdee + ziel_delta_kcal)
  return Math.round(tdee)
}

export function effectiveCalorieGoal(
  input: CalorieGoalInput & { taegliches_kalorienziel: number | null },
): number | null {
  if (input.taegliches_kalorienziel != null) return input.taegliches_kalorienziel
  return calculateCalorieGoal(input)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- nutrition-goal`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition-goal.ts src/lib/nutrition-goal.test.ts
git commit -m "feat: add Mifflin-St-Jeor calorie goal calculation"
```

---

### Task 3: `lib/open-food-facts.ts` — Barcode-Lookup gegen Open Food Facts

**Files:**
- Create: `src/lib/open-food-facts.ts`
- Test: `src/lib/open-food-facts.test.ts`

**Interfaces:**
- Produces: `export type OffProduct = { name: string; kalorien: number; eiweiss: number | null; fett: number | null; kohlenhydrate: number | null }`, `export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null>`
- Zero project dependencies. Uses the global `fetch`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/open-food-facts.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProductByBarcode } from './open-food-facts'

describe('fetchProductByBarcode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a normalized product on a successful lookup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: {
              product_name: 'Testprodukt',
              nutriments: {
                'energy-kcal_100g': 250,
                proteins_100g: 10,
                fat_100g: 5,
                carbohydrates_100g: 30,
              },
            },
          }),
      }),
    )

    const result = await fetchProductByBarcode('4001234567890')

    expect(result).toEqual({
      name: 'Testprodukt',
      kalorien: 250,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 30,
    })
  })

  it('returns null when the API reports the product as not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 0 }) }),
    )

    expect(await fetchProductByBarcode('0000000000000')).toBeNull()
  })

  it('returns null when the product has no name or no calorie value', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ status: 1, product: { product_name: '', nutriments: {} } }),
      }),
    )

    expect(await fetchProductByBarcode('1111111111111')).toBeNull()
  })

  it('returns null when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    expect(await fetchProductByBarcode('2222222222222')).toBeNull()
  })

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    expect(await fetchProductByBarcode('3333333333333')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- open-food-facts`
Expected: FAIL — `src/lib/open-food-facts.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/open-food-facts.ts`:

```ts
export type OffProduct = {
  name: string
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

type OffApiResponse = {
  status: number
  product?: {
    product_name?: string
    nutriments?: {
      'energy-kcal_100g'?: number
      proteins_100g?: number
      fat_100g?: number
      carbohydrates_100g?: number
    }
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null> {
  let response: Response
  try {
    response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
  } catch {
    return null
  }

  if (!response.ok) return null

  let data: OffApiResponse
  try {
    data = await response.json()
  } catch {
    return null
  }

  if (data.status !== 1 || !data.product) return null

  const { product_name, nutriments } = data.product
  const kalorien = nutriments?.['energy-kcal_100g']
  if (!product_name || kalorien == null) return null

  return {
    name: product_name,
    kalorien,
    eiweiss: nutriments?.proteins_100g ?? null,
    fett: nutriments?.fat_100g ?? null,
    kohlenhydrate: nutriments?.carbohydrates_100g ?? null,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- open-food-facts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/open-food-facts.ts src/lib/open-food-facts.test.ts
git commit -m "feat: add Open Food Facts barcode lookup"
```

---

### Task 4: `lib/product-lookup.ts` — lokaler Cache + Open-Food-Facts-Fallback

**Files:**
- Create: `src/lib/product-lookup.ts`
- Test: `src/lib/product-lookup.test.ts`

**Interfaces:**
- Consumes: `fetchProductByBarcode(barcode: string): Promise<OffProduct | null>` from `./open-food-facts` (Task 3); `supabase` client from `./supabase` (Phase 1, `src/lib/supabase.ts`, exports `supabase: SupabaseClient`).
- Produces: `export type Product = { id: string; name: string; barcode: string | null; kalorien: number; eiweiss: number | null; fett: number | null; kohlenhydrate: number | null }`, `export async function findOrFetchProductByBarcode(barcode: string): Promise<Product | null>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/product-lookup.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetchProductByBarcode = vi.fn()
vi.mock('./open-food-facts', () => ({
  fetchProductByBarcode: (barcode: string) => mockFetchProductByBarcode(barcode),
}))

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const existingProduct = {
  id: 'p1',
  name: 'Lokales Produkt',
  barcode: '4001234567890',
  kalorien: 100,
  eiweiss: 1,
  fett: 2,
  kohlenhydrate: 3,
}

describe('findOrFetchProductByBarcode', () => {
  beforeEach(() => {
    mockFetchProductByBarcode.mockReset()
    mockFrom.mockReset()
  })

  it('returns the local product without calling Open Food Facts when found', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: existingProduct }))

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    const result = await findOrFetchProductByBarcode('4001234567890')

    expect(result).toEqual(existingProduct)
    expect(mockFetchProductByBarcode).not.toHaveBeenCalled()
  })

  it('falls back to Open Food Facts and caches the result when not found locally', async () => {
    const selectBuilder = createQueryBuilder({ data: null })
    const upsertedProduct = {
      id: 'p2',
      name: 'OFF Produkt',
      barcode: '5001234567890',
      kalorien: 200,
      eiweiss: 5,
      fett: 6,
      kohlenhydrate: 7,
    }
    const upsertBuilder = createQueryBuilder({ data: upsertedProduct })
    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(upsertBuilder)
    mockFetchProductByBarcode.mockResolvedValue({
      name: 'OFF Produkt',
      kalorien: 200,
      eiweiss: 5,
      fett: 6,
      kohlenhydrate: 7,
    })

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    const result = await findOrFetchProductByBarcode('5001234567890')

    expect(result).toEqual(upsertedProduct)
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: '5001234567890', name: 'OFF Produkt' }),
      { onConflict: 'barcode' },
    )
  })

  it('returns null when neither the local DB nor Open Food Facts have the product', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null }))
    mockFetchProductByBarcode.mockResolvedValue(null)

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    expect(await findOrFetchProductByBarcode('9999999999999')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- product-lookup`
Expected: FAIL — `src/lib/product-lookup.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/product-lookup.ts`:

```ts
import { supabase } from './supabase'
import { fetchProductByBarcode } from './open-food-facts'

export type Product = {
  id: string
  name: string
  barcode: string | null
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

const PRODUCT_COLUMNS = 'id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate'

export async function findOrFetchProductByBarcode(barcode: string): Promise<Product | null> {
  const { data: existing } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('barcode', barcode)
    .maybeSingle()

  if (existing) return existing as Product

  const offProduct = await fetchProductByBarcode(barcode)
  if (!offProduct) return null

  const { data: inserted, error } = await supabase
    .from('products')
    .upsert(
      {
        barcode,
        name: offProduct.name,
        kalorien: offProduct.kalorien,
        eiweiss: offProduct.eiweiss,
        fett: offProduct.fett,
        kohlenhydrate: offProduct.kohlenhydrate,
      },
      { onConflict: 'barcode' },
    )
    .select(PRODUCT_COLUMNS)
    .single()

  if (error || !inserted) return null
  return inserted as Product
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- product-lookup`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/product-lookup.ts src/lib/product-lookup.test.ts
git commit -m "feat: add local-cache-first product lookup by barcode"
```

---

### Task 5: `hooks/use-profile.ts` — Profil laden & aktualisieren

**Files:**
- Create: `src/hooks/use-profile.ts`
- Test: `src/hooks/use-profile.test.ts`

**Interfaces:**
- Consumes: `supabase` client from `../lib/supabase` (Phase 1).
- Produces: `export type Profile = { id: string; name: string | null; alter: number | null; groesse: number | null; aktuelles_gewicht: number | null; geschlecht: 'maennlich' | 'weiblich' | null; aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null; ziel: 'abnehmen' | 'halten' | 'zunehmen' | null; ziel_delta_kcal: number; taegliches_kalorienziel: number | null }`, `export function useProfile(userId: string): { profile: Profile | null; loading: boolean; updateProfile: (patch: Partial<Profile>) => Promise<void> }`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/use-profile.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const profile = {
  id: 'u1',
  name: 'Test',
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich',
  aktivitaetslevel: 'moderat',
  ziel: 'halten',
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: null,
}

describe('useProfile', () => {
  it('loads the profile for the given user id', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: profile }))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual(profile)
  })

  it('updates the profile and stores the returned row', async () => {
    const updated = { ...profile, taegliches_kalorienziel: 1800 }
    const loadBuilder = createQueryBuilder({ data: profile })
    const updateBuilder = createQueryBuilder({ data: updated })
    mockFrom.mockReturnValueOnce(loadBuilder).mockReturnValueOnce(updateBuilder)

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateProfile({ taegliches_kalorienziel: 1800 })

    expect(updateBuilder.update).toHaveBeenCalledWith({ taegliches_kalorienziel: 1800 })
    await waitFor(() => expect(result.current.profile).toEqual(updated))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-profile`
Expected: FAIL — `src/hooks/use-profile.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-profile.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  name: string | null
  alter: number | null
  groesse: number | null
  aktuelles_gewicht: number | null
  geschlecht: 'maennlich' | 'weiblich' | null
  aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null
  ziel: 'abnehmen' | 'halten' | 'zunehmen' | null
  ziel_delta_kcal: number
  taegliches_kalorienziel: number | null
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  async function updateProfile(patch: Partial<Profile>) {
    const { data } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('*')
      .single()
    if (data) setProfile(data as Profile)
  }

  return { profile, loading, updateProfile }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-profile`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-profile.ts src/hooks/use-profile.test.ts
git commit -m "feat: add useProfile hook for reading and updating the own profile"
```

---

### Task 6: `hooks/use-food-entries.ts` — heutige Einträge laden/anlegen/bearbeiten/löschen

**Files:**
- Create: `src/hooks/use-food-entries.ts`
- Test: `src/hooks/use-food-entries.test.ts`

**Interfaces:**
- Consumes: `supabase` client from `../lib/supabase` (Phase 1).
- Produces: `export type FoodEntry = { id: string; menge: number; zeitpunkt: string; products: { name: string; kalorien: number; eiweiss: number | null; fett: number | null; kohlenhydrate: number | null } | null }`, `export function useFoodEntries(userId: string): { entries: FoodEntry[]; loading: boolean; addEntry: (productId: string, menge: number) => Promise<void>; updateEntryMenge: (entryId: string, menge: number) => Promise<void>; deleteEntry: (entryId: string) => Promise<void> }`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/use-food-entries.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const entry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-18T12:00:00Z',
  products: { name: 'Testprodukt', kalorien: 200, eiweiss: 5, fett: 2, kohlenhydrate: 30 },
}

describe('useFoodEntries', () => {
  it('loads today\'s entries for the given user id', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [entry] }))

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toEqual([entry])
  })

  it('inserts a new entry via addEntry and reloads', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.addEntry('p1', 150)

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'u1', product_id: 'p1', menge: 150 })
  })

  it('deletes an entry via deleteEntry', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteEntry('e1')

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'e1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-food-entries`
Expected: FAIL — `src/hooks/use-food-entries.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-food-entries.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FoodEntry = {
  id: string
  menge: number
  zeitpunkt: string
  products: {
    name: string
    kalorien: number
    eiweiss: number | null
    fett: number | null
    kohlenhydrate: number | null
  } | null
}

function todayRange() {
  const today = new Date().toISOString().slice(0, 10)
  return { start: `${today}T00:00:00`, end: `${today}T23:59:59` }
}

export function useFoodEntries(userId: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { start, end } = todayRange()
    const { data } = await supabase
      .from('food_entries')
      .select('id, menge, zeitpunkt, products(name, kalorien, eiweiss, fett, kohlenhydrate)')
      .eq('user_id', userId)
      .gte('zeitpunkt', start)
      .lte('zeitpunkt', end)
      .order('zeitpunkt', { ascending: true })
    setEntries((data ?? []) as unknown as FoodEntry[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  async function addEntry(productId: string, menge: number) {
    await supabase.from('food_entries').insert({ user_id: userId, product_id: productId, menge })
    await reload()
  }

  async function updateEntryMenge(entryId: string, menge: number) {
    await supabase.from('food_entries').update({ menge }).eq('id', entryId)
    await reload()
  }

  async function deleteEntry(entryId: string) {
    await supabase.from('food_entries').delete().eq('id', entryId)
    await reload()
  }

  return { entries, loading, addEntry, updateEntryMenge, deleteEntry }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-food-entries`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-food-entries.ts src/hooks/use-food-entries.test.ts
git commit -m "feat: add useFoodEntries hook for today's entries CRUD"
```

---

### Task 7: `components/CalorieGoalEditor.tsx` — manuell/berechnet umschalten

**Files:**
- Create: `src/components/CalorieGoalEditor.tsx`
- Test: `src/components/CalorieGoalEditor.test.tsx`

**Interfaces:**
- Consumes: `Profile` type from `../hooks/use-profile` (Task 5); `calculateCalorieGoal(input: CalorieGoalInput): number | null` from `../lib/nutrition-goal` (Task 2).
- Produces: `export default function CalorieGoalEditor(props: { profile: Profile; onUpdate: (patch: Partial<Profile>) => Promise<void> }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/CalorieGoalEditor.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CalorieGoalEditor from './CalorieGoalEditor'
import type { Profile } from '../hooks/use-profile'

const calculableProfile: Profile = {
  id: 'u1',
  name: null,
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich',
  aktivitaetslevel: 'moderat',
  ziel: 'halten',
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: null,
}

describe('CalorieGoalEditor', () => {
  it('shows the calculated goal when no manual value is set', () => {
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={vi.fn()} />)
    expect(screen.getByText(/2759 kcal/)).toBeInTheDocument()
  })

  it('shows a completion hint when profile data is missing', () => {
    const incomplete = { ...calculableProfile, geschlecht: null }
    render(<CalorieGoalEditor profile={incomplete} onUpdate={vi.fn()} />)
    expect(screen.getByText(/Profil vervollständigen/)).toBeInTheDocument()
  })

  it('switches to manual mode and calls onUpdate with the entered value', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell festlegen' }))
    fireEvent.change(screen.getByLabelText('Tagesziel (kcal)'), { target: { value: '1800' } })

    expect(onUpdate).toHaveBeenCalledWith({ taegliches_kalorienziel: 1800 })
  })

  it('starts in manual mode and switches to calculated on request', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const manualProfile = { ...calculableProfile, taegliches_kalorienziel: 1800 }
    render(<CalorieGoalEditor profile={manualProfile} onUpdate={onUpdate} />)

    expect(screen.getByLabelText('Tagesziel (kcal)')).toHaveValue(1800)

    fireEvent.click(screen.getByRole('button', { name: 'Berechnen lassen' }))
    expect(onUpdate).toHaveBeenCalledWith({ taegliches_kalorienziel: null })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- CalorieGoalEditor`
Expected: FAIL — `src/components/CalorieGoalEditor.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/CalorieGoalEditor.tsx`:

```tsx
import { useState } from 'react'
import type { Profile } from '../hooks/use-profile'
import { calculateCalorieGoal } from '../lib/nutrition-goal'

type Props = {
  profile: Profile
  onUpdate: (patch: Partial<Profile>) => Promise<void>
}

export default function CalorieGoalEditor({ profile, onUpdate }: Props) {
  const [mode, setMode] = useState<'manual' | 'calculated'>(
    profile.taegliches_kalorienziel != null ? 'manual' : 'calculated',
  )

  const calculated = calculateCalorieGoal(profile)

  function switchToManual() {
    setMode('manual')
  }

  async function switchToCalculated() {
    setMode('calculated')
    await onUpdate({ taegliches_kalorienziel: null })
  }

  async function handleManualChange(value: string) {
    const parsed = value === '' ? null : Number(value)
    await onUpdate({ taegliches_kalorienziel: parsed })
  }

  if (mode === 'calculated') {
    return (
      <div>
        <p>
          {calculated != null
            ? `Berechnetes Tagesziel: ${calculated} kcal`
            : 'Profil vervollständigen (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel), um ein Ziel zu berechnen.'}
        </p>
        <button type="button" onClick={switchToManual}>
          Manuell festlegen
        </button>
      </div>
    )
  }

  return (
    <div>
      <label>
        Tagesziel (kcal)
        <input
          type="number"
          value={profile.taegliches_kalorienziel ?? ''}
          onChange={(event) => handleManualChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- CalorieGoalEditor`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/CalorieGoalEditor.tsx src/components/CalorieGoalEditor.test.tsx
git commit -m "feat: add CalorieGoalEditor for manual/calculated goal switching"
```

---

### Task 8: `components/DailySummary.tsx` — Tagesübersicht

**Files:**
- Create: `src/components/DailySummary.tsx`
- Test: `src/components/DailySummary.test.tsx`

**Interfaces:**
- Consumes: `FoodEntry` type from `../hooks/use-food-entries` (Task 6).
- Produces: `export default function DailySummary(props: { entries: FoodEntry[]; goal: number | null }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/DailySummary.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailySummary from './DailySummary'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 200,
    zeitpunkt: '2026-08-18T12:00:00Z',
    products: { name: 'A', kalorien: 100, eiweiss: 10, fett: 5, kohlenhydrate: 20 },
  },
  {
    id: 'e2',
    menge: 50,
    zeitpunkt: '2026-08-18T13:00:00Z',
    products: { name: 'B', kalorien: 400, eiweiss: 4, fett: 40, kohlenhydrate: 0 },
  },
]

describe('DailySummary', () => {
  it('sums calories scaled by menge/100 and shows the remaining amount against the goal', () => {
    // e1: 100 * 200/100 = 200 kcal; e2: 400 * 50/100 = 200 kcal; total 400
    render(<DailySummary entries={entries} goal={2000} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
    expect(screen.getByText(/1600 kcal offen/)).toBeInTheDocument()
  })

  it('omits the remaining amount when there is no goal', () => {
    render(<DailySummary entries={entries} goal={null} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
    expect(screen.queryByText(/offen/)).not.toBeInTheDocument()
  })

  it('sums macros scaled by menge/100', () => {
    // eiweiss: 10*2 + 4*0.5 = 20 + 2 = 22
    render(<DailySummary entries={entries} goal={null} />)
    expect(screen.getByText(/22 g/)).toBeInTheDocument()
  })

  it('ignores entries whose product was deleted', () => {
    const withMissing: FoodEntry[] = [...entries, { id: 'e3', menge: 100, zeitpunkt: '2026-08-18T14:00:00Z', products: null }]
    render(<DailySummary entries={withMissing} goal={null} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- DailySummary`
Expected: FAIL — `src/components/DailySummary.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/DailySummary.tsx`:

```tsx
import type { FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  goal: number | null
}

function sumKalorien(entries: FoodEntry[]): number {
  return entries.reduce((total, entry) => {
    if (!entry.products) return total
    return total + (entry.products.kalorien * entry.menge) / 100
  }, 0)
}

function sumMakro(entries: FoodEntry[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  return entries.reduce((total, entry) => {
    const value = entry.products?.[makro]
    if (value == null) return total
    return total + (value * entry.menge) / 100
  }, 0)
}

export default function DailySummary({ entries, goal }: Props) {
  const consumed = Math.round(sumKalorien(entries))
  const remaining = goal != null ? Math.round(goal - consumed) : null

  return (
    <div>
      <h2>Heute</h2>
      <p>
        {consumed} kcal verbraucht
        {remaining != null ? `, ${remaining} kcal offen (Ziel ${goal} kcal)` : ''}
      </p>
      <p>
        Eiweiß: {Math.round(sumMakro(entries, 'eiweiss'))} g · Fett: {Math.round(sumMakro(entries, 'fett'))} g ·
        Kohlenhydrate: {Math.round(sumMakro(entries, 'kohlenhydrate'))} g
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- DailySummary`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/DailySummary.tsx src/components/DailySummary.test.tsx
git commit -m "feat: add DailySummary component"
```

---

### Task 9: `components/FoodEntryList.tsx` — heutige Einträge bearbeiten/löschen

**Files:**
- Create: `src/components/FoodEntryList.tsx`
- Test: `src/components/FoodEntryList.test.tsx`

**Interfaces:**
- Consumes: `FoodEntry` type from `../hooks/use-food-entries` (Task 6).
- Produces: `export default function FoodEntryList(props: { entries: FoodEntry[]; onUpdateMenge: (entryId: string, menge: number) => Promise<void>; onDelete: (entryId: string) => Promise<void> }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/FoodEntryList.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FoodEntryList from './FoodEntryList'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-18T12:00:00Z',
    products: { name: 'Testprodukt', kalorien: 100, eiweiss: 1, fett: 2, kohlenhydrate: 3 },
  },
]

describe('FoodEntryList', () => {
  it('shows a placeholder when there are no entries', () => {
    render(<FoodEntryList entries={[]} onUpdateMenge={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('renders each entry with its product name and menge', () => {
    render(<FoodEntryList entries={entries} onUpdateMenge={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByLabelText('Menge (g) für Testprodukt')).toHaveValue(150)
  })

  it('calls onUpdateMenge when the menge input changes', () => {
    const onUpdateMenge = vi.fn()
    render(<FoodEntryList entries={entries} onUpdateMenge={onUpdateMenge} onDelete={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g) für Testprodukt'), { target: { value: '200' } })

    expect(onUpdateMenge).toHaveBeenCalledWith('e1', 200)
  })

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<FoodEntryList entries={entries} onUpdateMenge={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- FoodEntryList`
Expected: FAIL — `src/components/FoodEntryList.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/FoodEntryList.tsx`:

```tsx
import type { FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  onUpdateMenge: (entryId: string, menge: number) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

export default function FoodEntryList({ entries, onUpdateMenge, onDelete }: Props) {
  if (entries.length === 0) {
    return <p>Noch keine Einträge heute.</p>
  }

  return (
    <ul>
      {entries.map((entry) => {
        const label = entry.products?.name ?? 'Unbekanntes Produkt'
        return (
          <li key={entry.id}>
            <span>{label}</span>
            <input
              type="number"
              aria-label={`Menge (g) für ${label}`}
              value={entry.menge}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) onUpdateMenge(entry.id, value)
              }}
            />
            <span>g</span>
            <button type="button" onClick={() => onDelete(entry.id)}>
              Löschen
            </button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- FoodEntryList`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/FoodEntryList.tsx src/components/FoodEntryList.test.tsx
git commit -m "feat: add FoodEntryList component"
```

---

### Task 10: `components/ManualProductForm.tsx` — neues Produkt anlegen

**Files:**
- Create: `src/components/ManualProductForm.tsx`
- Test: `src/components/ManualProductForm.test.tsx`

**Interfaces:**
- Consumes: `Product` type from `../lib/product-lookup` (Task 4); `supabase` client from `../lib/supabase` (Phase 1).
- Produces: `export default function ManualProductForm(props: { barcode?: string; onCreated: (product: Product) => void; onCancel: () => void }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ManualProductForm.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getUser: () => mockGetUser() },
  },
}))

const createdProduct = {
  id: 'p1',
  name: 'Neues Produkt',
  barcode: '4001234567890',
  kalorien: 250,
  eiweiss: 10,
  fett: 5,
  kohlenhydrate: 30,
}

describe('ManualProductForm', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('shows a validation error when name or kalorien are missing', async () => {
    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm onCreated={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Name und Kalorien')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('inserts the product with the given barcode and calls onCreated', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: createdProduct }))
    const onCreated = vi.fn()

    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm barcode="4001234567890" onCreated={onCreated} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neues Produkt' } })
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdProduct))

    const builder = mockFrom.mock.results[0].value
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Neues Produkt', barcode: '4001234567890', kalorien: 250, created_by: 'u1' }),
    )
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm onCreated={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ManualProductForm`
Expected: FAIL — `src/components/ManualProductForm.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/ManualProductForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/product-lookup'

type Props = {
  barcode?: string
  onCreated: (product: Product) => void
  onCancel: () => void
}

export default function ManualProductForm({ barcode, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [kalorien, setKalorien] = useState('')
  const [eiweiss, setEiweiss] = useState('')
  const [fett, setFett] = useState('')
  const [kohlenhydrate, setKohlenhydrate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || kalorien.trim() === '') {
      setError('Name und Kalorien (pro 100 g) sind erforderlich.')
      return
    }

    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          barcode: barcode ?? null,
          kalorien: Number(kalorien),
          eiweiss: eiweiss.trim() === '' ? null : Number(eiweiss),
          fett: fett.trim() === '' ? null : Number(fett),
          kohlenhydrate: kohlenhydrate.trim() === '' ? null : Number(kohlenhydrate),
          created_by: userData.user?.id,
        })
        .select('id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate')
        .single()

      if (insertError || !data) {
        setError(insertError?.message ?? 'Produkt konnte nicht angelegt werden.')
        return
      }

      onCreated(data as Product)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Neues Produkt (Werte pro 100 g)</h2>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Kalorien (kcal)
        <input type="number" value={kalorien} onChange={(event) => setKalorien(event.target.value)} />
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
        <input type="number" value={kohlenhydrate} onChange={(event) => setKohlenhydrate(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        Produkt speichern
      </button>
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ManualProductForm`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ManualProductForm.tsx src/components/ManualProductForm.test.tsx
git commit -m "feat: add ManualProductForm for community product entries"
```

---

### Task 11: `components/BarcodeScanner.tsx` — Kamera-Barcode-Scan

**Files:**
- Modify: `package.json` (add `@zxing/browser` dependency)
- Create: `src/components/BarcodeScanner.tsx`
- Test: `src/components/BarcodeScanner.test.tsx`

**Interfaces:**
- Consumes: `BrowserMultiFormatReader` from `@zxing/browser` (new dependency).
- Produces: `export default function BarcodeScanner(props: { onDetected: (barcode: string) => void; onClose: () => void }): JSX.Element`

- [ ] **Step 1: Install the dependency**

```bash
npm install @zxing/browser
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/BarcodeScanner.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockDecodeFromVideoDevice = vi.fn()
const mockStop = vi.fn()

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: mockDecodeFromVideoDevice,
  })),
}))

describe('BarcodeScanner', () => {
  beforeEach(() => {
    mockDecodeFromVideoDevice.mockReset()
    mockStop.mockReset()
  })

  it('calls onDetected when a barcode is decoded', async () => {
    mockDecodeFromVideoDevice.mockImplementation((_deviceId, _video, callback) => {
      callback({ getText: () => '4001234567890' })
      return Promise.resolve({ stop: mockStop })
    })

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    const onDetected = vi.fn()
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('4001234567890'))
  })

  it('shows an error message when the camera fails to start', async () => {
    mockDecodeFromVideoDevice.mockRejectedValue(new Error('permission denied'))

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Kamera konnte nicht gestartet werden'),
    )
  })

  it('calls onClose when the cancel button is clicked', async () => {
    mockDecodeFromVideoDevice.mockResolvedValue({ stop: mockStop })

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    const onClose = vi.fn()
    render(<BarcodeScanner onDetected={vi.fn()} onClose={onClose} />)

    screen.getByRole('button', { name: 'Abbrechen' }).click()

    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- BarcodeScanner`
Expected: FAIL — `src/components/BarcodeScanner.tsx` does not exist.

- [ ] **Step 4: Write the implementation**

Create `src/components/BarcodeScanner.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type ScannerControls = { stop: () => void }

type Props = {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: ScannerControls | undefined

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result) onDetectedRef.current(result.getText())
      })
      .then((startedControls: ScannerControls) => {
        controls = startedControls
      })
      .catch(() => {
        setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen oder manuell eintragen.')
      })

    return () => controls?.stop()
  }, [])

  return (
    <div>
      <video ref={videoRef} aria-label="Kamera-Vorschau für Barcode-Scan" />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- BarcodeScanner`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/BarcodeScanner.tsx src/components/BarcodeScanner.test.tsx
git commit -m "feat: add BarcodeScanner component using @zxing/browser"
```

---

### Task 12: `components/AddEntryFlow.tsx` — Scan/Manuell-Flow orchestrieren

**Files:**
- Create: `src/components/AddEntryFlow.tsx`
- Test: `src/components/AddEntryFlow.test.tsx`

**Interfaces:**
- Consumes: `BarcodeScanner` (Task 11); `ManualProductForm` (Task 10); `findOrFetchProductByBarcode(barcode: string): Promise<Product | null>` and `Product` type from `../lib/product-lookup` (Task 4).
- Produces: `export default function AddEntryFlow(props: { onAdd: (productId: string, menge: number) => Promise<void> }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/AddEntryFlow.test.tsx`:

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
    return <div>Scanner aktiv</div>
  },
}))

vi.mock('./ManualProductForm', () => ({
  default: ({ onCreated }: { onCreated: (product: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onCreated({ id: 'p-new', name: 'Manuell', kalorien: 100, barcode: null, eiweiss: null, fett: null, kohlenhydrate: null })}
    >
      Simulierte manuelle Erstellung
    </button>
  ),
}))

const product = {
  id: 'p1',
  name: 'Gefundenes Produkt',
  barcode: '4001234567890',
  kalorien: 200,
  eiweiss: 1,
  fett: 2,
  kohlenhydrate: 3,
}

describe('AddEntryFlow', () => {
  beforeEach(() => {
    mockFindOrFetch.mockReset()
  })

  it('opens the scanner, finds a product, and adds it with the entered quantity', async () => {
    mockFindOrFetch.mockResolvedValue(product)
    const onAdd = vi.fn().mockResolvedValue(undefined)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    expect(screen.getByText('Scanner aktiv')).toBeInTheDocument()

    mockOnDetected.current('4001234567890')

    await waitFor(() => expect(screen.getByText('Gefundenes Produkt')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('p1', 250))
  })

  it('falls back to the manual form when the barcode is not found', async () => {
    mockFindOrFetch.mockResolvedValue(null)
    const onAdd = vi.fn().mockResolvedValue(undefined)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('9999999999999')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' }))

    await waitFor(() => expect(screen.getByText('Manuell')).toBeInTheDocument())
  })

  it('opens the manual form directly via the fallback button', async () => {
    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell hinzufügen' }))

    expect(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' })).toBeInTheDocument()
    expect(mockFindOrFetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AddEntryFlow`
Expected: FAIL — `src/components/AddEntryFlow.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/AddEntryFlow.tsx`:

```tsx
import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'

type Step = 'idle' | 'scanning' | 'looking-up' | 'confirm-quantity' | 'manual-entry'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
}

export default function AddEntryFlow({ onAdd }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [product, setProduct] = useState<Product | null>(null)
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined)
  const [menge, setMenge] = useState('100')

  const handleDetected = useCallback(async (barcode: string) => {
    setStep('looking-up')
    const found = await findOrFetchProductByBarcode(barcode)
    if (found) {
      setProduct(found)
      setStep('confirm-quantity')
    } else {
      setScannedBarcode(barcode)
      setStep('manual-entry')
    }
  }, [])

  function reset() {
    setStep('idle')
    setProduct(null)
    setScannedBarcode(undefined)
    setMenge('100')
  }

  async function handleConfirmQuantity(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    await onAdd(product.id, Number(menge))
    reset()
  }

  function handleManuallyCreated(created: Product) {
    setProduct(created)
    setStep('confirm-quantity')
  }

  if (step === 'idle') {
    return (
      <div>
        <button type="button" onClick={() => setStep('scanning')}>
          Barcode scannen
        </button>
        <button type="button" onClick={() => setStep('manual-entry')}>
          Manuell hinzufügen
        </button>
      </div>
    )
  }

  if (step === 'scanning') {
    return <BarcodeScanner onDetected={handleDetected} onClose={reset} />
  }

  if (step === 'looking-up') {
    return <p>Produkt wird gesucht…</p>
  }

  if (step === 'manual-entry') {
    return <ManualProductForm barcode={scannedBarcode} onCreated={handleManuallyCreated} onCancel={reset} />
  }

  if (step === 'confirm-quantity' && product) {
    return (
      <form onSubmit={handleConfirmQuantity}>
        <p>{product.name}</p>
        <label>
          Menge (g)
          <input type="number" value={menge} onChange={(event) => setMenge(event.target.value)} />
        </label>
        <button type="submit">Hinzufügen</button>
        <button type="button" onClick={reset}>
          Abbrechen
        </button>
      </form>
    )
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AddEntryFlow`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AddEntryFlow.tsx src/components/AddEntryFlow.test.tsx
git commit -m "feat: add AddEntryFlow orchestrating scan/manual product entry"
```

---

### Task 13: `pages/NutritionPage.tsx` — Ernährungs-Dashboard zusammensetzen

**Files:**
- Modify: `src/pages/NutritionPage.tsx` (ersetzt den Phase-1-Platzhalter)
- Test: `src/pages/NutritionPage.test.tsx`

**Interfaces:**
- Consumes: `useSession()` from `../hooks/use-session` (Phase 1, returns `{ session: Session | null; loading: boolean }`, `session.user.id: string`); `useProfile(userId)` (Task 5); `useFoodEntries(userId)` (Task 6); `effectiveCalorieGoal` from `../lib/nutrition-goal` (Task 2); `DailySummary` (Task 8); `CalorieGoalEditor` (Task 7); `FoodEntryList` (Task 9); `AddEntryFlow` (Task 12).
- Produces: `export default function NutritionPage(): JSX.Element | null`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/NutritionPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({
  useFoodEntries: (userId: string) => mockUseFoodEntries(userId),
}))

const profile = {
  id: 'u1',
  name: null,
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: 2000,
}

describe('NutritionPage', () => {
  it('shows a loading state while profile or entries are loading', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: null, loading: true, updateProfile: vi.fn() })
    mockUseFoodEntries.mockReturnValue({
      entries: [],
      loading: true,
      addEntry: vi.fn(),
      updateEntryMenge: vi.fn(),
      deleteEntry: vi.fn(),
    })

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />)

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders the dashboard sections once profile and entries are loaded', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile, loading: false, updateProfile: vi.fn() })
    mockUseFoodEntries.mockReturnValue({
      entries: [],
      loading: false,
      addEntry: vi.fn(),
      updateEntryMenge: vi.fn(),
      deleteEntry: vi.fn(),
    })

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />)

    expect(screen.getByRole('heading', { name: 'Ernährung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument()
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Barcode scannen' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- NutritionPage`
Expected: FAIL — current placeholder does not render "Lädt…", "Heute", or the scan button.

- [ ] **Step 3: Write the implementation**

Replace `src/pages/NutritionPage.tsx`:

```tsx
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import DailySummary from '../components/DailySummary'
import CalorieGoalEditor from '../components/CalorieGoalEditor'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return null

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, updateProfile } = useProfile(userId)
  const { entries, loading: entriesLoading, addEntry, updateEntryMenge, deleteEntry } = useFoodEntries(userId)

  if (profileLoading || entriesLoading || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)

  return (
    <div>
      <h1>Ernährung</h1>
      <DailySummary entries={entries} goal={goal} />
      <CalorieGoalEditor profile={profile} onUpdate={updateProfile} />
      <FoodEntryList entries={entries} onUpdateMenge={updateEntryMenge} onDelete={deleteEntry} />
      <AddEntryFlow onAdd={addEntry} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- NutritionPage`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/NutritionPage.tsx src/pages/NutritionPage.test.tsx
git commit -m "feat: assemble the Ernährungs-Dashboard on NutritionPage"
```

---

### Task 14: Finale lokale Verifikation

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (Phase 1 suite + all new Phase 2 tests).

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: no errors (warnings, if any, do not fail the command).

- [ ] **Step 3: Run the type-checked build**

Run: `npm run build`
Expected: `tsc -b` and `vite build` both succeed with no type errors.

- [ ] **Step 4: Update `docs/domaenenmodell.md`**

In the `profiles` entity block inside the ` ```mermaid ` ERD, add these five lines right after the existing `numeric aktuelles_gewicht` line:

```
        string geschlecht
        string aktivitaetslevel
        string ziel
        numeric ziel_delta_kcal
        numeric taegliches_kalorienziel
```

In the "Fachliche Notizen" section, add a new bullet:

```
- `profiles.geschlecht/aktivitaetslevel/ziel/ziel_delta_kcal` speisen die Mifflin-St-Jeor-Berechnung des Kalorienziels (`src/lib/nutrition-goal.ts`); `taegliches_kalorienziel` überschreibt die Berechnung, wenn gesetzt. `products.barcode` hat seit Phase 2 einen Unique-Index für nicht-null-Werte (`products_barcode_unique`).
```

And update the last bullet's migration reference from "Stand Phase 1" to "Stand Phase 2, inkl. `0002_nutrition_profile_fields.sql`".

Copy the updated file to `../fitness-app.wiki/Domain-Model.md` (sibling wiki checkout, see project memory) — do not commit/push the wiki yet, that stays a separate explicit step the user confirms, same as after Phase 1.

- [ ] **Step 5: Update `CLAUDE.md` status section**

Run `git log --oneline` and copy the resulting commit hashes for Tasks 1–13 into a new "Phase 2" block in `CLAUDE.md`'s "Status / Fortschritt" section, following the exact format of the existing Phase 1 block (task name — fertig, Commit `<hash>`).

- [ ] **Step 6: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: update domain model and status for Phase 2 completion"
```

## Manual Verification (User, after push and merge)

These steps need the real, deployed Supabase project and a real device camera — they can't be automated here:

1. Push the branch to `origin` (not directly to `master`) and open a PR into `master` on GitHub, same flow as Phase 1 (direct pushes to `master` fire no CI since the workflow triggers on `pull_request`).
2. Confirm the `CI` workflow runs on the PR and all jobs go green, then merge — the `0002` migration applies automatically via the Supabase↔GitHub integration (already active since Phase 1).
3. In the Supabase Table Editor, spot-check that `profiles` has the five new columns and `products` has the `products_barcode_unique` index (Database → Indexes).
4. Start the dev server (`npm run dev`) on a phone or a laptop with a webcam, over HTTPS or `localhost` (camera access requires a secure context).
5. Open `/nutrition`, tap "Barcode scannen", grant camera permission, and scan a real product barcode with a known Open Food Facts entry → should look it up, show a quantity dialog, and add an entry after confirming.
6. Scan or type a barcode with no Open Food Facts entry (or use "Manuell hinzufügen") → fill out the manual form → should create the product and add an entry.
7. Confirm `DailySummary` shows the correct total kcal/macros for the entries just added (kalorien × menge / 100 per entry).
8. Edit an entry's Menge in `FoodEntryList` and confirm the summary updates; delete an entry and confirm it disappears and the summary updates.
9. In the profile's calorie goal section, switch between "Berechnen lassen" and "Manuell festlegen", set a manual value, then switch back — confirm the calculated value reappears correctly and matches Mifflin-St-Jeor by hand for your own profile data.
10. If your profile is missing Gewicht/Größe/Alter/Geschlecht/Aktivitätslevel, confirm the "Profil vervollständigen" hint shows instead of a crash.
