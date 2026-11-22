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

export interface PeriodInfo {
  readonly key: Period
  readonly name: string
  /** 짧은 기간 표기. 예: "2026년 47주차" */
  readonly label: string
  /** 차트 위에 보여줄 기준 기간. 예: "2026년 47주차 (11월 14일 ~ 11월 20일)" */
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
