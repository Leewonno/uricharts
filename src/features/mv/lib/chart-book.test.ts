import { describe, expect, it } from 'vitest'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartBook, isoWeekOf } from './chart-book'
import type { ChartSource } from './chart-data'

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

function source(snapshots: Snapshot[], registry: RegistryEntry[]): ChartSource {
  const dates = snapshots.map((s) => s.date).toSorted()
  return {
    registry,
    artists: [],
    snapshots: new Map(snapshots.map((s) => [s.date, s])),
    firstDate: dates[0],
    latestDate: dates.at(-1)!,
  }
}

/** from부터 to까지 매일 0시 기록. 조회수는 날마다 perDay씩 는다 */
function daily(from: string, to: string, perDay: Record<string, number>): Snapshot[] {
  const list: Snapshot[] = []
  const start = new Date(`${from}T00:00:00Z`).getTime()
  for (let t = start, n = 0; t <= new Date(`${to}T00:00:00Z`).getTime(); t += 86_400_000, n++) {
    const date = new Date(t).toISOString().slice(0, 10)
    list.push(midnight(date, Object.fromEntries(Object.entries(perDay).map(([yt, v]) => [yt, 1_000 + v * n]))))
  }
  return list
}

const keys = (slots: readonly { key: string }[]) => slots.map((s) => s.key)

describe('buildChartBook', () => {
  it('기록이 하나뿐이면 올해 공개곡 연간만 볼 수 있고, 나머지는 처음 볼 수 있게 될 기간을 집계 중으로 보여준다', () => {
    const book = buildChartBook(
      source([{ date: '2026-11-22', fetchedAt: '2026-11-22T10:35:00+09:00', views: { a: 500, old: 9000 }, missing: [], asMidnight: true }], [
        entry('a', '2026-04-30'),
        entry('old', '2024-10-18'),
      ]),
    )

    expect(book.asOf).toBe('2026-11-21')
    expect(book.slots).toEqual({
      day: [],
      week: [],
      month: [],
      year: [{ key: '2026', label: '2026년', range: null, inProgress: true }],
    })
    expect(book.view('year')).toMatchObject({ available: true, releaseYear: '2026', rows: [{ yt: 'a', views: 500, rank: 1, change: { kind: 'none' } }] })
    expect(book.view('day')).toMatchObject({ available: false, availableFrom: '2026-11-23', slot: { label: '2026년 11월 22일 (일)' }, rows: [] })
    expect(book.view('week')).toMatchObject({ available: false, availableFrom: '2026-11-30', slot: { label: '2026년 48주차', range: null } })
    expect(book.view('month')).toMatchObject({ available: false, availableFrom: '2026-12-02', slot: { label: '2026년 12월', range: null } })
  })

  it('일간은 이어진 두 기록마다, 주간은 끝난 월~일 주마다 고를 수 있다 (최근부터)', () => {
    const book = buildChartBook(source(daily('2026-11-08', '2026-11-24', { a: 10 }), [entry('a', '2026-01-01')]))

    expect(keys(book.slots.day)).toEqual(['2026-11-23', '2026-11-22', '2026-11-21', '2026-11-20', '2026-11-19', '2026-11-18', '2026-11-17', '2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09', '2026-11-08'])
    expect(book.slots.day[0]).toEqual({ key: '2026-11-23', label: '2026년 11월 23일 (월)', range: null, inProgress: false })
    // 11/8(일)부터 기록: 11/9~15, 11/16~22 두 주. 11/23~ 주는 아직 안 끝났다
    expect(book.slots.week).toEqual([
      { key: '2026-W47', label: '2026년 47주차', range: '11월 16일 ~ 11월 22일', inProgress: false },
      { key: '2026-W46', label: '2026년 46주차', range: '11월 9일 ~ 11월 15일', inProgress: false },
    ])
    expect(book.view('week')?.rows[0].views).toBe(70)
    expect(book.recordDates.slice(0, 2)).toEqual(['2026-11-08', '2026-11-09'])
    expect(book.recordDates).toHaveLength(17)
    expect(book.view('week', '2026-W46')?.slot.key).toBe('2026-W46')
    expect(book.view('week', '2026-W40')).toBeNull()
  })

  it('그 기간이 속한 해에 공개된 곡만 순위를 매기고, 직전 기간 순위와 같은 범위 안에서 비교한다', () => {
    const book = buildChartBook(
      source(
        [
          midnight('2026-11-21', { a: 100, b: 100, old: 100 }),
          midnight('2026-11-22', { a: 110, b: 130, old: 500 }), // 11/21: a +10, b +30
          midnight('2026-11-23', { a: 160, b: 150, old: 900 }), // 11/22: a +50, b +20
        ],
        [entry('a', '2026-01-01'), entry('b', '2026-02-01'), entry('old', '2025-05-05'), entry('hid', '2026-01-01', { hidden: true })],
      ),
    )

    const day = book.view('day')!
    expect(day.slot.key).toBe('2026-11-22')
    expect(day.rows).toEqual([
      { yt: 'a', title: 'song-a', artist: 'ILLIT', released: '2026-01-01', rank: 1, views: 50, change: { kind: 'up', amount: 1 } },
      { yt: 'b', title: 'song-b', artist: 'ILLIT', released: '2026-02-01', rank: 2, views: 20, change: { kind: 'down', amount: 1 } },
    ])
    // 첫날은 비교할 전날 기록이 없다
    expect(book.view('day', '2026-11-21')!.rows.map((r) => r.change)).toEqual([{ kind: 'none' }, { kind: 'none' }])
  })

  it('끝난 달과 이번 달(집계 중)을 고를 수 있고, 1일 기록이 없는 달은 뺀다', () => {
    const book = buildChartBook(
      source(
        [midnight('2026-09-15', { a: 0 }), midnight('2026-10-01', { a: 100 }), midnight('2026-11-01', { a: 400 }), midnight('2026-11-24', { a: 1000 })],
        [entry('a', '2026-01-01')],
      ),
    )

    expect(book.slots.month).toEqual([
      { key: '2026-11', label: '2026년 11월', range: '11월 23일까지', inProgress: true },
      { key: '2026-10', label: '2026년 10월', range: null, inProgress: false },
    ])
    expect(book.view('month')!.rows[0]).toMatchObject({ views: 600, change: { kind: 'same' } })
    expect(book.view('month', '2026-10')!.rows[0]).toMatchObject({ views: 300, change: { kind: 'none' } })
  })

  it('해가 바뀌면 지난해는 다음 해 1월 1일 기록까지로 끝나고, 새해 차트는 새해 공개곡만 본다', () => {
    const book = buildChartBook(
      source(
        [midnight('2026-12-30', { a: 100 }), midnight('2027-01-01', { a: 300 }), midnight('2027-01-03', { a: 350, n: 40 })],
        [entry('a', '2026-03-03'), entry('n', '2027-01-02')],
      ),
    )

    expect(book.slots.year).toEqual([
      { key: '2027', label: '2027년', range: null, inProgress: true },
      { key: '2026', label: '2026년', range: null, inProgress: false },
    ])
    expect(book.view('year', '2026')!.rows).toMatchObject([{ yt: 'a', views: 300 }])
    expect(book.view('year', '2027')!.rows).toMatchObject([{ yt: 'n', views: 40 }])
  })

  it('0시가 아닌 시각의 기록이 끼면 부분 집계라고 알린다', () => {
    const book = buildChartBook(
      source(
        [{ date: '2026-11-22', fetchedAt: '2026-11-22T09:15:02+09:00', views: { a: 100 }, missing: [] }, midnight('2026-11-23', { a: 150 })],
        [entry('a', '2026-01-01')],
      ),
    )
    expect(book.view('day')!.note).toContain('일부')
  })
})

describe('isoWeekOf', () => {
  it('연말 연초 주는 목요일이 든 해의 주차다', () => {
    expect(isoWeekOf('2026-11-16')).toEqual({ year: 2026, week: 47 })
    expect(isoWeekOf('2026-12-28')).toEqual({ year: 2026, week: 53 })
    expect(isoWeekOf('2027-01-04')).toEqual({ year: 2027, week: 1 })
    expect(isoWeekOf('2025-12-29')).toEqual({ year: 2026, week: 1 })
  })
})
