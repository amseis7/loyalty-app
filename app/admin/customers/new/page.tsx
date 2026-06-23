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
