import { describe, expect, it } from 'vitest'
import { describeChart } from './periods'

describe('describeChart', () => {
  it('누적이면 전체 K-POP MV의 기간별 조회수 순위라고 쓴다', () => {
    expect(describeChart('day', null)).toBe('K-POP MV 전체 일간 조회수 순위예요.')
    expect(describeChart('year', null)).toBe('K-POP MV 전체 연간 조회수 순위예요.')
  })

  it('공개연도면 그 해에 공개된 K-POP MV의 기간별 조회수 순위라고 쓴다', () => {
    expect(describeChart('day', '2026')).toBe('2026년에 공개된 K-POP MV 일간 조회수 순위예요.')
    expect(describeChart('month', '2024')).toBe('2024년에 공개된 K-POP MV 월간 조회수 순위예요.')
  })
})
