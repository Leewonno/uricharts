export type MvType = '걸그룹' | '보이그룹' | '솔로'

export type Period = 'day' | 'week' | 'month' | 'year'

export interface Mv {
  /** 유튜브 영상 ID */
  readonly yt: string
  readonly title: string
  readonly artist: string
  /** 아직 그룹/솔로 구분 전이면 null */
  readonly type: MvType | null
  /** 공개일 YYYY-MM-DD */
  readonly released: string
  /** 누적 조회수 */
  readonly total: number
  /** 기간별 조회수. 비교할 기록이 없어 알 수 없으면 null (그 기간 차트에서 빠진다) */
  readonly day: number | null
  readonly week: number | null
  readonly month: number | null
  /** 올해(1월 1일부터 기준일까지) 늘어난 조회수. 올해 공개곡은 누적과 같다 */
  readonly yearViews: number | null
  /** 기간별 직전 순위 (차트 밖이었으면 null) */
  readonly prevD: number | null
  readonly prevW: number | null
  readonly prevM: number | null
}

/** 차트 데이터 묶음. 조회수와 그 조회수를 집계한 기준일, 기간 정보가 같이 온다 */
export interface MvSnapshot {
  /** 집계 기준일 YYYY-MM-DD (이날까지의 조회수) */
  readonly asOf: string
  readonly mvs: readonly Mv[]
  readonly periods: Readonly<Record<Period, PeriodInfo>>
}

export type RankChange =
  | { readonly kind: 'up' | 'down'; readonly amount: number }
  | { readonly kind: 'same' }
  | { readonly kind: 'reentry' }
  | { readonly kind: 'none' }

export interface RankedMv extends Mv {
  readonly rank: number
  /** 이 기간의 순위 기준 조회수 */
  readonly views: number
  readonly change: RankChange
}

/** 차트 한 줄에 필요한 값 (RankedMv도 그대로 넘길 수 있다) */
export interface ChartEntry {
  readonly yt: string
  readonly title: string
  readonly artist: string
  /** 공개일 YYYY-MM-DD */
  readonly released: string
  readonly rank: number
  /** 이 기간 조회수 */
  readonly views: number
  readonly change: RankChange
}

/**
 * 고를 수 있는 기간 하나 (하루 · 월~일 한 주 · 한 달 · 한 해).
 * key 형식: 일간 2026-11-23 / 주간 2026-W47 / 월간 2026-10 / 연간 2026
 */
export interface ChartSlot {
  readonly key: string
  /** 예: "2026년 11월 23일 (월)", "2026년 47주차", "2026년 10월", "2026년" */
  readonly label: string
  /** 덧붙이는 기간 표기. 주간 "11월 16일 ~ 11월 22일", 집계 중인 달 "11월 23일까지". 없으면 null */
  readonly range: string | null
  /** 아직 끝나지 않은 달·해 (최신 기록까지만 셌다) */
  readonly inProgress: boolean
}

/** 한 기간의 차트. 그 기간이 속한 해에 공개된 곡만 순위를 매긴다 */
export interface ChartView {
  readonly period: Period
  readonly slot: ChartSlot
  /** 이 차트에 들어가는 곡의 공개 연도 */
  readonly releaseYear: string
  /** false면 아직 집계 중 (고를 수 있는 기간이 하나도 없을 때 보여주는 자리) */
  readonly available: boolean
  /** 집계 중일 때 볼 수 있게 되는 날 YYYY-MM-DD (알 수 없으면 null) */
  readonly availableFrom: string | null
  /** 차트 위에 덧붙일 안내 (부분 집계 등) */
  readonly note: string | null
  /** 조회수 순 (1위부터) */
  readonly rows: readonly ChartEntry[]
}

export interface PeriodInfo {
  readonly key: Period
  readonly name: string
  /** 짧은 기간 표기. 예: "2026년 47주차" */
  readonly label: string
  /** 차트 위에 보여줄 기준 기간. 예: "2026년 47주차 (11월 14일 ~ 11월 20일)", 월간·연간은 날짜 없이 "2026년 10월" */
  readonly range: string
  /** 이 기간이 속한 연도 */
  readonly year: string
  /** 비교할 기록이 있어 순위를 낼 수 있는가. false면 "집계 중" */
  readonly available: boolean
  /** 집계 중일 때 볼 수 있게 되는 날 YYYY-MM-DD (알 수 없으면 null) */
  readonly availableFrom: string | null
  /** 차트 위에 덧붙일 안내 (부분 집계 등) */
  readonly note: string | null
  /** 직전 기간과 순위를 비교할 수 있는가. false면 변동을 표시하지 않는다 */
  readonly hasPrev: boolean
}
