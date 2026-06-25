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
                ? 'bg-amber-500 text-white shadow-md shadow-amber-900/50'
                : 'border-2 border-dashed border-stone-600 text-stone-500 bg-stone-800/50'
              }
              ${isLastSlot && !filled ? 'border-amber-400 text-amber-400' : ''}
            `}
          >
            {filled ? '☕' : isLastSlot ? '🎁' : '○'}
          </div>
        )
      })}
    </div>
  )
}
