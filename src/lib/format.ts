const numberFormat = new Intl.NumberFormat('ko-KR')

/** 241490802 → "241,490,802" */
export function formatNumber(n: number): string {
  return numberFormat.format(n)
}

/**
 * 큰 수를 만/억 단위로 줄여 쓴다. 157만, 2.10억, 27.67억
 * 억 단위는 반올림하지 않고 소수 둘째 자리에서 자른다.
 */
export function formatShort(n: number): string {
  if (n >= 1e8) {
    // 정수로 계산해 부동소수점 오차로 자릿수가 밀리지 않게 한다. (1억의 1/100 = 100만)
    const hundredths = Math.floor(n / 1e6)
    const whole = Math.floor(hundredths / 100)
    const fraction = String(hundredths % 100).padStart(2, '0')
    return `${formatNumber(whole)}.${fraction}억`
  }
  if (n >= 1e4) return `${formatNumber(Math.round(n / 1e4))}만`
  return formatNumber(n)
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * 서버가 준 기준일 "2026-11-20" → "2026년 11월 20일".
 * Date로 바꾸지 않고 글자만 나눠, 보는 사람의 시간대에 따라 날짜가 밀리지 않게 한다.
 */
export function formatDateKo(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new Error(`날짜 형식이 YYYY-MM-DD가 아닙니다: "${isoDate}"`)
  const [, year, month, day] = match
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}
