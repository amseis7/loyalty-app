'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'

interface CustomerQRProps {
  cardToken: string
  customerName: string
}

export default function CustomerQR({ cardToken, customerName }: CustomerQRProps) {
  const [open, setOpen] = useState(false)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/card/${cardToken}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        📱 Ver QR
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-slate-800 font-semibold text-center">{customerName}</p>
            <QRCode value={url} size={220} />
            <p className="text-slate-500 text-xs text-center">
              Escanea para ver tu tarjeta de fidelidad
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-full bg-slate-900 text-white font-semibold py-2 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
