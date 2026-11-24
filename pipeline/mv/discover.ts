import { classifyVideo, parseDuration } from './classify'
import { addDays, kstDate } from './dates'
import type { Artist, Channel, RegistryEntry, Seen } from './schema'
import type { YoutubeClient } from './youtube-api'

/**
 * 새 MV를 찾아 차트 목록에 자동으로 넣는다.
 *
 * 1. 후보 모으기: 지켜보는 채널의 최근 업로드 + 유튜브 최신 음악 재생목록 + 한국 인기 음악 + MV 검색(하루 1번, 100유닛)
 * 2. 구독자 10만 명 미만이거나 구독자 수를 숨긴 채널은 뺀다 (팬 계정의 FMV, 조회수가 거의 없는 영상)
 * 3. 제목·길이로 MV인지 판단한다 (classify.ts)
 * 4. 지켜보는 채널의 확실한 MV만 바로 추가한다.
 *    처음 보는 채널(재업로드·리액션 채널, 해외 가수일 수 있다), 이미 있는 곡, 애매한 영상은 사람에게 묻는다.
 *
 * 최신 음악 재생목록은 유튜브가 직접 고른 목록이라 2, 4의 채널 기준을 보지 않는다.
 * MV 표시가 있으면 처음 보는 채널이어도 바로 추가하고, 그 밖의 영상(음원·클립 등)은 빼지 않고 한 번 묻는다.
 */

/** 유튜브 "최신 음악" 재생목록 (유튜브 뮤직이 매일 고르는 한국 신곡) */
export const LATEST_MUSIC_PLAYLIST = 'RDCLAK5uy_mVBAam6Saaqa_DeJRxGkawqqxwPTBrGXM'

export interface DiscoverOptions {
  /** 이보다 구독자가 적은 채널의 영상은 가져오지 않는다 */
  readonly minSubscribers?: number
  /** 채널 업로드 중 이 기간 안에 올라온 영상만 본다. 실행이 며칠 실패해도 놓치지 않게 넉넉히 잡는다 */
  readonly lookbackDays?: number
  /** 이 시각 이후 올라온 MV를 검색한다 (100유닛). null이면 검색하지 않는다 */
  readonly searchSince?: Date | null
  readonly regionCode?: string
  /** seen.json에 이 기간만큼만 남긴다 */
  readonly seenRetentionDays?: number
  /** 유튜브가 고른 신곡 재생목록. 여기 담긴 영상은 채널 기준 없이 본다 */
  readonly playlistIds?: readonly string[]
}

export interface DiscoverInput {
  readonly client: YoutubeClient
  readonly registry: readonly RegistryEntry[]
  readonly artists: readonly Artist[]
  readonly channels: readonly Channel[]
  readonly seen: Seen
  readonly now: Date
  readonly options?: DiscoverOptions
}

export type UnsureReason =
  | 'title-parse'
  | 'too-long'
  | 'unknown-duration'
  | 'new-channel'
  | 'duplicate'
  | 'alt-version'
  /** 재생목록에 있지만 규칙상 MV가 아닌 영상. 뒤에 classify.ts의 reject 이유가 붙는다 (playlist-no-mv-marker 등) */
  | `${typeof PLAYLIST_REASON_PREFIX}${string}`

export const PLAYLIST_REASON_PREFIX = 'playlist-'

/** 곡명 끝의 버전 표시. "Cotton Candy(Drama Ver.)", "Magnetic (Japanese Ver.)" */
const ALT_VERSION = /[([][^()[\]]*\bver(\.|sion)?\s*[)\]]\s*$/i

/** 사람에게 물어볼 영상. 유튜브 원래 제목은 보고서에만 쓰고 저장하지 않는다 */
export interface UnsureItem {
  readonly yt: string
  readonly youtubeTitle: string
  readonly channelId: string
  readonly channelTitle: string
  /** 구독자 수를 숨긴 채널은 null (지켜보는 채널만 여기까지 온다) */
  readonly subscribers: number | null
  readonly reason: UnsureReason | string
}

export interface DiscoverResult {
  readonly added: readonly RegistryEntry[]
  /** 처음 본 아티스트 */
  readonly newArtists: readonly Artist[]
  readonly unsure: readonly UnsureItem[]
  readonly seen: Seen
  /** 검색까지 성공했는지 (다음 검색 기준 시각을 옮길지) */
  readonly searched: boolean
  readonly warnings: readonly string[]
}

const DEFAULTS = {
  minSubscribers: 100_000,
  lookbackDays: 7,
  searchSince: null,
  regionCode: 'KR',
  seenRetentionDays: 30,
  playlistIds: [LATEST_MUSIC_PLAYLIST],
} satisfies Required<DiscoverOptions>

const UPLOAD_CONCURRENCY = 10

export async function discoverNewMvs({
  client,
  registry,
  artists,
  channels,
  seen,
  now,
  options,
}: DiscoverInput): Promise<DiscoverResult> {
  const opts = { ...DEFAULTS, ...options }
  const today = kstDate(now)
  const warnings: string[] = []

  /** 실패해도 다른 경로는 계속 돌도록 경고만 남긴다 */
  const attempt = async <T>(label: string, run: () => Promise<T>, fallback: T): Promise<{ ok: boolean; value: T }> => {
    try {
      return { ok: true, value: await run() }
    } catch (error) {
      warnings.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      return { ok: false, value: fallback }
    }
  }

  // 1. 후보 모으기
  const since = new Date(now.getTime() - opts.lookbackDays * 86_400_000)
  const uploads = await mapLimit(channels, UPLOAD_CONCURRENCY, async (ch) =>
    (await attempt(`채널 업로드 목록 ${ch.name} (${ch.id})`, () => client.recentUploads(ch.id, since), [])).value,
  )
  // 판단 기록(seen)이 지워진 뒤에도 재생목록에 남아 있는 영상을 다시 묻지 않게, 그보다 오래된 영상은 보지 않는다
  const seenFrom = now.getTime() - opts.seenRetentionDays * 86_400_000
  const listed = await mapLimit(opts.playlistIds, UPLOAD_CONCURRENCY, async (id) =>
    (await attempt(`재생목록 ${id}`, () => client.playlistVideos(id), [])).value,
  )
  const curated = new Set(
    listed
      .flat()
      .filter((v) => !v.publishedAt || Date.parse(v.publishedAt) >= seenFrom)
      .map((v) => v.videoId),
  )
  const popular = await attempt('인기 음악 목록', () => client.mostPopularMusic(opts.regionCode), [])
  const search = opts.searchSince
    ? await attempt('MV 검색', () => client.searchRecentMvs(opts.searchSince!, opts.regionCode), [])
    : { ok: false, value: [] }

  const known = new Set([...registry.map((r) => r.yt), ...Object.keys(seen)])
  const candidates = [
    ...new Set([...uploads.flat().map((u) => u.videoId), ...curated, ...popular.value, ...search.value]),
  ].filter((id) => !known.has(id))

  // 2. 영상·채널 정보
  const videos = candidates.length
    ? await client.videos(candidates, ['snippet', 'contentDetails', 'liveStreamingDetails'])
    : []
  const channelIds = [...new Set(videos.flatMap((v) => (v.snippet ? [v.snippet.channelId] : [])))]
  const channelInfo = channelIds.length ? await client.channels(channelIds, ['statistics']) : []
  const subscribers = new Map(
    channelInfo.map((c) => [
      c.id,
      c.statistics?.hiddenSubscriberCount || !c.statistics?.subscriberCount ? null : Number(c.statistics.subscriberCount),
    ]),
  )
  const watched = new Map(channels.map((c) => [c.id, c]))

  // 3~4. 판단
  const added: RegistryEntry[] = []
  const newArtists: Artist[] = []
  const unsure: UnsureItem[] = []
  const judged: Record<string, string> = {}
  const songKeys = (artist: string, song: string) => songNames(song).map((s) => `${normalizeName(artist)}/${s}`)
  const songs = new Set(registry.flatMap((r) => songKeys(r.artist, r.title)))

  for (const video of videos) {
    const snippet = video.snippet
    if (!snippet) continue

    const verdict = classifyVideo({
      title: snippet.title,
      durationSec: video.contentDetails?.duration ? parseDuration(video.contentDetails.duration) : null,
      liveBroadcastContent: snippet.liveBroadcastContent,
    })
    // 공개 전 영상은 판단했다고 적지 않는다. 다음 실행 때 다시 본다
    if (verdict.kind === 'wait') continue

    const channel = watched.get(snippet.channelId)
    const fromPlaylist = curated.has(video.id)
    const subs = subscribers.get(snippet.channelId) ?? null
    // 구독자 수 기준은 처음 보는 채널(팬·재업로드)을 거르는 용도다.
    // 지켜보는 채널은 이미 공식으로 확인했고, VEVO 채널은 구독자가 수천 명으로 나오므로 보지 않는다.
    // 유튜브가 고른 재생목록의 영상도 공식 영상이라 보지 않는다.
    // 여기서 뺀 영상은 판단했다고 적지 않는다. 검색으로 먼저 본 신인 MV가 나중에 재생목록에 오르면 그때 다시 본다
    if (!channel && !fromPlaylist && (subs === null || subs < opts.minSubscribers)) continue
    judged[video.id] = today

    const ask = (reason: UnsureReason | string) =>
      unsure.push({
        yt: video.id,
        youtubeTitle: snippet.title,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        subscribers: subs,
        reason,
      })
    // 재생목록에 오른 영상은 MV 표시가 없어도(음원·클립·자막판 등) 빼지 않고 한 번 묻는다
    if (verdict.kind === 'reject') {
      if (fromPlaylist) ask(`${PLAYLIST_REASON_PREFIX}${verdict.reason}`)
      continue
    }
    if (verdict.kind === 'unsure') {
      ask(verdict.reason)
      continue
    }

    if (!channel && !fromPlaylist) {
      ask('new-channel')
      continue
    }

    const parsedArtist = verdict.artist ?? channel?.artist ?? null
    if (!parsedArtist || !verdict.song) {
      ask('title-parse')
      continue
    }

    // Drama Ver., Japanese Ver. 같은 다른 버전은 원곡과 조회수를 따로 셀지 사람이 정한다
    if (ALT_VERSION.test(verdict.song)) {
      ask('alt-version')
      continue
    }

    const pool = [...artists, ...newArtists]
    const match = [parsedArtist, ...verdict.aliases].map((n) => findArtist(pool, n)).find(Boolean)
    const artist = match?.name ?? parsedArtist
    const keys = songKeys(artist, verdict.song)
    // 같은 곡을 유통사와 아티스트 채널이 따로 올린 경우. 조회수가 나뉘니 어느 쪽을 쓸지 사람이 고른다
    if (keys.some((k) => songs.has(k))) {
      ask('duplicate')
      continue
    }
    keys.forEach((k) => songs.add(k))

    if (!match) {
      newArtists.push({ name: parsedArtist, aliases: verdict.aliases.map(stripParens).filter(Boolean) })
    }
    added.push({
      yt: video.id,
      title: verdict.song,
      artist,
      released: kstDate(new Date(video.liveStreamingDetails?.actualStartTime ?? snippet.publishedAt)),
      addedAt: today,
      source: 'auto',
      channelId: snippet.channelId,
    })
  }

  const keepFrom = addDays(today, -opts.seenRetentionDays)
  const nextSeen = Object.fromEntries(Object.entries({ ...seen, ...judged }).filter(([, date]) => date >= keepFrom))

  return { added, newArtists, unsure, seen: nextSeen, searched: search.ok, warnings }
}

/** 대소문자·공백·기호를 무시하고 이름이나 별칭이 같은 아티스트를 찾는다 */
export function findArtist(artists: readonly Artist[], name: string): Artist | undefined {
  const key = normalizeName(name)
  if (!key) return undefined
  return artists.find((a) => [a.name, ...a.aliases].some((n) => normalizeName(n) === key))
}

export const normalizeName = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const stripParens = (s: string) => s.replace(/^\((.*)\)$/, '$1').trim()

/**
 * 같은 곡인지 비교할 이름들. 채널마다 한글·영문 곡명을 괄호에 넣는 쪽이 달라서
 * ("Mountain, Life(산, 삶)" → "Mountain, Life" / "산, 삶(Mountain, Life)"), 곡명 전체와 함께
 * 괄호 밖·괄호 안 글자도 따로 본다.
 * - 곡명 끝의 괄호 하나만 나눈다 ("FRI(END)S"는 그대로)
 * - 한쪽만 한글이고 양쪽 다 글자가 있을 때(번역 표기)만 나눈다. "산 (2024)"는 나누지 않는다
 * - 리믹스·피처링·버전 표시는 나누지 않는다. "RUDE! (윤지 Remix)"는 원곡과 다른 곡이다
 */
export function songNames(song: string): string[] {
  const m = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(song)
  const translated =
    m !== null &&
    HANGUL.test(m[1]) !== HANGUL.test(m[2]) &&
    LETTER.test(m[1]) &&
    LETTER.test(m[2]) &&
    !SONG_QUALIFIER.test(m[2])
  const names = translated ? [song, m[1], m[2]] : [song]
  return [...new Set(names.map(normalizeName).filter(Boolean))]
}

const HANGUL = /[가-힣]/
const LETTER = /\p{L}/u
/** 괄호 안이 번역이 아니라 곡의 다른 판·참여자 표시인 경우 */
const SONG_QUALIFIER = /\b(feat|ft|prod|with|remix|mix|edit|ver|version|inst|acoustic|live)\b|리믹스|버전/i

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))))
  }
  return results
}
