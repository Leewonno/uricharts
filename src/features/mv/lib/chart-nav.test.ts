import { describe, expect, it } from 'vitest'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartBook } from './chart-book'
import { chartNav } from './chart-nav'

const entry = (yt: string, released: string): RegistryEntry => ({ yt, title: yt, artist: 'X', released, addedAt: '2026-11-22', source: 'seed' })

/** 2026-12-01, 2026-12-21 ~ 2027-01-12 매일 0시 기록. 지난해 곡 a는 1월 1일 기록까지, 새해 곡 n은 1월 2일 기록부터 */
function book() {
  const snapshots = new Map<string, Snapshot>()
  for (let t = Date.UTC(2026, 11, 21), i = 0; t <= Date.UTC(2027, 0, 12); t += 86_400_000, i++) {
    const date = new Date(t).toISOString().slice(0, 10)
    const views = { ...(date <= '2027-01-01' ? { a: 1000 + i } : {}), ...(date >= '2027-01-02' ? { n: 100 + i } : {}) }
    snapshots.set(date, { date, fetchedAt: `${date}T00:05:00+09:00`, views, missing: [] })
  }
  // 12월 월간이 생기게 12월 1일 기록도 하나 둔다
  snapshots.set('2026-12-01', { date: '2026-12-01', fetchedAt: '2026-12-01T00:05:00+09:00', views: { a: 900 }, missing: [] })
  return buildChartBook({ registry: [entry('a', '2026-03-03'), entry('n', '2027-01-01')], snapshots, firstDate: '2026-12-01', latestDate: '2027-01-12' })
}

describe('chartNav', () => {
  it('연도 목록은 최근 해부터, 가장 최근 해는 기본 주소이고 지난해는 그 해의 최근 기간으로 간다', () => {
    const b = book()
    const nav = chartNav(b, b.view('week', '2026-W52')!)

    expect(nav.years).toEqual([
      { year: '2027', inProgress: true, href: '/mv/chart/week', current: false },
      { year: '2026', inProgress: false, href: '/mv/chart/week/2026-W53', current: true },
    ])
  })

  it('기간 탭을 눌러도 고른 해에 머문다', () => {
    const b = book()
    const past = chartNav(b, b.view('week', '2026-W52')!)
    expect(past.tabs.map((t) => [t.period, t.href, t.current])).toEqual([
      ['day', '/mv/chart/day/2026-12-31', false],
      ['week', '/mv/chart/week/2026-W53', true],
      ['month', '/mv/chart/month/2026-12', false],
      ['year', '/mv/chart/year/2026', false],
    ])
    expect(chartNav(b, b.view('month')!).tabs.find((t) => t.period === 'month')!.href).toBe('/mv/chart/month')
  })

  it('기간 목록은 보는 해의 것만이고, 기본 차트와 같은 기간은 기본 주소다', () => {
    const b = book()
    const past = chartNav(b, b.view('week', '2026-W52')!)
    expect(past.slots.map((s) => [s.key, s.href])).toEqual([
      ['2026-W53', '/mv/chart/week/2026-W53'],
      ['2026-W52', '/mv/chart/week/2026-W52'],
    ])
    const now = chartNav(b, b.view('week')!)
    expect(now.slots.map((s) => [s.key, s.href])).toEqual([
      ['2027-W02', '/mv/chart/week'],
      ['2027-W01', '/mv/chart/week/2027-W01'],
    ])
  })

  it('마감된 해에서는 다음 해 차트 주소를, 가장 최근 해에서는 null을 준다', () => {
    const b = book()
    expect(chartNav(b, b.view('week', '2026-W52')!).nextYearHref).toBe('/mv/chart/week')
    expect(chartNav(b, b.view('week')!).nextYearHref).toBeNull()
  })
})
