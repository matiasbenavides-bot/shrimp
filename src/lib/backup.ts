import { db } from '../db/database'
import type { AppSettings, Habit, HabitEntry } from './types'

export interface Backup {
  app: 'shrimp'
  version: 1
  exportedAt: string
  habits: Habit[]
  entries: HabitEntry[]
  settings?: AppSettings
}

export async function exportBackup(settings: AppSettings): Promise<string> {
  const [habits, entries] = await Promise.all([db.habits.toArray(), db.entries.toArray()])
  const backup: Backup = {
    app: 'shrimp',
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    entries,
    settings,
  }
  return JSON.stringify(backup, null, 2)
}

/** Reemplaza todos los datos por los del backup. Valida antes de tocar nada. */
export async function importBackup(json: string): Promise<{ habits: number; entries: number }> {
  let data: Partial<Backup>
  try {
    data = JSON.parse(json) as Partial<Backup>
  } catch {
    throw new Error('El texto no es un JSON válido.')
  }

  if (data.app !== 'shrimp' || !Array.isArray(data.habits) || !Array.isArray(data.entries)) {
    throw new Error('Ese archivo no es un backup de Shrimp.')
  }

  const habits = data.habits.filter(
    (h): h is Habit => !!h && typeof h.name === 'string' && typeof h.goal === 'number' && !!h.frequency,
  )
  if (habits.length === 0) throw new Error('El backup no contiene hábitos válidos.')

  const validIds = new Set(habits.map((h) => h.id))
  const entries = data.entries.filter(
    (e): e is HabitEntry =>
      !!e &&
      typeof e.date === 'string' &&
      typeof e.value === 'number' &&
      validIds.has(e.habitId),
  )

  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.habits.clear()
    await db.entries.clear()
    await db.habits.bulkAdd(habits)
    await db.entries.bulkAdd(entries)
  })

  return { habits: habits.length, entries: entries.length }
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, db.settings, async () => {
    await db.habits.clear()
    await db.entries.clear()
    await db.settings.clear()
  })
}
