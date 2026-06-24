'use client'

import { useState, useTransition } from 'react'
import Toast from '@/components/Toast'
import CustomerQR from './CustomerQR'
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
        <CustomerQR cardToken={customer.card_token} customerName={customer.name} />
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
