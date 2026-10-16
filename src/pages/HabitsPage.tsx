import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Shuffle, Trash2 } from 'lucide-react'
import { HabitCard } from '../components/HabitCard'
import { HabitForm } from '../components/HabitForm'
import { EmptyState } from '../components/EmptyState'
import {
  useActiveHabits,
  useAllHabits,
  useArchivedHabits,
  useEntriesByHabit,
} from '../hooks/useShrimp'
import { useSettings } from '../store/settings'
import {
  archiveHabit,
  bumpEntry,
  createHabit,
  deleteHabit,
  reorderHabits,
  toggleEntry,
  unarchiveHabit,
  updateHabit,
} from '../db/repo'
import { describeFrequencyLong } from '../lib/frequency'
import { todayKey } from '../lib/dates'
import type { Habit } from '../lib/types'

export function HabitsPage() {
  const navigate = useNavigate()
  const all = useAllHabits()
  const active = useActiveHabits()
  const archived = useArchivedHabits()
  const byHabit = useEntriesByHabit()
  const weekStart = useSettings((s) => s.settings.weekStart)
  const today = todayKey()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [ordering, setOrdering] = useState(false)

  const move = (index: number, direction: -1 | 1): void => {
    if (!active) return
    const ids = active.map((h) => h.id).filter((id): id is number => id != null)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    const copy = [...ids]
    const tmp = copy[index]
    copy[index] = copy[target]
    copy[target] = tmp
    void reorderHabits(copy)
  }

  const openEdit = (habit: Habit): void => {
    setEditing(habit)
    setFormOpen(true)
  }

  return (
    <div className="px-4 pt-3">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Mis hábitos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {all === undefined
              ? 'Cargando…'
              : `${active?.length ?? 0} activos${archived?.length ? ` · ${archived.length} archivados` : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOrdering((v) => !v)}
          aria-label="Reordenar hábitos"
          className={`rounded-xl p-2.5 transition ${
            ordering
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Shuffle size={20} />
        </button>
      </header>

      {active && active.length === 0 ? (
        <EmptyState
          icon={<Plus size={26} />}
          title="Aún no hay hábitos activos"
          description="Toca el botón + para crear el primero. Shrimp guarda todo en tu móvil, sin cuentas ni internet."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {active?.map((habit, index) => (
            <div key={habit.id} className="flex items-center gap-2">
              {ordering ? (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir ${habit.name}`}
                    className="rounded-lg bg-slate-100 p-1.5 disabled:opacity-30 dark:bg-slate-800"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === (active.length ?? 1) - 1}
                    aria-label={`Bajar ${habit.name}`}
                    className="rounded-lg bg-slate-100 p-1.5 disabled:opacity-30 dark:bg-slate-800"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <HabitCard
                  habit={habit}
                  entries={byHabit.get(habit.id ?? -1) ?? []}
                  today={today}
                  weekStart={weekStart}
                  onToggle={() => habit.id != null && void toggleEntry(habit.id, today, habit.goal)}
                  onBump={(d) => habit.id != null && void bumpEntry(habit.id, today, habit.goal, d)}
                  onOpen={() => navigate(`/habitos/${habit.id}`)}
                />
              </div>

              <button
                type="button"
                onClick={() => openEdit(habit)}
                aria-label={`Editar ${habit.name}`}
                className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <Pencil size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {archived && archived.length > 0 ? (
        <section className="mt-8 flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Archivados ({archived.length})
          </h2>
          {archived.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 opacity-80 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
            >
              <span className="text-xl">{habit.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{habit.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {describeFrequencyLong(habit.frequency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => habit.id != null && void unarchiveHabit(habit.id)}
                aria-label={`Restaurar ${habit.name}`}
                className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800"
              >
                <RotateCcw size={18} />
              </button>
              <button
                type="button"
                onClick={() => habit.id != null && void deleteHabit(habit.id)}
                aria-label={`Borrar ${habit.name} definitivamente`}
                className="rounded-xl bg-rose-100 p-2.5 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        aria-label="Nuevo hábito"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition active:scale-90 dark:bg-white dark:text-slate-900"
      >
        <Plus size={26} strokeWidth={2.6} />
      </button>

      <HabitForm
        open={formOpen}
        habit={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={async (input) => {
          if (editing?.id != null) await updateHabit(editing.id, input)
          else await createHabit(input)
          setFormOpen(false)
          setEditing(null)
        }}
        onArchive={
          editing?.id != null
            ? async () => {
                await archiveHabit(editing.id as number)
                setFormOpen(false)
                setEditing(null)
              }
            : undefined
        }
        onDelete={
          editing?.id != null
            ? async () => {
                await deleteHabit(editing.id as number)
                setFormOpen(false)
                setEditing(null)
              }
            : undefined
        }
      />
    </div>
  )
}
