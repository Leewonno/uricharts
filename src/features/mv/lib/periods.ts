import type { Period } from '../types'

/** 화면에 보이는 기간 순서 */
export const PERIOD_ORDER: readonly Period[] = ['day', 'week', 'month', 'year']

export const PERIOD_NAMES: Readonly<Record<Period, string>> = {
  day: '일간',
  week: '주간',
  month: '월간',
  year: '연간',
}

export const isPeriod = (value: string): value is Period => (PERIOD_ORDER as readonly string[]).includes(value)
