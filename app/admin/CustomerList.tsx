'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCustomerAction } from './actions'
import type { Customer } from '@/lib/customers'

export default function CustomerList({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(customer: Customer) {
    if (!confirm(`¿Eliminar a ${customer.name}? Esto borrará también sus sellos.`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteCustomerAction(customer.id)
        router.push('/admin')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  if (customers.length === 0) return null

  return (
    <div>
      <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3">
        Clientes registrados ({customers.length})
      </h3>
      {error && (
        <p className="text-red-400 text-sm mb-3 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="space-y-2">
        {customers.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            <a
              href={`/admin?customerId=${c.id}`}
              className="flex-1 flex items-center justify-between bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 transition-colors"
            >
              <div>
                <p className="text-white text-sm font-medium">{c.name}</p>
                <p className="text-slate-500 text-xs">{c.phone}</p>
              </div>
              <span className="text-slate-600 text-xs font-mono">{c.short_code}</span>
            </a>
            <button
              onClick={() => handleDelete(c)}
              disabled={isPending}
              className="text-slate-600 hover:text-red-400 disabled:opacity-30 px-2 py-3 transition-colors"
              title="Eliminar cliente"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
