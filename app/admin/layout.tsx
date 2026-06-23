import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">☕</span>
          <span className="font-semibold text-sm">
            {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Mi Café'}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{user.email}</span>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
