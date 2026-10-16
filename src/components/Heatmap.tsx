import { useMemo } from 'react'
import { addDays, dowOf, startOfWeek } from '../lib/dates'
import { daySeries, type DayPoint } from '../lib/streaks'
import type { DateKey, Habit, HabitEntry } from '../lib/types'

interface HeatmapProps {
  habit: Habit
  entries: HabitEntry[]
  today: DateKey
  weekStart: number
  weeks?: number
}

/** Mapa de calor tipo GitHub: columnas = semanas, filas = días. */
export function Heatmap({ habit, entries, today, weekStart, weeks = 16 }: HeatmapProps) {
  const from = startOfWeek(addDays(today, -(weeks - 1) * 7), weekStart)

  const points = useMemo(
    () => daySeries(habit, entries, from, today),
    [habit, entries, from, today],
  )

  const cells = useMemo(() => {
    const pad = (dowOf(from) - weekStart + 7) % 7
    const list: (DayPoint | null)[] = [
      ...Array.from({ length: pad }, () => null),
      ...points,
    ]
    const target = Math.ceil(list.length / 7) * 7
    while (list.length < target) list.push(null)
    return list
  }, [points, from, weekStart])

  return (
    <div className="grid grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))] gap-1">
      {cells.map((p, i) => {
        if (!p) {
          return <div key={`pad-${i}`} className="aspect-square rounded-[4px] bg-transparent" />
        }
        const isToday = p.date === today
        const style = p.satisfied
          ? { backgroundColor: habit.color }
          : undefined
        const cls = p.satisfied
          ? ''
          : p.due
            ? 'bg-slate-200 dark:bg-slate-700'
            : 'bg-slate-100 dark:bg-slate-800/60'
        return (
          <div
            key={p.date}
            title={p.date}
            className={`aspect-square rounded-[4px] ${cls} ${isToday ? 'ring-2 ring-slate-900/60 dark:ring-white/70' : ''}`}
            style={style}
          />
        )
      })}
    </div>
  )
}
