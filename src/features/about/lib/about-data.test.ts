import { describe, expect, it } from 'vitest'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartBook } from '@/features/mv/lib/chart-book'
import type { ChartSource } from '@/features/mv/lib/chart-data'
import { buildAboutData } from './about-data'

const entry = (yt: string, released: string): RegistryEntry => ({
  yt,
  title: `song-${yt}`,
  artist: 'ILLIT',
  released,
  addedAt: '2026-11-22',
  source: 'seed',
})

const midnight = (date: string, views: Record<string, number>): Snapshot => ({
  date,
  fetchedAt: `${date}T00:05:00+09:00`,
  views,
  missing: [],
})

function bookOf(snapshots: Snapshot[], registry: RegistryEntry[]) {
  const dates = snapshots.map((s) => s.date).toSorted()
  const src: ChartSource = {
    registry,
    artists: [],
    snapshots: new Map(snapshots.map((s) => [s.date, s])),
    firstDate: dates[0],
    latestDate: dates.at(-1)!,
  }
  return buildChartBook(src)
}

const REGISTRY = [entry('a', '2026-04-30'), entry('b', '2026-09-04'), entry('old', '2012-07-15')]

/** 모든 곡의 누적 조회수 (getMvSnapshot의 mvs에서 쓰는 값만) */
const mvs = [
  { yt: 'a', title: 'song-a', artist: 'ILLIT', total: 500 },
  { yt: 'b', title: 'song-b', artist: 'LISA', total: 900 },
  { yt: 'old', title: 'song-old', artist: 'PSY', total: 9000 },
]

describe('buildAboutData', () => {
  it('기록이 하나뿐일 때: 올해 공개곡 순위, 모든 곡 누적 순위, 첫 기록부터 7일, 집계 중인 기간을 담는다', () => {
    const book = bookOf([midnight('2026-11-22', { a: 500, b: 900, old: 9000 })], REGISTRY)
    const data = buildAboutData(book, mvs)

    expect(data.asOf).toBe('2026-11-21')
    expect(data.year).toBe('2026')
    expect(data.firstRecord).toBe('2026-11-22')
    expect(data.recordCount).toBe(1)
    // 올해 공개곡은 연간 차트 순서 (old는 2012년 곡이라 빠진다)
    expect(data.yearTop.map((m) => m.yt)).toEqual(['b', 'a'])
    expect(data.yearTop[0]).toEqual({ yt: 'b', title: 'song-b', artist: 'ILLIT', views: 900 })
    expect(data.allTimeTop.map((m) => [m.yt, m.views])).toEqual([
      ['old', 9000],
      ['b', 900],
      ['a', 500],
    ])
    expect(data.firstWeek).toEqual([
      { date: '2026-11-22', label: '11/22', state: 'recorded' },
      { date: '2026-11-23', label: '11/23', state: 'upcoming' },
      { date: '2026-11-24', label: '11/24', state: 'upcoming' },
      { date: '2026-11-25', label: '11/25', state: 'upcoming' },
      { date: '2026-11-26', label: '11/26', state: 'upcoming' },
      { date: '2026-11-27', label: '11/27', state: 'upcoming' },
      { date: '2026-11-28', label: '11/28', state: 'upcoming' },
    ])

    const byPeriod = Object.fromEntries(data.periods.map((p) => [p.period, p]))
    expect(data.periods.map((p) => p.name)).toEqual(['일간', '주간', '월간', '연간'])
    expect(byPeriod.day).toMatchObject({ open: false, status: '2026년 11월 23일부터 볼 수 있어요' })
    expect(byPeriod.week).toMatchObject({ open: false, status: '2026년 11월 30일부터 볼 수 있어요' })
    expect(byPeriod.year).toMatchObject({ open: true, status: '지금 볼 수 있는 차트: 2026년' })
  })

  it('열린 기간은 가장 최근 차트를 알려주고, 막대 길이는 1월 1일부터 기준일까지 중 그 기간이 차지하는 비율이다', () => {
    const snaps: Snapshot[] = []
    for (let d = 16; d <= 24; d++) snaps.push(midnight(`2026-11-${d}`, { a: d * 10 }))
    const data = buildAboutData(bookOf(snaps, [entry('a', '2026-01-01')]), [{ yt: 'a', title: 'song-a', artist: 'ILLIT', total: 240 }])

    const byPeriod = Object.fromEntries(data.periods.map((p) => [p.period, p]))
    expect(data.asOf).toBe('2026-11-23')
    expect(byPeriod.day).toMatchObject({ open: true, status: '지금 볼 수 있는 차트: 2026년 11월 23일 (월)' })
    expect(byPeriod.week).toMatchObject({ open: true, status: '지금 볼 수 있는 차트: 2026년 47주차 (11월 16일 ~ 11월 22일)' })
    // 11월 23일은 올해 327번째 날
    expect(byPeriod.day.span).toBeCloseTo((1 / 327) * 100)
    expect(byPeriod.week.span).toBeCloseTo((7 / 327) * 100)
    expect(byPeriod.month.span).toBeCloseTo((23 / 327) * 100)
    expect(byPeriod.year.span).toBe(100)
    expect(data.recordCount).toBe(9)
  })

  it('첫 기록부터 7일 중 최신 기록보다 앞인데 기록이 없는 날은 빠진 날이다', () => {
    const book = bookOf([midnight('2026-11-22', { a: 1 }), midnight('2026-11-24', { a: 2 })], [entry('a', '2026-01-01')])
    const data = buildAboutData(book, [{ yt: 'a', title: 'song-a', artist: 'ILLIT', total: 2 }])
    expect(data.firstWeek.slice(0, 4).map((d) => d.state)).toEqual(['recorded', 'missed', 'recorded', 'upcoming'])
    expect(data.recordCount).toBe(2)
  })

  it('보여줄 곡 수를 정할 수 있다', () => {
    const book = bookOf([midnight('2026-11-22', { a: 500, b: 900, old: 9000 })], REGISTRY)
    const data = buildAboutData(book, mvs, { count: 1 })
    expect(data.yearTop).toHaveLength(1)
    expect(data.allTimeTop).toHaveLength(1)
  })
})
