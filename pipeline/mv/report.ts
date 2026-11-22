import type { DiscoverResult } from './discover'
import type { Artist, RegistryEntry } from './schema'

/**
 * GitHub 이슈 본문. 매일 실행 결과 중 사람이 봐야 할 것이 있을 때만 만든다.
 * 유튜브 제목은 외부 입력이라, 마크다운 표를 깨거나 멘션·이슈 링크·URL이 걸리지 않게 처리해서 넣는다.
 */

const REASON_LABEL: Readonly<Record<string, string>> = {
  'new-channel': '처음 보는 채널',
  duplicate: '이미 목록에 있는 곡 (다른 채널 업로드)',
  'title-parse': '제목에서 아티스트·곡명을 못 찾음',
  'too-long': '영상이 15분보다 김',
  'unknown-duration': '영상 길이를 알 수 없음',
  'alt-version': '다른 버전 MV (원곡과 따로 셀지 정해 주세요)',
}

const DATA_FILE = (file: string) => `data 브랜치의 \`mv/${file}\``

export function dailyIssue(date: string, result: DiscoverResult, failures: readonly string[]): string | null {
  const unclassified = result.newArtists.filter((a) => a.type === null)
  const warnings = [...failures, ...result.warnings]
  if (!unclassified.length && !result.unsure.length && !warnings.length) return null

  const sections = [`## MV 자동 수집 ${date}`]

  if (warnings.length) {
    sections.push(`### 실패·경고 (${warnings.length})`, warnings.map((w) => `- ${md(w)}`).join('\n'))
  }

  if (unclassified.length) {
    sections.push(
      `### 그룹/솔로 구분이 필요한 아티스트 (${unclassified.length})`,
      `${DATA_FILE('artists.json')}에서 아래 아티스트의 \`"type": null\`을 \`"걸그룹"\`, \`"보이그룹"\`, \`"솔로"\` 중 하나로 바꿔 주세요. 이름이 이상하게 뽑혔으면 \`name\`과 \`registry.json\`의 \`artist\`를 같이 고쳐 주세요.`,
      unclassified
        .map((a) => {
          const songs = result.added.filter((e) => e.artist === a.name)
          return `- **${md(a.name)}**: ${songs.map((s) => `${md(s.title)} (${youtube(s.yt)})`).join(', ')}`
        })
        .join('\n'),
    )
  }

  if (result.unsure.length) {
    const newChannels = uniqueBy(
      result.unsure.filter((u) => u.reason === 'new-channel'),
      (u) => u.channelId,
    )
    sections.push(
      `### 확인이 필요한 영상 (${result.unsure.length})`,
      `공식 MV가 맞으면 ${DATA_FILE('registry.json')}에 추가해 주세요. 아니면 그냥 두면 됩니다 (다시 묻지 않아요).`,
      [
        '| 영상 | 채널 (구독자) | 이유 |',
        '| --- | --- | --- |',
        ...result.unsure.map(
          (u) =>
            `| ${md(u.youtubeTitle)}<br>${youtube(u.yt)} | ${md(u.channelTitle)} (${formatSubs(u.subscribers)}) | ${REASON_LABEL[u.reason] ?? u.reason} |`,
        ),
      ].join('\n'),
      codeBlock({ yt: result.unsure[0].yt, title: '곡명', artist: '아티스트', released: date, addedAt: date, source: 'manual' }),
    )
    if (newChannels.length) {
      sections.push(
        '#### 처음 보는 채널',
        `아티스트·소속사의 공식 채널이면 ${DATA_FILE('channels.json')}에 추가해 주세요. 다음부터 이 채널의 MV는 자동으로 들어갑니다. 재업로드·리액션 채널이면 넣지 마세요.`,
        newChannels.map((u) => `- ${md(u.channelTitle)}: https://www.youtube.com/channel/${encodeURIComponent(u.channelId)}`).join('\n'),
        codeBlock(newChannels.map((u) => ({ id: u.channelId, name: u.channelTitle, addedAt: date, source: 'manual' }))),
      )
    }
  }

  if (result.added.length) {
    sections.push(`### 오늘 자동 추가한 곡 (${result.added.length})`, addedTable(result.added))
  }

  return sections.join('\n\n') + '\n'
}

/** 주간 요약: 지난 7일 자동 추가한 곡과 아직 분류하지 않은 아티스트 */
export function weeklyDigest(
  date: string,
  since: string,
  registry: readonly RegistryEntry[],
  artists: readonly Artist[],
): string | null {
  const added = registry.filter((r) => r.source === 'auto' && r.addedAt >= since)
  const unclassified = artists.filter((a) => a.type === null)
  if (!added.length && !unclassified.length) return null

  const sections = [
    `## MV 자동 수집 주간 요약 (${since} ~ ${date})`,
    `틀리게 들어간 곡이 있으면 ${DATA_FILE('registry.json')}에서 곡명·아티스트를 고치거나 \`"hidden": true\`를 넣어 차트에서 빼 주세요.`,
  ]
  if (added.length) sections.push(`### 자동 추가한 곡 (${added.length})`, addedTable(added))
  if (unclassified.length) {
    sections.push(
      `### 아직 그룹/솔로 구분이 없는 아티스트 (${unclassified.length})`,
      `${DATA_FILE('artists.json')}에서 \`type\`을 채워 주세요: ${unclassified.map((a) => md(a.name)).join(', ')}`,
    )
  }
  return sections.join('\n\n') + '\n'
}

function addedTable(entries: readonly RegistryEntry[]): string {
  return [
    '| 아티스트 | 곡 | 공개일 | 영상 |',
    '| --- | --- | --- | --- |',
    ...entries.map((e) => `| ${md(e.artist)} | ${md(e.title)} | ${e.released} | ${youtube(e.yt)} |`),
  ].join('\n')
}

const youtube = (id: string) => `https://youtu.be/${encodeURIComponent(id)}`

const formatSubs = (n: number | null) => (n === null ? '비공개' : n >= 10_000 ? `${Math.round(n / 10_000).toLocaleString('ko-KR')}만` : n.toLocaleString('ko-KR'))

/** 복사해서 붙여넣을 JSON. 외부 문자열 안의 백틱이 코드 블록을 끝내지 않게 바꾼다 */
const codeBlock = (data: unknown) => `\`\`\`json\n${JSON.stringify(data, null, 2).replace(/`/g, "'")}\n\`\`\``

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((i) => [key(i), i])).values()]
}

/** 외부 문자열을 마크다운에 안전하게 넣는다 */
export function md(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[‪-‮⁦-⁩]/g, '') // 글자 방향을 뒤집는 제어 문자
    .replace(/[\\`*_[\]<>|~&]/g, '\\$&')
    .replace(/:\/\//g, ':/​/') // 자동 링크
    .replace(/@/g, '@​') // 멘션
    .replace(/#(?=\d)/g, '#​') // #123 이슈 링크
    .replace(/\b(gh)-(?=\d)/gi, '$1-​') // GH-123 이슈 링크
}
