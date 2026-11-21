import { describe, expect, it } from 'vitest'
import type { Mv } from '../types'
import { dailyAverage, rankMvs, releaseYears } from './ranking'

const mv = (overrides: Partial<Mv>): Mv => ({
  yt: 'id',
  title: 't',
  artist: 'a',
  type: '솔로',
  released: '2026-01-01',
  total: 0,
  day: 0,
  week: 0,
  month: 0,
  yearViews: 0,
  prevD: null,
  prevW: null,
  prevM: null,
  ...overrides,
})

const A = mv({ yt: 'A', title: 'A', released: '2026-03-01', total: 300, day: 10, week: 70, month: 300, yearViews: 300, prevD: 2, prevW: 1, prevM: 1 })
const B = mv({ yt: 'B', title: 'B', released: '2025-05-01', total: 900, day: 30, week: 50, month: 200, yearViews: 400, prevD: 1, prevW: 2, prevM: null })
const C = mv({ yt: 'C', title: 'C', released: '2026-07-01', total: 500, day: 20, week: 90, month: 100, yearViews: 500, prevD: 3, prevW: 3, prevM: 3 })

describe('rankMvs', () => {
  it('기간별 조회수가 많은 순서로 순위를 매기고 views에 그 기간 조회수를 넣는다', () => {
    const ranked = rankMvs([A, B, C], 'day')
    expect(ranked.map((m) => [m.title, m.rank, m.views])).toEqual([
      ['B', 1, 30],
      ['C', 2, 20],
      ['A', 3, 10],
    ])
  })

  it('연간은 공개일과 관계없이 올해 늘어난 조회수(yearViews)로 순위를 매긴다', () => {
    const ranked = rankMvs([A, B, C], 'year')
    expect(ranked.map((m) => [m.title, m.views])).toEqual([
      ['C', 500],
      ['B', 400],
      ['A', 300],
    ])
  })

  it('공개 연도를 주면 그 해에 공개된 곡만 모아 순위를 매긴다', () => {
    expect(rankMvs([A, B, C], 'year', { releaseYear: '2026' }).map((m) => [m.title, m.rank])).toEqual([
      ['C', 1],
      ['A', 2],
    ])
    expect(rankMvs([A, B, C], 'day', { releaseYear: '2025' }).map((m) => [m.title, m.rank])).toEqual([['B', 1]])
  })

  it('이전 순위와 비교해 상승/하락/유지/재진입을 표시한다', () => {
    const changes = Object.fromEntries(rankMvs([A, B, C], 'week').map((m) => [m.title, m.change]))
    // C: 3위 → 1위, A: 1위 → 2위, B: 2위 → 3위
    expect(changes.C).toEqual({ kind: 'up', amount: 2 })
    expect(changes.A).toEqual({ kind: 'down', amount: 1 })
    expect(changes.B).toEqual({ kind: 'down', amount: 1 })

    const monthly = Object.fromEntries(rankMvs([A, B, C], 'month').map((m) => [m.title, m.change]))
    expect(monthly.A).toEqual({ kind: 'same' })
    expect(monthly.B).toEqual({ kind: 'reentry' })
  })

  it('공개 연도로 좁히면 이전 순위도 좁힌 곡들 안에서 다시 매겨 비교한다', () => {
    // 2026년 공개곡만: 이전 주간 순위 A(1) C(3) → A 1위, C 2위. 이번 주는 C 1위, A 2위
    const changes = Object.fromEntries(rankMvs([A, B, C], 'week', { releaseYear: '2026' }).map((m) => [m.title, m.change]))
    expect(changes.C).toEqual({ kind: 'up', amount: 1 })
    expect(changes.A).toEqual({ kind: 'down', amount: 1 })
  })

  it('연간은 순위 변동을 표시하지 않는다', () => {
    expect(rankMvs([A, B, C], 'year').every((m) => m.change.kind === 'none')).toBe(true)
  })

  it('입력 배열을 바꾸지 않는다', () => {
    const input = [A, B, C]
    rankMvs(input, 'day')
    expect(input).toEqual([A, B, C])
  })
})

describe('releaseYears', () => {
  it('곡들의 공개 연도를 중복 없이 최근 연도부터 돌려준다', () => {
    expect(releaseYears([A, B, C])).toEqual(['2026', '2025'])
  })
})

describe('dailyAverage', () => {
  it('누적 조회수를 공개일부터 기준일까지 일수로 나눈다', () => {
    expect(dailyAverage(mv({ released: '2026-11-10', total: 1000 }), '2026-11-20')).toBe(100)
  })

  it('기준일에 공개된 곡은 하루로 친다', () => {
    expect(dailyAverage(mv({ released: '2026-11-20', total: 1000 }), '2026-11-20')).toBe(1000)
  })
})
