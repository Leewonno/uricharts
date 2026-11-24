/**
 * 유튜브 썸네일 (480×360). 4:3 레터박스 이미지라
 * 16:9 칸에 object-fit: cover로 채우면 위아래 검은 띠가 잘려 나간다.
 */
export const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

/**
 * iframe에 넣을 유튜브 플레이어 주소.
 * youtube.com을 써야 보는 사람의 유튜브 로그인이 적용된다(프리미엄이면 광고 없음).
 * youtube-nocookie는 로그인 쿠키를 못 받아 프리미엄 사용자에게도 광고가 나온다.
 * 끝난 뒤 추천 영상은 같은 채널 것만 보여준다(rel=0).
 * 모달은 열자마자 재생하고(기본값), 페이지에 바로 넣는 플레이어는 autoplay: false로 누를 때까지 기다린다.
 */
export const embedUrl = (videoId: string, { autoplay = true }: { autoplay?: boolean } = {}) =>
  `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${autoplay ? 'autoplay=1&' : ''}rel=0`
