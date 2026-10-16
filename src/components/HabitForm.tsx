import { useState } from 'react'
import { Archive, Trash2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { EMOJIS, PALETTE, type Frequency, type Habit } from '../lib/types'
import { describeFrequencyLong } from '../lib/frequency'
import { WEEKDAYS_3, orderedDow, todayKey } from '../lib/dates'
import type { NewHabitInput } from '../db/repo'

type Kind = 'daily' | 'weekly' | 'daysOfWeek' | 'everyN'

const KIND_LABELS: { kind: Kind; label: string }[] = [
  { kind: 'daily', label: 'Diario' },
  { kind: 'weekly', label: 'N por semana' },
  { kind: 'daysOfWeek', label: 'Días fijos' },
  { kind: 'everyN', label: 'Cada N días' },
]

interface HabitFormProps {
  open: boolean
  /** null/undefined = crear */
  habit?: Habit | null
  onClose: () => void
  onSubmit: (input: NewHabitInput) => void | Promise<void>
  onArchive?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function HabitForm(props: HabitFormProps) {
  // Al abrir o cambiar de hábito remontamos el formulario con el truco de `key`:
  // así el estado se inicializa limpio sin un efecto que llame a setState (que
  // provocaría renders en cascada — justo lo que avisa react(set-state-in-effect)).
  const { open, habit } = props
  return (
    <HabitFormFields
      key={`${open ? 'abierto' : 'cerrado'}-${habit?.id ?? 'nuevo'}`}
      {...props}
    />
  )
}

function HabitFormFields({ open, habit, onClose, onSubmit, onArchive, onDelete }: HabitFormProps) {
  const editing = !!habit
  const freq = habit?.frequency

  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? EMOJIS[0])
  const [color, setColor] = useState(habit?.color ?? PALETTE[0].hex)
  const [kind, setKind] = useState<Kind>(freq?.kind ?? 'daily')
  const [timesPerWeek, setTimesPerWeek] = useState(freq?.kind === 'weekly' ? freq.timesPerWeek : 3)
  const [days, setDays] = useState<number[]>(
    freq?.kind === 'daysOfWeek' ? freq.days : [1, 2, 3, 4, 5],
  )
  const [everyN, setEveryN] = useState(freq?.kind === 'everyN' ? freq.n : 2)
  const [goal, setGoal] = useState(habit?.goal ?? 1)
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [reminder, setReminder] = useState(habit?.reminder ?? '')
  const [notes, setNotes] = useState(habit?.notes ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleDay = (d: number): void => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  const buildFrequency = (): Frequency => {
    switch (kind) {
      case 'weekly':
        return { kind: 'weekly', timesPerWeek }
      case 'daysOfWeek':
        return { kind: 'daysOfWeek', days }
      case 'everyN':
        return {
          kind: 'everyN',
          n: everyN,
          anchor: habit?.frequency.kind === 'everyN' ? habit.frequency.anchor : todayKey(),
        }
      default:
        return { kind: 'daily' }
    }
  }

  const submit = (): void => {
    if (!name.trim()) {
      setError('Ponle un nombre al hábito.')
      return
    }
    if (kind === 'daysOfWeek' && days.length === 0) {
      setError('Elige al menos un día de la semana.')
      return
    }
    void onSubmit({
      name,
      emoji,
      color,
      frequency: buildFrequency(),
      goal: Math.max(1, goal),
      unit,
      reminder,
      notes,
    })
  }

  return (
    <Sheet
      open={open}
      title={editing ? 'Editar hábito' : 'Nuevo hábito'}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2 pb-2">
          {editing && onDelete ? (
            confirmDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white active:scale-95"
              >
                Confirmar borrado
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Eliminar hábito"
                className="rounded-xl bg-rose-100 p-3 text-rose-600 active:scale-95 dark:bg-rose-950 dark:text-rose-400"
              >
                <Trash2 size={20} />
              </button>
            )
          ) : null}
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]"
            style={{ backgroundColor: color }}
          >
            {editing ? 'Guardar cambios' : 'Crear hábito'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-6">
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Beber agua, Leer, Salir a andar..."
            maxLength={60}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Icono</span>
          <div className="no-scrollbar grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex aspect-square items-center justify-center rounded-xl text-xl transition ${
                  emoji === e ? 'bg-slate-900 text-white dark:bg-white' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Color</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((p) => (
              <button
                key={p.hex}
                type="button"
                aria-label={p.name}
                onClick={() => setColor(p.hex)}
                className={`h-9 w-9 rounded-full transition ${
                  color === p.hex ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: p.hex }}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            ¿Cada cuánto?
          </span>
          <div className="grid grid-cols-2 gap-2">
            {KIND_LABELS.map(({ kind: k, label }) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  kind === k
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {kind === 'weekly' ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
              <span className="text-sm">Veces por semana</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimesPerWeek((v) => Math.max(1, v - 1))}
                  className="h-8 w-8 rounded-full bg-white font-bold shadow-sm dark:bg-slate-700"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold tabular-nums">{timesPerWeek}</span>
                <button
                  type="button"
                  onClick={() => setTimesPerWeek((v) => Math.min(7, v + 1))}
                  className="h-8 w-8 rounded-full bg-white font-bold shadow-sm dark:bg-slate-700"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}

          {kind === 'daysOfWeek' ? (
            <div className="flex gap-1.5">
              {orderedDow(1).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`h-10 flex-1 rounded-xl text-sm font-semibold transition ${
                    days.includes(d)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {WEEKDAYS_3[d][0].toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}

          {kind === 'everyN' ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
              <span className="text-sm">Un día sí y {everyN - 1} no</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEveryN((v) => Math.max(2, v - 1))}
                  className="h-8 w-8 rounded-full bg-white font-bold shadow-sm dark:bg-slate-700"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold tabular-nums">{everyN}</span>
                <button
                  type="button"
                  onClick={() => setEveryN((v) => Math.min(30, v + 1))}
                  className="h-8 w-8 rounded-full bg-white font-bold shadow-sm dark:bg-slate-700"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-slate-500">{describeFrequencyLong(buildFrequency())}</p>
        </section>

        <section className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meta diaria
            </span>
            <input
              type="number"
              min={1}
              max={999}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-[11px] text-slate-500">1 = sí o no</span>
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unidad</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="vasos, min, pág."
              maxLength={12}
              disabled={goal <= 1}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] outline-none focus:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </section>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recordatorio (informativo)
          </span>
          <input
            type="time"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Por qué quieres este hábito, trucos, dónde..."
            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        {editing && onArchive ? (
          <button
            type="button"
            onClick={() => void onArchive()}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-300"
          >
            <Archive size={16} />
            Archivar (guardar historial)
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
