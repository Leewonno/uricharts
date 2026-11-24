import { isMidnightRecord } from '../../../../pipeline/mv/collect'
import { addDays, kstDate } from '../../../../pipeline/mv/dates'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import type { ChartEntry, ChartSlot, ChartView, ChartYear, Period, RankChange } from '../types'
import type { ChartSource } from './chart-data'

/**
 * 차트 페이지에서 고를 수 있는 기간별 차트를 수집 기록으로 만든다.
 *
 * 기록 YYYY-MM-DD.json은 그날 0시(KST) 무렵의 누적 조회수라, 기간 조회수 = 끝 기록 − 시작 기록이다.
 * 기간은 해를 넘지 않는다. 그 해 차트에는 그 해에 공개된 곡만 들어간다 (공개연도 차트).
 * - 일간 D: D 기록 → D+1 기록
 * - 주간: 월요일 기록 → 다음 월요일 기록. 1월 1일이 든 주가 1주차이고, 해가 바뀌는 주는 해에서 자른다
 *   (2026-12-28~12-31은 2026년 53주차 4일, 2027-01-01~01-03은 2027년 1주차 3일). 끝난 주만 고를 수 있다
 * - 월간: 1일 기록 → 다음 달 1일 기록. 끝난 달만 고를 수 있다
 * - 연간: 1월 1일 → 다음 해 1월 1일. 올해는 최신 기록까지 (집계 중)
 *
 * 해의 첫 기간(1월 1일·1주차·1월)은 비교할 직전 기간이 없어 변동을 표시하지 않는다.
 * 연간은 1월 1일 기록이 없어도 된다: 그 해 공개곡은 1월 1일 조회수가 0이다.
 * 기록이 없는 기간은 고를 수 없다. 값을 추정해서 채우지 않는다.
 */

interface Window {
  readonly start: string
  readonly end: string
}

interface SlotPlan {
  readonly slot: ChartSlot
  readonly window: Window
  /** 순위 변동을 비교할 직전 기간 (연간·해의 첫 기간은 비교하지 않는다) */
  readonly prev: Window | null
  readonly releaseYear: string
  /** 시작 기록이 꼭 있어야 하는가 (연간은 없어도 된다) */
  readonly requireStart: boolean
}

/** 해 안에서 잘린 한 주. end는 다음 주 시작 기록 날짜 (그날은 포함하지 않는다) */
interface WeekSpan {
  readonly n: number
  readonly start: string
  readonly end: string
}

export interface ChartBook {
  /** 집계 기준일 YYYY-MM-DD */
  readonly asOf: string
  /** 기록이 있는 날 YYYY-MM-DD (오래된 날부터) */
  readonly recordDates: readonly string[]
  /** 차트의 해 (최근 해부터). 기준일이 속한 해까지 */
  readonly years: readonly ChartYear[]
  /** 기간별로 고를 수 있는 차트 (모든 해, 최근부터) */
  readonly slots: Readonly<Record<Period, readonly ChartSlot[]>>
  /**
   * 기간 차트. key가 없으면 가장 최근 해의 가장 최근 차트, 그 해에 고를 수 있는 기간이 없으면 집계 중 자리.
   * 없는 key면 null
   */
  view(period: Period, key?: string): ChartView | null
}

const PARTIAL_NOTE = '0시가 아닌 시각에 남긴 기록이 섞여 있어 기간의 일부만 집계했어요'

export function buildChartBook(src: ChartSource): ChartBook {
  const snap = (date: string): Snapshot | undefined => src.snapshots.get(date)
  const has = (date: string) => src.snapshots.has(date)
  const L = src.latestDate
  const latest = snap(L)
  if (!latest) throw new Error(`최신 기록(${L})이 없습니다`)

  /** 이 기록이 담은 조회수의 마지막 날 (0시 기록이면 전날) */
  const through = (s: Snapshot) => (isMidnightRecord(s) ? addDays(s.date, -1) : kstDate(new Date(s.fetchedAt)))
  const asOf = through(latest)
  const closed = (y: string) => asOf >= `${y}-12-31`

  const years: ChartYear[] = []
  for (let y = year(asOf); y >= Math.min(year(src.firstDate), year(asOf)); y--) years.push({ year: String(y), closed: closed(String(y)) })

  const plans: Record<Period, SlotPlan[]> = { day: [], week: [], month: [], year: [] }

  for (let d = src.firstDate; d < L; d = addDays(d, 1)) {
    if (has(d) && has(addDays(d, 1))) plans.day.push(dayPlan(d))
  }

  for (let y = year(src.firstDate); y <= year(L); y++) {
    const weeks = weeksOf(y)
    weeks.forEach((w, i) => {
      if (has(w.start) && has(w.end)) plans.week.push(weekPlan(y, w, weeks[i - 1]))
    })
  }

  for (let f = firstOfMonth(src.firstDate); f <= L; f = nextMonthFirst(f)) {
    if (has(f) && has(nextMonthFirst(f))) plans.month.push(monthPlan(f))
  }

  for (let y = year(src.firstDate); y <= year(L); y++) {
    const start = `${y}-01-01`
    const next = `${y + 1}-01-01`
    if (has(next)) plans.year.push(yearPlan(y, { start, end: next }, false))
    else if (next > L && L > start) plans.year.push(yearPlan(y, { start, end: L }, true))
  }

  for (const list of Object.values(plans)) list.reverse()

  const entries = src.registry.filter((e) => !e.hidden)

  /** 기간 조회수. 알 수 없으면 null */
  function viewsIn(w: Window, e: RegistryEntry, requireStart: boolean): number | null {
    const end = snap(w.end)?.views[e.yt]
    if (end === undefined) return null
    const start = snap(w.start)
    if (!start && requireStart) return null
    const begin = start?.views[e.yt]
    if (begin !== undefined) return Math.max(0, end - begin)
    // 시작 기록에 없던 곡: 기간 안에 공개됐으면 누적값이 전부 이 기간 조회수다
    return !start || e.released >= w.start ? end : null
  }

  /** 기간 안에서 공개 연도가 같은 곡들의 조회수 순 (total: 끝 기록의 누적) */
  function ranked(w: Window, releaseYear: string, requireStart: boolean) {
    const end = snap(w.end)
    return entries
      .flatMap((e) => {
        if (!e.released.startsWith(releaseYear)) return []
        const views = viewsIn(w, e, requireStart)
        return views === null || !end ? [] : [{ e, views, total: end.views[e.yt] }]
      })
      .toSorted((a, b) => b.views - a.views)
  }

  function build(plan: SlotPlan, period: Period): ChartView {
    const { window: w, prev, releaseYear, requireStart } = plan
    // 직전 기간에 같은 공개연도 곡이 하나도 없으면 변동을 표시하지 않는다 (모두 "재진입"이 되지 않게)
    const prevList = prev && has(prev.start) && has(prev.end) ? ranked(prev, releaseYear, true) : []
    const prevRanks = prevList.length > 0 ? new Map(prevList.map(({ e }, i) => [e.yt, i + 1])) : null
    const rows: ChartEntry[] = ranked(w, releaseYear, requireStart).map(({ e, views, total }, i) => ({
      yt: e.yt,
      title: e.title,
      artist: e.artist,
      released: e.released,
      rank: i + 1,
      views,
      total,
      change: prevRanks ? rankChange(prevRanks.get(e.yt), i + 1, e.released >= w.start) : { kind: 'none' },
    }))
    const partial = [snap(w.start), snap(w.end)].some((s) => s !== undefined && !isMidnightRecord(s))
    return {
      period,
      slot: plan.slot,
      releaseYear,
      closed: closed(releaseYear),
      available: true,
      availableFrom: null,
      note: partial ? PARTIAL_NOTE : null,
      rows,
    }
  }

  /** 그 해에 고를 수 있는 기간이 없을 때: 그 해에서 처음으로 볼 수 있게 될 기간을 집계 중으로 보여준다 */
  function pending(period: Period, y: number): ChartView {
    const jan1 = `${y}-01-01`
    const first = src.firstDate > jan1 ? src.firstDate : jan1
    const { plan, from } = {
      day: () => ({ plan: dayPlan(first), from: addDays(first, 1) }),
      week: () => {
        const weeks = weeksOf(y)
        const w = weeks.find((s) => s.start >= first) ?? weeks.at(-1)!
        return { plan: weekPlan(y, w, undefined), from: w.end }
      },
      month: () => {
        const f = first.endsWith('-01') ? first : nextMonthFirst(first)
        return { plan: monthPlan(f), from: nextMonthFirst(f) }
      },
      year: () => ({ plan: yearPlan(y, { start: jan1, end: L }, true), from: `${y}-01-02` }),
    }[period]()
    return {
      period,
      slot: { ...plan.slot, range: null },
      releaseYear: plan.releaseYear,
      closed: closed(plan.releaseYear),
      available: false,
      // 기록이 중간에 빠져 영영 못 채우는 기간이면 null
      availableFrom: from > L ? from : null,
      note: null,
      rows: [],
    }
  }

  return {
    asOf,
    recordDates: [...src.snapshots.keys()].toSorted(),
    years,
    slots: {
      day: plans.day.map((p) => p.slot),
      week: plans.week.map((p) => p.slot),
      month: plans.month.map((p) => p.slot),
      year: plans.year.map((p) => p.slot),
    },
    view(period, key) {
      const list = plans[period]
      if (key === undefined) {
        const newest = years[0].year
        const plan = list.find((p) => p.slot.year === newest)
        return plan ? build(plan, period) : pending(period, Number(newest))
      }
      const plan = list.find((p) => p.slot.key === key)
      return plan ? build(plan, period) : null
    },
  }
}

function dayPlan(d: string): SlotPlan {
  return {
    slot: { key: d, year: d.slice(0, 4), label: `${md(d)} (${weekday(d)})`, range: null, inProgress: false },
    window: { start: d, end: addDays(d, 1) },
    prev: d.endsWith('-01-01') ? null : { start: addDays(d, -1), end: d },
    releaseYear: d.slice(0, 4),
    requireStart: true,
  }
}

/** 그 해의 주들. 1월 1일이 든 주가 1주차이고, 해를 넘는 주는 해에서 자른다 */
function weeksOf(y: number): WeekSpan[] {
  const jan1 = `${y}-01-01`
  const next = `${y + 1}-01-01`
  const weeks: WeekSpan[] = []
  for (let m = mondayOnOrBefore(jan1), n = 1; m < next; m = addDays(m, 7), n++) {
    const end = addDays(m, 7)
    weeks.push({ n, start: m < jan1 ? jan1 : m, end: end > next ? next : end })
  }
  return weeks
}

function weekPlan(y: number, w: WeekSpan, prev: WeekSpan | undefined): SlotPlan {
  const last = addDays(w.end, -1)
  const days = Math.round((utc(w.end).getTime() - utc(w.start).getTime()) / 86_400_000)
  const range = `${md(w.start)}(${weekday(w.start)}) ~ ${md(last)}(${weekday(last)})${days < 7 ? ` · ${days}일` : ''}`
  return {
    slot: { key: `${y}-W${String(w.n).padStart(2, '0')}`, year: String(y), label: `${w.n}주차`, range, inProgress: false },
    window: { start: w.start, end: w.end },
    prev: prev ? { start: prev.start, end: prev.end } : null,
    releaseYear: String(y),
    requireStart: true,
  }
}

function monthPlan(first: string): SlotPlan {
  return {
    slot: { key: first.slice(0, 7), year: first.slice(0, 4), label: `${Number(first.slice(5, 7))}월`, range: null, inProgress: false },
    window: { start: first, end: nextMonthFirst(first) },
    prev: first.slice(5, 7) === '01' ? null : { start: prevMonthFirst(first), end: first },
    releaseYear: first.slice(0, 4),
    requireStart: true,
  }
}

function yearPlan(y: number, window: Window, inProgress: boolean): SlotPlan {
  return {
    slot: { key: String(y), year: String(y), label: `${y}년`, range: null, inProgress },
    window,
    prev: null,
    releaseYear: String(y),
    requireStart: false,
  }
}

/** 직전 기간 순위와 비교. 직전에 없던 곡은 이번 기간에 공개됐으면 NEW, 아니면 재진입 */
function rankChange(prev: number | undefined, rank: number, releasedInWindow: boolean): RankChange {
  if (prev === undefined) return releasedInWindow ? { kind: 'new' } : { kind: 'reentry' }
  if (prev > rank) return { kind: 'up', amount: prev - rank }
  if (prev < rank) return { kind: 'down', amount: rank - prev }
  return { kind: 'same' }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const utc = (date: string) => new Date(`${date}T00:00:00Z`)
const year = (date: string) => Number(date.slice(0, 4))
const md = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`
const weekday = (date: string) => WEEKDAYS[utc(date).getUTCDay()]
const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`
const nextMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), 32))
const prevMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), -1))
const mondayOnOrBefore = (date: string) => addDays(date, -((utc(date).getUTCDay() + 6) % 7))
