import { describe, expect, it } from 'vitest'
import { RELEASED_PARAM, parseReleaseYear, scopeQuery } from './scope'

const YEARS = ['2026', '2025', '2024']

describe('parseReleaseYear', () => {
  it('목록에 있는 연도면 그 연도를 돌려준다', () => {
    expect(parseReleaseYear('2025', YEARS)).toBe('2025')
  })

  it('값이 없거나 목록에 없는 연도면 null (= 누적)', () => {
    expect(parseReleaseYear(null, YEARS)).toBeNull()
    expect(parseReleaseYear('', YEARS)).toBeNull()
    expect(parseReleaseYear('1999', YEARS)).toBeNull()
    expect(parseReleaseYear('abc', YEARS)).toBeNull()
  })
})

describe('scopeQuery', () => {
  it('누적이면 빈 문자열', () => {
    expect(scopeQuery(null)).toBe('')
  })

  it('공개연도면 ?released=연도', () => {
    expect(scopeQuery('2025')).toBe(`?${RELEASED_PARAM}=2025`)
  })
})
