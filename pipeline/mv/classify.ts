/**
 * 유튜브 영상 제목·길이로 "공식 뮤직비디오인지" 판단하고, 제목에서 아티스트와 곡명을 뽑는다.
 * 소속사·유통사마다 제목 형식이 달라서 자주 쓰는 형식들을 규칙으로 처리한다:
 *   ILLIT (아일릿) 'It's Me' Official MV   /  TWICE "THIS IS FOR" M/V
 *   BLACKPINK - 'JUMP' M/V                  /  JENNIE - like JENNIE (Official Video)
 *   [MV] IU(아이유) - Love wins all          /  뷔 (V) 'FRI(END)S' Official MV
 *   TWICE『Wake Me Up』Music Video           /  JO1｜'Love seeker' MV
 */

export interface ParsedTitle {
  readonly artist: string | null
  /** 제목에 같이 적힌 다른 표기 (아일릿, 에스파 등). 아티스트를 찾을 때 같이 본다 */
  readonly aliases: readonly string[]
  readonly song: string | null
}

export type Verdict =
  | ({ readonly kind: 'mv' } & ParsedTitle)
  /** MV가 아니다. 다시 보지 않는다 */
  | { readonly kind: 'reject'; readonly reason: string }
  /** 규칙으로 판단이 안 된다. 사람에게 묻는다 */
  | { readonly kind: 'unsure'; readonly reason: string }
  /** 아직 공개 전이다. 다음 실행 때 다시 본다 */
  | { readonly kind: 'wait'; readonly reason: string }

export interface VideoFacts {
  readonly title: string
  /** 영상 길이(초). 모르면 null */
  readonly durationSec: number | null
  /** 유튜브 snippet.liveBroadcastContent: none | upcoming | live */
  readonly liveBroadcastContent?: string
}

/** 이보다 짧으면 숏츠·티저로 본다 */
const MIN_DURATION_SEC = 90
/** 이보다 길면 MV보다 라이브·모음 영상일 가능성이 커서 사람에게 묻는다 */
const MAX_DURATION_SEC = 15 * 60

/** 팬이 만든 영상. 제목에 MV가 들어 있어도 MV가 아니다 */
const FAN_MADE_PATTERNS: readonly RegExp[] = [
  /(?<![a-z])f\.?\s?\/?\s?m\.?\s?\/?\s?v(?![a-z])/i, // FMV, F/MV, F.MV, F M/V
  /fan[\s-]?made/i,
  /fan[\s-]?(m\/?v|video|edit)/i,
  /팬\s?(메이드|뮤비|영상|mv)/i,
  /unofficial|비공식/i,
  /(?<![a-z])opv(?![a-z])/i,
]

/** 공식 MV 표시. MVP처럼 다른 단어 안의 MV는 세지 않는다 */
const MV_MARKER_PATTERNS: readonly RegExp[] = [
  /(?<![a-z/])m\/?v(?![a-z])/i,
  /official\s+(music\s+)?video/i,
  /music\s+video/i,
  /뮤직\s?비디오|뮤비/,
]

/** MV가 아닌 영상(티저, 비하인드, 리액션, 재업로드 등). 곡명을 뺀 나머지 제목에서 찾는다 */
const NOT_MV_PATTERNS: readonly RegExp[] = [
  /teaser|trailer|티저|예고/i,
  /preview|spoiler|highlight\s+medley|하이라이트\s?메들리/i,
  /behind|비하인드/i,
  /making|메이킹|shooting|촬영/i,
  /(?<![a-z])react(s|ing|ion)?(?![a-z])|rea(cci[oó]n|ç[aã]o)|리액션|반응/i, // 스페인어·포르투갈어 리액션도
  /review|리뷰|해석|분석|explain|commentary|코멘터리/i,
  /practice|안무|choreograph/i,
  /performance|퍼포먼스/i,
  /dance\s+(ver|video|break|cover)/i,
  /(?<![a-z])live(?![a-z])|라이브/i,
  /stage|무대|직캠|fancam/i,
  /lyric|가사/i,
  /visuali[sz]er/i,
  /(?<![a-z])audio(?![a-z])/i,
  /karaoke|instrumental|(?<![a-z])inst(?![a-z])|노래방/i,
  /(?<![a-z])cover(?![a-z])|커버/i,
  /shorts|쇼츠/i,
  /challenge|챌린지/i,
  /concept\s+(film|trailer)|콘셉트\s?필름/i,
  /sped\s?up|slowed|nightcore|8d\s+audio|mashup|매시업|parody|패러디/i,
  /(?<![a-z])reversed?(?![a-z])|역재생/i,
  /episode|(?<![a-z])ep\.?\s?\d|vlog|브이로그|interview|인터뷰/i,
  /showcase|쇼케이스|comeback\s+show/i,
  /color\s+coded|(?<![a-z])sub(title)?s?(?![a-z])|자막/i,
]

export function classifyVideo({ title, durationSec, liveBroadcastContent }: VideoFacts): Verdict {
  if (liveBroadcastContent === 'upcoming' || liveBroadcastContent === 'live') {
    return { kind: 'wait', reason: 'not-yet-public' }
  }
  if (FAN_MADE_PATTERNS.some((p) => p.test(title))) return { kind: 'reject', reason: 'fan-made' }
  if (!MV_MARKER_PATTERNS.some((p) => p.test(title))) return { kind: 'reject', reason: 'no-mv-marker' }

  const parsed = parseMvTitle(title)
  // 곡명에 든 단어(Live My Life, Making Movies 등)로 잘못 빼지 않도록 곡명은 지우고 검사한다
  const rest = parsed.song ? title.replace(parsed.song, ' ') : title
  if (NOT_MV_PATTERNS.some((p) => p.test(rest))) return { kind: 'reject', reason: 'not-mv-content' }

  if (durationSec === null) return { kind: 'unsure', reason: 'unknown-duration' }
  if (durationSec < MIN_DURATION_SEC) return { kind: 'reject', reason: 'too-short' }
  if (durationSec > MAX_DURATION_SEC) return { kind: 'unsure', reason: 'too-long' }

  return { kind: 'mv', ...parsed }
}

/** 유튜브 contentDetails.duration (ISO 8601, 예: PT3M25S) → 초 */
export function parseDuration(iso: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso)
  if (!m) return null
  const [, d = '0', h = '0', min = '0', s = '0'] = m
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s)
}

const QUOTE_PAIRS: Readonly<Record<string, string>> = {
  "'": "'",
  '"': '"',
  '‘': '’',
  '“': '”',
  '「': '」',
  '『': '』',
}
/** 일본식 괄호 따옴표는 앞 글자와 붙어 있어도 따옴표다 (TWICE『Wake Me Up』) */
const BRACKET_QUOTES = new Set(['「', '『'])
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
const LEADING_TAGS = /^(\s*[[【][^\]】]*[\]】])+/
const SEPARATORS = [' - ', ' _ ', ' – ', ' — ', ' | ', '｜']
const EDGE_SEPARATORS = /^[\s\-_–—|｜:·]+|[\s\-_–—|｜:·]+$/g
/** 한글이 든 괄호와 바로 붙은 한글. "(아일릿)", "(여자)아이들" */
const HANGUL_PAREN = /\s*\([^()]*[가-힣][^()]*\)[가-힣]*/g
/** "한글 (Latin)" 형식. 뷔 (V), 아이유(IU), 임영웅 (Lim Young Woong) */
const HANGUL_THEN_LATIN = /^([가-힣][가-힣\s]*?)\s*\(([^()]*[a-z][^()]*)\)$/i
/** 아티스트 뒤에 붙는 발매 정보. "NiziU 2nd Single『CLAP CLAP』" */
const RELEASE_INFO = /\s*(japan(ese)?\s+)?\d+(st|nd|rd|th)\s+(digital\s+|mini\s+|full\s+)?(single|album|ep)\b.*$/i
const MARKER_BRACKET_TAIL = /\s*[([【]([^)\]】]*)[)\]】]\s*$/
const MARKER_WORDS = /m\/?v|video|official|뮤직|뮤비/i
const MARKER_TAIL = /\s*(official\s+)?(music\s+)?(m\/?v|video|뮤직\s?비디오|뮤비)\s*$/i

export function parseMvTitle(title: string): ParsedTitle {
  const quoted = findQuoted(title)
  if (quoted) {
    return { ...cleanArtist(title.slice(0, quoted.start)), song: quoted.text.trim() || null }
  }

  const body = title.replace(LEADING_TAGS, '').trim()
  const sep = SEPARATORS.map((s) => ({ s, i: body.indexOf(s) }))
    .filter(({ i }) => i > 0)
    .toSorted((a, b) => a.i - b.i)[0]
  if (!sep) return { artist: null, aliases: [], song: null }

  return { ...cleanArtist(body.slice(0, sep.i)), song: cleanSong(body.slice(sep.i + sep.s.length)) }
}

/**
 * 따옴표로 감싼 곡명을 찾는다.
 * - 여는 따옴표는 맨 앞이나 글자·숫자가 아닌 문자 뒤에 있어야 한다 (Girls' Generation의 '는 아니다)
 * - 같은 문자로 닫는 따옴표('…', "…")는 뒤에 글자·숫자가 오지 않는 첫 번째 것을 쓴다.
 *   'It's Me'의 It's는 건너뛰고, 'Shut Down' M/V (BLACKPINK's …)에서는 Down 뒤에서 닫는다.
 */
function findQuoted(title: string): { start: number; text: string } | null {
  for (let i = 0; i < title.length; i++) {
    const open = title[i]
    const close = QUOTE_PAIRS[open]
    if (!close) continue
    if (!BRACKET_QUOTES.has(open) && i > 0 && LETTER_OR_DIGIT.test(title[i - 1])) continue

    for (let j = i + 2; j < title.length; j++) {
      if (title[j] !== close) continue
      const next = title[j + 1]
      if (close === open && next !== undefined && LETTER_OR_DIGIT.test(next)) continue
      return { start: i, text: title.slice(i + 1, j) }
    }
  }
  return null
}

/** 괄호 안의 괄호를 나란한 괄호로 편다. "순순희(지환)" 같은 표기를 감싼 "(순순희(지환))" → "(순순희)(지환)" */
function flattenParens(text: string): string {
  let out = text
  for (let prev = ''; prev !== out; ) {
    prev = out
    out = out.replace(/\(([^()]*)\(([^()]*)\)([^()]*)\)/, '($1)($2)($3)').replace(/\(\s*\)/g, '')
  }
  return out
}

function cleanArtist(raw: string): Pick<ParsedTitle, 'artist' | 'aliases'> {
  const base = flattenParens(raw).replace(LEADING_TAGS, '').replace(RELEASE_INFO, '').replace(EDGE_SEPARATORS, '').trim()

  const hangulFirst = HANGUL_THEN_LATIN.exec(base)
  if (hangulFirst) return { artist: hangulFirst[2].trim(), aliases: [hangulFirst[1].trim()] }

  const aliases = [...base.matchAll(HANGUL_PAREN)].map((m) => m[0].trim())
  const tokens = base.replace(HANGUL_PAREN, ' ').split(/\s+/).filter(Boolean)
  // "aespa 에스파"처럼 영문 이름 옆에 붙은 한글 이름은 별칭으로 돌린다. 한글로만 된 이름(아이유)은 그대로 둔다
  const hasLatin = tokens.some((t) => /[a-z]/i.test(t))
  const isHangul = (t: string) => /^[가-힣]+$/.test(t)
  const kept = (hasLatin ? tokens.filter((t) => !isHangul(t)) : tokens)
    // "NCT 127 엔시티 127"에서 한글을 빼면 남는 반복 토큰
    .filter((t, i, all) => i === 0 || t !== all[i - 1])
  const name = kept.join(' ').replace(EDGE_SEPARATORS, '').trim()

  return {
    artist: name || null,
    aliases: [...aliases, ...(hasLatin ? tokens.filter(isHangul) : [])],
  }
}

/** 곡명 중간의 MV 표시. 그 뒤는 곡명이 아니다 ("FIRE (Street Ver.) M/V Reversed!") */
const MV_MARKER_INSIDE = /(?<![a-z/])m\/?v(?![a-z])|official\s+(music\s+)?video|music\s+video|뮤직\s?비디오|뮤비/i
const TRAILING_OPENERS = /[\s([【\-_–—|｜]+$/

function cleanSong(raw: string): string | null {
  let song = raw.trim()
  const marker = MV_MARKER_INSIDE.exec(song)
  if (marker && marker.index > 0) song = song.slice(0, marker.index).replace(TRAILING_OPENERS, '').trim()
  for (;;) {
    const bracket = MARKER_BRACKET_TAIL.exec(song)
    if (bracket && MARKER_WORDS.test(bracket[1])) {
      song = song.slice(0, bracket.index).trim()
      continue
    }
    const next = song.replace(MARKER_TAIL, '').trim()
    if (next === song) break
    song = next
  }
  const withoutHangulParen = song.replace(HANGUL_PAREN, '').trim()
  if (/\p{L}/u.test(withoutHangulParen)) song = withoutHangulParen
  return song || null
}
