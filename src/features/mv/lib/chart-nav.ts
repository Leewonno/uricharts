import type { ChartSlot, ChartView, Period } from '../types'
import type { ChartBook } from './chart-book'
import { PERIOD_ORDER } from './periods'
import { chartPath } from './routes'

/**
 * 차트 화면의 이동 주소. 화면은 연도 → 기간 종류 → 기간 순으로 고르고, 해 밖으로는 연도 드롭다운으로만 나간다.
 * - 가장 최근 해는 기간 기본 주소(/mv/chart/week), 지난해는 그 해의 가장 최근 기간 주소로 간다
 * - 기본 차트와 같은 기간은 기본 주소로 둔다 (같은 차트가 두 주소로 갈리지 않게)
 */

export interface NavSlot extends ChartSlot {
  readonly href: string
}

export interface YearOption {
  readonly year: string
  /** 아직 집계 중인 해 */
  readonly inProgress: boolean
  readonly href: string
  readonly current: boolean
}

export interface PeriodTab {
  readonly period: Period
  readonly href: string
  readonly current: boolean
}

export interface ChartNav {
  /** 최근 해부터 */
  readonly years: readonly YearOption[]
  /** 일간·주간·월간·연간 */
  readonly tabs: readonly PeriodTab[]
  /** 지금 보는 해·기간 종류의 기간들 (최근부터) */
  readonly slots: readonly NavSlot[]
  /** 마감된 해를 볼 때 다음 해 차트 주소. 다음 해가 아직 없으면 null */
  readonly nextYearHref: string | null
}

export function chartNav(book: ChartBook, view: ChartView): ChartNav {
  const newest = book.years[0].year
  const year = view.releaseYear

  /** 기본 차트(가장 최근 해의 최근 기간)의 key. 집계 중 자리면 null */
  const defaultKey = (period: Period) => {
    const v = book.view(period)
    return v?.available ? v.slot.key : null
  }
  const slotHref = (period: Period, key: string) => (key === defaultKey(period) ? chartPath(period) : chartPath(period, key))
  const hrefFor = (period: Period, y: string) => {
    if (y === newest) return chartPath(period)
    const latest = book.slots[period].find((s) => s.year === y)
    return latest ? slotHref(period, latest.key) : chartPath(period)
  }

  return {
    years: book.years.map((y) => ({ year: y.year, inProgress: !y.closed, href: hrefFor(view.period, y.year), current: y.year === year })),
    tabs: PERIOD_ORDER.map((period) => ({ period, href: hrefFor(period, year), current: period === view.period })),
    slots: book.slots[view.period].filter((s) => s.year === year).map((s) => ({ ...s, href: slotHref(view.period, s.key) })),
    nextYearHref: book.years.some((y) => y.year === String(Number(year) + 1)) ? hrefFor(view.period, String(Number(year) + 1)) : null,
  }
}
