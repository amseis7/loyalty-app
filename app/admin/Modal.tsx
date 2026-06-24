'use client'
import Link from 'next/link'

export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4 pb-6">
      <Link
        href="/admin"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-sm">
        <Link
          href="/admin"
          aria-label="Cerrar"
          className="absolute -top-4 right-0 z-10 w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </Link>
        {children}
      </div>
    </div>
  )
}
