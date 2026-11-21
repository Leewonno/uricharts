const numberFormat = new Intl.NumberFormat('ko-KR')

/** 241490802 → "241,490,802" */
export function formatNumber(n: number): string {
  return numberFormat.format(n)
}

/** 큰 수를 만/억 단위로 줄여 쓴다. 157만, 2.41억, 27.7억 */
export function formatShort(n: number): string {
  if (n >= 1e8) {
    const digits = n >= 1e9 ? 1 : 2
    const trimmed = (n / 1e8).toFixed(digits).replace(/\.?0+$/, '')
    return `${trimmed}억`
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
