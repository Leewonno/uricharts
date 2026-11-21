/** 유튜브 영상 페이지 */
export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

/**
 * 유튜브 썸네일 (480×360). 4:3 레터박스 이미지라
 * 16:9 칸에 object-fit: cover로 채우면 위아래 검은 띠가 잘려 나간다.
 */
export const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
