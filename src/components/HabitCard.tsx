import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { CheckButton } from './CheckButton'
import { CounterStepper } from './CounterStepper'
import { describeFrequency } from '../lib/frequency'
import { computeProgress } from '../lib/streaks'
import type { DateKey, Habit, HabitEntry } from '../lib/types'

interface HabitCardProps {
  habit: Habit
  entries: HabitEntry[]
  today: DateKey
  weekStart: number
  onToggle: () => void
  onBump: (delta: number) => void
  onOpen?: () => void
}

export function HabitCard({
  habit,
  entries,
  today,
  weekStart,
  onToggle,
  onBump,
  onOpen,
}: HabitCardProps) {
  const progress = useMemo(
    () => computeProgress(habit, entries, { today, weekStart }),
    [habit, entries, today, weekStart],
  )

  const isCounter = habit.goal > 1
  const pct = isCounter ? Math.min(100, (progress.valueToday / habit.goal) * 100) : 0

  return (
    <article className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Ver detalle de ${habit.name}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{ backgroundColor: `${habit.color}22` }}
        >
          {habit.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{habit.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{describeFrequency(habit.frequency)}</span>
            {progress.currentStreak > 0 ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 font-semibold"
                style={{ color: habit.color }}
              >
                <Flame size={13} strokeWidth={2.6} />
                {progress.currentStreak}
              </span>
            ) : null}
            {progress.weekTarget < 7 && !progress.weekSatisfied ? (
              <span className="shrink-0 tabular-nums">
                {progress.weekCount}/{progress.weekTarget} sem.
              </span>
            ) : null}
          </span>
          {isCounter ? (
            <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: habit.color }}
              />
            </span>
          ) : null}
        </span>
      </button>

      {isCounter ? (
        <CounterStepper
          value={progress.valueToday}
          goal={habit.goal}
          color={habit.color}
          unit={habit.unit}
          label={habit.name}
          onBump={onBump}
        />
      ) : (
        <CheckButton
          done={progress.doneToday}
          color={habit.color}
          label={habit.name}
          onToggle={onToggle}
        />
      )}
    </article>
  )
}
