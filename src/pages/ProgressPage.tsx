import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { useActiveHabits, useEntriesByHabit } from '../hooks/useShrimp'
import { useSettings } from '../store/settings'
import { computeProgress, daySeries } from '../lib/streaks'
import { addDays, todayKey } from '../lib/dates'

export function ProgressPage() {
  const navigate = useNavigate()
  const habits = useActiveHabits()
  const byHabit = useEntriesByHabit()
  const weekStart = useSettings((s) => s.settings.weekStart)
  const today = todayKey()

  const rows = useMemo(() => {
    return (habits ?? []).map((habit) => {
      const entries = byHabit.get(habit.id ?? -1) ?? []
      return {
        habit,
        progress: computeProgress(habit, entries, { today, weekStart }),
        week: daySeries(habit, entries, addDays(today, -6), today),
      }
    })
  }, [habits, byHabit, today, weekStart])

  const totals = useMemo(() => {
    const completions = rows.reduce((sum, r) => sum + r.progress.totalCompletions, 0)
    const withRate = rows.filter((r) => r.habit.goal > 0)
    const avg = withRate.length
      ? withRate.reduce((sum, r) => sum + r.progress.rate30, 0) / withRate.length
      : 0
    const best = rows.reduce((m, r) => Math.max(m, r.progress.bestStreak), 0)
    return { completions, avg, best }
  }, [rows])

  return (
    <div className="px-4 pt-3">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Progreso</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cómo van tus hábitos en los últimos 30 días
        </p>
      </header>

      {habits && habits.length === 0 ? (
        <EmptyState
          icon={<Flame size={26} />}
          title="Sin datos todavía"
          description="Cuando marques tus primeros hábitos, aquí verás tus rachas y tu cumplimiento."
        />
      ) : (
        <>
          <section className="mb-5 grid grid-cols-3 gap-2">
            <Card label="Hábitos" value={String(habits?.length ?? 0)} />
            <Card label="Cumplido 30d" value={`${Math.round(totals.avg * 100)}%`} />
            <Card label="Días hechos" value={String(totals.completions)} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Por hábito
            </h2>
            {rows.map(({ habit, progress, week }) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => navigate(`/habitos/${habit.id}`)}
                className="rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${habit.color}22` }}
                  >
                    {habit.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{habit.name}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: habit.color }}>
                        <Flame size={12} strokeWidth={2.6} />
                        {progress.currentStreak}
                      </span>
                      <span>mejor {progress.bestStreak}</span>
                      <span>· {progress.totalCompletions} días</span>
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {Math.round(progress.rate30 * 100)}%
                  </span>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(progress.rate30 * 100)}%`, backgroundColor: habit.color }}
                  />
                </div>

                <div className="mt-2 flex gap-1">
                  {week.map((p) => (
                    <span
                      key={p.date}
                      title={p.date}
                      className={`h-4 flex-1 rounded-[4px] ${
                        p.satisfied
                          ? ''
                          : p.due
                            ? 'bg-slate-200 dark:bg-slate-700'
                            : 'bg-slate-100 dark:bg-slate-800/60'
                      }`}
                      style={p.satisfied ? { backgroundColor: habit.color } : undefined}
                    />
                  ))}
                </div>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  )
}
