import { describe, expect, it } from 'vitest'
import type { RegistryEntry, Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartBook } from './chart-book'
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
      year: [{ key: '2026', year: '2026', label: '2026년', range: null, inProgress: true }],
    })
    expect(book.years).toEqual([{ year: '2026', closed: false }])
    expect(book.view('year')).toMatchObject({ available: true, closed: false, releaseYear: '2026', rows: [{ yt: 'a', views: 500, total: 500, rank: 1, change: { kind: 'none' } }] })
    expect(book.view('day')).toMatchObject({ available: false, availableFrom: '2026-11-23', slot: { label: '11월 22일 (일)', year: '2026' }, rows: [] })
    expect(book.view('week')).toMatchObject({ available: false, availableFrom: '2026-11-30', slot: { label: '48주차', range: null } })
    // 월간은 끝난 달만: 12월은 2027년 1월 1일 기록이 생겨야 볼 수 있다
    expect(book.view('month')).toMatchObject({ available: false, availableFrom: '2027-01-01', slot: { label: '12월', range: null } })
  })

  it('일간은 이어진 두 기록마다, 주간은 끝난 월~일 주마다 고를 수 있다 (최근부터)', () => {
    const book = buildChartBook(source(daily('2026-11-08', '2026-11-24', { a: 10 }), [entry('a', '2026-01-01')]))

    expect(keys(book.slots.day)).toEqual(['2026-11-23', '2026-11-22', '2026-11-21', '2026-11-20', '2026-11-19', '2026-11-18', '2026-11-17', '2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09', '2026-11-08'])
    expect(book.slots.day[0]).toEqual({ key: '2026-11-23', year: '2026', label: '11월 23일 (월)', range: null, inProgress: false })
    // 11/8(일)부터 기록: 11/9~15, 11/16~22 두 주. 11/23~ 주는 아직 안 끝났다
    expect(book.slots.week).toEqual([
      { key: '2026-W47', year: '2026', label: '47주차', range: '11월 16일(월) ~ 11월 22일(일)', inProgress: false },
      { key: '2026-W46', year: '2026', label: '46주차', range: '11월 9일(월) ~ 11월 15일(일)', inProgress: false },
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
      { yt: 'a', title: 'song-a', artist: 'ILLIT', released: '2026-01-01', rank: 1, views: 50, total: 160, change: { kind: 'up', amount: 1 } },
      { yt: 'b', title: 'song-b', artist: 'ILLIT', released: '2026-02-01', rank: 2, views: 20, total: 150, change: { kind: 'down', amount: 1 } },
    ])
    // 첫날은 비교할 전날 기록이 없다
    expect(book.view('day', '2026-11-21')!.rows.map((r) => r.change)).toEqual([{ kind: 'none' }, { kind: 'none' }])
  })

  it('끝난 달만 고를 수 있고, 1일 기록이 없는 달은 뺀다', () => {
    const book = buildChartBook(
      source(
        [midnight('2026-09-15', { a: 0 }), midnight('2026-10-01', { a: 100 }), midnight('2026-11-01', { a: 400 }), midnight('2026-11-24', { a: 1000 })],
        [entry('a', '2026-01-01')],
      ),
    )

    expect(book.slots.month).toEqual([{ key: '2026-10', year: '2026', label: '10월', range: null, inProgress: false }])
    expect(book.view('month')!.rows[0]).toMatchObject({ views: 300, total: 400, change: { kind: 'none' } })
    expect(book.view('month', '2026-11')).toBeNull()
  })

  it('해가 바뀌면 지난해는 다음 해 1월 1일 기록까지로 끝나고, 새해 차트는 새해 공개곡만 본다', () => {
    const book = buildChartBook(
      source(
        [midnight('2026-12-30', { a: 100 }), midnight('2027-01-01', { a: 300 }), midnight('2027-01-03', { a: 350, n: 40 })],
        [entry('a', '2026-03-03'), entry('n', '2027-01-02')],
      ),
    )

    expect(book.slots.year).toEqual([
      { key: '2027', year: '2027', label: '2027년', range: null, inProgress: true },
      { key: '2026', year: '2026', label: '2026년', range: null, inProgress: false },
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

  it('해가 바뀌는 주는 해에서 자르고, 새해 1주차는 1월 1일이 든 주다', () => {
    // 지난해 곡 a는 1월 1일 기록까지만, 새해 곡 n(1월 1일 공개)은 1월 2일 기록부터 있다
    const snaps = daily('2026-12-21', '2027-01-12', { a: 10, n: 5 }).map((s) => ({
      ...s,
      views: Object.fromEntries(Object.entries(s.views).filter(([yt]) => (yt === 'a' ? s.date <= '2027-01-01' : s.date >= '2027-01-02'))),
    }))
    const book = buildChartBook(source(snaps, [entry('a', '2026-03-03'), entry('n', '2027-01-01')]))

    expect(book.slots.week).toEqual([
      { key: '2027-W02', year: '2027', label: '2주차', range: '1월 4일(월) ~ 1월 10일(일)', inProgress: false },
      { key: '2027-W01', year: '2027', label: '1주차', range: '1월 1일(금) ~ 1월 3일(일) · 3일', inProgress: false },
      { key: '2026-W53', year: '2026', label: '53주차', range: '12월 28일(월) ~ 12월 31일(목) · 4일', inProgress: false },
      { key: '2026-W52', year: '2026', label: '52주차', range: '12월 21일(월) ~ 12월 27일(일)', inProgress: false },
    ])
    // 12/28 기록 1070 → 1/1 기록 1110
    expect(book.view('week', '2026-W53')!.rows).toMatchObject([{ yt: 'a', views: 40, total: 1110 }])
    // 1월 1일 공개곡: 시작 기록(1/1)에 없으니 1/4 기록 값(1070)이 전부 1주차 조회수. 첫 주라 변동 없음
    expect(book.view('week', '2027-W01')!.rows).toEqual([expect.objectContaining({ yt: 'n', views: 1070, change: { kind: 'none' } })])
    expect(book.view('week', '2027-W02')!.rows).toEqual([expect.objectContaining({ yt: 'n', change: { kind: 'same' } })])
    // 1월 1일 일간·1월 월간도 첫 기간이라 변동 없음
    expect(book.view('day', '2027-01-01')!.rows.map((r) => r.change)).toEqual([{ kind: 'none' }])
  })

  it('해 목록은 기준일의 해까지이고, 12월 31일까지 집계된 해는 마감이다', () => {
    const justEnded = buildChartBook(source(daily('2026-12-21', '2027-01-01', { a: 10 }), [entry('a', '2026-03-03')]))
    expect(justEnded.years).toEqual([{ year: '2026', closed: true }])
    expect(justEnded.view('year')).toMatchObject({ closed: true, releaseYear: '2026' })

    const newYear = buildChartBook(source(daily('2026-12-21', '2027-01-05', { a: 10 }), [entry('a', '2026-03-03')]))
    expect(newYear.years).toEqual([
      { year: '2027', closed: false },
      { year: '2026', closed: true },
    ])
    expect(newYear.view('week', '2026-W52')).toMatchObject({ closed: true })
  })

  it('가장 최근 해에 끝난 달이 없으면 기본 월간은 그 해 1월 집계 중이다', () => {
    const book = buildChartBook(
      source(
        [midnight('2026-11-01', { a: 100 }), midnight('2026-12-01', { a: 400 }), midnight('2027-01-01', { a: 900 }), midnight('2027-01-05', { n: 50 })],
        [entry('a', '2026-03-03'), entry('n', '2027-01-02')],
      ),
    )

    expect(keys(book.slots.month)).toEqual(['2026-12', '2026-11'])
    expect(book.view('month')).toMatchObject({ available: false, releaseYear: '2027', slot: { key: '2027-01', year: '2027', label: '1월' }, rows: [] })
    expect(book.view('month', '2026-12')).toMatchObject({ available: true, closed: true, rows: [{ yt: 'a', views: 500, total: 900 }] })
  })

  it('직전 기간에 없던 곡은 이번 기간에 공개됐으면 NEW, 아니면 재진입이다', () => {
    const book = buildChartBook(
      source(
        [
          midnight('2026-11-21', { a: 100 }),
          midnight('2026-11-22', { a: 110, c: 50 }), // c: 예전에 공개됐는데 11/22 기록부터 있음
          midnight('2026-11-23', { a: 160, c: 60, b: 30 }), // b: 11/22 공개
        ],
        [entry('a', '2026-01-01'), entry('b', '2026-11-22'), entry('c', '2026-05-05')],
      ),
    )

    expect(book.view('day', '2026-11-22')!.rows.map((r) => [r.yt, r.change])).toEqual([
      ['a', { kind: 'same' }],
      ['b', { kind: 'new' }],
      ['c', { kind: 'reentry' }],
    ])
  })

  it('시작이나 끝 기록이 빠진 주는 고를 수 없다', () => {
    const book = buildChartBook(source(daily('2026-11-30', '2026-12-21', { a: 10 }).filter((s) => s.date !== '2026-12-07'), [entry('a', '2026-01-01')]))
    expect(keys(book.slots.week)).toEqual(['2026-W51'])
  })
})
