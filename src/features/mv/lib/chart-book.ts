import { isMidnightRecord } from '../../../../pipeline/mv/collect'
import { addDays, kstDate } from '../../../../pipeline/mv/dates'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import type { ChartEntry, ChartSlot, ChartView, Period, RankChange } from '../types'
import type { ChartSource } from './chart-data'

/**
 * 차트 페이지에서 고를 수 있는 기간별 차트를 수집 기록으로 만든다.
 *
 * 기록 YYYY-MM-DD.json은 그날 0시(KST) 무렵의 누적 조회수라, 기간 조회수 = 끝 기록 − 시작 기록이다.
 * - 일간 D: D 기록 → D+1 기록
 * - 주간 (월요일 M부터 일요일까지): M 기록 → M+7 기록. 끝난 주만 고를 수 있다
 * - 월간: 1일 기록 → 다음 달 1일 기록. 이번 달은 1일 기록 → 최신 기록 (집계 중)
 * - 연간: 1월 1일 → 다음 해 1월 1일. 올해는 최신 기록까지 (집계 중)
 *
 * 차트에는 그 기간이 속한 해에 공개된 곡만 들어간다 (공개연도 차트).
 * 그래서 연간은 1월 1일 기록이 없어도 된다: 그 해 공개곡은 1월 1일 조회수가 0이다.
 * 기록이 없는 기간은 고를 수 없다. 값을 추정해서 채우지 않는다.
 */

interface Window {
  readonly start: string
  readonly end: string
}

interface SlotPlan {
  readonly slot: ChartSlot
  readonly window: Window
  /** 순위 변동을 비교할 직전 기간 (연간은 비교하지 않는다) */
  readonly prev: Window | null
  readonly releaseYear: string
  /** 시작 기록이 꼭 있어야 하는가 (연간은 없어도 된다) */
  readonly requireStart: boolean
}

export interface ChartBook {
  /** 집계 기준일 YYYY-MM-DD */
  readonly asOf: string
  /** 기록이 있는 날 YYYY-MM-DD (오래된 날부터) */
  readonly recordDates: readonly string[]
  /** 기간별로 고를 수 있는 차트 (최근부터) */
  readonly slots: Readonly<Record<Period, readonly ChartSlot[]>>
  /**
   * 기간 차트. key가 없으면 가장 최근 차트, 고를 수 있는 기간이 없으면 집계 중 자리.
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
  const untilLatest = `${md(asOf)}까지`

  const plans: Record<Period, SlotPlan[]> = { day: [], week: [], month: [], year: [] }

  for (let d = src.firstDate; d < L; d = addDays(d, 1)) {
    if (has(d) && has(addDays(d, 1))) plans.day.push(dayPlan(d))
  }

  for (let m = mondayOnOrBefore(src.firstDate); addDays(m, 7) <= L; m = addDays(m, 7)) {
    if (has(m) && has(addDays(m, 7))) plans.week.push(weekPlan(m))
  }

  for (let f = firstOfMonth(src.firstDate); f <= L; f = nextMonthFirst(f)) {
    const next = nextMonthFirst(f)
    if (!has(f)) continue
    if (has(next)) plans.month.push(monthPlan(f, next, false))
    else if (next > L && L > f) plans.month.push(monthPlan(f, L, true))
  }

  for (let y = year(src.firstDate); y <= year(L); y++) {
    const start = `${y}-01-01`
    const next = `${y + 1}-01-01`
    if (has(next)) plans.year.push(yearPlan(y, { start, end: next }, false))
    else if (next > L && L > start) plans.year.push(yearPlan(y, { start, end: L }, true))
  }

  for (const list of Object.values(plans)) list.reverse()

  function monthPlan(first: string, end: string, inProgress: boolean): SlotPlan {
    return {
      slot: { key: first.slice(0, 7), label: ym(first), range: inProgress ? untilLatest : null, inProgress },
      window: { start: first, end },
      prev: { start: prevMonthFirst(first), end: first },
      releaseYear: first.slice(0, 4),
      requireStart: true,
    }
  }

  function yearPlan(y: number, window: Window, inProgress: boolean): SlotPlan {
    return {
      slot: { key: String(y), label: `${y}년`, range: null, inProgress },
      window,
      prev: null,
      releaseYear: String(y),
      requireStart: false,
    }
  }

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

  /** 기간 안에서 공개 연도가 같은 곡들의 조회수 순 */
  function ranked(w: Window, releaseYear: string, requireStart: boolean) {
    return entries
      .flatMap((e) => {
        if (!e.released.startsWith(releaseYear)) return []
        const views = viewsIn(w, e, requireStart)
        return views === null ? [] : [{ e, views }]
      })
      .toSorted((a, b) => b.views - a.views)
  }

  function build(plan: SlotPlan, period: Period): ChartView {
    const { window: w, prev, releaseYear, requireStart } = plan
    // 직전 기간에 같은 공개연도 곡이 하나도 없으면(새해 첫 기간) 변동을 표시하지 않는다 (모두 "재진입"이 되지 않게)
    const prevList = prev && has(prev.start) && has(prev.end) ? ranked(prev, releaseYear, true) : []
    const prevRanks = prevList.length > 0 ? new Map(prevList.map(({ e }, i) => [e.yt, i + 1])) : null
    const rows: ChartEntry[] = ranked(w, releaseYear, requireStart).map(({ e, views }, i) => ({
      yt: e.yt,
      title: e.title,
      artist: e.artist,
      released: e.released,
      rank: i + 1,
      views,
      change: prevRanks ? rankChange(prevRanks.get(e.yt), i + 1) : { kind: 'none' },
    }))
    const partial = [snap(w.start), snap(w.end)].some((s) => s !== undefined && !isMidnightRecord(s))
    return {
      period,
      slot: plan.slot,
      releaseYear,
      available: true,
      availableFrom: null,
      note: partial ? PARTIAL_NOTE : null,
      rows,
    }
  }

  /** 고를 수 있는 기간이 없을 때: 처음으로 볼 수 있게 될 기간을 집계 중으로 보여준다 */
  function pending(period: Period): ChartView {
    const first = src.firstDate
    const { plan, from } = {
      day: () => ({ plan: dayPlan(first), from: addDays(first, 1) }),
      week: () => {
        const monday = mondayOnOrAfter(first)
        return { plan: weekPlan(monday), from: addDays(monday, 7) }
      },
      month: () => {
        const f = first.endsWith('-01') ? first : nextMonthFirst(first)
        return { plan: monthPlan(f, f, true), from: addDays(f, 1) }
      },
      year: () => {
        const y = year(L)
        return { plan: yearPlan(y, { start: `${y}-01-01`, end: L }, true), from: `${y}-01-02` }
      },
    }[period]()
    return {
      period,
      slot: { ...plan.slot, range: null },
      releaseYear: plan.releaseYear,
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
    slots: {
      day: plans.day.map((p) => p.slot),
      week: plans.week.map((p) => p.slot),
      month: plans.month.map((p) => p.slot),
      year: plans.year.map((p) => p.slot),
    },
    view(period, key) {
      const list = plans[period]
      if (key === undefined) return list[0] ? build(list[0], period) : pending(period)
      const plan = list.find((p) => p.slot.key === key)
      return plan ? build(plan, period) : null
    },
  }
}

function dayPlan(d: string): SlotPlan {
  return {
    slot: { key: d, label: `${year(d)}년 ${md(d)} (${weekday(d)})`, range: null, inProgress: false },
    window: { start: d, end: addDays(d, 1) },
    prev: { start: addDays(d, -1), end: d },
    releaseYear: d.slice(0, 4),
    requireStart: true,
  }
}

function weekPlan(monday: string): SlotPlan {
  const { year: y, week } = isoWeekOf(monday)
  return {
    slot: { key: `${y}-W${String(week).padStart(2, '0')}`, label: `${y}년 ${week}주차`, range: `${md(monday)} ~ ${md(addDays(monday, 6))}`, inProgress: false },
    window: { start: monday, end: addDays(monday, 7) },
    prev: { start: addDays(monday, -7), end: monday },
    releaseYear: String(y),
    requireStart: true,
  }
}

function rankChange(prev: number | undefined, rank: number): RankChange {
  if (prev === undefined) return { kind: 'reentry' }
  if (prev > rank) return { kind: 'up', amount: prev - rank }
  if (prev < rank) return { kind: 'down', amount: rank - prev }
  return { kind: 'same' }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const utc = (date: string) => new Date(`${date}T00:00:00Z`)
const year = (date: string) => Number(date.slice(0, 4))
const md = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`
const ym = (date: string) => `${year(date)}년 ${Number(date.slice(5, 7))}월`
const weekday = (date: string) => WEEKDAYS[utc(date).getUTCDay()]
const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`
const nextMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), 32))
const prevMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), -1))
const mondayOnOrBefore = (date: string) => addDays(date, -((utc(date).getUTCDay() + 6) % 7))
const mondayOnOrAfter = (date: string) => {
  const monday = mondayOnOrBefore(date)
  return monday === date ? date : addDays(monday, 7)
}

/** ISO 주차와 그 주차가 속한 해 (월요일 시작, 그 해 첫 목요일이 든 주가 1주차) */
export function isoWeekOf(date: string): { year: number; week: number } {
  const d = utc(date)
  const thursday = new Date(d.getTime() + (4 - (d.getUTCDay() || 7)) * 86_400_000)
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return { year: thursday.getUTCFullYear(), week: Math.ceil(((thursday.getTime() - jan1) / 86_400_000 + 1) / 7) }
}
