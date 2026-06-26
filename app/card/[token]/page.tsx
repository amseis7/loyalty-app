import { notFound } from 'next/navigation'
import { findCustomerByToken } from '@/lib/customers'
import StampGrid from '@/components/StampGrid'
import CardActions from './CardActions'
import StampConfetti from './StampConfetti'

interface CardPageProps {
  params: Promise<{ token: string }>
}

const BG_IMAGE = 'https://images.unsplash.com/photo-1598515502440-30a8cf591be9?w=1920&q=80&fit=crop&auto=format'

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params
  const customer = await findCustomerByToken(token)

  if (!customer) notFound()

  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'
  const remaining = 10 - customer.activeStamps

  const cardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/card/${token}`

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 relative"
      style={{ backgroundImage: `url(${BG_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-stone-900/80" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <StampConfetti token={token} activeStamps={customer.activeStamps} />
        <CardActions cardUrl={cardUrl} customerName={customer.name} />

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-amber-500 uppercase tracking-widest mb-1">
            Tarjeta de fidelidad
          </p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-stone-400 text-sm mt-1">☕ {businessName}</p>
        </div>

        {/* Short code */}
        {customer.short_code && (
          <div className="bg-stone-800/80 backdrop-blur-sm rounded-xl px-6 py-3 mb-6 inline-block">
            <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Tu código</p>
            <p className="text-white text-3xl font-black tracking-[0.3em]">
              {customer.short_code}
            </p>
          </div>
        )}

        {/* Stamp grid */}
        <div className="mb-6">
          <StampGrid activeStamps={customer.activeStamps} total={10} />
        </div>

        {/* Progress */}
        {customer.rewardReady ? (
          <div className="bg-green-900/80 backdrop-blur-sm border border-green-600 rounded-xl p-5 mb-4">
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
          <div className="bg-stone-800/80 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-3xl font-black text-amber-400">{customer.activeStamps} / 10</p>
            <p className="text-stone-400 text-sm mt-1">
              Te {remaining === 1 ? 'falta' : 'faltan'}{' '}
              <strong className="text-white">{remaining} {remaining === 1 ? 'sello' : 'sellos'}</strong>{' '}
              para tu café gratis
            </p>
          </div>
        )}

        <p className="text-stone-500 text-xs">
          Muestra esta pantalla o dile tu código al cajero
        </p>
      </div>
    </div>
  )
}
