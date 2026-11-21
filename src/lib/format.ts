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
