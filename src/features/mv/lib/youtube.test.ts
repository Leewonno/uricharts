import { describe, expect, it } from 'vitest'
import { embedUrl } from './youtube'

describe('embedUrl', () => {
  it('쿠키를 덜 쓰는 youtube-nocookie 주소로, 자동 재생하고 끝나도 다른 채널 영상을 추천하지 않게 한다', () => {
    const url = new URL(embedUrl('FyS5dAywkEo'))
    expect(url.origin).toBe('https://www.youtube-nocookie.com')
    expect(url.pathname).toBe('/embed/FyS5dAywkEo')
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('rel')).toBe('0')
  })

  it('영상 ID를 주소에 안전하게 넣는다', () => {
    expect(new URL(embedUrl('a/b?c')).pathname).toBe('/embed/a%2Fb%3Fc')
  })
})
