import { useMemo, useState } from 'react'
import { CheckCircle2, Plus, Sparkles } from 'lucide-react'
import { HabitCard } from '../components/HabitCard'
import { HabitForm } from '../components/HabitForm'
import { ProgressRing } from '../components/ProgressRing'
import { EmptyState } from '../components/EmptyState'
import { useActiveHabits, useEntriesByHabit } from '../hooks/useShrimp'
import { useSettings } from '../store/settings'
import { bumpEntry, createHabit, toggleEntry } from '../db/repo'
import { computeProgress } from '../lib/streaks'
import { formatLong, todayKey } from '../lib/dates'
import type { Habit } from '../lib/types'

export function TodayPage() {
  const habits = useActiveHabits()
  const byHabit = useEntriesByHabit()
  const weekStart = useSettings((s) => s.settings.weekStart)
  const showCompleted = useSettings((s) => s.settings.showCompleted)

  const [formOpen, setFormOpen] = useState(false)
  const today = todayKey()

  const rows = useMemo(() => {
    return (habits ?? []).map((habit) => ({
      habit,
      entries: byHabit.get(habit.id ?? -1) ?? [],
      progress: computeProgress(habit, byHabit.get(habit.id ?? -1) ?? [], { today, weekStart }),
    }))
  }, [habits, byHabit, today, weekStart])

  const pending = rows.filter((r) => r.progress.dueToday && !r.progress.doneToday)
  const done = rows.filter((r) => r.progress.doneToday)
  const optional = rows.filter((r) => !r.progress.dueToday && !r.progress.doneToday)

  const dueCount = pending.length + done.length
  const completed = done.length
  const pct = dueCount === 0 ? 0 : completed / dueCount

  const message =
    dueCount === 0
      ? 'Nada pendiente para hoy 🌴'
      : pct === 1
        ? '¡Día completo! 🎉'
        : pct >= 0.5
          ? 'Ya llevas más de la mitad 💪'
          : 'Empieza por el más fácil 🙂'

  const handleToggle = (habit: Habit): void => {
    if (habit.id == null) return
    void toggleEntry(habit.id, today, habit.goal)
  }

  const handleBump = (habit: Habit, delta: number): void => {
    if (habit.id == null) return
    void bumpEntry(habit.id, today, habit.goal, delta)
  }

  return (
    <div className="px-4 pt-3">
      <header className="mb-4 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold">{formatLong(today)}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <ProgressRing value={completed} total={dueCount} />
      </header>

      {habits === undefined ? (
        <p className="py-10 text-center text-sm text-slate-500">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="Shrimp está vacío"
          description="Crea tu primer hábito y empieza a construir rachas. Todo se guarda en tu móvil, sin cuentas ni internet."
          action={
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Crear hábito
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          {pending.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pendientes ({pending.length})
              </h2>
              {pending.map((r) => (
                <HabitCard
                  key={r.habit.id}
                  habit={r.habit}
                  entries={r.entries}
                  today={today}
                  weekStart={weekStart}
                  onToggle={() => handleToggle(r.habit)}
                  onBump={(d) => handleBump(r.habit, d)}
                />
              ))}
            </section>
          ) : null}

          {done.length > 0 && showCompleted ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CheckCircle2 size={14} /> Hechos hoy ({done.length})
              </h2>
              {done.map((r) => (
                <HabitCard
                  key={r.habit.id}
                  habit={r.habit}
                  entries={r.entries}
                  today={today}
                  weekStart={weekStart}
                  onToggle={() => handleToggle(r.habit)}
                  onBump={(d) => handleBump(r.habit, d)}
                />
              ))}
            </section>
          ) : null}

          {optional.length > 0
            ? optional.map((r) => (
                <HabitCard
                  key={r.habit.id}
                  habit={r.habit}
                  entries={r.entries}
                  today={today}
                  weekStart={weekStart}
                  onToggle={() => handleToggle(r.habit)}
                  onBump={(d) => handleBump(r.habit, d)}
                />
              ))
            : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        aria-label="Nuevo hábito"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition active:scale-90 dark:bg-white dark:text-slate-900"
      >
        <Plus size={26} strokeWidth={2.6} />
      </button>

      <HabitForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input) => {
          await createHabit(input)
          setFormOpen(false)
        }}
      />
    </div>
  )
}
