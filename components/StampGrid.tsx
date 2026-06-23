interface StampGridProps {
  activeStamps: number
  total: number
}

export default function StampGrid({ activeStamps, total }: StampGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < activeStamps
        const isLastSlot = i === total - 1

        return (
          <div
            key={i}
            data-testid="stamp-slot"
            data-filled={filled}
            className={`
              aspect-square rounded-full flex items-center justify-center text-xl
              ${filled
                ? 'bg-blue-700 text-white'
                : 'border-2 border-dashed border-slate-600 text-slate-600 opacity-40'
              }
              ${isLastSlot && !filled ? 'border-amber-500' : ''}
            `}
          >
            {filled ? '☕' : isLastSlot ? '🎁' : '○'}
          </div>
        )
      })}
    </div>
  )
}
