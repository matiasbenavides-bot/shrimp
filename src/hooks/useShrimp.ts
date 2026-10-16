import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { DateKey, Habit, HabitEntry } from '../lib/types'

/** Todos los hábitos, en orden manual. */
export function useAllHabits(): Habit[] | undefined {
  return useLiveQuery(() => db.habits.orderBy('sortOrder').toArray(), [])
}

export function useActiveHabits(): Habit[] | undefined {
  const all = useAllHabits()
  return useMemo(() => all?.filter((h) => !h.archivedAt), [all])
}

export function useArchivedHabits(): Habit[] | undefined {
  const all = useAllHabits()
  return useMemo(() => all?.filter((h) => !!h.archivedAt), [all])
}

/**
 * Todos los registros. Para una app personal son unos cientos de filas y así
 * las rachas se calculan sobre el historial completo (correcto de verdad).
 */
export function useAllEntries(): HabitEntry[] {
  const entries = useLiveQuery(() => db.entries.toArray(), [], [] as HabitEntry[])
  return entries ?? []
}

/** entries agrupados por habitId, listos para la lógica de rachas. */
export function useEntriesByHabit(): Map<number, HabitEntry[]> {
  const entries = useAllEntries()
  return useMemo(() => {
    const map = new Map<number, HabitEntry[]>()
    for (const e of entries) {
      const list = map.get(e.habitId)
      if (list) list.push(e)
      else map.set(e.habitId, [e])
    }
    return map
  }, [entries])
}

export function useHabit(id: number | undefined): Habit | undefined {
  return useLiveQuery(async () => (id == null ? undefined : await db.habits.get(id)), [id])
}

/** Registros de un hábito concreto desde una fecha. */
export function useHabitEntriesSince(habitId: number | undefined, from: DateKey): HabitEntry[] {
  const rows = useLiveQuery(
    () =>
      habitId == null
        ? Promise.resolve([] as HabitEntry[])
        : db.entries.where('[habitId+date]').between([habitId, from], [habitId, '9999-12-31']).toArray(),
    [habitId, from],
    [] as HabitEntry[],
  )
  return rows ?? []
}
