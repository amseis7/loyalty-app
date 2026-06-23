# Short Code Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace phone-number search on the admin panel with a 6-digit short code lookup that stamps existing customers or registers new ones inline, plus a WhatsApp share button.

**Architecture:** Add `short_code char(6)` to the `customers` table. The admin panel (`app/admin/page.tsx`) stays a Server Component — it reads `?code=` from searchParams, looks up the customer, and renders either the customer card or an inline `RegisterForm` client component. A `CodeSearch` client component handles auto-submit at 6 digits. After registration the client redirects to `?code=<short_code>` so the server re-renders with the new customer loaded.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Tailwind CSS, Vitest

## Global Constraints

- `short_code` is exactly 6 numeric digits, zero-padded (`000001`–`999999`), unique per customer
- WhatsApp URL format: `https://wa.me/<digits_only_phone>?text=<encoded>`
- All server actions must verify `user` from Supabase before writing
- No new npm packages
- Tailwind only for styles

---

### Task 1: DB Migration + update Customer interface + findCustomerByShortCode

**Files:**
- Create: `supabase/migrations/002_short_code.sql`
- Modify: `lib/customers.ts` (lines 6-12 interface, add function after line 31)

**Interfaces:**
- Produces:
  - `Customer.short_code: string` (added to existing interface)
  - `findCustomerByShortCode(code: string): Promise<CustomerWithStamps | null>`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/002_short_code.sql` with this content:

```sql
alter table customers
  add column short_code char(6) unique not null
  default lpad((floor(random()*999999)+1)::text, 6, '0');
```

- [ ] **Step 2: Run the migration in Supabase**

Open your Supabase project → SQL Editor → paste the file contents → Run.

Verify: go to Table Editor → customers → confirm the `short_code` column exists and all rows have a 6-digit value.

- [ ] **Step 3: Add `short_code` to the Customer interface**

In `lib/customers.ts`, update the `Customer` interface (currently lines 6-12):

```ts
export interface Customer {
  id: string
  name: string
  phone: string
  card_token: string
  short_code: string
  created_at: string
}
```

- [ ] **Step 4: Add `findCustomerByShortCode` to lib/customers.ts**

Add this function after `findCustomerByPhone` (after line 31):

```ts
export async function findCustomerByShortCode(code: string): Promise<CustomerWithStamps | null> {
  const supabase = await createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('short_code', code)
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
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_short_code.sql lib/customers.ts
git commit -m "feat: add short_code column and findCustomerByShortCode"
```

---

### Task 2: createCustomerAction server action

**Files:**
- Modify: `app/admin/actions.ts`

**Interfaces:**
- Consumes: `createCustomer(name, phone)` from `lib/customers.ts` (already imported via `addStamp`/`redeemReward` pattern — add to import)
- Produces: `createCustomerAction(name: string, phone: string): Promise<{ short_code: string }>`

- [ ] **Step 1: Add createCustomer import and createCustomerAction to actions.ts**

Replace the contents of `app/admin/actions.ts` with:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { addStamp, redeemReward, createCustomer } from '@/lib/customers'
import { revalidatePath } from 'next/cache'

export async function addStampAction(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await addStamp(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}

export async function redeemRewardAction(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await redeemReward(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}

export async function createCustomerAction(
  name: string,
  phone: string
): Promise<{ short_code: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  try {
    const customer = await createCustomer(name, phone)
    revalidatePath('/admin')
    return { short_code: customer.short_code }
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') throw new Error('DUPLICATE_PHONE')
    throw err
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/actions.ts
git commit -m "feat: add createCustomerAction server action"
```

---

### Task 3: CodeSearch client component

**Files:**
- Create: `app/admin/CodeSearch.tsx`

**Interfaces:**
- Produces: `<CodeSearch defaultCode?: string />` — renders a GET form to `/admin?code=XXXXXX`, auto-submits when 6 numeric digits are entered

- [ ] **Step 1: Create app/admin/CodeSearch.tsx**

```tsx
'use client'

import { useRef } from 'react'

export default function CodeSearch({ defaultCode }: { defaultCode?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    e.target.value = digits
    if (digits.length === 6) formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} method="get" action="/admin" className="mb-6">
      <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
        Código de cliente
      </label>
      <input
        name="code"
        type="text"
        inputMode="numeric"
        maxLength={6}
        defaultValue={defaultCode}
        onChange={handleChange}
        autoFocus
        placeholder="000000"
        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 text-2xl text-center tracking-widest focus:outline-none focus:border-blue-500"
      />
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/CodeSearch.tsx
git commit -m "feat: add CodeSearch auto-submit component"
```

---

### Task 4: RegisterForm client component

**Files:**
- Create: `app/admin/RegisterForm.tsx`

**Interfaces:**
- Consumes: `createCustomerAction(name, phone)` from `./actions`
- Produces: `<RegisterForm />` — inline registration form; on success redirects to `/admin?code=<short_code>`

- [ ] **Step 1: Create app/admin/RegisterForm.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomerAction } from './actions'

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const { short_code } = await createCustomerAction(name.trim(), phone.trim())
        router.push(`/admin?code=${short_code}`)
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'DUPLICATE_PHONE') {
          setError('Ya existe un cliente con ese número de teléfono.')
        } else {
          setError('Error al registrar. Intenta de nuevo.')
        }
      }
    })
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h2 className="text-white font-semibold mb-4">Registrar cliente nuevo</h2>
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
            className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
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
            className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            placeholder="ej. 5512345678"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isPending ? 'Registrando...' : 'Registrar cliente'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/RegisterForm.tsx
git commit -m "feat: add inline RegisterForm component"
```

---

### Task 5: Rewrite admin page + delete old new-customer page

**Files:**
- Modify: `app/admin/page.tsx` (full rewrite)
- Delete: `app/admin/customers/new/page.tsx`

**Interfaces:**
- Consumes:
  - `findCustomerByShortCode(code)` from `lib/customers`
  - `<CodeSearch defaultCode? />` from `./CodeSearch`
  - `<RegisterForm />` from `./RegisterForm`
  - `<AdminActions customer />` from `./AdminActions`
  - `<StampGrid activeStamps total />` from `@/components/StampGrid`

- [ ] **Step 1: Rewrite app/admin/page.tsx**

```tsx
import { headers } from 'next/headers'
import CodeSearch from './CodeSearch'
import StampGrid from '@/components/StampGrid'
import AdminActions from './AdminActions'
import RegisterForm from './RegisterForm'
import { findCustomerByShortCode } from '@/lib/customers'

interface AdminPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { code } = await searchParams
  const isValidCode = typeof code === 'string' && code.length === 6

  const customer = isValidCode ? await findCustomerByShortCode(code) : null
  const notFound = isValidCode && !customer

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const waPhone = customer?.phone.replace(/\D/g, '') ?? ''
  const waText = customer
    ? encodeURIComponent(
        `Hola ${customer.name}, tu código de fidelidad es ${customer.short_code}. Ve tu tarjeta aquí: ${origin}/card/${customer.card_token}`
      )
    : ''
  const waUrl = `https://wa.me/${waPhone}?text=${waText}`

  return (
    <div>
      <CodeSearch defaultCode={code} />

      {!isValidCode && (
        <p className="text-slate-600 text-center text-sm mt-4">
          Ingresa el código de 6 dígitos del cliente.
        </p>
      )}

      {notFound && <RegisterForm />}

      {customer && (
        <div className="bg-slate-800 border border-blue-900 rounded-xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{customer.name}</h2>
              <p className="text-slate-500 text-sm">📱 {customer.phone}</p>
              <p className="text-slate-600 text-xs mt-1">Código: {customer.short_code}</p>
            </div>
            <div className="bg-blue-950 rounded-lg px-3 py-2 text-center">
              <div className="text-blue-300 text-2xl font-black">{customer.activeStamps}</div>
              <div className="text-blue-500 text-xs">/ 10 sellos</div>
            </div>
          </div>

          <div className="mb-5">
            <StampGrid activeStamps={customer.activeStamps} total={10} />
          </div>

          <AdminActions customer={customer} />

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            Enviar tarjeta por WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete the old new-customer page**

Delete the file `app/admin/customers/new/page.tsx`.

If the `app/admin/customers/` directory is now empty, delete that too.

```bash
rm -rf app/admin/customers
```

- [ ] **Step 3: Verify dev server**

Run `npm run dev` and confirm:
1. `/admin` shows the 6-digit input, focused and ready
2. Typing 6 digits for an existing customer auto-submits and shows their card + WhatsApp button
3. Typing 6 digits that don't match any customer shows the registration form
4. Registering a new customer redirects back to their card
5. WhatsApp button opens wa.me with a pre-filled message

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git rm -r app/admin/customers
git commit -m "feat: short code lookup with inline registration and WhatsApp share"
```
