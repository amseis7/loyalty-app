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
