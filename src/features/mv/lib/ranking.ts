import type { Mv, Period, RankChange, RankedMv } from '../types'

const VIEWS_FIELD = { day: 'day', week: 'week', month: 'month', year: 'yearViews' } as const
const PREV_FIELD = { day: 'prevD', week: 'prevW', month: 'prevM', year: null } as const

export interface RankOptions {
  /** 이 연도에 공개된 곡만 모은다. 없으면 공개일과 관계없이 모든 곡 (누적) */
  readonly releaseYear?: string | null
  /** 직전 기간 순위와 비교해 변동을 표시할지. 직전 기간 기록이 없으면 false (모두 "재진입"으로 보이지 않게) */
  readonly withChange?: boolean
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
export function rankMvs(mvs: readonly Mv[], period: Period, { releaseYear, withChange = true }: RankOptions = {}): RankedMv[] {
  const field = VIEWS_FIELD[period]
  const prevField = withChange ? PREV_FIELD[period] : null
  // 그 기간 조회수를 모르는 곡(비교할 기록이 없음)은 순위에 넣지 않는다
  const pool = mvs.flatMap((m) => {
    const views = m[field]
    return views !== null && (!releaseYear || m.released.startsWith(releaseYear)) ? [{ mv: m, views }] : []
  })

  const prevRanks = new Map<string, number>()
  if (prevField) {
    pool
      .filter(({ mv }) => mv[prevField] !== null)
      .toSorted((a, b) => (a.mv[prevField] ?? 0) - (b.mv[prevField] ?? 0))
      .forEach(({ mv }, i) => prevRanks.set(mv.yt, i + 1))
  }

  return pool
    .toSorted((a, b) => b.views - a.views)
    .map(({ mv, views }, i) => {
      const rank = i + 1
      return {
        ...mv,
        rank,
        views,
        change: prevField ? rankChange(prevRanks.get(mv.yt), rank) : { kind: 'none' },
      }
    })
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
