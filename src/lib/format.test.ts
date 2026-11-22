import { describe, expect, it } from 'vitest'
import { formatDateKo, formatNumber, formatShort } from './format'

describe('formatNumber', () => {
  it('천 단위마다 쉼표를 넣는다', () => {
    expect(formatNumber(241490802)).toBe('241,490,802')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatShort', () => {
  it('1만 미만은 그대로 쓴다', () => {
    expect(formatShort(9999)).toBe('9,999')
  })

  it('1만 이상 1억 미만은 만 단위로 반올림한다', () => {
    expect(formatShort(1573000)).toBe('157만')
    expect(formatShort(43500000)).toBe('4,350만')
    expect(formatShort(68297737)).toBe('6,830만')
  })

  it('1억 이상은 반올림하지 않고 소수 둘째 자리에서 자른다 (끝의 0도 쓴다)', () => {
    expect(formatShort(241490802)).toBe('2.41억')
    expect(formatShort(220516909)).toBe('2.20억')
    expect(formatShort(219999999)).toBe('2.19억')
    expect(formatShort(210000000)).toBe('2.10억')
    expect(formatShort(200000000)).toBe('2.00억')
    expect(formatShort(130276403)).toBe('1.30억')
    expect(formatShort(100000000)).toBe('1.00억')
  })

  it('10억 이상도 소수 둘째 자리에서 자른다', () => {
    expect(formatShort(2767419100)).toBe('27.67억')
    expect(formatShort(3000000000)).toBe('30.00억')
    expect(formatShort(10000000000)).toBe('100.00억')
    expect(formatShort(123456789012)).toBe('1,234.56억')
  })
})

describe('formatDateKo', () => {
  it('YYYY-MM-DD 날짜를 "YYYY년 M월 D일"로 쓴다 (앞자리 0은 뺀다)', () => {
    expect(formatDateKo('2026-11-20')).toBe('2026년 11월 20일')
    expect(formatDateKo('2026-01-05')).toBe('2026년 1월 5일')
  })

  it('YYYY-MM-DD 형식이 아니면 오류를 낸다', () => {
    expect(() => formatDateKo('2026/11/20')).toThrow()
    expect(() => formatDateKo('')).toThrow()
  })
})
