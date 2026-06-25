import { notFound } from 'next/navigation'
import { findCustomerByToken } from '@/lib/customers'
import StampGrid from '@/components/StampGrid'
import CardActions from './CardActions'
import StampConfetti from './StampConfetti'

interface CardPageProps {
  params: Promise<{ token: string }>
}

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params
  const customer = await findCustomerByToken(token)

  if (!customer) notFound()

  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'
  const remaining = 10 - customer.activeStamps

  const cardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/card/${token}`

  const bgItems = [
    { e: '☕', t: '4%',  l: '6%',  r: '8deg',  s: '1.4rem' },
    { e: '🫘', t: '8%',  l: '78%', r: '-15deg', s: '1rem'   },
    { e: '🥐', t: '14%', l: '88%', r: '10deg',  s: '1.2rem' },
    { e: '🧁', t: '22%', l: '3%',  r: '-8deg',  s: '1rem'   },
    { e: '☕', t: '30%', l: '91%', r: '20deg',  s: '1rem'   },
    { e: '🍩', t: '38%', l: '10%', r: '5deg',   s: '1.1rem' },
    { e: '🫖', t: '45%', l: '82%', r: '-12deg', s: '1.3rem' },
    { e: '🫘', t: '52%', l: '2%',  r: '18deg',  s: '0.9rem' },
    { e: '🥐', t: '60%', l: '87%', r: '-5deg',  s: '1rem'   },
    { e: '🧁', t: '67%', l: '7%',  r: '12deg',  s: '1.2rem' },
    { e: '☕', t: '74%', l: '80%', r: '6deg',   s: '1.1rem' },
    { e: '🍩', t: '80%', l: '4%',  r: '-18deg', s: '1rem'   },
    { e: '🫖', t: '86%', l: '85%', r: '14deg',  s: '0.9rem' },
    { e: '🫘', t: '92%', l: '12%', r: '-6deg',  s: '1.1rem' },
    { e: '🥐', t: '96%', l: '70%', r: '9deg',   s: '1rem'   },
  ]

  return (
    <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center px-4">
      {/* Café background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        {bgItems.map((item, i) => (
          <span
            key={i}
            className="absolute opacity-[0.07]"
            style={{ top: item.t, left: item.l, fontSize: item.s, transform: `rotate(${item.r})` }}
          >
            {item.e}
          </span>
        ))}
      </div>
      <div className="relative w-full max-w-sm text-center">
        <StampConfetti token={token} activeStamps={customer.activeStamps} />
        <CardActions cardUrl={cardUrl} customerName={customer.name} />

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-amber-600 uppercase tracking-widest mb-1">
            Tarjeta de fidelidad
          </p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-stone-400 text-sm mt-1">☕ {businessName}</p>
        </div>

        {/* Short code */}
        {customer.short_code && (
          <div className="bg-stone-800 rounded-xl px-6 py-3 mb-6 inline-block">
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
          <div className="bg-stone-800 rounded-xl p-4 mb-4">
            <p className="text-3xl font-black text-amber-400">{customer.activeStamps} / 10</p>
            <p className="text-stone-400 text-sm mt-1">
              Te {remaining === 1 ? 'falta' : 'faltan'}{' '}
              <strong className="text-white">{remaining} {remaining === 1 ? 'sello' : 'sellos'}</strong>{' '}
              para tu café gratis
            </p>
          </div>
        )}

        <p className="text-stone-600 text-xs">
          Muestra esta pantalla o dile tu código al cajero
        </p>
      </div>
    </div>
  )

}
