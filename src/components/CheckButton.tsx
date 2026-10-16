import { Check } from 'lucide-react'

interface CheckButtonProps {
  done: boolean
  color: string
  onToggle: () => void
  label: string
}

export function CheckButton({ done, color, onToggle, label }: CheckButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? `Desmarcar ${label}` : `Marcar ${label} como hecho`}
      onClick={onToggle}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-150 active:scale-90 ${
        done
          ? 'border-transparent text-white shadow-sm'
          : 'border-slate-300 text-transparent dark:border-slate-600'
      }`}
      style={done ? { backgroundColor: color } : undefined}
    >
      <Check size={26} strokeWidth={3} className={done ? 'animate-pop' : undefined} />
    </button>
  )
}
