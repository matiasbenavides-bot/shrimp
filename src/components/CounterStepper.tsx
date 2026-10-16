import { Minus, Plus } from 'lucide-react'

interface CounterStepperProps {
  value: number
  goal: number
  color: string
  unit?: string
  label: string
  onBump: (delta: number) => void
}

/** Contador con +/- para hábitos con meta > 1 (vasos, páginas, minutos...). */
export function CounterStepper({ value, goal, color, unit, label, onBump }: CounterStepperProps) {
  const done = value >= goal
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
      <button
        type="button"
        aria-label={`Restar a ${label}`}
        disabled={value <= 0}
        onClick={() => onBump(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition active:scale-90 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-200"
      >
        <Minus size={16} strokeWidth={3} />
      </button>
      <span
        className="min-w-11 text-center text-sm font-bold tabular-nums"
        style={done ? { color } : undefined}
      >
        {value}/{goal}
        {unit ? <span className="ml-0.5 text-[10px] font-medium text-slate-500">{unit}</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Sumar a ${label}`}
        disabled={value >= goal}
        onClick={() => onBump(1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition active:scale-90 disabled:opacity-40"
        style={{ backgroundColor: color }}
      >
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  )
}
