import Link from 'next/link'
import StampGrid from '@/components/StampGrid'
import AdminActions from './AdminActions'
import { getCustomerWithStamps, findCustomerByPhone } from '@/lib/customers'

interface AdminPageProps {
  searchParams: Promise<{ phone?: string; customerId?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { phone, customerId } = await searchParams

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
