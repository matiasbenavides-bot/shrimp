import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  completionRate,
  computeProgress,
  currentStreak,
  daySeries,
  isDue,
  isSatisfied,
  totalCompletions,
  weekCountOf,
  indexEntries,
} from './streaks'
import { startOfWeek } from './dates'
import type { Habit, HabitEntry, Frequency } from './types'

/** Viernes 16 oct 2026. Semana empieza en lunes. */
const TODAY = '2026-10-16'
const OPTS = { today: TODAY, weekStart: 1 }

function makeHabit(over: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    name: 'Beber agua',
    emoji: '💧',
    color: '#3b82f6',
    frequency: { kind: 'daily' },
    goal: 1,
    createdAt: '2026-01-01',
    archivedAt: null,
    sortOrder: 0,
    ...over,
  }
}

function log(valuesByDate: Record<string, number>): HabitEntry[] {
  return Object.entries(valuesByDate).map(([date, value]) => ({
    habitId: 1,
    date,
    value,
    updatedAt: `${date}T12:00:00.000Z`,
  }))
}

const days = (...dates: string[]): HabitEntry[] => log(Object.fromEntries(dates.map((d) => [d, 1])))

/* --------------------------------------------------------------- */

describe('isDue: cuándo toca cada frecuencia', () => {
  it('daily toca siempre', () => {
    const h = makeHabit()
    expect(isDue(h, '2026-10-12')).toBe(true)
    expect(isDue(h, TODAY)).toBe(true)
  })

  it('daysOfWeek solo los días elegidos', () => {
    const h = makeHabit({ frequency: { kind: 'daysOfWeek', days: [1, 3, 5] } })
    expect(isDue(h, '2026-10-12')).toBe(true) // lunes
    expect(isDue(h, '2026-10-13')).toBe(false) // martes
    expect(isDue(h, '2026-10-14')).toBe(true) // miércoles
    expect(isDue(h, TODAY)).toBe(true) // viernes
    expect(isDue(h, '2026-10-17')).toBe(false) // sábado
  })

  it('everyN cuenta desde el ancla y no antes', () => {
    const h = makeHabit({ frequency: { kind: 'everyN', n: 2, anchor: '2026-10-12' } })
    expect(isDue(h, '2026-10-11')).toBe(false) // antes del ancla
    expect(isDue(h, '2026-10-12')).toBe(true)
    expect(isDue(h, '2026-10-13')).toBe(false)
    expect(isDue(h, '2026-10-14')).toBe(true)
    expect(isDue(h, TODAY)).toBe(true)
  })

  it('weekly toca cualquier día (se cumple con el objetivo semanal)', () => {
    const h = makeHabit({ frequency: { kind: 'weekly', timesPerWeek: 3 } })
    expect(isDue(h, '2026-10-13')).toBe(true)
    expect(isDue(h, TODAY)).toBe(true)
  })
})

describe('isSatisfied: metas y contadores', () => {
  it('un hábito de sí/no se cumple con 1', () => {
    const h = makeHabit()
    expect(isSatisfied(h, 0)).toBe(false)
    expect(isSatisfied(h, undefined)).toBe(false)
    expect(isSatisfied(h, 1)).toBe(true)
    expect(isSatisfied(h, 3)).toBe(true)
  })

  it('un contador necesita llegar a la meta', () => {
    const h = makeHabit({ goal: 3 })
    expect(isSatisfied(h, 2)).toBe(false)
    expect(isSatisfied(h, 3)).toBe(true)
    expect(isSatisfied(h, 8)).toBe(true)
  })
})

describe('racha diaria', () => {
  const h = makeHabit()

  it('cuenta los días consecutivos hasta hoy', () => {
    expect(currentStreak(h, days('2026-10-14', '2026-10-15', TODAY), OPTS)).toBe(3)
  })

  it('el día de hoy sin hacer NO rompe la racha (sigue en curso)', () => {
    expect(currentStreak(h, days('2026-10-14', '2026-10-15'), OPTS)).toBe(2)
  })

  it('un hueco en un día que tocaba sí la rompe', () => {
    expect(currentStreak(h, days('2026-10-13', TODAY), OPTS)).toBe(1)
    expect(currentStreak(h, days('2026-10-12', '2026-10-13'), OPTS)).toBe(0)
  })

  it('sin registros la racha es 0', () => {
    expect(currentStreak(h, [], OPTS)).toBe(0)
  })

  it('no hay racha negativa si nunca se hizo nada y hoy tampoco', () => {
    const nuevo = makeHabit({ createdAt: TODAY })
    expect(currentStreak(nuevo, [], OPTS)).toBe(0)
    expect(bestStreak(nuevo, [], OPTS)).toBe(0)
  })

  it('los registros anteriores a la fecha de creación cuentan (importación)', () => {
    const importado = makeHabit({ createdAt: '2026-10-16' })
    expect(currentStreak(importado, days('2026-10-14', '2026-10-15', TODAY), OPTS)).toBe(3)
  })

  it('bestStreak recuerda la mejor racha histórica', () => {
    const entries = days(
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-14', '2026-10-15', TODAY,
    )
    expect(currentStreak(h, entries, OPTS)).toBe(3)
    expect(bestStreak(h, entries, OPTS)).toBe(5)
  })

  it('la mejor racha puede ser la actual', () => {
    const entries = days('2026-10-14', '2026-10-15', TODAY)
    expect(bestStreak(h, entries, OPTS)).toBe(3)
  })
})

describe('racha con días concretos (lun/mié/vie)', () => {
  const h = makeHabit({ frequency: { kind: 'daysOfWeek', days: [1, 3, 5] } })

  it('los días que no tocan no rompen nada', () => {
    // lunes 12, miércoles 14, viernes 16 -> 3 seguidos aunque martes/jueves estén vacíos
    expect(currentStreak(h, days('2026-10-12', '2026-10-14', TODAY), OPTS)).toBe(3)
  })

  it('hoy pendiente devuelve los días anteriores seguidos', () => {
    expect(currentStreak(h, days('2026-10-12', '2026-10-14'), OPTS)).toBe(2)
  })

  it('fallar un día que tocaba corta la racha', () => {
    expect(currentStreak(h, days('2026-10-12', TODAY), OPTS)).toBe(1)
  })
})

describe('racha cada N días', () => {
  const h = makeHabit({ frequency: { kind: 'everyN', n: 2, anchor: '2026-10-12' } })

  it('cuenta solo los días del ciclo', () => {
    expect(currentStreak(h, days('2026-10-12', '2026-10-14', TODAY), OPTS)).toBe(3)
  })

  it('los días intermedios no cuentan ni rompen', () => {
    expect(currentStreak(h, days('2026-10-12', '2026-10-14'), OPTS)).toBe(2)
  })
})

describe('racha semanal (objetivo N por semana)', () => {
  const h = makeHabit({
    frequency: { kind: 'weekly', timesPerWeek: 3 },
    createdAt: '2026-09-01',
  })

  it('una semana cumplida suma 1 a la racha', () => {
    // semana 12-18: lunes 12, miércoles 14, viernes 16 = 3 -> objetivo
    expect(currentStreak(h, days('2026-10-12', '2026-10-14', TODAY), OPTS)).toBe(1)
  })

  it('encadena semanas cumplidas', () => {
    const entries = days(
      '2026-10-05', '2026-10-07', '2026-10-09', // semana 5-11 cumplida
      '2026-10-12', '2026-10-14', TODAY, // semana 12-18 cumplida
    )
    expect(currentStreak(h, entries, OPTS)).toBe(2)
    expect(bestStreak(h, entries, OPTS)).toBe(2)
  })

  it('la semana en curso sin cumplir todavía no rompe la racha', () => {
    const entries = days(
      '2026-10-05', '2026-10-07', '2026-10-09',
      '2026-10-14', // semana actual solo 1 de 3
    )
    expect(currentStreak(h, entries, OPTS)).toBe(1)
  })

  it('una semana incompleta en el pasado sí la rompe', () => {
    const entries = days(
      '2026-09-28', '2026-09-30', '2026-10-02', // semana 28/09 cumplida
      '2026-10-05', '2026-10-07', // semana 05/10 solo 2 de 3 -> rota
      '2026-10-12', '2026-10-14', TODAY,
    )
    expect(currentStreak(h, entries, OPTS)).toBe(1)
    expect(bestStreak(h, entries, OPTS)).toBe(1)
  })

  it('weekCountOf cuenta los días cumplidos de la semana en curso', () => {
    const byDate = indexEntries(days('2026-10-12', '2026-10-14', TODAY))
    expect(weekCountOf(h, byDate, startOfWeek(TODAY, 1))).toBe(3)
  })
})

describe('tasas de cumplimiento', () => {
  it('daily: días cumplidos / días que tocaban', () => {
    const h = makeHabit()
    const entries = days('2026-10-14', '2026-10-15', TODAY)
    // rango 12..16 -> 5 días que tocan, 3 cumplidos
    expect(completionRate(h, entries, '2026-10-12', TODAY, 1)).toBeCloseTo(3 / 5, 5)
  })

  it('daysOfWeek solo cuenta los días que tocan', () => {
    const h = makeHabit({ frequency: { kind: 'daysOfWeek', days: [1, 3, 5] } })
    const entries = days('2026-10-12', '2026-10-14', TODAY)
    expect(completionRate(h, entries, '2026-10-12', TODAY, 1)).toBe(1)
  })

  it('weekly: semanas cumplidas / semanas del rango', () => {
    const h = makeHabit({ frequency: { kind: 'weekly', timesPerWeek: 2 } })
    const entries = days('2026-10-12', '2026-10-14')
    expect(completionRate(h, entries, '2026-10-12', '2026-10-18', 1)).toBe(1)
    // en un rango de dos semanas con una sola cumplida -> 0.5
    expect(completionRate(h, entries, '2026-10-12', '2026-10-25', 1)).toBeCloseTo(0.5, 5)
  })

  it('rango invertido o sin días que toquen -> 0', () => {
    const h = makeHabit()
    expect(completionRate(h, [], TODAY, '2026-10-12', 1)).toBe(0)
    const finde = makeHabit({ frequency: { kind: 'daysOfWeek', days: [6] } })
    expect(completionRate(finde, [], '2026-10-12', TODAY, 1)).toBe(0)
  })
})

describe('totalCompletions', () => {
  it('cuenta solo los días que llegan a la meta', () => {
    const h = makeHabit({ goal: 3 })
    const entries = log({ '2026-10-12': 1, '2026-10-13': 3, '2026-10-14': 5, '2026-10-15': 2 })
    expect(totalCompletions(h, entries)).toBe(2)
  })
})

describe('daySeries (heatmap)', () => {
  it('marca qué días tocaban y cuáles se cumplieron', () => {
    const h = makeHabit({ frequency: { kind: 'daysOfWeek', days: [1, 3, 5] } })
    const s = daySeries(h, days('2026-10-14', TODAY), '2026-10-14', '2026-10-17')
    expect(s.map((p) => p.date)).toEqual([
      '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17',
    ])
    expect(s.map((p) => p.due)).toEqual([true, false, true, false])
    expect(s.map((p) => p.satisfied)).toEqual([true, false, true, false])
  })
})

describe('computeProgress: agregado que consume la UI', () => {
  it('hábito diario pendiente hoy', () => {
    const h = makeHabit()
    const p = computeProgress(h, days('2026-10-14', '2026-10-15'), OPTS)
    expect(p.valueToday).toBe(0)
    expect(p.doneToday).toBe(false)
    expect(p.dueToday).toBe(true)
    expect(p.currentStreak).toBe(2)
    expect(p.weekCount).toBe(2)
    expect(p.totalCompletions).toBe(2)
    expect(p.rate7).toBeCloseTo(2 / 7, 5)
  })

  it('hábito diario hecho hoy', () => {
    const p = computeProgress(makeHabit(), days('2026-10-14', '2026-10-15', TODAY), OPTS)
    expect(p.valueToday).toBe(1)
    expect(p.doneToday).toBe(true)
    expect(p.currentStreak).toBe(3)
  })

  it('contador a medias: no está hecho pero se ve el progreso', () => {
    const h = makeHabit({ goal: 8, unit: 'vasos' })
    const p = computeProgress(h, log({ [TODAY]: 5 }), OPTS)
    expect(p.valueToday).toBe(5)
    expect(p.doneToday).toBe(false)
    expect(p.dueToday).toBe(true)
  })

  it('semanal: deja de estar pendiente cuando cumple el objetivo', () => {
    const h = makeHabit({ frequency: { kind: 'weekly', timesPerWeek: 3 } })
    const p = computeProgress(h, days('2026-10-12', '2026-10-14', TODAY), OPTS)
    expect(p.weekCount).toBe(3)
    expect(p.weekTarget).toBe(3)
    expect(p.weekSatisfied).toBe(true)
    expect(p.dueToday).toBe(false)
    expect(p.doneToday).toBe(true)
  })

  it('semanal: sigue pendiente si aún no llega al objetivo', () => {
    const h = makeHabit({ frequency: { kind: 'weekly', timesPerWeek: 3 } })
    const p = computeProgress(h, days('2026-10-14'), OPTS)
    expect(p.dueToday).toBe(true)
    expect(p.weekSatisfied).toBe(false)
  })

  it('frecuencia: cada tipo se describe bien', () => {
    const freqs: Frequency[] = [
      { kind: 'daily' },
      { kind: 'weekly', timesPerWeek: 2 },
      { kind: 'daysOfWeek', days: [1, 3, 5] },
      { kind: 'everyN', n: 3, anchor: '2026-10-12' },
    ]
    for (const frequency of freqs) {
      const h = makeHabit({ frequency })
      const p = computeProgress(h, [], OPTS)
      expect(p.currentStreak).toBe(0)
      expect(p.weekTarget).toBeGreaterThan(0)
    }
  })
})
