import { describe, expect, it } from 'vitest'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartData, chartSnapshotDates, type ChartSource } from './chart-data'

const entry = (yt: string, released: string, extra: Partial<RegistryEntry> = {}): RegistryEntry => ({
  yt,
  title: `song-${yt}`,
  artist: 'ILLIT',
  released,
  addedAt: '2026-11-22',
  source: 'seed',
  ...extra,
})

/** 0시 5분에 받은 기록 */
const midnight = (date: string, views: Record<string, number>): Snapshot => ({
  date,
  fetchedAt: `${date}T00:05:00+09:00`,
  views,
  missing: [],
})

function source(snapshots: Snapshot[], registry: RegistryEntry[], extra: Partial<ChartSource> = {}): ChartSource {
  const dates = snapshots.map((s) => s.date).toSorted()
  return {
    registry,
    snapshots: new Map(snapshots.map((s) => [s.date, s])),
    firstDate: dates[0],
    latestDate: dates.at(-1)!,
    ...extra,
  }
}

describe('buildChartData', () => {
  it('기록이 낮에 남긴 하나뿐이면 누적·올해 공개곡 연간만 보여주고, 나머지 기간은 집계 중이다', () => {
    const today: Snapshot = { date: '2026-11-22', fetchedAt: '2026-11-22T09:15:02+09:00', views: { new: 500, old: 9000, gone: 1 }, missing: [] }
    const registry = [
      entry('new', '2026-04-30'),
      entry('old', '2024-10-18', { artist: 'NEWGRP' }),
      entry('hid', '2026-01-01', { hidden: true }),
      entry('nodata', '2026-01-01'),
    ]

    const data = buildChartData(source([today], [...registry, entry('gone', '2026-02-02', { hidden: true })]))

    expect(data.asOf).toBe('2026-11-22')
    // 숨긴 곡, 조회수를 못 받은 곡은 뺀다
    expect(data.mvs.map((m) => [m.yt, m.total])).toEqual([
      ['new', 500],
      ['old', 9000],
    ])
    // 올해 공개곡은 올해 조회수 = 누적. 그 전 공개곡은 1월 1일 기록이 없어 알 수 없다
    expect(data.mvs.map((m) => [m.yt, m.yearViews, m.day, m.week, m.month])).toEqual([
      ['new', 500, null, null, null],
      ['old', null, null, null, null],
    ])
    expect(data.periods.day).toMatchObject({ available: false, availableFrom: '2026-11-23', label: '11월 22일' })
    expect(data.periods.week).toMatchObject({ available: false, availableFrom: '2026-11-29' })
    expect(data.periods.month).toMatchObject({ available: false, availableFrom: '2027-01-01' })
    expect(data.periods.year).toMatchObject({ available: true, label: '2026년', range: '2026년' })
    expect(data.periods.year.note).toBeNull()
  })

  it('0시 기록이 이어지면 두 기록의 차이로 일간 조회수를 내고, 전날 순위와 비교한다', () => {
    const data = buildChartData(
      source(
        [
          midnight('2026-11-21', { a: 100, b: 100 }),
          midnight('2026-11-22', { a: 110, b: 130 }), // 11/21: a +10, b +30
          midnight('2026-11-23', { a: 160, b: 150 }), // 11/22: a +50, b +20
        ],
        [entry('a', '2025-01-01'), entry('b', '2025-01-01')],
      ),
    )

    expect(data.asOf).toBe('2026-11-22')
    expect(data.mvs.map((m) => [m.yt, m.day, m.prevD])).toEqual([
      ['a', 50, 2],
      ['b', 20, 1],
    ])
    expect(data.periods.day).toMatchObject({
      available: true,
      hasPrev: true,
      note: null,
      label: '11월 22일',
      range: '2026년 11월 22일 (일)',
    })
  })

  it('기간 중에 들어온 곡은 그 기간 안에 공개됐을 때만 누적값을 그 기간 조회수로 쓴다', () => {
    const data = buildChartData(
      source(
        [midnight('2026-11-22', { a: 100 }), midnight('2026-11-23', { a: 150, fresh: 70, late: 999 })],
        [entry('a', '2025-01-01'), entry('fresh', '2026-11-22'), entry('late', '2026-10-01')],
      ),
    )

    expect(data.mvs.map((m) => [m.yt, m.day])).toEqual([
      ['a', 50],
      ['fresh', 70],
      ['late', null],
    ])
  })

  it('0시가 아닌 시각의 기록이 끼면 부분 집계라고 알린다', () => {
    const data = buildChartData(
      source(
        [{ date: '2026-11-22', fetchedAt: '2026-11-22T09:15:02+09:00', views: { a: 100 }, missing: [] }, midnight('2026-11-23', { a: 150 })],
        [entry('a', '2025-01-01')],
      ),
    )

    expect(data.periods.day.available).toBe(true)
    expect(data.periods.day.hasPrev).toBe(false)
    expect(data.periods.day.note).toContain('일부')
  })

  it('0시 대신 쓰기로 한 기록(asMidnight)은 0시 기록으로 본다: 기준일은 전날, 부분 집계 안내도 없다', () => {
    const late: Snapshot = { date: '2026-11-22', fetchedAt: '2026-11-22T15:30:00+09:00', views: { a: 100 }, missing: [], asMidnight: true }

    const today = buildChartData(source([late], [entry('a', '2025-01-01')]))
    expect(today.asOf).toBe('2026-11-21')
    expect(today.periods.year.range).toBe('2026년')

    const tomorrow = buildChartData(source([late, midnight('2026-11-23', { a: 150 })], [entry('a', '2025-01-01')]))
    expect(tomorrow.asOf).toBe('2026-11-22')
    expect(tomorrow.periods.day).toMatchObject({ available: true, note: null, label: '11월 22일' })
    expect(tomorrow.mvs[0].day).toBe(50)
  })

  it('조회수가 줄어든 것으로 나오면(유튜브 보정) 0으로 본다', () => {
    const data = buildChartData(source([midnight('2026-11-22', { a: 100 }), midnight('2026-11-23', { a: 90 })], [entry('a', '2025-01-01')]))
    expect(data.mvs[0].day).toBe(0)
  })

  it('주간은 최근 7일, 월간은 지난달 1일부터 말일까지, 연간은 1월 1일 기록과의 차이다', () => {
    const data = buildChartData(
      source(
        [
          midnight('2026-01-01', { a: 1_000 }),
          midnight('2026-10-01', { a: 5_000 }),
          midnight('2026-11-01', { a: 8_000 }),
          midnight('2026-11-16', { a: 9_000 }),
          midnight('2026-11-22', { a: 9_500 }),
          midnight('2026-11-23', { a: 9_600 }),
        ],
        [entry('a', '2025-01-01')],
      ),
    )

    expect(data.mvs[0]).toMatchObject({ week: 600, month: 3_000, yearViews: 8_600, prevW: null })
    expect(data.periods.week).toMatchObject({ label: '2026년 47주차', range: '2026년 47주차 (11월 16일 ~ 11월 22일)', hasPrev: false })
    expect(data.periods.month).toMatchObject({ label: '2026년 10월', range: '2026년 10월', hasPrev: false })
    expect(data.periods.year.note).toBeNull()
  })
})

describe('chartSnapshotDates', () => {
  it('최신 기록 날짜로 계산에 필요한 기록 날짜를 모은다', () => {
    expect(chartSnapshotDates('2026-11-23')).toEqual([
      '2026-11-23',
      '2026-11-22',
      '2026-11-21',
      '2026-11-16',
      '2026-11-09',
      '2026-11-01',
      '2026-10-01',
      '2026-09-01',
      '2026-01-01',
      '2025-01-01',
    ])
  })
})
