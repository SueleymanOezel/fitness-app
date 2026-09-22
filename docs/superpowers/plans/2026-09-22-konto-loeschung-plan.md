# GDPR-Konto-Löschung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-service "Konto löschen" in VitaLoop — ein Nutzer kann sein Konto und alle Daten endgültig und ohne Support-Eingriff löschen.

**Architecture:** Eine additive Migration schließt die letzten beiden nicht-kaskadierenden Fremdschlüssel (`products.created_by`, `exercises.created_by`), damit `auth.admin.deleteUser` nicht mit einer Fremdschlüssel-Verletzung scheitert. Eine neue Supabase Edge Function (`delete-account`, erste im Projekt) führt die eigentliche Löschung serverseitig mit dem Service-Role-Key aus — Storage-Aufräumen zuerst, dann `auth.admin.deleteUser`, das den Rest über bereits bestehende `on delete cascade`-Beziehungen erledigt. `ProfilePage.tsx` bekommt eine neue Sektion mit Warnhinweis-Dialog und Tippbestätigung, die die Funktion aufruft.

**Tech Stack:** React + Vite + TypeScript (Frontend), Supabase Postgres + Auth + Storage + Edge Functions (Deno), Vitest/RTL (Frontend-Tests), Deno.test (Edge-Function-Tests, auf dieser Maschine nicht ausführbar — siehe Task 2).

**Spec:** `docs/superpowers/specs/2026-09-22-konto-loeschung-design.md`

## Global Constraints

- Kein Gnadenfrist-/Reaktivierungsmodell — sofortiges, endgültiges Löschen (Spec-Entscheidung 1).
- Kein neuer Scheduler/Cron.
- Tippbestätigung mit dem exakten Wort `LÖSCHEN`, keine Passwort-Reauthentifizierung (Spec-Entscheidung 4).
- Storage-Bucket-Name `body-photos`, Pfadformat `{userId}/{dateiname}` (bestehende Konvention aus `src/lib/body-photo-urls.ts`/`src/hooks/use-body-photos.ts`).
- Fehler, die auftreten können während ein Dialog offen bleibt, werden inline im Dialog gezeigt, nie als Toast (bestehende Projekt-Konvention, siehe „Ein Ding, das beim Weiterbauen gilt" in `CLAUDE.md`).
- Kein destruktiver/roter Button-Stil im Design-System — `buttonPrimaryClass`/`buttonSecondaryClass` sind die einzigen Varianten (bestehende Konvention).
- Deployment der Edge Function und Ende-zu-Ende-Verifikation brauchen die Supabase-CLI, die auf dieser Maschine nicht installiert ist — dieser Plan bringt den Code bis zum deploybaren Zustand, das eigentliche `supabase functions deploy` läuft erst, wenn die CLI verfügbar ist (analog zum `firebase deploy`-Muster: der Nutzer führt es aus).

---

### Task 1: Migration 0013 — `on delete set null` für `products.created_by`/`exercises.created_by`

**Files:**
- Create: `supabase/migrations/0013_account_deletion_cascade.sql`
- Test: `supabase/migrations/0013_account_deletion_cascade.test.ts`
- Modify: `docs/domaenenmodell.md`

**Interfaces:**
- Produces: Constraint-Namen bleiben `products_created_by_fkey`/`exercises_created_by_fkey` (nur die `on delete`-Klausel ändert sich) — spätere Tasks müssen daran nichts anpassen, `products`/`exercises` verhalten sich für alle bestehenden Abfragen unverändert.

- [ ] **Step 1: Write the failing test**

```ts
// supabase/migrations/0013_account_deletion_cascade.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0013_account_deletion_cascade.sql'),
  'utf-8',
)
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0013_account_deletion_cascade.sql', () => {
  it('replaces products_created_by_fkey with an on delete set null version', () => {
    expect(statements).toContain('alter table public.products')
    expect(statements).toContain('drop constraint products_created_by_fkey')
    expect(statements).toMatch(
      /add constraint products_created_by_fkey\s+foreign key \(created_by\) references auth\.users \(id\) on delete set null/,
    )
  })

  it('replaces exercises_created_by_fkey with an on delete set null version', () => {
    expect(statements).toContain('alter table public.exercises')
    expect(statements).toContain('drop constraint exercises_created_by_fkey')
    expect(statements).toMatch(
      /add constraint exercises_created_by_fkey\s+foreign key \(created_by\) references auth\.users \(id\) on delete set null/,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/migrations/0013_account_deletion_cascade.test.ts`
Expected: FAIL — `ENOENT: no such file or directory` beim `readFileSync`, weil `0013_account_deletion_cascade.sql` noch nicht existiert.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/0013_account_deletion_cascade.sql
-- Beide Fremdschlüssel hatten bisher keine on-delete-Klausel (Postgres-Default
-- NO ACTION). Da products/exercises geteilte Community-Tabellen sind, würde
-- ein Löschen von auth.users mit einer Fremdschlüssel-Verletzung scheitern,
-- sobald der Nutzer je einen Barcode gescannt oder eine eigene Übung angelegt
-- hat — praktisch jeder aktive Nutzer. on delete set null passt zur bereits
-- etablierten Haltung aus products_update_own/products_delete_own: created_by
-- markiert nur, wer eine geteilte Zeile ursprünglich angelegt hat, nicht
-- dauerhafte Autorenschaft. Mit created_by = null bleibt die Zeile für alle
-- anderen Nutzer unverändert nutzbar, ist aber von niemandem mehr
-- bearbeit- oder löschbar (siehe Migration 0012).
alter table public.products
  drop constraint products_created_by_fkey,
  add constraint products_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.exercises
  drop constraint exercises_created_by_fkey,
  add constraint exercises_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/migrations/0013_account_deletion_cascade.test.ts`
Expected: PASS, 2 Tests grün.

- [ ] **Step 5: Domain-Model-Doku ergänzen**

In `docs/domaenenmodell.md`, im Satz der bereits mit „Bei `products` gilt das seit Migration `0012`…" beginnt (im Abschnitt direkt vor dem ERD), am Ende ergänzen:

```
 Seit Migration `0013` setzt das Löschen eines Kontos `created_by` auf `products` und `exercises` auf `null`, statt die Löschung zu blockieren oder die geteilte Zeile zu entfernen — beide Tabellen überleben unverändert.
```

(Der Satz wird direkt an den bestehenden, mit „…legt stattdessen immer eine eigene Kopie ohne Barcode an (`src/lib/product-edit.ts`)." endenden Satz angehängt, im selben Absatz.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0013_account_deletion_cascade.sql supabase/migrations/0013_account_deletion_cascade.test.ts docs/domaenenmodell.md
git commit -m "feat: allow deleting a user without orphaning shared products/exercises"
```

---

### Task 2: Edge Function `delete-account`

**Files:**
- Create: `supabase/functions/delete-account/core.ts`
- Create: `supabase/functions/delete-account/core.test.ts` (Deno-Test — auf dieser Maschine nicht ausführbar, siehe Step 2)
- Create: `supabase/functions/delete-account/index.ts`
- Modify: `vite.config.ts` (vitest muss `supabase/functions/**` ignorieren, sonst bricht `npx vitest run` an den Deno-Test-Dateien)

**Interfaces:**
- Produces (aus `core.ts`, von `index.ts` in diesem Task und potenziell von künftigen Edge Functions genutzt):
  ```ts
  export type CallerAuth = {
    getUser(): Promise<
      | { data: { user: { id: string } }; error: null }
      | { data: { user: null }; error: { message: string } }
    >
  }
  export type AdminAuth = { deleteUser(userId: string): Promise<{ error: { message: string } | null }> }
  export type Storage = {
    list(prefix: string): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>
    remove(paths: string[]): Promise<{ error: { message: string } | null }>
  }
  export type DeleteAccountResult = { ok: true } | { ok: false; error: string }
  export function deleteAccount(
    callerAuth: CallerAuth,
    adminAuth: AdminAuth,
    storage: Storage,
  ): Promise<DeleteAccountResult>
  ```
- Consumes: nichts aus früheren Tasks (Migration 0013 ist eine reine DB-Änderung, diese Function greift zur Laufzeit über Supabase-Clients darauf zu, kein Code-Import).

- [ ] **Step 1: vitest von den Deno-Testdateien fernhalten**

`vite.config.ts` — den bestehenden `test`-Block um ein `exclude` erweitern (vitests Default-`exclude` wird durch eine eigene Angabe komplett ersetzt, deshalb die Standardliste explizit mit übernehmen):

```ts
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,vite.config,vitest.config,jest.config,ava.config,babel.config,nuxt.config,karma.conf,rollup.config,webpack.config}.*',
      // Deno edge function tests run via `deno test`, not vitest — Deno
      // globals and remote https:// imports break the Node/jsdom runner.
      'supabase/functions/**',
    ],
  },
```

Verifizieren: `mkdir -p supabase/functions/delete-account && printf "Deno.test('x', () => {})\n" > supabase/functions/delete-account/core.test.ts && npx vitest run` — muss weiterhin alle bisherigen Testdateien grün zeigen, ohne einen Fehlversuch für die neue Datei. Danach die Scratch-Datei wieder löschen (`rm supabase/functions/delete-account/core.test.ts`), der echte Inhalt kommt in Step 2.

- [ ] **Step 2: Write the failing Deno test**

**Kann auf dieser Maschine nicht ausgeführt werden** (weder `deno` noch die Supabase-CLI sind installiert, siehe Global Constraints) — trotzdem zuerst schreiben (TDD-Prinzip nicht stillschweigend überspringen). Der Nutzer führt `deno test supabase/functions/delete-account/` nach, sobald Deno verfügbar ist, und bestätigt RED/GREEN dann nachträglich.

```ts
// supabase/functions/delete-account/core.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { deleteAccount, type AdminAuth, type CallerAuth, type Storage } from './core.ts'

function fakeCallerAuth(userId: string | null): CallerAuth {
  return {
    getUser: () =>
      Promise.resolve(
        userId
          ? { data: { user: { id: userId } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } },
      ),
  }
}

Deno.test("deletes the caller's storage files and account on success", async () => {
  const removedCalls: string[][] = []
  const deletedUserIds: string[] = []
  const storage: Storage = {
    list: () => Promise.resolve({ data: [{ name: 'a.jpg' }, { name: 'b.jpg' }], error: null }),
    remove: (paths) => {
      removedCalls.push(paths)
      return Promise.resolve({ error: null })
    },
  }
  const admin: AdminAuth = {
    deleteUser: (userId) => {
      deletedUserIds.push(userId)
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: true })
  assertEquals(removedCalls, [['u1/a.jpg', 'u1/b.jpg']])
  assertEquals(deletedUserIds, ['u1'])
})

Deno.test('rejects when the caller has no valid session', async () => {
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ error: null }),
  }
  const admin: AdminAuth = { deleteUser: () => Promise.resolve({ error: null }) }

  const result = await deleteAccount(fakeCallerAuth(null), admin, storage)

  assertEquals(result, { ok: false, error: 'invalid session' })
})

Deno.test('skips storage.remove when there are no files, still deletes the account', async () => {
  let removeCalled = false
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => {
      removeCalled = true
      return Promise.resolve({ error: null })
    },
  }
  const deletedUserIds: string[] = []
  const admin: AdminAuth = {
    deleteUser: (userId) => {
      deletedUserIds.push(userId)
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: true })
  assertEquals(removeCalled, false)
  assertEquals(deletedUserIds, ['u1'])
})

Deno.test('stops before deleting the account when storage cleanup fails', async () => {
  let deleteCalled = false
  const storage: Storage = {
    list: () => Promise.resolve({ data: [{ name: 'a.jpg' }], error: null }),
    remove: () => Promise.resolve({ error: { message: 'storage down' } }),
  }
  const admin: AdminAuth = {
    deleteUser: () => {
      deleteCalled = true
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: false, error: 'storage cleanup failed' })
  assertEquals(deleteCalled, false)
})

Deno.test('reports an error when deleteUser fails after successful cleanup', async () => {
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ error: null }),
  }
  const admin: AdminAuth = { deleteUser: () => Promise.resolve({ error: { message: 'admin api down' } }) }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: false, error: 'account deletion failed' })
})
```

Erwartete RED-Meldung (sobald `deno test` läuft, nicht auf dieser Maschine): Modul `./core.ts` nicht gefunden.

- [ ] **Step 3: Write the core logic**

```ts
// supabase/functions/delete-account/core.ts
export type CallerAuth = {
  getUser(): Promise<
    | { data: { user: { id: string } }; error: null }
    | { data: { user: null }; error: { message: string } }
  >
}

export type AdminAuth = {
  deleteUser(userId: string): Promise<{ error: { message: string } | null }>
}

export type Storage = {
  list(prefix: string): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>
  remove(paths: string[]): Promise<{ error: { message: string } | null }>
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

/**
 * Storage files have no foreign-key relationship to any Postgres table, so
 * they never disappear on their own when the account is deleted — they must
 * be removed explicitly, before deleteUser runs. If cleanup fails, the
 * account is left intact rather than deleted with orphaned files nobody can
 * reach: a retryable half-state is safer than an unretryable one.
 */
export async function deleteAccount(
  callerAuth: CallerAuth,
  adminAuth: AdminAuth,
  storage: Storage,
): Promise<DeleteAccountResult> {
  const { data, error: authError } = await callerAuth.getUser()
  if (authError || !data.user) return { ok: false, error: 'invalid session' }
  const userId = data.user.id

  const { data: files, error: listError } = await storage.list(userId)
  if (listError) return { ok: false, error: 'storage cleanup failed' }

  if (files && files.length > 0) {
    const paths = files.map((file) => `${userId}/${file.name}`)
    const { error: removeError } = await storage.remove(paths)
    if (removeError) return { ok: false, error: 'storage cleanup failed' }
  }

  const { error: deleteError } = await adminAuth.deleteUser(userId)
  if (deleteError) return { ok: false, error: 'account deletion failed' }

  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

**Auf dieser Maschine nicht ausführbar** (kein `deno`). Sobald der Nutzer Deno installiert hat: `deno test supabase/functions/delete-account/`, erwartet PASS, 5 Tests grün. Bis dahin bleibt dieser Schritt als offener Punkt im Task-Report markiert.

- [ ] **Step 5: Write the wiring layer**

```ts
// supabase/functions/delete-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0'
import { deleteAccount } from './core.ts'

const BODY_PHOTO_BUCKET = 'body-photos'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Scoped to the caller's own JWT: getUser() below can only ever resolve to
  // whoever made this request, never an id a client could supply itself.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const result = await deleteAccount(
    { getUser: () => callerClient.auth.getUser() },
    { deleteUser: (userId: string) => adminClient.auth.admin.deleteUser(userId) },
    {
      list: (prefix: string) => adminClient.storage.from(BODY_PHOTO_BUCKET).list(prefix),
      remove: (paths: string[]) => adminClient.storage.from(BODY_PHOTO_BUCKET).remove(paths),
    },
  )

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

`SUPABASE_URL`/`SUPABASE_ANON_KEY` sind auf jeder Supabase Edge Function automatisch als Umgebungsvariablen gesetzt (Plattform-Standard, kein eigenes Secret nötig). `SUPABASE_SERVICE_ROLE_KEY` muss der Nutzer einmalig selbst setzen, sobald die CLI verfügbar ist: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>` — **nie** in `.env`, `.env.example` oder irgendeine committete Datei eintragen.

- [ ] **Step 6: `npm run lint`/`tsc -b --noEmit`/`npx vitest run` laufen lassen**

Run: `npm run lint && npx tsc -b --noEmit && npx vitest run`
Erwartung: alle drei sauber/grün — `supabase/functions/**` liegt außerhalb von `tsconfig.app.json`s `include: ["src"]` (wird von `tsc -b` nicht angefasst) und außerhalb von vitests Scope (Step 1), ESLint lintet die Dateien zwar mit (kein Ausschluss nötig, geprüft: `Deno`-Globals und `https://`-Imports lösen keinen Lint-Fehler aus), muss aber sauber sein — bei einem Fehler den Code in Step 3/5 entsprechend korrigieren, nicht den Ausschluss erweitern.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/delete-account/core.ts supabase/functions/delete-account/core.test.ts supabase/functions/delete-account/index.ts vite.config.ts
git commit -m "feat: add delete-account edge function"
```

---

### Task 3: „Konto löschen"-Flow auf `ProfilePage.tsx`

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `supabase.functions.invoke<{ ok: boolean; error?: string }>('delete-account')` (ruft die in Task 2 gebaute Edge Function auf; in Tests wird `supabase.functions.invoke` gemockt, die echte Funktion muss dafür nicht laufen).
- Produces: nichts, das andere Tasks konsumieren — Endpunkt der Kette.

- [ ] **Step 1: Write the failing tests**

Diese drei Verhaltensweisen (Button-Enable-Logik, Erfolgspfad, Fehlerpfad) gehören zu einer einzigen zusammenhängenden Komponente (`DeleteAccountSection`, Step 3) — sie lassen sich nicht sinnvoll durch getrennte Zwischen-Implementierungen treiben, ohne unsinnige Stub-Zwischenstände zu bauen. Deshalb: alle drei Tests zusammen schreiben, zusammen RED verifizieren (Step 2), dann zusammen implementieren (Step 3), zusammen GREEN verifizieren (Step 4) — statt für Test 2/3 ein künstliches RED zu erzwingen, das nur denselben schon in Step 3 feststehenden Code noch einmal anders aufrufen würde.

In `src/pages/ProfilePage.test.tsx`, am Anfang der Datei die bestehenden Mocks um `functions.invoke` und `react-router-dom` erweitern:

```ts
const mockInvoke = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn() },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
```

(Diese Blöcke stehen neben den bestehenden `vi.mock('../hooks/use-session', ...)`/`vi.mock('../hooks/use-profile', ...)`-Aufrufen, vor der `profile`-Konstante.)

Im bestehenden `describe('ProfilePage', ...)`-Block einen `beforeEach` ergänzen (falls noch keiner existiert, neu anlegen) und alle drei neuen Testfälle:

```ts
  beforeEach(() => {
    mockInvoke.mockReset()
    mockNavigate.mockReset()
  })

  it('keeps the delete-account confirm button disabled until "LÖSCHEN" is typed exactly', async () => {
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))
    const confirmButton = screen.getByRole('button', { name: 'Konto endgültig löschen' })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'löschen' },
    })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    expect(confirmButton).toBeEnabled()
  })

  it('calls the delete-account function and navigates to /login when the account is deleted', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null })
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))
    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(mockInvoke).toHaveBeenCalledWith('delete-account')
  })

  it('shows an inline error and keeps the confirmation text when the function call fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'network' } })
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))
    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Konto konnte nicht gelöscht werden. Bitte erneut versuchen.',
      ),
    )
    expect(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben')).toHaveValue('LÖSCHEN')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify all three fail**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL, alle drei neuen Tests — `Unable to find role="button" and name "Konto löschen"` (die Sektion existiert noch nicht).

- [ ] **Step 3: Write minimal implementation**

In `src/pages/ProfilePage.tsx`, Imports ergänzen:

```ts
import { useNavigate } from 'react-router-dom'
import Dialog from '../components/Dialog'
```

(`inputClass` zu den bereits importierten `ui-classes`-Namen hinzufügen: `import { cardClass, buttonPrimaryClass, buttonSecondaryClass, inputClass } from '../lib/ui-classes'`.)

Neue Komponente, direkt vor `LoadedProfileForm` einfügen:

```tsx
const DELETE_CONFIRM_WORD = 'LÖSCHEN'

function DeleteAccountSection() {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function closeDialog() {
    setDialogOpen(false)
    setConfirmText('')
    setError(null)
  }

  async function handleDelete() {
    setSubmitting(true)
    setError(null)
    const { data, error: invokeError } = await supabase.functions.invoke<{
      ok: boolean
      error?: string
    }>('delete-account')
    if (invokeError || !data?.ok) {
      setSubmitting(false)
      setError('Konto konnte nicht gelöscht werden. Bitte erneut versuchen.')
      return
    }
    navigate('/login')
  }

  return (
    <>
      <button type="button" className={buttonSecondaryClass} onClick={() => setDialogOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="delete" tone="mono" size={20} />
          Konto löschen
        </span>
      </button>
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <div className={cardClass}>
          <h2 className="m-0">Konto endgültig löschen?</h2>
          <p>
            Alle Trainings-, Ernährungs- und Körperdaten sowie Fortschrittsfotos werden
            unwiderruflich gelöscht, dein Login verschwindet. Das lässt sich nicht rückgängig
            machen.
          </p>
          <label>
            Bestätigung: {DELETE_CONFIRM_WORD} eingeben
            <input
              type="text"
              className={inputClass}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            className={buttonPrimaryClass}
            disabled={confirmText !== DELETE_CONFIRM_WORD || submitting}
            onClick={handleDelete}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="delete" tone="mono" size={20} />
              Konto endgültig löschen
            </span>
          </button>
          <button type="button" className={buttonSecondaryClass} onClick={closeDialog}>
            Abbrechen
          </button>
        </div>
      </Dialog>
    </>
  )
}
```

In `LoadedProfileForm`s `return`, direkt nach dem bestehenden Logout-`<button>` (vor dem schließenden `</div>`) einfügen:

```tsx
      <DeleteAccountSection />
```

- [ ] **Step 4: Run tests to verify all three pass**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: PASS, alle Tests dieser Datei grün (die drei neuen plus alle vorher bestehenden).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx
git commit -m "feat: add account deletion flow to the profile page"
```

---

### Task 4: Abschluss — volle Verifikation, Status-Doku, Deployment-Hinweis

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts Neues — reine Verifikation und Doku über das gesamte Vorhaben.

- [ ] **Step 1: Volle Suite/Lint/Typecheck/Build laufen lassen**

Run: `npx vitest run && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: alle vier grün/erfolgreich (Build-Warnung zur Bundle-Größe ist bekannt und bleibt bestehen, keine neue Warnung erwartet).

- [ ] **Step 2: `docs/domaenenmodell.md` gegenprüfen**

Sicherstellen, dass der in Task 1 Step 5 ergänzte Satz noch korrekt zum tatsächlichen Endstand von `products`/`exercises` passt (keine weitere Änderung an diesen beiden Tabellen in Task 2/3). Migration bleibt bei `0013`.

- [ ] **Step 3: `CLAUDE.md`-Status ergänzen**

Im Abschnitt „Claude-Code-Tooling & Sicherheits-/Design-Fahrplan" (Bucket B, Punkt 2) einen neuen Absatz ergänzen, der festhält:
- Migration `0013`, Edge Function `delete-account`, `ProfilePage.tsx`-Flow sind implementiert und lokal verifiziert (Test-/Lint-/Typecheck-/Build-Stand aus Step 1 nennen).
- Die Edge-Function-Tests (`supabase/functions/delete-account/core.test.ts`) sind geschrieben, aber auf dieser Maschine **nicht** ausgeführt worden (kein `deno` installiert) — RED/GREEN steht noch aus.
- **Vor dem Live-Gang nötig, in dieser Reihenfolge:** (1) Supabase-CLI installieren, (2) `deno test supabase/functions/delete-account/` laufen lassen und bestätigen, (3) `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>` einmalig setzen, (4) `supabase functions deploy delete-account`, (5) Migration `0013` läuft automatisch über die GitHub-Integration beim nächsten Push/Merge nach `master` (wie jede andere Migration dieses Projekts), (6) Ende-zu-Ende-Test mit einem Wegwerf-Testkonto: registrieren, ein paar Daten anlegen (Trainingsplan, Ernährungseintrag, ein Foto), „Konto löschen" durchklicken, danach per Supabase-MCP/-Dashboard bestätigen, dass alle Zeilen weg sind, `auth.users` den Account nicht mehr listet, die Storage-Datei weg ist, und — falls das Testkonto einen Barcode gescannt hatte — das zugehörige `products`-Produkt mit `created_by = null` weiterhin existiert und für andere Nutzer normal funktioniert.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record account deletion status and remaining deployment steps"
```
