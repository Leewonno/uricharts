/** 수집 기준 시간대는 한국 시간(KST, UTC+9)이다. 서버(Actions)는 UTC로 돈다 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const shift = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS)

/** KST 날짜 YYYY-MM-DD */
export const kstDate = (d: Date): string => shift(d).toISOString().slice(0, 10)

/** KST 시 (0~23) */
export const kstHour = (d: Date): number => shift(d).getUTCHours()

/** KST 요일 (0=일요일) */
export const kstWeekday = (d: Date): number => shift(d).getUTCDay()

/** KST 시각 ISO 문자열. 예: 2026-11-22T00:07:31+09:00 */
export const kstIso = (d: Date): string => `${shift(d).toISOString().slice(0, 19)}+09:00`

/** YYYY-MM-DD 날짜에 n일을 더한다 */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  return new Date(d.getTime() + n * 86_400_000).toISOString().slice(0, 10)
}
