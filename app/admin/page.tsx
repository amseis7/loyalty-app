import StampGrid from '@/components/StampGrid'
import AdminActions from './AdminActions'
import CodeSearch from './CodeSearch'
import RegisterForm from './RegisterForm'
import CustomerList from './CustomerList'
import Modal from './Modal'
import { getCustomerWithStamps, findCustomerByShortCode, getAllCustomers } from '@/lib/customers'

interface AdminPageProps {
  searchParams: Promise<{ code?: string; customerId?: string; new?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { code, customerId, new: isNew } = await searchParams

  let customer = null

  if (customerId) {
    customer = await getCustomerWithStamps(customerId)
  } else if (code) {
    customer = await findCustomerByShortCode(code)
  }

  const notFound = code && !customer
  const showRegister = isNew === '1' || notFound

  const customers = await getAllCustomers()

  return (
    <div className="space-y-6">
      <CodeSearch defaultCode={code} />

      {!showRegister && !customer && (
        <div className="text-center">
          <a href="/admin?new=1" className="text-blue-400 hover:text-blue-300 text-sm underline">
            + Registrar nuevo cliente
          </a>
        </div>
      )}

      {showRegister && (
        <Modal>
          <RegisterForm />
        </Modal>
      )}

      {customer && (
        <Modal>
          <div className="bg-slate-800 border border-blue-900 rounded-xl p-5">
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

            <div className="mb-5">
              <StampGrid activeStamps={customer.activeStamps} total={10} />
            </div>

            <AdminActions customer={customer} />
          </div>
        </Modal>
      )}

      {!customer && !showRegister && <CustomerList customers={customers} />}
    </div>
  )
}
