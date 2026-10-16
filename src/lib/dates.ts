import type { DateKey } from './types'

const MS_PER_DAY = 86_400_000

/** Date -> 'YYYY-MM-DD' en hora LOCAL (getMonth/getDate locales, nunca toISOString). */
export function toKey(d: Date): DateKey {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> Date local a medianoche. */
export function fromKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): DateKey {
  return toKey(new Date())
}

export function isValidKey(k: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false
  const [y, m, d] = k.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function addMonths(k: DateKey, n: number): DateKey {
  const d = fromKey(k)
  d.setMonth(d.getMonth() + n)
  return toKey(d)
}

/** Días completos entre a y b (b - a). Usa Math.round para sobrevivir a cambios de hora. */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / MS_PER_DAY)
}

/** 0 = domingo ... 6 = sábado (igual que Date#getDay). */
export function dowOf(k: DateKey): number {
  return fromKey(k).getDay()
}

/** Lunes/fecha de inicio de la semana que contiene `k` según `weekStart` (0 o 1). */
export function startOfWeek(k: DateKey, weekStart: number): DateKey {
  const d = fromKey(k)
  const delta = (d.getDay() - weekStart + 7) % 7
  d.setDate(d.getDate() - delta)
  return toKey(d)
}

/** [from, to] inclusive */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  if (diffDays(from, to) < 0) return out
  let cur = from
  // tope defensivo: 20 años
  for (let i = 0; i < 7300; i++) {
    out.push(cur)
    if (cur === to) break
    cur = addDays(cur, 1)
  }
  return out
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return diffDays(a, b) >= 0 ? a : b
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return diffDays(a, b) >= 0 ? b : a
}

const WEEKDAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const WEEKDAYS_3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function weekdayShort(k: DateKey): string {
  return WEEKDAYS_SHORT[dowOf(k)]
}

export function weekdayLong(k: DateKey): string {
  return WEEKDAYS_LONG[dowOf(k)]
}

/** Orden de iniciales de la semana según el día de inicio elegido. */
export function orderedWeekdays(weekStart: number): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAYS_SHORT[(weekStart + i) % 7])
}

export function orderedDow(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)
}

/** 'vie 16 oct' */
export function formatShort(k: DateKey): string {
  const d = fromKey(k)
  return `${WEEKDAYS_3[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export function formatLong(k: DateKey): string {
  const d = fromKey(k)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/** Etiqueta amable para "hoy" / "ayer" / fecha. */
export function relativeLabel(k: DateKey, today: DateKey): string {
  const diff = diffDays(today, k)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === -2) return 'Antepenúltimo día'
  if (diff === 1) return 'Mañana'
  return formatLong(k)
}

/** 'HH:MM' -> Date de hoy a esa hora (para ordenar recordatorios). */
export function minutesOfDay(hhmm: string | undefined): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
