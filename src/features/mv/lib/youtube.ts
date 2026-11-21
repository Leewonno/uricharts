/**
 * 유튜브 썸네일 (480×360). 4:3 레터박스 이미지라
 * 16:9 칸에 object-fit: cover로 채우면 위아래 검은 띠가 잘려 나간다.
 */
export const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

/**
 * iframe에 넣을 유튜브 플레이어 주소.
 * 시청 기록 쿠키를 덜 남기는 youtube-nocookie를 쓰고,
 * 끝난 뒤 추천 영상은 같은 채널 것만 보여준다(rel=0).
 * 모달은 열자마자 재생하고(기본값), 페이지에 바로 넣는 플레이어는 autoplay: false로 누를 때까지 기다린다.
 */
export const embedUrl = (videoId: string, { autoplay = true }: { autoplay?: boolean } = {}) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${autoplay ? 'autoplay=1&' : ''}rel=0`
