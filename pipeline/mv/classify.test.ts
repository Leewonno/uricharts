import { describe, expect, it } from 'vitest'
import { classifyVideo, parseDuration, parseMvTitle } from './classify'

describe('parseMvTitle', () => {
  it.each([
    // HYBE: 아티스트 (한글) '곡' Official MV — 곡명 안의 아포스트로피
    ["ILLIT (아일릿) 'It's Me' Official MV", 'ILLIT', "It's Me"],
    ["BTS (방탄소년단) '2.0' Official MV", 'BTS', '2.0'],
    // SM: 아티스트 한글 '곡' MV
    ["aespa 에스파 'Rich Man' MV", 'aespa', 'Rich Man'],
    ["Hearts2Hearts 하츠투하츠 'RUDE!' MV", 'Hearts2Hearts', 'RUDE!'],
    // JYP: 큰따옴표 + M/V
    ['TWICE "THIS IS FOR" M/V', 'TWICE', 'THIS IS FOR'],
    ['Stray Kids "This & That" M/V', 'Stray Kids', 'This & That'],
    // YG: 아티스트 - '곡' M/V
    ["BABYMONSTER - 'CHOOM' M/V", 'BABYMONSTER', 'CHOOM'],
    ["BLACKPINK - 'JUMP' M/V", 'BLACKPINK', 'JUMP'],
    // 따옴표 없는 형식
    ['JENNIE - like JENNIE (Official Video)', 'JENNIE', 'like JENNIE'],
    ['ROSÉ & Bruno Mars - APT. (Official Music Video)', 'ROSÉ & Bruno Mars', 'APT.'],
    ['PSY - GANGNAM STYLE (강남스타일) M/V', 'PSY', 'GANGNAM STYLE'],
    // 유통사: [MV] 아티스트(한글) _ 곡
    ["[MV] ILLIT(아일릿) _ It's Me", 'ILLIT', "It's Me"],
    ['[MV] IU(아이유) - Love wins all', 'IU', 'Love wins all'],
    // 괄호로 시작하는 아티스트 이름은 지우지 않는다
    ["(G)I-DLE (여자)아이들 'Klaxon' Official Music Video", '(G)I-DLE', 'Klaxon'],
    // 아티스트 이름 안의 아포스트로피는 여는 따옴표가 아니다
    ["Girls' Generation 'FOREVER 1' MV", "Girls' Generation", 'FOREVER 1'],
    // 곡명만 있는 제목 (아티스트 전용 채널)
    ["'Supernova' MV", null, 'Supernova'],
    // 닫는 따옴표 뒤 문장에 's가 있어도 곡명이 늘어나지 않는다
    ["BLACKPINK - 'Shut Down' M/V (BLACKPINK's 'BORN PINK')", 'BLACKPINK', 'Shut Down'],
    // 한글 (영문) 형식은 영문을 이름으로 쓴다
    ["뷔 (V) 'FRI(END)S' Official MV", 'V', 'FRI(END)S'],
    ["지민 (Jimin) 'Who' Official MV", 'Jimin', 'Who'],
    ['[MV] 임영웅 (Lim Young Woong) - 온기', 'Lim Young Woong', '온기'],
    ['[MV] 아이유(IU) _ 에잇(Prod.&Feat. SUGA of BTS)', 'IU', '에잇(Prod.&Feat. SUGA of BTS)'],
    // 한글 이름을 빼고 남은 반복 토큰
    ["NCT 127 엔시티 127 '삐그덕 (Walk)' MV", 'NCT 127', '삐그덕 (Walk)'],
    // 일본 활동곡
    ['TWICE『Wake Me Up』Music Video', 'TWICE', 'Wake Me Up'],
    ['NiziU(니쥬) 2nd Single『CLAP CLAP』MV', 'NiziU', 'CLAP CLAP'],
    ["JO1｜'Love seeker' MV", 'JO1', 'Love seeker'],
    // 괄호 안의 괄호 (실제 1theK 제목)
    ['[MV] YOON JI HWAN(순순희(지환)) _ Still, I Love You(그래도 사랑합니다)', 'YOON JI HWAN', 'Still, I Love You'],
    // 구분자로 쓴 소문자 l (실제 도경수 채널 제목)
    ["도경수(D.O.) l 'Darling' MV", 'D.O.', 'Darling'],
  ])('%s', (title, artist, song) => {
    expect(parseMvTitle(title)).toMatchObject({ artist, song })
  })

  it('제목의 다른 표기를 별칭으로 모은다', () => {
    expect(parseMvTitle("aespa 에스파 'Rich Man' MV").aliases).toEqual(['에스파'])
    expect(parseMvTitle("뷔 (V) 'FRI(END)S' Official MV").aliases).toEqual(['뷔'])
    expect(parseMvTitle("ILLIT (아일릿) 'It's Me' Official MV").aliases).toEqual(['(아일릿)'])
  })
})

describe('parseDuration', () => {
  it.each([
    ['PT3M25S', 205],
    ['PT1H2M3S', 3723],
    ['PT45S', 45],
    ['PT4M', 240],
    ['P0D', 0],
  ])('%s → %d초', (iso, sec) => {
    expect(parseDuration(iso)).toBe(sec)
  })

  it('알 수 없는 형식은 null', () => {
    expect(parseDuration('3:25')).toBeNull()
  })
})

describe('classifyVideo', () => {
  const mv = (title: string, durationSec: number | null = 200) => classifyVideo({ title, durationSec })

  it('공식 MV는 MV로 본다', () => {
    expect(mv("ILLIT (아일릿) 'It's Me' Official MV")).toMatchObject({ kind: 'mv', artist: 'ILLIT', song: "It's Me" })
    expect(mv('ROSÉ & Bruno Mars - APT. (Official Music Video)').kind).toBe('mv')
    expect(mv('아이유 - 홀씨 뮤직비디오').kind).toBe('mv')
  })

  it.each([
    'ILLIT (아일릿) It\'s Me FMV',
    '[FMV] BTS - Spring Day',
    'NewJeans - Ditto F/MV',
    'TWICE "THIS IS FOR" MV (Fan-made)',
    'aespa Rich Man fanmade MV',
    '에스파 Rich Man 팬메이드 뮤비',
    'BLACKPINK - JUMP (Unofficial MV)',
    'Stray Kids OPV',
    'BTS - Spring Day [F.MV]',
  ])('팬이 만든 영상은 MV가 아니다: %s', (title) => {
    expect(mv(title)).toEqual({ kind: 'reject', reason: 'fan-made' })
  })

  it.each([
    "ILLIT (아일릿) 'It's Me' Official MV Teaser",
    "ILLIT (아일릿) 'It's Me' Official Teaser",
    "BTS (방탄소년단) '2.0' MV Making Film",
    "BTS (방탄소년단) '2.0' MV Behind The Scenes",
    "BABYMONSTER - 'CHOOM' M/V REACTION",
    "aespa 에스파 'Rich Man' Dance Practice",
    "aespa 에스파 'Rich Man' MV (Performance Ver.)",
    "TWICE \"THIS IS FOR\" Lyric Video",
    "TWICE \"THIS IS FOR\" Live Clip",
    "LISA - SaWaDiKa (Official Audio)",
    '#shorts ILLIT It\'s Me MV',
    "[MV 비하인드] ILLIT 'It's Me'",
    // 리액션·리뷰·해석·자막 재업로드
    "aespa 'Whiplash' MV Reaction - Korean's first time",
    "aespa 'Whiplash' MV Teaser - aespa's 5th mini album",
    "Reacting to aespa 'Whiplash' MV",
    "aespa 'Whiplash' MV REACT",
    "aespa 'Whiplash' MV Review",
    "에스파 'Whiplash' MV 해석",
    "SEVENTEEN (세븐틴) 'MAESTRO' MV Commentary",
    "BTS 'Butter' Official MV [Sub Español]",
    // 실제로 걸러지지 않았던 제목들
    'ESTAN EN SU MOLE 💗💗 | EMP (ZERO BASE ONE) "RUN" M/V REACCION',
    'NAYEON "BABY ANGEL" M/V | Reação',
    "2NE1 - FIRE (Street Ver.) M/V Reversed!",
  ])('MV가 아닌 영상은 뺀다: %s', (title) => {
    expect(mv(title).kind).toBe('reject')
  })

  it('곡명에 든 단어로 잘못 빼지 않는다', () => {
    expect(mv("aespa 에스파 'Live My Life' MV").kind).toBe('mv')
    expect(mv("SEVENTEEN (세븐틴) 'Making Movies' Official MV").kind).toBe('mv')
  })

  it('MV 표시가 없으면 뺀다', () => {
    expect(mv("ILLIT (아일릿) 'It's Me' Special Clip")).toEqual({ kind: 'reject', reason: 'no-mv-marker' })
    // MVP 같은 단어는 MV 표시가 아니다
    expect(mv('ILLIT MVP 투표 결과').kind).toBe('reject')
  })

  it('너무 짧으면 뺀다 (숏츠)', () => {
    expect(mv("ILLIT (아일릿) 'It's Me' Official MV", 45)).toEqual({ kind: 'reject', reason: 'too-short' })
  })

  it('길이를 모르거나 너무 길면 사람에게 묻는다', () => {
    expect(mv("ILLIT (아일릿) 'It's Me' Official MV", null)).toEqual({ kind: 'unsure', reason: 'unknown-duration' })
    expect(mv("ILLIT (아일릿) 'It's Me' Official MV", 20 * 60)).toEqual({ kind: 'unsure', reason: 'too-long' })
  })

  it('공개 전(프리미어 예정)이거나 생방송 중이면 다음에 다시 본다', () => {
    expect(
      classifyVideo({ title: "ILLIT (아일릿) 'It's Me' Official MV", durationSec: 0, liveBroadcastContent: 'upcoming' }),
    ).toEqual({ kind: 'wait', reason: 'not-yet-public' })
  })
})
