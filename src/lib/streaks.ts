import { addDays, diffDays, dowOf, eachDay, startOfWeek } from './dates'
import type { DateKey, Habit, HabitEntry } from './types'

/** Tope de seguridad para los recorridos hacia atrás (~10 años). */
const MAX_DAYS = 3700
const MAX_WEEKS = 530

export type ValueByDate = Map<DateKey, number>

export interface StreakOptions {
  today: DateKey
  /** 0 = domingo, 1 = lunes */
  weekStart: number
}

export interface DayPoint {
  date: DateKey
  value: number
  due: boolean
  satisfied: boolean
}

export interface HabitProgress {
  valueToday: number
  doneToday: boolean
  dueToday: boolean
  currentStreak: number
  bestStreak: number
  weekCount: number
  weekTarget: number
  weekSatisfied: boolean
  totalCompletions: number
  rate7: number
  rate30: number
}

/* ------------------------------------------------------------------ */
/* helpers básicos                                                     */
/* ------------------------------------------------------------------ */

export function indexEntries(entries: HabitEntry[]): ValueByDate {
  const m: ValueByDate = new Map()
  for (const e of entries) {
    // si hubiera duplicados, gana el mayor
    const prev = m.get(e.date)
    if (prev === undefined || e.value > prev) m.set(e.date, e.value)
  }
  return m
}

/** ¿Toca este hábito en esta fecha? (para `weekly` siempre true: se cumple en cualquier día de la semana) */
export function isDue(habit: Habit, date: DateKey): boolean {
  const f = habit.frequency
  switch (f.kind) {
    case 'daily':
      return true
    case 'weekly':
      return true
    case 'daysOfWeek':
      return f.days.includes(dowOf(date))
    case 'everyN': {
      const d = diffDays(f.anchor, date)
      return d >= 0 && d % f.n === 0
    }
  }
}

export function isSatisfied(habit: Habit, value: number | undefined): boolean {
  return (value ?? 0) >= habit.goal
}

export function weekTargetOf(habit: Habit): number {
  return habit.frequency.kind === 'weekly' ? habit.frequency.timesPerWeek : 7
}

export function weekKeyOf(date: DateKey, weekStart: number): DateKey {
  return startOfWeek(date, weekStart)
}

/** Días cumplidos dentro de la semana que empieza en `weekStartKey`. */
export function weekCountOf(habit: Habit, byDate: ValueByDate, weekStartKey: DateKey): number {
  let n = 0
  for (let i = 0; i < 7; i++) {
    if (isSatisfied(habit, byDate.get(addDays(weekStartKey, i)))) n++
  }
  return n
}

/** Primera fecha relevante: la creación del hábito o su primer registro (lo que sea anterior). */
export function firstTrackedDate(habit: Habit, entries: HabitEntry[]): DateKey {
  let min = habit.createdAt
  for (const e of entries) if (diffDays(e.date, min) > 0) min = e.date
  return min
}

/* ------------------------------------------------------------------ */
/* rachas                                                             */
/* ------------------------------------------------------------------ */

function dayStreak(habit: Habit, byDate: ValueByDate, floor: DateKey, today: DateKey): number {
  let streak = 0
  let cursor = today
  for (let i = 0; i < MAX_DAYS; i++) {
    if (diffDays(floor, cursor) < 0) break // antes de que existiera el hábito
    if (!isDue(habit, cursor)) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (isSatisfied(habit, byDate.get(cursor))) {
      streak++
    } else if (cursor !== today) {
      break // hueco en un día que tocaba -> racha rota
    }
    // si es hoy y no está hecho, no lo contamos pero tampoco rompemos: el día sigue en curso
    cursor = addDays(cursor, -1)
  }
  return streak
}

function weeklyStreak(
  habit: Habit,
  byDate: ValueByDate,
  floorWeek: DateKey,
  today: DateKey,
  weekStart: number,
): number {
  const target = weekTargetOf(habit)
  const currentWeek = startOfWeek(today, weekStart)
  let streak = 0
  let cursor = currentWeek
  for (let w = 0; w < MAX_WEEKS; w++) {
    if (diffDays(floorWeek, cursor) < 0) break
    const ok = weekCountOf(habit, byDate, cursor) >= target
    if (ok) {
      streak++
    } else if (cursor !== currentWeek) {
      break
    }
    // semana en curso sin cumplir todavía: no rompe
    cursor = addDays(cursor, -7)
  }
  return streak
}

export function currentStreak(habit: Habit, entries: HabitEntry[], opts: StreakOptions): number {
  const byDate = indexEntries(entries)
  const floor = firstTrackedDate(habit, entries)
  if (habit.frequency.kind === 'weekly') {
    return weeklyStreak(habit, byDate, startOfWeek(floor, opts.weekStart), opts.today, opts.weekStart)
  }
  return dayStreak(habit, byDate, floor, opts.today)
}

function dayBest(habit: Habit, byDate: ValueByDate, floor: DateKey, today: DateKey): number {
  let best = 0
  let run = 0
  let cursor = floor
  for (let i = 0; i < MAX_DAYS; i++) {
    if (diffDays(cursor, today) < 0) break
    if (isDue(habit, cursor)) {
      if (isSatisfied(habit, byDate.get(cursor))) {
        run++
        if (run > best) best = run
      } else if (cursor !== today) {
        run = 0 // hoy a medias no rompe la mejor racha
      }
    }
    cursor = addDays(cursor, 1)
  }
  return best
}

function weeklyBest(
  habit: Habit,
  byDate: ValueByDate,
  floorWeek: DateKey,
  today: DateKey,
  weekStart: number,
): number {
  const target = weekTargetOf(habit)
  const currentWeek = startOfWeek(today, weekStart)
  let best = 0
  let run = 0
  let cursor = floorWeek
  for (let w = 0; w < MAX_WEEKS; w++) {
    if (diffDays(cursor, currentWeek) < 0) break
    if (weekCountOf(habit, byDate, cursor) >= target) {
      run++
      if (run > best) best = run
    } else if (cursor !== currentWeek) {
      run = 0
    }
    cursor = addDays(cursor, 7)
  }
  return best
}

export function bestStreak(habit: Habit, entries: HabitEntry[], opts: StreakOptions): number {
  const byDate = indexEntries(entries)
  const floor = firstTrackedDate(habit, entries)
  if (habit.frequency.kind === 'weekly') {
    return weeklyBest(habit, byDate, startOfWeek(floor, opts.weekStart), opts.today, opts.weekStart)
  }
  return dayBest(habit, byDate, floor, opts.today)
}

/* ------------------------------------------------------------------ */
/* tasas y series                                                     */
/* ------------------------------------------------------------------ */

/** Proporción 0..1 de cumplimiento. Para `weekly` cuenta semanas cumplidas. */
export function completionRate(
  habit: Habit,
  entries: HabitEntry[],
  from: DateKey,
  to: DateKey,
  weekStart: number,
): number {
  const byDate = indexEntries(entries)
  if (diffDays(from, to) < 0) return 0

  if (habit.frequency.kind === 'weekly') {
    const target = weekTargetOf(habit)
    let weeks = 0
    let ok = 0
    // cuentan las semanas cuyo inicio cae dentro del rango (la que contiene `from` incluida)
    let cursor = startOfWeek(from, weekStart)
    for (let w = 0; w < MAX_WEEKS; w++) {
      if (diffDays(cursor, to) < 0) break
      weeks++
      if (weekCountOf(habit, byDate, cursor) >= target) ok++
      cursor = addDays(cursor, 7)
    }
    return weeks === 0 ? 0 : ok / weeks
  }

  let due = 0
  let done = 0
  for (const d of eachDay(from, to)) {
    if (!isDue(habit, d)) continue
    due++
    if (isSatisfied(habit, byDate.get(d))) done++
  }
  return due === 0 ? 0 : done / due
}

/** Serie diaria para el heatmap / calendario. */
export function daySeries(
  habit: Habit,
  entries: HabitEntry[],
  from: DateKey,
  to: DateKey,
): DayPoint[] {
  const byDate = indexEntries(entries)
  return eachDay(from, to).map((d) => {
    const value = byDate.get(d) ?? 0
    return { date: d, value, due: isDue(habit, d), satisfied: isSatisfied(habit, value) }
  })
}

export function totalCompletions(habit: Habit, entries: HabitEntry[]): number {
  let n = 0
  for (const e of entries) if (e.value >= habit.goal) n++
  return n
}

/* ------------------------------------------------------------------ */
/* agregado que consume la UI                                          */
/* ------------------------------------------------------------------ */

export function computeProgress(
  habit: Habit,
  entries: HabitEntry[],
  opts: StreakOptions,
): HabitProgress {
  const byDate = indexEntries(entries)
  const valueToday = byDate.get(opts.today) ?? 0
  const doneToday = isSatisfied(habit, valueToday)
  const weekStartKey = startOfWeek(opts.today, opts.weekStart)
  const weekCount = weekCountOf(habit, byDate, weekStartKey)
  const weekTarget = weekTargetOf(habit)
  const isWeekly = habit.frequency.kind === 'weekly'

  return {
    valueToday,
    doneToday,
    // en semanales, "toca" solo mientras no hayas llegado al objetivo de la semana
    dueToday: isWeekly ? weekCount < weekTarget : isDue(habit, opts.today),
    currentStreak: currentStreak(habit, entries, opts),
    bestStreak: bestStreak(habit, entries, opts),
    weekCount,
    weekTarget,
    weekSatisfied: weekCount >= weekTarget,
    totalCompletions: totalCompletions(habit, entries),
    rate7: completionRate(habit, entries, addDays(opts.today, -6), opts.today, opts.weekStart),
    rate30: completionRate(habit, entries, addDays(opts.today, -29), opts.today, opts.weekStart),
  }
}
