import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, Flame, Pencil, Target, TrendingUp } from 'lucide-react'
import { HabitForm } from '../components/HabitForm'
import { Heatmap } from '../components/Heatmap'
import { useEntriesByHabit, useHabit } from '../hooks/useShrimp'
import { useSettings } from '../store/settings'
import { archiveHabit, deleteHabit, setEntryValue, updateHabit } from '../db/repo'
import { computeProgress } from '../lib/streaks'
import { addDays, formatShort, formatLong, todayKey, weekdayShort } from '../lib/dates'
import { describeFrequencyLong } from '../lib/frequency'

export function HabitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const habitId = Number(id)
  const navigate = useNavigate()
  const habit = useHabit(Number.isFinite(habitId) ? habitId : undefined)
  const byHabit = useEntriesByHabit()
  const weekStart = useSettings((s) => s.settings.weekStart)
  const today = todayKey()

  const [formOpen, setFormOpen] = useState(false)

  const entries = useMemo(
    () => byHabit.get(habitId) ?? [],
    [byHabit, habitId],
  )

  const progress = useMemo(
    () => (habit ? computeProgress(habit, entries, { today, weekStart }) : undefined),
    [habit, entries, today, weekStart],
  )

  /** Últimos 14 días para corregir el historial a mano. */
  const recent = useMemo(() => {
    if (!habit) return []
    const byDate = new Map(entries.map((e) => [e.date, e.value]))
    return Array.from({ length: 14 }, (_, i) => addDays(today, -i)).map((date) => ({
      date,
      value: byDate.get(date) ?? 0,
    }))
  }, [habit, entries, today])

  if (!habit) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-slate-500">Este hábito ya no existe.</p>
        <button
          type="button"
          onClick={() => navigate('/habitos')}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          Volver
        </button>
      </div>
    )
  }

  const cycle = (date: string, value: number): void => {
    const next = (value + 1) % (habit.goal + 1)
    void setEntryValue(habitId, date, next)
  }

  const rate = progress ? Math.round(progress.rate30 * 100) : 0

  return (
    <div className="px-4 pt-3">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold">{habit.name}</h1>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          aria-label="Editar hábito"
          className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <Pencil size={18} />
        </button>
      </header>

      <section className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${habit.color}22` }}
        >
          {habit.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {describeFrequencyLong(habit.frequency)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Meta: {habit.goal}
            {habit.unit ? ` ${habit.unit}` : ''} al día
            {habit.reminder ? ` · recordatorio ${habit.reminder}` : ''}
          </p>
        </div>
      </section>

      {habit.notes ? (
        <p className="mb-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {habit.notes}
        </p>
      ) : null}

      <section className="mb-4 grid grid-cols-2 gap-2">
        <Stat
          icon={<Flame size={16} />}
          color={habit.color}
          label="Racha actual"
          value={`${progress?.currentStreak ?? 0} ${progress?.currentStreak === 1 ? 'día' : 'días'}`}
        />
        <Stat
          icon={<TrendingUp size={16} />}
          label="Mejor racha"
          value={`${progress?.bestStreak ?? 0} ${progress?.bestStreak === 1 ? 'día' : 'días'}`}
        />
        <Stat
          icon={<Target size={16} />}
          label="Días cumplidos"
          value={String(progress?.totalCompletions ?? 0)}
        />
        <Stat icon={<Check size={16} />} label="Últimos 30 días" value={`${rate}%`} />
      </section>

      <section className="mb-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Últimas 16 semanas
        </h2>
        <Heatmap habit={habit} entries={entries} today={today} weekStart={weekStart} />
        <div className="mt-3 flex items-center gap-3 px-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: habit.color }} /> hecho
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px] bg-slate-200 dark:bg-slate-700" /> fallado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px] bg-slate-100 dark:bg-slate-800/60" /> no tocaba
          </span>
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Corregir historial (14 días)
        </h2>
        <ul className="flex flex-col">
          {recent.map(({ date, value }) => {
            const done = value >= habit.goal
            return (
              <li
                key={date}
                className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"
              >
                <span className="w-24 text-sm text-slate-500">
                  {date === today ? 'Hoy' : `${weekdayShort(date)} ${formatShort(date).split(' ')[1]}`}
                </span>
                <span className="flex-1 text-xs text-slate-400">{formatLong(date)}</span>
                {habit.goal === 1 ? (
                  <button
                    type="button"
                    onClick={() => void setEntryValue(habitId, date, done ? 0 : 1)}
                    aria-pressed={done}
                    aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${date}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition active:scale-90 ${
                      done ? 'border-transparent text-white' : 'border-slate-300 text-transparent dark:border-slate-600'
                    }`}
                    style={done ? { backgroundColor: habit.color } : undefined}
                  >
                    <Check size={18} strokeWidth={3} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cycle(date, value)}
                    className="min-w-14 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold tabular-nums dark:bg-slate-800"
                    style={done ? { color: habit.color } : undefined}
                    aria-label={`Cambiar valor de ${date}`}
                  >
                    {value}/{habit.goal}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mb-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-200"
        >
          Editar este hábito
        </button>
      </div>

      <HabitForm
        open={formOpen}
        habit={habit}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input) => {
          await updateHabit(habitId, input)
          setFormOpen(false)
        }}
        onArchive={async () => {
          await archiveHabit(habitId)
          setFormOpen(false)
          navigate('/habitos')
        }}
        onDelete={async () => {
          await deleteHabit(habitId)
          setFormOpen(false)
          navigate('/habitos')
        }}
      />
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <span
        className="flex items-center gap-1.5 text-xs text-slate-500"
        style={color ? { color } : undefined}
      >
        {icon}
        {label}
      </span>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
