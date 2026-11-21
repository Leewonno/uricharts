/**
 * 유튜브 썸네일 (480×360). 4:3 레터박스 이미지라
 * 16:9 칸에 object-fit: cover로 채우면 위아래 검은 띠가 잘려 나간다.
 */
export const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

/**
 * 모달 iframe에 넣을 유튜브 플레이어 주소.
 * 시청 기록 쿠키를 덜 남기는 youtube-nocookie를 쓰고, 열자마자 재생하며(autoplay),
 * 끝난 뒤 추천 영상은 같은 채널 것만 보여준다(rel=0).
 */
export const embedUrl = (videoId: string) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`
