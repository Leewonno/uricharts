import { addDays, kstDate, kstHour } from '../../../../pipeline/mv/dates'
import type { Artist, RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import type { Mv, MvSnapshot, Period, PeriodInfo } from '../types'
import { PERIOD_NAMES } from './periods'

/**
 * 수집 기록(data 브랜치의 mv/)으로 차트 데이터를 만든다.
 *
 * 기록 파일 YYYY-MM-DD.json은 그날 0시(KST) 무렵의 누적 조회수다. 기간 조회수는 두 기록의 차이로 구한다.
 * - 일간: 최신 기록 − 하루 전 기록 (= 전날 하루)
 * - 주간: 최신 기록 − 7일 전 기록 (= 최근 7일)
 * - 월간: 이번 달 1일 기록 − 지난달 1일 기록 (= 지난달 한 달)
 * - 연간: 최신 기록 − 올해 1월 1일 기록
 * 비교할 기록이 없으면 그 기간은 "집계 중"이다. 값을 추정해서 채우지 않는다.
 * 단, 기간 안에 공개된 곡은 공개 전 조회수가 0이므로 시작 기록이 없어도 누적값이 곧 기간 조회수다.
 */

export interface ChartSource {
  readonly registry: readonly RegistryEntry[]
  readonly artists: readonly Artist[]
  /** 날짜 → 기록. chartSnapshotDates()의 날짜 중 있는 것만 들어 있으면 된다 */
  readonly snapshots: ReadonlyMap<string, Snapshot>
  /** 가장 오래된 기록 날짜 (언제부터 볼 수 있는지 안내용) */
  readonly firstDate: string
  /** 가장 최근 기록 날짜 */
  readonly latestDate: string
}

/** 0시 기록이 늦어져도 6시 전이면 그날 0시 기록으로 본다 (수집기의 SNAPSHOT_CUTOFF_HOUR와 같다) */
const MIDNIGHT_GRACE_HOURS = 6
const HOUR_MS = 3_600_000

const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`
const prevMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), -1))
const nextMonthFirst = (date: string) => firstOfMonth(addDays(firstOfMonth(date), 32))
const yearStart = (year: string | number) => `${year}-01-01`

/** 최신 기록 날짜로 계산에 필요한 기록 날짜들 (중복 없이) */
export function chartSnapshotDates(latest: string): string[] {
  const monthEnd = firstOfMonth(latest)
  const monthStart = prevMonthFirst(monthEnd)
  const year = Number(latest.slice(0, 4))
  return [
    ...new Set([
      latest,
      addDays(latest, -1),
      addDays(latest, -2),
      addDays(latest, -7),
      addDays(latest, -14),
      monthEnd,
      monthStart,
      prevMonthFirst(monthStart),
      // 1월 1일 0시 기록이면 기준일은 전년도 12월 31일이라 전년도 1월 1일도 필요하다
      yearStart(year),
      yearStart(year - 1),
    ]),
  ]
}

/** 그날 0시 무렵에 받은 기록인가. 아니면(낮에 수동으로 남긴 기록) 그 기록이 낀 기간은 일부만 집계된다 */
function isMidnight(s: Snapshot): boolean {
  const at = new Date(s.fetchedAt)
  return kstDate(at) === s.date && kstHour(at) < MIDNIGHT_GRACE_HOURS
}

interface Window {
  readonly start: string
  readonly end: string
}

export function buildChartData(src: ChartSource): MvSnapshot {
  const snap = (date: string) => src.snapshots.get(date)
  const latest = snap(src.latestDate)
  if (!latest) throw new Error(`최신 기록(${src.latestDate})이 없습니다`)

  const L = src.latestDate
  // 0시 5분 기록이면 전날까지의 조회수다. 6시간을 빼서 그 기록이 담은 마지막 날을 구한다
  const asOf = kstDate(new Date(Date.parse(latest.fetchedAt) - MIDNIGHT_GRACE_HOURS * HOUR_MS))
  const year = asOf.slice(0, 4)

  const monthEnd = firstOfMonth(L)
  const monthStart = prevMonthFirst(monthEnd)
  const windows: Record<Exclude<Period, 'year'>, { cur: Window; prev: Window }> = {
    day: { cur: { start: addDays(L, -1), end: L }, prev: { start: addDays(L, -2), end: addDays(L, -1) } },
    week: { cur: { start: addDays(L, -7), end: L }, prev: { start: addDays(L, -14), end: addDays(L, -7) } },
    month: { cur: { start: monthStart, end: monthEnd }, prev: { start: prevMonthFirst(monthStart), end: monthStart } },
  }
  const yearWindow: Window = { start: yearStart(year), end: L }

  const hasWindow = (w: Window) => snap(w.start) !== undefined && snap(w.end) !== undefined

  /** 기간 조회수. 알 수 없으면 null */
  function viewsIn(w: Window, e: RegistryEntry, { requireStart }: { requireStart: boolean }): number | null {
    const end = snap(w.end)?.views[e.yt]
    if (end === undefined) return null
    const start = snap(w.start)
    if (!start && requireStart) return null
    const begin = start?.views[e.yt]
    if (begin !== undefined) return Math.max(0, end - begin)
    // 시작 기록에 없던 곡: 기간 안에 공개됐으면 누적값이 전부 이 기간 조회수다
    return e.released >= w.start ? end : null
  }

  const entries = src.registry.filter((e) => !e.hidden && latest.views[e.yt] !== undefined)

  /** 기간 안 순위 (yt → 순위). 기록이 없는 기간이면 빈 Map */
  function ranksIn(w: Window): Map<string, number> {
    if (!hasWindow(w)) return new Map()
    return new Map(
      entries
        .flatMap((e) => {
          const v = viewsIn(w, e, { requireStart: true })
          return v === null ? [] : [{ yt: e.yt, v }]
        })
        .toSorted((a, b) => b.v - a.v)
        .map(({ yt }, i) => [yt, i + 1]),
    )
  }

  const prevRanks = {
    day: ranksIn(windows.day.prev),
    week: ranksIn(windows.week.prev),
    month: ranksIn(windows.month.prev),
  }
  const typeOf = new Map(src.artists.map((a) => [a.name, a.type]))
  const periodViews = (p: keyof typeof windows, e: RegistryEntry) =>
    hasWindow(windows[p].cur) ? viewsIn(windows[p].cur, e, { requireStart: true }) : null

  const mvs: Mv[] = entries.map((e) => ({
    yt: e.yt,
    title: e.title,
    artist: e.artist,
    type: typeOf.get(e.artist) ?? null,
    released: e.released,
    total: latest.views[e.yt],
    day: periodViews('day', e),
    week: periodViews('week', e),
    month: periodViews('month', e),
    // 1월 1일 기록이 없으면 올해 공개곡만 알 수 있다 (공개 전 조회수 0)
    yearViews: viewsIn(yearWindow, e, { requireStart: false }),
    prevD: prevRanks.day.get(e.yt) ?? null,
    prevW: prevRanks.week.get(e.yt) ?? null,
    prevM: prevRanks.month.get(e.yt) ?? null,
  }))

  const partial = (w: Window) => [snap(w.start), snap(w.end)].some((s) => s !== undefined && !isMidnight(s))
  const PARTIAL_NOTE = '0시가 아닌 시각에 남긴 기록이 섞여 있어 기간의 일부만 집계했어요'
  const firstMonth = src.firstDate.endsWith('-01') ? src.firstDate : nextMonthFirst(src.firstDate)
  const availableFrom = {
    day: addDays(src.firstDate, 1),
    week: addDays(src.firstDate, 7),
    month: nextMonthFirst(firstMonth),
  }

  const info = (key: keyof typeof windows, label: string, range: string): PeriodInfo => {
    const { cur, prev } = windows[key]
    const available = hasWindow(cur)
    return {
      key,
      name: PERIOD_NAMES[key],
      label,
      range,
      year,
      available,
      // 기록이 중간에 빠져 영영 못 채우는 기간이면 null
      availableFrom: available || availableFrom[key] <= L ? null : availableFrom[key],
      note: available && partial(cur) ? PARTIAL_NOTE : null,
      hasPrev: hasWindow(prev),
    }
  }

  const weekFrom = addDays(asOf, -6)
  const monthOf = monthStart
  const monthLast = addDays(monthEnd, -1)
  // 연간은 기준일까지 늘어난 조회수라 끝 기록의 시각은 따지지 않는다
  function yearNote(): string | null {
    const start = snap(yearWindow.start)
    if (!start) return `${year}년 1월 1일 기록이 없어 ${year}년에 공개된 곡만 집계했어요`
    return isMidnight(start) ? null : PARTIAL_NOTE
  }

  const periods: Record<Period, PeriodInfo> = {
    day: info('day', md(asOf), `${y(asOf)} ${md(asOf)} (${weekday(asOf)})`),
    week: info('week', `${y(asOf)} ${isoWeek(asOf)}주차`, `${y(asOf)} ${isoWeek(asOf)}주차 (${md(weekFrom)} ~ ${md(asOf)})`),
    month: info('month', ym(monthOf), `${ym(monthOf)} (${md(monthOf)} ~ ${md(monthLast)})`),
    year: {
      key: 'year',
      name: PERIOD_NAMES.year,
      label: y(asOf),
      range: `${y(asOf)} (1월 1일 ~ ${md(asOf)})`,
      year,
      available: true,
      availableFrom: null,
      note: yearNote(),
      hasPrev: false,
    },
  }

  return { asOf, mvs, periods }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const parts = (date: string) => date.split('-').map(Number)
const y = (date: string) => `${parts(date)[0]}년`
const md = (date: string) => `${parts(date)[1]}월 ${parts(date)[2]}일`
const ym = (date: string) => `${parts(date)[0]}년 ${parts(date)[1]}월`
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]

/** ISO 주차 (월요일 시작, 그 해 첫 목요일이 든 주가 1주차) */
export function isoWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`)
  const thursday = new Date(d.getTime() + (4 - (d.getUTCDay() || 7)) * 86_400_000)
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.ceil(((thursday.getTime() - jan1) / 86_400_000 + 1) / 7)
}
