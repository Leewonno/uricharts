import type { Period } from '../types'

/**
 * MV 차트 페이지 경로. 카테고리(/mv) 단위로 둔다.
 * key를 주면 그 기간 차트 (예: /mv/chart/week/2026-W47), 없으면 가장 최근 차트.
 */
export const chartPath = (period: Period, key?: string) => (key ? `/mv/chart/${period}/${key}` : `/mv/chart/${period}`)
