import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  diffDays,
  dowOf,
  eachDay,
  fromKey,
  isValidKey,
  startOfWeek,
  toKey,
} from './dates'

/** Viernes */
const FRI = '2026-10-16'

describe('fechas: conversión', () => {
  it('toKey usa hora local, no UTC', () => {
    // 16 oct 2026 00:30 local: toISOString() daría el día anterior en zonas positivas
    expect(toKey(new Date(2026, 9, 16, 0, 30))).toBe('2026-10-16')
    expect(toKey(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16')
  })

  it('fromKey/toKey son inversas', () => {
    for (const k of ['2026-01-01', '2026-02-28', '2026-12-31', '2024-02-29']) {
      expect(toKey(fromKey(k))).toBe(k)
    }
  })

  it('isValidKey rechaza fechas imposibles y formatos raros', () => {
    expect(isValidKey('2026-02-30')).toBe(false)
    expect(isValidKey('2026-13-01')).toBe(false)
    expect(isValidKey('16-10-2026')).toBe(false)
    expect(isValidKey('2026-10-16')).toBe(true)
  })
})

describe('fechas: aritmética', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28') // 2026 no es bisiesto
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29') // 2024 sí
  })

  it('addMonths respeta final de mes', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03') // overflow nativo de JS, documentado
    expect(addMonths('2026-10-16', -1)).toBe('2026-09-16')
  })

  it('diffDays es exacto en rangos largos (detecta bugs de DST)', () => {
    let cur = '2026-01-01'
    for (let i = 0; i < 400; i++) {
      const next = addDays(cur, 1)
      expect(diffDays(cur, next)).toBe(1)
      cur = next
    }
  })

  it('diffDays cuenta días completos en ambos sentidos', () => {
    expect(diffDays('2026-10-12', FRI)).toBe(4)
    expect(diffDays(FRI, '2026-10-12')).toBe(-4)
    expect(diffDays(FRI, FRI)).toBe(0)
  })
})

describe('fechas: semanas', () => {
  it('dowOf coincide con Date#getDay', () => {
    expect(dowOf('2026-10-12')).toBe(1) // lunes
    expect(dowOf(FRI)).toBe(5) // viernes
    expect(dowOf('2026-10-18')).toBe(0) // domingo
  })

  it('startOfWeek con semana que empieza en lunes', () => {
    expect(startOfWeek(FRI, 1)).toBe('2026-10-12')
    expect(startOfWeek('2026-10-12', 1)).toBe('2026-10-12')
    expect(startOfWeek('2026-10-18', 1)).toBe('2026-10-12') // domingo -> lunes anterior
  })

  it('startOfWeek con semana que empieza en domingo', () => {
    expect(startOfWeek(FRI, 0)).toBe('2026-10-11')
    expect(startOfWeek('2026-10-11', 0)).toBe('2026-10-11')
    expect(startOfWeek('2026-10-10', 0)).toBe('2026-10-04')
  })
})

describe('fechas: rangos', () => {
  it('eachDay incluye ambos extremos', () => {
    expect(eachDay('2026-10-12', FRI)).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
    ])
    expect(eachDay(FRI, FRI)).toEqual([FRI])
  })

  it('eachDay devuelve vacío si el rango está invertido', () => {
    expect(eachDay(FRI, '2026-10-12')).toEqual([])
  })
})
