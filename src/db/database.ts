import Dexie, { type Table } from 'dexie'
import type { Habit, HabitEntry } from '../lib/types'

export interface SettingRow {
  key: string
  value: unknown
}

/**
 * Base de datos local. Índices pensados para las consultas reales de la app:
 * - habits: orden manual y filtrado de archivados
 * - entries: por hábito, por fecha y el compuesto único [habitId+date]
 *   (garantiza "un registro por hábito y día" a nivel de motor, no solo en código)
 */
export class ShrimpDB extends Dexie {
  habits!: Table<Habit, number>
  entries!: Table<HabitEntry, number>
  settings!: Table<SettingRow, string>

  constructor() {
    super('shrimp')
    this.version(1).stores({
      habits: '++id, sortOrder, archivedAt, createdAt',
      entries: '++id, habitId, date, &[habitId+date], updatedAt',
      settings: 'key',
    })
  }
}

export const db = new ShrimpDB()
