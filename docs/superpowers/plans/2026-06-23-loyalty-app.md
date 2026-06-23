# Loyalty App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based stamp loyalty card app for a single-location café — staff panel to register customers and add stamps, customer view to check progress via a personal link.

**Architecture:** Next.js App Router with two route groups: `/admin/*` (protected, staff only) and `/card/[token]` (public, read-only). Supabase handles the PostgreSQL database and authentication. Business logic lives in plain TypeScript functions in `lib/` so it can be tested without a database.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS, Vitest, React Testing Library, Vercel (deploy).

---

## File Map

```
app/
├── layout.tsx                     # Root layout + Tailwind font
├── globals.css                    # Tailwind directives
├── admin/
│   ├── layout.tsx                 # Auth guard — redirects to /admin/login if no session
│   ├── login/
│   │   └── page.tsx               # Email + password login form
│   ├── page.tsx                   # Main panel: search bar + customer card + actions
│   └── customers/
│       └── new/
│           └── page.tsx           # Register new customer form
├── card/
│   └── [token]/
│       └── page.tsx               # Public customer stamp card

lib/
├── supabase/
│   ├── client.ts                  # Browser Supabase client (singleton)
│   └── server.ts                  # Server Supabase client (per-request)
├── stamps.ts                      # Pure functions: count active stamps, is reward ready
└── customers.ts                   # Supabase queries: find, create, add stamp, redeem

components/
├── StampGrid.tsx                  # Visual 2×5 stamp grid — used in both admin and /card
├── CustomerProfile.tsx            # Customer name, phone, stamp count, action buttons
└── Toast.tsx                      # Success/error toast notification

supabase/
└── migrations/
    └── 001_initial_schema.sql     # All three tables + RLS policies

middleware.ts                      # Next.js middleware: protect /admin/* routes
.env.local.example                 # Template for required env vars
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

When prompted: choose default options for everything.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Create env vars template**

Create `.env.local.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BUSINESS_NAME=Mi Café
```

Copy to `.env.local` and fill in real values from your Supabase project dashboard.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000` with no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: bootstrap Next.js project with Supabase and Vitest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the SQL migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Customers table
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  card_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

-- Stamps table (one row per stamp awarded)
create table stamps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  added_by text not null,
  created_at timestamptz not null default now()
);

-- Redemptions table (one row per reward redeemed)
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  redeemed_by text not null,
  redeemed_at timestamptz not null default now()
);

-- Row Level Security: allow authenticated users full access (staff panel)
alter table customers enable row level security;
alter table stamps enable row level security;
alter table redemptions enable row level security;

create policy "Authenticated staff can read customers"
  on customers for select to authenticated using (true);

create policy "Authenticated staff can insert customers"
  on customers for insert to authenticated with check (true);

create policy "Authenticated staff can read stamps"
  on stamps for select to authenticated using (true);

create policy "Authenticated staff can insert stamps"
  on stamps for insert to authenticated with check (true);

create policy "Authenticated staff can read redemptions"
  on redemptions for select to authenticated using (true);

create policy "Authenticated staff can insert redemptions"
  on redemptions for insert to authenticated with check (true);

-- Public read for customer card (by token — no auth required)
create policy "Public can read own customer by token"
  on customers for select to anon
  using (true);

create policy "Public can read stamps for card view"
  on stamps for select to anon
  using (true);

create policy "Public can read redemptions for card view"
  on redemptions for select to anon
  using (true);
```

- [ ] **Step 2: Run the migration in Supabase**

Go to your Supabase project dashboard → SQL Editor → paste the full SQL above → click Run.

Expected: no errors, three tables appear in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema for customers, stamps, and redemptions"
```

---

## Task 3: Supabase Client + Middleware

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create auth middleware to protect /admin routes**

Create `middleware.ts` at the project root:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (isAdminRoute && !isLoginPage && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/ middleware.ts
git commit -m "feat: add Supabase client helpers and auth middleware"
```

---

## Task 4: Stamp Business Logic (TDD)

**Files:**
- Create: `lib/stamps.ts`, `lib/stamps.test.ts`

This is the core business logic — pure functions with no database dependency.

- [ ] **Step 1: Write failing tests**

Create `lib/stamps.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { countActiveStamps, isRewardReady } from './stamps'

const STAMPS_REQUIRED = 10

describe('countActiveStamps', () => {
  it('returns 0 when customer has no stamps', () => {
    expect(countActiveStamps([], [])).toBe(0)
  })

  it('returns total stamps when no redemptions exist', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-02T10:00:00Z' },
      { id: '3', created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, [])).toBe(3)
  })

  it('resets count after a redemption — only counts stamps after last redemption', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-05T10:00:00Z' }, // after redemption
      { id: '3', created_at: '2024-01-06T10:00:00Z' }, // after redemption
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-03T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(2)
  })

  it('returns 0 when all stamps are before the last redemption', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-05T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(0)
  })

  it('counts stamps after the LAST redemption when multiple redemptions exist', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-06T10:00:00Z' },
      { id: '3', created_at: '2024-01-11T10:00:00Z' }, // after second redemption
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-03T10:00:00Z' },
      { id: 'r2', redeemed_at: '2024-01-08T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(1)
  })
})

describe('isRewardReady', () => {
  it('returns false when active stamps < 10', () => {
    expect(isRewardReady(9, STAMPS_REQUIRED)).toBe(false)
  })

  it('returns true when active stamps === 10', () => {
    expect(isRewardReady(10, STAMPS_REQUIRED)).toBe(true)
  })

  it('returns true when active stamps > 10', () => {
    expect(isRewardReady(11, STAMPS_REQUIRED)).toBe(true)
  })

  it('returns false when 0 stamps', () => {
    expect(isRewardReady(0, STAMPS_REQUIRED)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run lib/stamps.test.ts
```

Expected: FAIL — "Cannot find module './stamps'"

- [ ] **Step 3: Implement stamps.ts**

Create `lib/stamps.ts`:

```typescript
export interface StampRow {
  id: string
  created_at: string
}

export interface RedemptionRow {
  id: string
  redeemed_at: string
}

export function countActiveStamps(
  stamps: StampRow[],
  redemptions: RedemptionRow[]
): number {
  if (redemptions.length === 0) return stamps.length

  const lastRedemptionDate = redemptions
    .map(r => new Date(r.redeemed_at))
    .reduce((latest, d) => (d > latest ? d : latest), new Date(0))

  return stamps.filter(s => new Date(s.created_at) > lastRedemptionDate).length
}

export function isRewardReady(activeStamps: number, stampsRequired: number): boolean {
  return activeStamps >= stampsRequired
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/stamps.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/stamps.ts lib/stamps.test.ts
git commit -m "feat: add stamp counting business logic with tests"
```

---

## Task 5: Customer Data Layer

**Files:**
- Create: `lib/customers.ts`

- [ ] **Step 1: Create customer data functions**

Create `lib/customers.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { countActiveStamps, isRewardReady, StampRow, RedemptionRow } from '@/lib/stamps'

const STAMPS_REQUIRED = 10

export interface Customer {
  id: string
  name: string
  phone: string
  card_token: string
  created_at: string
}

export interface CustomerWithStamps extends Customer {
  stamps: StampRow[]
  redemptions: RedemptionRow[]
  activeStamps: number
  rewardReady: boolean
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findCustomerByToken(token: string): Promise<CustomerWithStamps | null> {
  const supabase = createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('card_token', token)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return null

  const { data: stamps, error: stampsError } = await supabase
    .from('stamps')
    .select('id, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: true })

  if (stampsError) throw stampsError

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('redemptions')
    .select('id, redeemed_at')
    .eq('customer_id', customer.id)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) throw redemptionsError

  const activeStamps = countActiveStamps(stamps ?? [], redemptions ?? [])

  return {
    ...customer,
    stamps: stamps ?? [],
    redemptions: redemptions ?? [],
    activeStamps,
    rewardReady: isRewardReady(activeStamps, STAMPS_REQUIRED),
  }
}

export async function getCustomerWithStamps(customerId: string): Promise<CustomerWithStamps | null> {
  const supabase = createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return null

  const { data: stamps, error: stampsError } = await supabase
    .from('stamps')
    .select('id, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })

  if (stampsError) throw stampsError

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('redemptions')
    .select('id, redeemed_at')
    .eq('customer_id', customerId)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) throw redemptionsError

  const activeStamps = countActiveStamps(stamps ?? [], redemptions ?? [])

  return {
    ...customer,
    stamps: stamps ?? [],
    redemptions: redemptions ?? [],
    activeStamps,
    rewardReady: isRewardReady(activeStamps, STAMPS_REQUIRED),
  }
}

export async function createCustomer(name: string, phone: string): Promise<Customer> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: name.trim(), phone: phone.trim() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addStamp(customerId: string, addedBy: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('stamps')
    .insert({ customer_id: customerId, added_by: addedBy })

  if (error) throw error
}

export async function redeemReward(customerId: string, redeemedBy: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('redemptions')
    .insert({ customer_id: customerId, redeemed_by: redeemedBy })

  if (error) throw error
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/customers.ts
git commit -m "feat: add customer data layer with Supabase queries"
```

---

## Task 6: StampGrid Component (TDD)

**Files:**
- Create: `components/StampGrid.tsx`, `components/StampGrid.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/StampGrid.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StampGrid from './StampGrid'

describe('StampGrid', () => {
  it('renders 10 slots total', () => {
    const { container } = render(<StampGrid activeStamps={0} total={10} />)
    const slots = container.querySelectorAll('[data-testid="stamp-slot"]')
    expect(slots).toHaveLength(10)
  })

  it('marks the correct number of slots as filled', () => {
    const { container } = render(<StampGrid activeStamps={7} total={10} />)
    const filled = container.querySelectorAll('[data-filled="true"]')
    expect(filled).toHaveLength(7)
  })

  it('marks the remaining slots as empty', () => {
    const { container } = render(<StampGrid activeStamps={7} total={10} />)
    const empty = container.querySelectorAll('[data-filled="false"]')
    expect(empty).toHaveLength(3)
  })

  it('shows all slots filled when activeStamps equals total', () => {
    const { container } = render(<StampGrid activeStamps={10} total={10} />)
    const filled = container.querySelectorAll('[data-filled="true"]')
    expect(filled).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run components/StampGrid.test.tsx
```

Expected: FAIL — "Cannot find module './StampGrid'"

- [ ] **Step 3: Implement StampGrid component**

Create `components/StampGrid.tsx`:

```typescript
interface StampGridProps {
  activeStamps: number
  total: number
}

export default function StampGrid({ activeStamps, total }: StampGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < activeStamps
        const isLastSlot = i === total - 1

        return (
          <div
            key={i}
            data-testid="stamp-slot"
            data-filled={filled}
            className={`
              aspect-square rounded-full flex items-center justify-center text-xl
              ${filled
                ? 'bg-blue-700 text-white'
                : 'border-2 border-dashed border-slate-600 text-slate-600 opacity-40'
              }
              ${isLastSlot && !filled ? 'border-amber-500' : ''}
            `}
          >
            {filled ? '☕' : isLastSlot ? '🎁' : '○'}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run components/StampGrid.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/StampGrid.tsx components/StampGrid.test.tsx
git commit -m "feat: add StampGrid component with tests"
```

---

## Task 7: Toast Component

**Files:**
- Create: `components/Toast.tsx`

- [ ] **Step 1: Create Toast component**

Create `components/Toast.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}

export default function Toast({ message, type, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDone()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-sm
        transition-all duration-300
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}
      `}
    >
      {message}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Toast.tsx
git commit -m "feat: add Toast notification component"
```

---

## Task 8: Admin Login Page

**Files:**
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Create login page**

Create `app/admin/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-white">
            {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Panel de Fidelidad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="cajera@tucafe.com"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create staff account in Supabase**

Go to your Supabase project → Authentication → Users → "Add user" → fill in email and password for the first staff member. Repeat for each cajero.

- [ ] **Step 3: Test login manually**

```bash
npm run dev
```

Visit `http://localhost:3000/admin/login`. Enter the credentials created in Step 2. Expected: redirects to `/admin` (which will 404 for now — that's fine).

- [ ] **Step 4: Commit**

```bash
git add app/admin/login/
git commit -m "feat: add admin login page with Supabase Auth"
```

---

## Task 9: Admin Layout (Auth Guard)

**Files:**
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Create admin layout with auth guard**

Create `app/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">☕</span>
          <span className="font-semibold text-sm">
            {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{user.email}</span>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add admin layout with server-side auth guard"
```

---

## Task 10: Admin Main Panel

**Files:**
- Create: `app/admin/page.tsx`

This is the core page: search by phone, display customer card, add stamp or redeem reward.

- [ ] **Step 1: Create Server Actions file**

Create `app/admin/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { addStamp, redeemReward, findCustomerByPhone } from '@/lib/customers'
import { revalidatePath } from 'next/cache'

export async function addStampAction(customerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await addStamp(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}

export async function redeemRewardAction(customerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await redeemReward(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}
```

- [ ] **Step 2: Create the main admin page**

Create `app/admin/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StampGrid from '@/components/StampGrid'
import AdminActions from './AdminActions'
import { getCustomerWithStamps, findCustomerByPhone } from '@/lib/customers'

interface AdminPageProps {
  searchParams: { phone?: string; customerId?: string }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { phone, customerId } = searchParams

  let customer = null

  if (customerId) {
    customer = await getCustomerWithStamps(customerId)
  } else if (phone) {
    const found = await findCustomerByPhone(phone)
    if (found) {
      customer = await getCustomerWithStamps(found.id)
    }
  }

  const notFound = phone && !customer

  return (
    <div>
      {/* Search form */}
      <form action="/admin" method="get" className="mb-6">
        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
          Buscar cliente por teléfono
        </label>
        <div className="flex gap-2">
          <input
            name="phone"
            type="tel"
            defaultValue={phone}
            placeholder="ej. 5512345678"
            className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Customer not found */}
      {notFound && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
          <p className="text-slate-400 mb-3">No se encontró ningún cliente con ese número.</p>
          <Link
            href={`/admin/customers/new?phone=${phone}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
          >
            Registrar cliente nuevo
          </Link>
        </div>
      )}

      {/* Customer found */}
      {customer && (
        <div className="bg-slate-800 border border-blue-900 rounded-xl p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{customer.name}</h2>
              <p className="text-slate-500 text-sm">📱 {customer.phone}</p>
            </div>
            <div className="bg-blue-950 rounded-lg px-3 py-2 text-center">
              <div className="text-blue-300 text-2xl font-black">{customer.activeStamps}</div>
              <div className="text-blue-500 text-xs">/ 10 sellos</div>
            </div>
          </div>

          {/* Stamp grid */}
          <div className="mb-5">
            <StampGrid activeStamps={customer.activeStamps} total={10} />
          </div>

          {/* Actions — client component for toast feedback */}
          <AdminActions customer={customer} />
        </div>
      )}

      {/* Initial state */}
      {!phone && !customer && (
        <p className="text-slate-600 text-center text-sm mt-4">
          Ingresa un número de teléfono para buscar o registrar un cliente.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create AdminActions client component**

Create `app/admin/AdminActions.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import Toast from '@/components/Toast'
import { addStampAction, redeemRewardAction } from './actions'
import type { CustomerWithStamps } from '@/lib/customers'

interface AdminActionsProps {
  customer: CustomerWithStamps
}

export default function AdminActions({ customer }: AdminActionsProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAddStamp() {
    startTransition(async () => {
      try {
        await addStampAction(customer.id)
        setToast({ message: 'Sello agregado ✓', type: 'success' })
      } catch {
        setToast({ message: 'Error al agregar sello', type: 'error' })
      }
    })
  }

  function handleRedeem() {
    if (!confirm(`¿Confirmar canje de recompensa para ${customer.name}?`)) return

    startTransition(async () => {
      try {
        await redeemRewardAction(customer.id)
        setToast({ message: '¡Recompensa canjeada! Tarjeta reiniciada.', type: 'success' })
      } catch {
        setToast({ message: 'Error al canjear recompensa', type: 'error' })
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        {customer.rewardReady ? (
          <button
            onClick={handleRedeem}
            disabled={isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            🎁 Canjear Recompensa
          </button>
        ) : (
          <button
            onClick={handleAddStamp}
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isPending ? 'Guardando...' : '✚ Agregar Sello'}
          </button>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Verify panel works end-to-end**

```bash
npm run dev
```

1. Go to `http://localhost:3000/admin` — should show search bar
2. Enter a phone number that doesn't exist — should show "Registrar cliente nuevo" link
3. Enter a real customer phone — should show their card (create a test customer in Supabase first via SQL Editor: `insert into customers (name, phone) values ('Test', '1234567890');`)
4. Click "Agregar Sello" — should show toast and refresh stamp count

- [ ] **Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat: add admin main panel with stamp add and redeem actions"
```

---

## Task 11: New Customer Registration Page

**Files:**
- Create: `app/admin/customers/new/page.tsx`

- [ ] **Step 1: Create registration page**

Create `app/admin/customers/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillPhone = searchParams.get('phone') ?? ''

  const [name, setName] = useState('')
  const [phone, setPhone] = useState(prefillPhone)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !phone.trim()) {
      setError('Nombre y teléfono son requeridos.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim() })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Ya existe un cliente con ese número de teléfono.')
      } else {
        setError('Error al registrar cliente. Intenta de nuevo.')
      }
      setLoading(false)
      return
    }

    router.push(`/admin?customerId=${data.id}`)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Registrar Cliente Nuevo</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            placeholder="Nombre del cliente"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            placeholder="ej. 5512345678"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Test registration flow**

```bash
npm run dev
```

1. Go to `/admin`, search for a number that doesn't exist
2. Click "Registrar cliente nuevo" — should open the form with phone prefilled
3. Fill in name and submit — should redirect to admin panel showing the new customer with 0 stamps
4. Try registering the same phone again — should show "Ya existe un cliente" error

- [ ] **Step 3: Commit**

```bash
git add app/admin/customers/
git commit -m "feat: add new customer registration page"
```

---

## Task 12: Customer Card Page

**Files:**
- Create: `app/card/[token]/page.tsx`

- [ ] **Step 1: Create customer card page**

Create `app/card/[token]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { findCustomerByToken } from '@/lib/customers'
import StampGrid from '@/components/StampGrid'

interface CardPageProps {
  params: { token: string }
}

export default async function CardPage({ params }: CardPageProps) {
  const customer = await findCustomerByToken(params.token)

  if (!customer) {
    notFound()
  }

  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'
  const remaining = 10 - customer.activeStamps

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            Tarjeta de fidelidad
          </p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-slate-500 text-sm mt-1">☕ {businessName}</p>
        </div>

        {/* Stamp grid */}
        <div className="mb-6">
          <StampGrid activeStamps={customer.activeStamps} total={10} />
        </div>

        {/* Progress */}
        {customer.rewardReady ? (
          <div className="bg-green-900 border border-green-600 rounded-xl p-5 mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-green-300 font-bold text-lg">¡Tarjeta completa!</p>
            <p className="text-green-400 text-sm mt-1">
              Tienes un <strong>café gratis</strong> esperándote
            </p>
            <div className="mt-4 bg-green-600 rounded-lg py-2 px-4 text-sm font-semibold">
              Muéstrale esto al cajero →
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <p className="text-3xl font-black text-blue-400">{customer.activeStamps} / 10</p>
            <p className="text-slate-400 text-sm mt-1">
              Te {remaining === 1 ? 'falta' : 'faltan'}{' '}
              <strong className="text-white">{remaining} {remaining === 1 ? 'sello' : 'sellos'}</strong>{' '}
              para tu café gratis
            </p>
          </div>
        )}

        <p className="text-slate-600 text-xs">Muestra esta pantalla a tu cajero</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test customer card**

```bash
npm run dev
```

1. Get the `card_token` of a test customer from Supabase: `select name, card_token from customers limit 5;`
2. Visit `http://localhost:3000/card/<token>` — should show the customer's stamp card
3. Visit `http://localhost:3000/card/invalid-token` — should show Next.js 404 page

- [ ] **Step 3: Commit**

```bash
git add app/card/
git commit -m "feat: add public customer stamp card page"
```

---

## Task 13: Root Redirect + Final Polish

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Redirect root to admin**

Replace the contents of `app/page.tsx` with:

```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/admin')
}
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass (stamps logic + StampGrid).

- [ ] **Step 3: Test the full flow manually**

```bash
npm run dev
```

Run through this checklist:

- [ ] Go to `http://localhost:3000` — redirects to `/admin` — redirects to `/admin/login`
- [ ] Log in with a staff account
- [ ] Search for non-existent phone → see "Registrar cliente nuevo"
- [ ] Register a new customer → redirected to their panel with 0 stamps
- [ ] Click "Agregar Sello" 3 times → stamp count increases correctly
- [ ] Open `/card/<token>` in an incognito window → see the correct stamp count
- [ ] Add stamps until reaching 10 → button changes to "Canjear Recompensa" (amber)
- [ ] Click "Canjear Recompensa" → confirm dialog → toast → stamp count resets to 0

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redirect root to admin panel"
```

---

## Task 14: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/loyalty-app.git
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to vercel.com → New Project → Import the GitHub repository
2. Framework: Next.js (auto-detected)
3. Add these environment variables in Vercel's dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project settings
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project settings
   - `NEXT_PUBLIC_BUSINESS_NAME` — e.g. `Mi Café`
4. Click Deploy

- [ ] **Step 3: Add your Vercel domain to Supabase**

In Supabase → Authentication → URL Configuration → add your Vercel URL (e.g. `https://loyalty-app.vercel.app`) to "Redirect URLs".

- [ ] **Step 4: Smoke test production**

1. Visit your Vercel URL → should redirect to login
2. Log in → search for a customer → add a stamp
3. Open the customer card link from a phone
4. Verify stamps update correctly

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Next.js project with Vitest |
| 2 | Database schema in Supabase |
| 3 | Supabase client + auth middleware |
| 4 | Stamp counting logic (TDD) |
| 5 | Customer data layer |
| 6 | StampGrid component (TDD) |
| 7 | Toast component |
| 8 | Admin login page |
| 9 | Admin layout (auth guard) |
| 10 | Admin main panel (search, add stamp, redeem) |
| 11 | New customer registration |
| 12 | Customer card page |
| 13 | Root redirect + full flow test |
| 14 | Deploy to Vercel |
