'use client'

import { useEffect } from 'react'

export default function StampConfetti({ token, activeStamps }: { token: string; activeStamps: number }) {
  useEffect(() => {
    const key = `stamps_seen_${token}`
    const lastSeen = parseInt(localStorage.getItem(key) ?? '0')

    if (activeStamps > lastSeen) {
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#15803D', '#D97706', '#3B82F6', '#EC4899', '#F59E0B', '#ffffff'],
        })
      })
      localStorage.setItem(key, String(activeStamps))
    }
  }, [token, activeStamps])

  return null
}
