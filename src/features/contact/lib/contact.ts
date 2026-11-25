/**
 * 문의 페이지의 받는 주소와 문의 종류.
 *
 * 사이트가 정적 파일(GitHub Pages)이라 폼 내용을 받아 줄 서버가 없다.
 * 발송 방법을 정하기 전까지는 보내기를 누르면 내용을 채운 메일 앱을 연다(mailto).
 */

/** 받는 메일 주소. 공식 메일이 아직 없어 운영자 개인 메일을 쓴다. 도메인 메일을 만들면 바꾼다 */
export const CONTACT_EMAIL = 'jsca5253@gmail.com'

export type TopicId = 'add' | 'fix' | 'biz' | 'etc'

export interface Topic {
  readonly id: TopicId
  /** 카드 제목, 메일 제목 */
  readonly label: string
  /** 카드 아래 한 줄 */
  readonly short: string
  /** 카드 귀퉁이의 큰 글자 */
  readonly icon: string
  /** 폼 위 제목과 설명 */
  readonly title: string
  readonly submit: string
  /** 메일 앱을 연 뒤에 보여줄 그림 글자와 한 줄 */
  readonly doneIcon: string
  readonly doneNote: string
}

export const TOPICS: readonly Topic[] = [
  {
    id: 'add',
    label: '곡 추가 요청',
    short: '이 MV도 넣어 주세요',
    icon: '＋',
    title: '이 뮤직비디오도 차트에 넣어 주세요',
    submit: '요청하기',
    doneIcon: '🎬',
    doneNote: '확인되면 다음 날 0시 기록부터 들어가요.',
  },
  {
    id: 'fix',
    label: '정보 오류',
    short: '순위나 정보가 이상해요',
    icon: '!',
    title: '정보가 이상해요',
    submit: '알려주기',
    doneIcon: '🔍',
    doneNote: '고치면 차트에 바로 반영돼요.',
  },
  {
    id: 'biz',
    label: '제휴·광고',
    short: '함께 일하고 싶어요',
    icon: '✦',
    title: '함께 일하고 싶어요',
    submit: '제안 보내기',
    doneIcon: '🤝',
    doneNote: '2~3일 안에 메일로 답장 드릴게요.',
  },
  {
    id: 'etc',
    label: '기타',
    short: '의견, 응원, 질문',
    icon: '…',
    title: '어떤 이야기든 좋아요',
    submit: '보내기',
    doneIcon: '💌',
    doneNote: '하나하나 다 읽어요. 고마워요!',
  },
]

/** 폼 항목들 → 메일 본문. 빈칸은 뺀다 */
export function mailBody(fields: readonly (readonly [name: string, value: string])[]): string {
  return fields
    .filter(([, value]) => value.trim() !== '')
    .map(([name, value]) => `[${name}]\n${value.trim()}`)
    .join('\n\n')
}

/**
 * 메일 앱을 여는 mailto 주소.
 * URLSearchParams는 공백을 +로 바꾸는데, 메일 앱은 +를 그대로 보여주므로 encodeURIComponent로 적는다.
 */
export function buildMailto({
  to,
  topic,
  fields,
}: {
  to: string
  topic: string
  fields: readonly (readonly [name: string, value: string])[]
}): string {
  const subject = encodeURIComponent(`[우리의차트] ${topic}`)
  const body = encodeURIComponent(mailBody(fields))
  return `mailto:${to}?subject=${subject}&body=${body}`
}
