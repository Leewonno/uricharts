import type { Mv, Period, RankChange, RankedMv } from '../types'

const VIEWS_FIELD = { day: 'day', week: 'week', month: 'month', year: 'yearViews' } as const
const PREV_FIELD = { day: 'prevD', week: 'prevW', month: 'prevM', year: null } as const

export interface RankOptions {
  /** 이 연도에 공개된 곡만 모은다. 없으면 공개일과 관계없이 모든 곡 (누적) */
  readonly releaseYear?: string | null
}

function rankChange(prev: number | undefined, rank: number): RankChange {
  if (prev === undefined) return { kind: 'reentry' }
  if (prev > rank) return { kind: 'up', amount: prev - rank }
  if (prev < rank) return { kind: 'down', amount: rank - prev }
  return { kind: 'same' }
}

/**
 * 기간별 조회수 순위를 매긴다.
 * 공개 연도로 좁히면 이전 순위도 좁힌 곡들 안에서 다시 매겨 비교한다
 * (전체 순위와 비교하면 변동 폭이 부풀려진다). 연간은 순위 변동을 표시하지 않는다.
 */
export function rankMvs(mvs: readonly Mv[], period: Period, { releaseYear }: RankOptions = {}): RankedMv[] {
  const field = VIEWS_FIELD[period]
  const prevField = PREV_FIELD[period]
  const pool = releaseYear ? mvs.filter((m) => m.released.startsWith(releaseYear)) : mvs

  const prevRanks = new Map<string, number>()
  if (prevField) {
    pool
      .filter((m) => m[prevField] !== null)
      .toSorted((a, b) => (a[prevField] ?? 0) - (b[prevField] ?? 0))
      .forEach((m, i) => prevRanks.set(m.yt, i + 1))
  }

  return pool
    .toSorted((a, b) => b[field] - a[field])
    .map((m, i) => {
      const rank = i + 1
      return {
        ...m,
        rank,
        views: m[field],
        change: prevField ? rankChange(prevRanks.get(m.yt), rank) : { kind: 'none' },
      }
    })
}

/** 누적 조회수 순위. 공개일과 관계없이 모든 곡을 모으고, 순위 변동은 표시하지 않는다 */
export function rankByTotal(mvs: readonly Mv[]): RankedMv[] {
  return mvs
    .toSorted((a, b) => b.total - a.total)
    .map((m, i) => ({ ...m, rank: i + 1, views: m.total, change: { kind: 'none' } }))
}

/** 곡들의 공개 연도 (중복 없이, 최근 연도부터) */
export function releaseYears(mvs: readonly Mv[]): string[] {
  return [...new Set(mvs.map((m) => m.released.slice(0, 4)))].toSorted().toReversed()
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 하루 평균 조회수: 누적 조회수 ÷ 공개일부터 기준일까지 일수 (최소 1일) */
export function dailyAverage(mv: Mv, refDate: string): number {
  const days = Math.max(1, Math.round((Date.parse(refDate) - Date.parse(mv.released)) / DAY_MS))
  return Math.round(mv.total / days)
}
