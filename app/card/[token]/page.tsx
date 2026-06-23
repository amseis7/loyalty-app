import { notFound } from 'next/navigation'
import { findCustomerByToken } from '@/lib/customers'
import StampGrid from '@/components/StampGrid'

interface CardPageProps {
  params: Promise<{ token: string }>
}

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params
  const customer = await findCustomerByToken(token)

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
