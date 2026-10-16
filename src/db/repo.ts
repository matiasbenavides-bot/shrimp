import { db } from './database'
import { todayKey } from '../lib/dates'
import type { AppSettings, DateKey, Habit, HabitEntry } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/types'

/* ------------------------------------------------------------------ */
/* registros (entries)                                                 */
/* ------------------------------------------------------------------ */

export async function getEntry(habitId: number, date: DateKey): Promise<HabitEntry | undefined> {
  return db.entries.where('[habitId+date]').equals([habitId, date]).first()
}

/** Escribe el valor del día (0 = borra el registro). */
export async function setEntryValue(
  habitId: number,
  date: DateKey,
  value: number,
  note?: string,
): Promise<void> {
  const clamped = Math.max(0, Math.round(value))
  const existing = await getEntry(habitId, date)
  if (clamped === 0) {
    if (existing?.id != null) await db.entries.delete(existing.id)
    return
  }
  if (existing?.id != null) {
    await db.entries.update(existing.id, { value: clamped, note, updatedAt: new Date().toISOString() })
  } else {
    await db.entries.add({ habitId, date, value: clamped, note, updatedAt: new Date().toISOString() })
  }
}

/** Marca/desmarca un hábito de sí-no. */
export async function toggleEntry(habitId: number, date: DateKey, goal: number): Promise<void> {
  const existing = await getEntry(habitId, date)
  const done = (existing?.value ?? 0) >= goal
  await setEntryValue(habitId, date, done ? 0 : goal)
}

/** Suma/resta a un contador, sin bajar de 0 ni de la meta por arriba. */
export async function bumpEntry(
  habitId: number,
  date: DateKey,
  goal: number,
  delta: number,
): Promise<void> {
  const existing = await getEntry(habitId, date)
  const current = existing?.value ?? 0
  const next = Math.min(goal, Math.max(0, current + delta))
  await setEntryValue(habitId, date, next)
}

/* ------------------------------------------------------------------ */
/* hábitos                                                             */
/* ------------------------------------------------------------------ */

export interface NewHabitInput {
  name: string
  emoji: string
  color: string
  frequency: Habit['frequency']
  goal: number
  unit?: string
  reminder?: string
  notes?: string
}

export async function createHabit(input: NewHabitInput): Promise<number> {
  const all = await db.habits.toArray()
  const maxOrder = all.reduce((m, h) => Math.max(m, h.sortOrder), 0)
  return db.habits.add({
    name: input.name.trim(),
    emoji: input.emoji,
    color: input.color,
    frequency: input.frequency,
    goal: Math.max(1, Math.round(input.goal)),
    unit: input.unit?.trim() || undefined,
    reminder: input.reminder || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: todayKey(),
    archivedAt: null,
    sortOrder: maxOrder + 1,
  })
}

export async function updateHabit(id: number, patch: Partial<Habit>): Promise<void> {
  const clean: Partial<Habit> = { ...patch }
  if (clean.name != null) clean.name = clean.name.trim()
  if (clean.goal != null) clean.goal = Math.max(1, Math.round(clean.goal))
  await db.habits.update(id, clean)
}

export async function archiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { archivedAt: todayKey() })
}

export async function unarchiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { archivedAt: null })
}

/** Borrado real: el hábito y todo su historial. */
export async function deleteHabit(id: number): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.entries.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

export async function duplicateHabit(id: number): Promise<number | undefined> {
  const h = await db.habits.get(id)
  if (!h) return undefined
  const all = await db.habits.toArray()
  const maxOrder = all.reduce((m, x) => Math.max(m, x.sortOrder), 0)
  const { id: _omit, ...rest } = h
  return db.habits.add({ ...rest, name: `${h.name} (copia)`, sortOrder: maxOrder + 1 })
}

export async function reorderHabits(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.habits.update(orderedIds[i], { sortOrder: i })
    }
  })
}

/* ------------------------------------------------------------------ */
/* ajustes                                                            */
/* ------------------------------------------------------------------ */

export async function loadSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray()
  const out: AppSettings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    // validación explícita por clave: nada de casts a ciegas
    if (row.key === 'theme' && (row.value === 'light' || row.value === 'dark' || row.value === 'system')) {
      out.theme = row.value
    } else if (row.key === 'weekStart' && (row.value === 0 || row.value === 1)) {
      out.weekStart = row.value
    } else if (row.key === 'showCompleted' && typeof row.value === 'boolean') {
      out.showCompleted = row.value
    }
  }
  return out
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  await db.settings.put({ key, value })
}

/* ------------------------------------------------------------------ */
/* datos de ejemplo en la primera ejecución                            */
/* ------------------------------------------------------------------ */

export async function seedIfEmpty(): Promise<void> {
  const count = await db.habits.count()
  if (count > 0) return
  const today = todayKey()
  const base = { createdAt: today, archivedAt: null }
  await db.habits.bulkAdd([
    {
      ...base,
      name: 'Beber agua',
      emoji: '💧',
      color: '#06b6d4',
      frequency: { kind: 'daily' },
      goal: 8,
      unit: 'vasos',
      sortOrder: 0,
    },
    {
      ...base,
      name: 'Leer',
      emoji: '📚',
      color: '#8b5cf6',
      frequency: { kind: 'daily' },
      goal: 1,
      unit: '20 min',
      sortOrder: 1,
    },
    {
      ...base,
      name: 'Entrenar',
      emoji: '💪',
      color: '#f43f5e',
      frequency: { kind: 'weekly', timesPerWeek: 3 },
      goal: 1,
      sortOrder: 2,
    },
    {
      ...base,
      name: 'Meditar',
      emoji: '🧘',
      color: '#10b981',
      frequency: { kind: 'daily' },
      goal: 1,
      sortOrder: 3,
    },
    {
      ...base,
      name: 'Estudiar inglés',
      emoji: '🗣️',
      color: '#f59e0b',
      frequency: { kind: 'daysOfWeek', days: [1, 2, 3, 4, 5] },
      goal: 1,
      sortOrder: 4,
    },
  ])
}
