import { describe, expect, it } from 'vitest'
import { embedUrl, parseYoutubeId } from './youtube'

describe('embedUrl', () => {
  it('로그인(프리미엄)이 적용되는 youtube.com 주소로, 자동 재생하고 끝나도 다른 채널 영상을 추천하지 않게 한다', () => {
    const url = new URL(embedUrl('FyS5dAywkEo'))
    expect(url.origin).toBe('https://www.youtube.com')
    expect(url.pathname).toBe('/embed/FyS5dAywkEo')
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('rel')).toBe('0')
  })

  it('페이지에 바로 넣는 플레이어는 자동 재생하지 않는다', () => {
    const url = new URL(embedUrl('FyS5dAywkEo', { autoplay: false }))
    expect(url.searchParams.has('autoplay')).toBe(false)
    expect(url.searchParams.get('rel')).toBe('0')
  })

  it('영상 ID를 주소에 안전하게 넣는다', () => {
    expect(new URL(embedUrl('a/b?c')).pathname).toBe('/embed/a%2Fb%3Fc')
  })
})

describe('parseYoutubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=FyS5dAywkEo', 'FyS5dAywkEo'],
    ['https://youtube.com/watch?feature=share&v=FyS5dAywkEo&t=30', 'FyS5dAywkEo'],
    ['https://youtu.be/FyS5dAywkEo?si=abc', 'FyS5dAywkEo'],
    ['https://www.youtube.com/shorts/FyS5dAywkEo', 'FyS5dAywkEo'],
    ['https://www.youtube.com/embed/FyS5dAywkEo', 'FyS5dAywkEo'],
    ['  youtu.be/FyS5dAywkEo  ', 'FyS5dAywkEo'],
  ])('%s → 영상 ID', (url, id) => {
    expect(parseYoutubeId(url)).toBe(id)
  })

  it.each(['', 'https://youtu.be/', 'https://example.com/watch?v=FyS5dAywkEo', 'FyS5dAywkEo', 'https://youtu.be/short'])(
    '%s → 유튜브 영상 주소가 아니면 null',
    (url) => {
      expect(parseYoutubeId(url)).toBeNull()
    },
  )
})
