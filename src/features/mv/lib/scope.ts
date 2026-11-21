/**
 * 차트 범위: 누적(모든 곡) 또는 공개연도(그 해에 공개된 곡만).
 * 주소의 ?released=연도 로 들고 다녀서 기간 탭을 옮겨도 유지되게 한다.
 */
export const RELEASED_PARAM = 'released'

/** 주소 값이 고를 수 있는 연도면 그 연도, 아니면 null (= 누적) */
export function parseReleaseYear(value: string | null, years: readonly string[]): string | null {
  return value && years.includes(value) ? value : null
}

/** 범위를 주소 뒤에 붙일 쿼리로. 누적이면 빈 문자열 */
export function scopeQuery(releaseYear: string | null): string {
  return releaseYear ? `?${new URLSearchParams({ [RELEASED_PARAM]: releaseYear })}` : ''
}
