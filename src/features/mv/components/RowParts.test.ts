import { describe, expect, it } from 'vitest'
import { rowLabel } from './RowParts'

const row = { yt: 'x', title: '2.0', artist: 'BTS', released: '2026-04-02', rank: 2, views: 1_182_000, total: 219_088_671 }

describe('rowLabel', () => {
  it('순위·곡·조회수·누적·변동을 읽어 준다', () => {
    expect(rowLabel({ ...row, change: { kind: 'up', amount: 1 } })).toBe('2위 BTS 2.0, 조회수 1,182,000회, 누적 219,088,671회, 1계단 상승. 뮤직비디오 보기')
  })

  it('새로 들어온 곡은 "새로 진입"이라고 읽는다', () => {
    expect(rowLabel({ ...row, change: { kind: 'new' } })).toBe('2위 BTS 2.0, 조회수 1,182,000회, 누적 219,088,671회, 새로 진입. 뮤직비디오 보기')
  })
})
