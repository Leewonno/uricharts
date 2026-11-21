import type { Period } from '../types'

/** MV 차트 페이지 경로. 카테고리(/mv) 단위로 둔다. */
export const chartPath = (period: Period) => `/mv/chart/${period}`
