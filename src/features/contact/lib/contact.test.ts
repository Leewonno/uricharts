import { describe, expect, it } from 'vitest'
import { buildMailto, mailBody } from './contact'

describe('mailBody', () => {
  it('빈칸은 빼고, 항목마다 이름과 내용을 적는다', () => {
    expect(
      mailBody([
        ['차트', '연간'],
        ['순위', ''],
        ['내용', '아티스트 이름이\n틀렸어요'],
        ['답장 받을 메일', '  '],
      ]),
    ).toBe('[차트]\n연간\n\n[내용]\n아티스트 이름이\n틀렸어요')
  })
})

describe('buildMailto', () => {
  it('받는 주소, 문의 종류가 들어간 제목, 본문을 mailto 주소로 만든다', () => {
    const url = new URL(buildMailto({ to: 'hello@uricharts.com', topic: '곡 추가 요청', fields: [['유튜브 주소', 'https://youtu.be/FyS5dAywkEo?a=1&b=2']] }))
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe('hello@uricharts.com')
    expect(url.searchParams.get('subject')).toBe('[우리의차트] 곡 추가 요청')
    expect(url.searchParams.get('body')).toBe('[유튜브 주소]\nhttps://youtu.be/FyS5dAywkEo?a=1&b=2')
  })

  it('공백을 +가 아닌 %20으로 적는다 (메일 앱이 +를 그대로 보여주지 않게)', () => {
    const mailto = buildMailto({ to: 'a@b.c', topic: '그 밖의 이야기', fields: [] })
    expect(mailto).not.toContain('+')
    expect(mailto).toContain('%20')
  })
})
