'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}

export default function Toast({ message, type, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDone()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-sm
        transition-all duration-300
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}
      `}
    >
      {message}
    </div>
  )
}
