'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { clearStampAnimation } from './actions'

export default function StampConfetti({ token }: { token: string }) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#15803D', '#D97706', '#3B82F6', '#EC4899', '#F59E0B', '#ffffff'],
    })
    clearStampAnimation(token)
  }, [token])

  return null
}
