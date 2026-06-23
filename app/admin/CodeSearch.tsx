'use client'

import { useRef } from 'react'

export default function CodeSearch({ defaultCode }: { defaultCode?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    e.target.value = digits
    if (digits.length === 6) formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} method="get" action="/admin" className="mb-6">
      <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
        Código de cliente
      </label>
      <input
        name="code"
        type="text"
        inputMode="numeric"
        maxLength={6}
        defaultValue={defaultCode}
        onChange={handleChange}
        autoFocus
        placeholder="000000"
        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 text-2xl text-center tracking-widest focus:outline-none focus:border-blue-500"
      />
    </form>
  )
}
