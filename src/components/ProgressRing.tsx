interface ProgressRingProps {
  value: number
  total: number
  size?: number
  stroke?: number
}

/** Anillo de progreso del día. SVG puro: cero dependencias. */
export function ProgressRing({ value, total, size = 64, stroke = 7 }: ProgressRingProps) {
  const pct = total === 0 ? 0 : Math.min(1, value / total)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {value}/{total}
      </div>
    </div>
  )
}
