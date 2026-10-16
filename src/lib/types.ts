/** Tipos del dominio de Shrimp. Sin dependencias: solo datos. */

/** Fecha en formato `YYYY-MM-DD` **en hora local** (nunca UTC: un hábito es cosa del día del usuario). */
export type DateKey = string

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekly'; timesPerWeek: number }
  | { kind: 'daysOfWeek'; days: number[] }
  | { kind: 'everyN'; n: number; anchor: DateKey }

export interface Habit {
  id?: number
  name: string
  emoji: string
  /** hex, ej. '#10b981' */
  color: string
  frequency: Frequency
  /** meta por día: 1 = sí/no, >1 = contador */
  goal: number
  /** unidad para mostrar: 'vasos', 'min', 'páginas'... */
  unit?: string
  /** 'HH:MM' recordatorio (solo informativo en la app) */
  reminder?: string
  notes?: string
  createdAt: DateKey
  archivedAt?: DateKey | null
  sortOrder: number
}

export interface HabitEntry {
  id?: number
  habitId: number
  date: DateKey
  value: number
  note?: string
  updatedAt: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  weekStart: 0 | 1
  showCompleted: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  weekStart: 1,
  showCompleted: true,
}

/** Paleta curada: se aplica por estilo inline para no depender del purge de Tailwind. */
export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Rosa', hex: '#f43f5e' },
  { name: 'Cian', hex: '#06b6d4' },
  { name: 'Lima', hex: '#84cc16' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Magenta', hex: '#ec4899' },
  { name: 'Pizarra', hex: '#64748b' },
]

export const EMOJIS: string[] = [
  '💧', '🏃', '📚', '🧘', '💪', '🥗', '😴', '🎸', '✍️', '🦷',
  '☀️', '🧹', '💻', '🌱', '🎯', '🧠', '🚭', '🚶', '🍎', '⚽',
  '🎨', '🗣️', '💊', '🧴', '📝', '🛏️', '🐕', '☕', '🔬', '🎧',
]
