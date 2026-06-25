'use client'

import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'

interface CardActionsProps {
  cardUrl: string
  customerName: string
}

export default function CardActions({ cardUrl, customerName }: CardActionsProps) {
  const router = useRouter()

  function downloadQR() {
    const svg = document.querySelector('#card-qr svg') as SVGElement
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 300, 300)
      ctx.drawImage(img, 0, 0, 300, 300)
      const link = document.createElement('a')
      link.download = `tarjeta-${customerName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <div className="mt-6 border-t border-slate-800 pt-6 flex flex-col items-center gap-3">
        <p className="text-slate-500 text-xs uppercase tracking-widest">Guarda tu tarjeta</p>
        <div id="card-qr" className="bg-white p-3 rounded-xl">
          <QRCode value={cardUrl} size={160} />
        </div>
        <button
          onClick={downloadQR}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          ↓ Guardar QR como imagen
        </button>
      </div>
    </>
  )
}
