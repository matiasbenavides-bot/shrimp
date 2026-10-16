import type { Frequency } from './types'

const WD = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
const WD_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

/** Texto humano de una frecuencia: "Todos los días", "3 veces por semana"... */
export function describeFrequency(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Todos los días'
    case 'weekly':
      return `${f.timesPerWeek} ${f.timesPerWeek === 1 ? 'vez' : 'veces'} por semana`
    case 'daysOfWeek': {
      const days = [...f.days].sort((a, b) => a - b)
      if (days.length === 7) return 'Todos los días'
      if (days.length === 0) return 'Sin días'
      return days.map((d) => WD_SHORT[d]).join(' · ')
    }
    case 'everyN':
      return f.n === 1 ? 'Todos los días' : `Cada ${f.n} días`
  }
}

export function describeFrequencyLong(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Todos los días'
    case 'weekly':
      return f.timesPerWeek === 1
        ? 'Una vez por semana (elige el día que quieras)'
        : `${f.timesPerWeek} veces por semana (elige los días que quieras)`
    case 'daysOfWeek':
      return f.days.length === 0
        ? 'Ningún día seleccionado'
        : `Los ${[...f.days].sort((a, b) => a - b).map((d) => WD[d]).join(', ')}`
    case 'everyN':
      return f.n === 1 ? 'Todos los días' : `Un día sí y ${f.n - 1} no`
  }
}

/** Cuántas veces "toca" por semana (para estadísticas). */
export function weeklyTargetOf(f: Frequency): number {
  switch (f.kind) {
    case 'daily':
      return 7
    case 'weekly':
      return f.timesPerWeek
    case 'daysOfWeek':
      return f.days.length
    case 'everyN':
      return Math.round(7 / f.n)
  }
}
