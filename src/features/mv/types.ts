export type MvType = '걸그룹' | '보이그룹' | '솔로'

export type Period = 'day' | 'week' | 'month' | 'year'

export interface Mv {
  /** 유튜브 영상 ID */
  readonly yt: string
  readonly title: string
  readonly artist: string
  readonly type: MvType
  /** 공개일 YYYY-MM-DD */
  readonly released: string
  /** 누적 조회수 */
  readonly total: number
  /** 기간별 조회수 */
  readonly day: number
  readonly week: number
  readonly month: number
  /** 올해(1월 1일부터 기준일까지) 늘어난 조회수. 올해 공개곡은 누적과 같다 */
  readonly yearViews: number
  /** 기간별 직전 순위 (차트 밖이었으면 null) */
  readonly prevD: number | null
  readonly prevW: number | null
  readonly prevM: number | null
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
}
