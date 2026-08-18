# Phase 1 (Grundgerüst & Security-Basis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Vite/React/TypeScript project skeleton with Supabase Auth + Row-Level-Security, the full base database schema, placeholder UI for the four dashboards, and a CI/CD pipeline running Semgrep and OWASP ZAP.

**Architecture:** A single-page React app (Vite, TypeScript) talks to Supabase directly from the client using the `anon`/publishable key; every table has RLS so the client never needs elevated privileges. React Router gates four placeholder dashboard routes behind a session check; an unauthenticated visitor only ever sees the login screen. The database schema and CI pipeline are infrastructure-as-code committed to the repo.

**Tech Stack:** React 19 + Vite + TypeScript, `@supabase/supabase-js`, `react-router-dom`, Vitest + React Testing Library, GitHub Actions (Semgrep, `npm audit`, OWASP ZAP baseline scan).

**Spec:** `docs/superpowers/specs/2026-08-18-phase1-grundgeruest-design.md`

## Global Constraints

- No functionality from Phase 2+ (no barcode scan, no workout logic, no PWA manifest/service worker, no Gemini, no Apple Shortcuts) — see spec "Out of scope".
- Only the `anon`/publishable Supabase key is used in client code. The `service_role` key is never referenced anywhere in this codebase.
- All secrets live only in `.env` (gitignored). `.env.example` holds placeholders only and is the only env file committed.
- Row-Level-Security is enabled on every table created in this plan, no exceptions.
- No Docker, no local Postgres instance. The migration ships to production automatically via the Supabase↔GitHub integration when merged to `main` (already confirmed connected by the user).
- Naming (from `CLAUDE.md`): all code identifiers in English; plain TS files kebab-case (e.g. `use-session.ts`); React component files PascalCase (e.g. `ProtectedRoute.tsx`). Database column/table names stay German, matching `docs/fitness-app-architektur.md` §10 (already approved in the spec).
- Never run `git push`. Every task ends with a local commit only; pushing to `origin` is a separate, explicit action the user takes.

---

### Task 1: Project scaffold & test tooling

**Files:**
- Create: full Vite scaffold via CLI (`package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `.gitignore`, `public/`)
- Modify: `vite.config.ts`
- Create: `src/test-setup.ts`
- Modify: `.gitignore`
- Create: `.env.example`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm run dev|build|lint|preview|test` scripts; Vitest configured with `jsdom` environment, `src/test-setup.ts` as setup file, and default test env vars `VITE_SUPABASE_URL=https://example.supabase.co` / `VITE_SUPABASE_ANON_KEY=test-anon-key` (consumed by every later test task so importing `src/lib/supabase.ts` never crashes a test by default).

- [ ] **Step 1: Scaffold the Vite project**

Run (in the repo root, which already contains `CLAUDE.md`, `docs/`, `.git/`):

```bash
npm create vite@latest . -- --template react-ts --force
```

Expected: `package.json`, `index.html`, `src/`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.gitignore`, `public/` are created. Existing `CLAUDE.md` and `docs/` are untouched.

- [ ] **Step 2: Install runtime and test dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/dom jsdom
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the file's contents with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Exclude `.env` from git**

Open `.gitignore` and append a new line at the end:

```
.env
```

(`.env.example` is not excluded and stays tracked; the generated `.gitignore` already ignores `node_modules`, `dist`, and `*.local`, which does not match plain `.env` — this line closes that gap.)

- [ ] **Step 6: Create `.env.example`**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 7: Add the `test` npm script**

Open `package.json`, in the `"scripts"` object add:

```json
"test": "vitest run"
```

(alongside the existing `dev`, `build`, `lint`, `preview` scripts generated by the scaffold.)

- [ ] **Step 8: Create the local `.env` with real Supabase values**

Create `.env` (gitignored, never committed) with the project's actual Supabase Project URL and publishable key gathered earlier in this conversation — do not invent placeholder values here, use the real ones. If you don't have them, stop and ask the user for their Supabase Project URL and publishable/anon key before continuing.

- [ ] **Step 9: Verify the scaffold and Vitest config are valid**

Run:

```bash
npx vitest run --passWithNoTests
```

Expected: exits 0, no config errors (no test files exist yet, that's fine).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite/React/TypeScript project with Vitest tooling"
```

---

### Task 2: Supabase client with fail-fast env validation

**Files:**
- Create: `src/lib/supabase.ts`
- Test: `src/lib/supabase.test.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY` (test defaults from Task 1's `vite.config.ts`)
- Produces: `export const supabase: SupabaseClient` from `src/lib/supabase.ts`, throws at module load if either env var is missing/empty.

- [ ] **Step 1: Write the failing test**

Create `src/lib/supabase.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('supabase client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

    await expect(import('./supabase')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(import('./supabase')).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('creates a client when both env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

    const { supabase } = await import('./supabase')

    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/supabase.test.ts`
Expected: FAIL — `./supabase` module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/supabase.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabase.test.ts
git commit -m "feat: add Supabase client with fail-fast env validation"
```

---

### Task 3: `useSession` hook

**Files:**
- Create: `src/hooks/use-session.ts`
- Test: `src/hooks/use-session.test.ts`

**Interfaces:**
- Consumes: `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()` from `src/lib/supabase.ts` (mocked in the test)
- Produces: `export function useSession(): { session: Session | null; loading: boolean }` from `src/hooks/use-session.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-session.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
  },
}))

describe('useSession', () => {
  it('starts loading, then resolves the session from getSession', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    const { useSession } = await import('./use-session')
    const { result } = renderHook(() => useSession())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual({ user: { id: 'u1' } })
  })

  it('resolves a null session when no user is logged in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    const { useSession } = await import('./use-session')
    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/use-session.test.ts`
Expected: FAIL — `./use-session` module not found.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/use-session.ts`:

```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/use-session.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-session.ts src/hooks/use-session.test.ts
git commit -m "feat: add useSession hook for Supabase auth state"
```

---

### Task 4: `ProtectedRoute` component

**Files:**
- Create: `src/components/ProtectedRoute.tsx`
- Test: `src/components/ProtectedRoute.test.tsx`

**Interfaces:**
- Consumes: `useSession()` from `src/hooks/use-session.ts` (mocked in the test)
- Produces: `export default function ProtectedRoute({ children }: { children: ReactNode })` from `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ProtectedRoute.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({
  useSession: () => mockUseSession(),
}))

async function renderProtected() {
  const { default: ProtectedRoute } = await import('./ProtectedRoute')
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renders children when a session exists', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    await renderProtected()
    expect(screen.getByText('Secret Content')).toBeInTheDocument()
  })

  it('redirects to /login when there is no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })
    await renderProtected()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders nothing while loading', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: true })
    await renderProtected()
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProtectedRoute.test.tsx`
Expected: FAIL — `./ProtectedRoute` module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/ProtectedRoute.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ProtectedRoute.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProtectedRoute.tsx src/components/ProtectedRoute.test.tsx
git commit -m "feat: add ProtectedRoute component"
```

---

### Task 5: `LoginPage` (signup/login form)

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Test: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.signInWithPassword`, `supabase.auth.signUp` from `src/lib/supabase.ts` (mocked in the test); `useNavigate` from `react-router-dom`
- Produces: `export default function LoginPage()` from `src/pages/LoginPage.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/LoginPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (args: unknown) => mockSignIn(args),
      signUp: (args: unknown) => mockSignUp(args),
    },
  },
}))

async function renderLoginPage() {
  const { default: LoginPage } = await import('./LoginPage')
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockSignUp.mockReset()
  })

  it('shows a validation error and does not call Supabase when fields are empty', async () => {
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail und Passwort sind erforderlich.')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows a validation error when the password is too short', async () => {
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signInWithPassword with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })

  it('switches to signup mode and calls signUp', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Noch keinen Account? Registrieren' }))
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL — `./LoginPage` module not found.

- [ ] **Step 3: Write the implementation**

Create `src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  function validate(): string | null {
    if (!email.trim() || !password) return 'E-Mail und Passwort sind erforderlich.'
    if (password.length < 8) return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const { error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      return
    }

    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{mode === 'login' ? 'Login' : 'Signup'}</h1>
      <label>
        E-Mail
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Passwort
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">{mode === 'login' ? 'Einloggen' : 'Registrieren'}</button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon registriert? Einloggen'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx
git commit -m "feat: add LoginPage with signup/login form"
```

---

### Task 6: Placeholder dashboards, navigation, and routing

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/AppLayout.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/TrainingPage.tsx`
- Create: `src/pages/NutritionPage.tsx`
- Create: `src/pages/BodyPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`
- Modify: `src/App.css` (delete, unused after rewrite)

**Interfaces:**
- Consumes: `ProtectedRoute` (Task 4), `LoginPage` (Task 5), `useSession` (Task 3, mocked in the test), `supabase` (Task 2, real client via test env vars)
- Produces: `export default function App()` from `src/App.tsx`, mounted unchanged by the scaffold's `src/main.tsx` (which already does `import App from './App.tsx'`)

- [ ] **Step 1: Write the failing test**

Create `src/App.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUseSession = vi.fn()
vi.mock('./hooks/use-session', () => ({
  useSession: () => mockUseSession(),
}))

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App routing', () => {
  it('shows the login page at /login', async () => {
    window.history.pushState({}, '', '/login')
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('redirects to /login when visiting / without a session', async () => {
    window.history.pushState({}, '', '/')
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows the home dashboard with logout button at / with an active session', async () => {
    window.history.pushState({}, '', '/')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('shows the training placeholder at /training with an active session', async () => {
    window.history.pushState({}, '', '/training')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the default template's `App.tsx` (Vite counter demo) doesn't render a "Login" or "Home" heading.

- [ ] **Step 3: Delete the unused template stylesheet**

Delete `src/App.css`.

- [ ] **Step 4: Create `BottomNav`**

Create `src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/training', label: 'Training' },
  { to: '/nutrition', label: 'Ernährung' },
  { to: '/body', label: 'Körper' },
]

export default function BottomNav() {
  return (
    <nav>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Create `AppLayout`**

Create `src/components/AppLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from './BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 6: Create the four placeholder pages**

Create `src/pages/HomePage.tsx`:

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>Home</h1>
      <p>Platzhalter – Inhalt folgt in Phase 2/3.</p>
    </div>
  )
}
```

Create `src/pages/TrainingPage.tsx`:

```tsx
export default function TrainingPage() {
  return (
    <div>
      <h1>Training</h1>
      <p>Platzhalter – Inhalt folgt in Phase 3.</p>
    </div>
  )
}
```

Create `src/pages/NutritionPage.tsx`:

```tsx
export default function NutritionPage() {
  return (
    <div>
      <h1>Ernährung</h1>
      <p>Platzhalter – Inhalt folgt in Phase 2.</p>
    </div>
  )
}
```

Create `src/pages/BodyPage.tsx`:

```tsx
export default function BodyPage() {
  return (
    <div>
      <h1>Körper</h1>
      <p>Platzhalter – Inhalt folgt in Phase 4.</p>
    </div>
  )
}
```

- [ ] **Step 7: Rewrite `App.tsx`**

Replace the contents of `src/App.tsx`:

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TrainingPage from './pages/TrainingPage'
import NutritionPage from './pages/NutritionPage'
import BodyPage from './pages/BodyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HomePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TrainingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nutrition"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NutritionPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/body"
          element={
            <ProtectedRoute>
              <AppLayout>
                <BodyPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

No change needed to `src/main.tsx` — it already does `import App from './App.tsx'`, which still matches this default export.

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 9: Run the full test suite**

Run: `npm run test`
Expected: all tests across every file (Tasks 2–6) PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add placeholder dashboards, bottom nav, and app routing"
```

---

### Task 7: Database migration (base schema + RLS)

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`
- Test: `supabase/migrations/0001_initial_schema.test.ts`

**Interfaces:**
- Produces: 12 tables (`profiles`, `products`, `food_entries`, `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_sessions`, `workout_session_sets`, `body_metrics`, `body_photos`, `day_status`, `health_sync_data`), each with RLS enabled and at least one policy; a `handle_new_user` trigger function on `auth.users`.

- [ ] **Step 1: Write the failing structural test**

Create `supabase/migrations/0001_initial_schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sql = readFileSync(
  fileURLToPath(new URL('./0001_initial_schema.sql', import.meta.url)),
  'utf-8',
)

const expectedTables = [
  'profiles',
  'products',
  'food_entries',
  'exercises',
  'workout_plans',
  'workout_plan_exercises',
  'workout_sessions',
  'workout_session_sets',
  'body_metrics',
  'body_photos',
  'day_status',
  'health_sync_data',
]

describe('0001_initial_schema.sql', () => {
  it('creates every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table} `))
    }
  })

  it('enables row level security on every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`))
    }
  })

  it('defines at least one policy on every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`on public\\.${table}\\s`))
    }
  })

  it('defines the handle_new_user trigger for automatic profile creation', () => {
    expect(sql).toContain('create function public.handle_new_user')
    expect(sql).toContain('after insert on auth.users')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/migrations/0001_initial_schema.test.ts`
Expected: FAIL — `0001_initial_schema.sql` does not exist (ENOENT).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0001_initial_schema.sql`:

```sql
-- Phase 1: base schema for all four app areas. RLS enabled on every table.

-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  alter integer,
  groesse numeric,
  aktuelles_gewicht numeric,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- products: community nutrition database
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text,
  kalorien numeric not null,
  eiweiss numeric,
  fett numeric,
  kohlenhydrate numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (auth.role() = 'authenticated');

create policy "products_insert_own" on public.products
  for insert with check (created_by = auth.uid());

create policy "products_update_own" on public.products
  for update using (created_by = auth.uid());

create policy "products_delete_own" on public.products
  for delete using (created_by = auth.uid());

-- food_entries
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id),
  menge numeric not null,
  zeitpunkt timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.food_entries enable row level security;

create policy "food_entries_all_own" on public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercises: community entries + later free-exercise-db import
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kategorie text,
  equipment text,
  muskelgruppen_primaer text[],
  muskelgruppen_sekundaer text[],
  bild_url text,
  met_wert numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "exercises_select_all" on public.exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_insert_own" on public.exercises
  for insert with check (created_by = auth.uid());

create policy "exercises_update_own" on public.exercises
  for update using (created_by = auth.uid());

create policy "exercises_delete_own" on public.exercises
  for delete using (created_by = auth.uid());

-- workout_plans
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  aktiv boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "workout_plans_all_own" on public.workout_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_plan_exercises
create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  reihenfolge integer not null,
  ziel_saetze integer,
  ziel_wiederholungen integer,
  pausenzeit_sekunden integer,
  created_at timestamptz not null default now()
);

alter table public.workout_plan_exercises enable row level security;

create policy "workout_plan_exercises_all_own" on public.workout_plan_exercises
  for all using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  );

-- workout_sessions
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id),
  gestartet_am timestamptz,
  beendet_am timestamptz,
  gesamt_kalorien numeric,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_session_sets
create table public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  satz_nummer integer not null,
  gewicht numeric,
  wiederholungen integer,
  abgeschlossen_am timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_session_sets enable row level security;

create policy "workout_session_sets_all_own" on public.workout_session_sets
  for all using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  );

-- body_metrics
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  gewicht numeric,
  bauchumfang numeric,
  beinumfang numeric,
  armumfang numeric,
  ruckenumfang numeric,
  brustumfang numeric,
  created_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

create policy "body_metrics_all_own" on public.body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- body_photos
create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  foto_url text not null,
  created_at timestamptz not null default now()
);

alter table public.body_photos enable row level security;

create policy "body_photos_all_own" on public.body_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- day_status
create table public.day_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  status text not null check (status in ('trainingstag', 'restday')),
  created_at timestamptz not null default now()
);

alter table public.day_status enable row level security;

create policy "day_status_all_own" on public.day_status
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- health_sync_data
create table public.health_sync_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schritte integer,
  weitere_health_metriken jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.health_sync_data enable row level security;

create policy "health_sync_data_all_own" on public.health_sync_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/migrations/0001_initial_schema.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql supabase/migrations/0001_initial_schema.test.ts
git commit -m "feat: add Phase 1 base database schema with RLS policies"
```

---

### Task 8: CI/CD pipeline (Semgrep, npm audit, ZAP) + Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `npm run preview` (all from Task 1's `package.json`)
- Produces: a `pull_request`-triggered GitHub Actions workflow with 4 jobs

- [ ] **Step 1: Create the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc -b --noEmit
      - run: npm run lint
      - run: npm run test

  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: semgrep/semgrep-action@v1
        with:
          config: p/react p/typescript p/owasp-top-ten

  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high

  zap-baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run preview -- --host 0.0.0.0 &
      - run: npx --yes wait-on http://localhost:4173
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:4173'
          cmd_options: '-a'
```

- [ ] **Step 2: Create Dependabot config**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- [ ] **Step 3: Validate both YAML files parse correctly**

Run:

```bash
npx --yes js-yaml .github/workflows/ci.yml
npx --yes js-yaml .github/dependabot.yml
```

Expected: both commands print the parsed structure with no error and exit 0. This only checks YAML syntax, not whether the workflow actually succeeds on GitHub — that can only be verified after the first push (see "Manual Verification" below).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/dependabot.yml
git commit -m "ci: add Semgrep, npm audit, and OWASP ZAP baseline pipeline"
```

---

### Task 9: Final local verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: exits 0 (also performs the full TypeScript typecheck).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exits 0, no errors.

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: exits 0, all test files from Tasks 2–7 pass.

- [ ] **Step 4: Confirm working tree is clean**

Run: `git status`
Expected: nothing to commit — every task already committed its own changes. If anything is uncommitted, commit it now with an appropriate message before continuing.

- [ ] **Step 5: Stop — do not push**

Report Phase 1 as locally complete and ready for review. Do **not** run `git push`. Pushing to `origin/main` (and, per the user's earlier decision, enabling the Supabase "Deploy to production" toggle afterward) is a manual step the user takes explicitly, not part of this plan's automated execution.

---

## Manual Verification (User, after push)

These steps need the real, deployed Supabase project and can't be automated here:

1. Push the local `master` branch to a new branch on `origin` — not directly to `main` — and open a pull request into `main` on GitHub, e.g.:
   ```bash
   git push -u origin master:phase-1-grundgeruest
   ```
   Then open a PR from `phase-1-grundgeruest` into `main` on GitHub. Pushing straight to `origin/main` would fire no CI (the workflow only triggers on `pull_request`) while Supabase's GitHub integration would still auto-apply the migration on that same push — opening a PR ensures CI runs before anything merges.
2. Confirm the `CI` workflow runs on the PR and all 4 jobs go green, then merge the PR into `main`.
3. In Supabase, enable "Deploy to production" (Settings → Integrations → GitHub) now that `main` exists on GitHub — this applies `0001_initial_schema.sql` on the next push to `main` (i.e. this merge, or the next one).
4. Start the dev server (`npm run dev`) with a real `.env`.
5. Sign up with a new e-mail → should redirect to `/` and show the Home placeholder with the four tabs and a Logout button.
6. Click through all four tabs (Home/Training/Ernährung/Körper) — each shows its placeholder heading.
7. Click Logout → should redirect back to `/login`.
8. In the Supabase Table Editor, confirm a `profiles` row was created automatically for the new user (via the `handle_new_user` trigger).
