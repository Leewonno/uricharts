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

/** 차트 위에 보여줄 설명. releaseYear가 null이면 누적(모든 곡), 연도면 그 해 공개곡 */
export function describeChart(period: Period, releaseYear: string | null): string {
  const name = PERIOD_NAMES[period]
  return releaseYear
    ? `${releaseYear}년에 공개된 K-POP MV ${name} 조회수 순위예요.`
    : `K-POP MV 전체 ${name} 조회수 순위예요.`
}
