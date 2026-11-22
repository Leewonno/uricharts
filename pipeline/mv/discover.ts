import { classifyVideo, parseDuration } from './classify'
import { addDays, kstDate } from './dates'
import type { Artist, Channel, RegistryEntry, Seen } from './schema'
import type { YoutubeClient } from './youtube-api'

/**
 * 새 MV를 찾아 차트 목록에 자동으로 넣는다.
 *
 * 1. 후보 모으기: 지켜보는 채널의 최근 업로드 + 한국 인기 음악 + MV 검색(하루 1번, 100유닛)
 * 2. 구독자 10만 명 미만이거나 구독자 수를 숨긴 채널은 뺀다 (팬 계정의 FMV, 조회수가 거의 없는 영상)
 * 3. 제목·길이로 MV인지 판단한다 (classify.ts)
 * 4. 지켜보는 채널의 확실한 MV만 바로 추가한다.
 *    처음 보는 채널(재업로드·리액션 채널, 해외 가수일 수 있다), 이미 있는 곡, 애매한 영상은 사람에게 묻는다.
 */

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

export type UnsureReason = 'title-parse' | 'too-long' | 'unknown-duration' | 'new-channel' | 'duplicate' | 'alt-version'

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
  /** 처음 본 아티스트. 그룹/솔로 구분(type)은 비어 있다 */
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
  const popular = await attempt('인기 음악 목록', () => client.mostPopularMusic(opts.regionCode), [])
  const search = opts.searchSince
    ? await attempt('MV 검색', () => client.searchRecentMvs(opts.searchSince!, opts.regionCode), [])
    : { ok: false, value: [] }

  const known = new Set([...registry.map((r) => r.yt), ...Object.keys(seen)])
  const candidates = [...new Set([...uploads.flat().map((u) => u.videoId), ...popular.value, ...search.value])].filter(
    (id) => !known.has(id),
  )

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
  const songKey = (artist: string, song: string) => `${normalizeName(artist)}/${normalizeName(song)}`
  const songs = new Set(registry.map((r) => songKey(r.artist, r.title)))

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
    judged[video.id] = today

    const channel = watched.get(snippet.channelId)
    const subs = subscribers.get(snippet.channelId) ?? null
    // 구독자 수 기준은 처음 보는 채널(팬·재업로드)을 거르는 용도다.
    // 지켜보는 채널은 이미 공식으로 확인했고, VEVO 채널은 구독자가 수천 명으로 나오므로 보지 않는다
    if (!channel && (subs === null || subs < opts.minSubscribers)) continue
    if (verdict.kind === 'reject') continue

    const ask = (reason: string) =>
      unsure.push({
        yt: video.id,
        youtubeTitle: snippet.title,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        subscribers: subs,
        reason,
      })
    if (verdict.kind === 'unsure') {
      ask(verdict.reason)
      continue
    }

    if (!channel) {
      ask('new-channel')
      continue
    }

    const parsedArtist = verdict.artist ?? channel.artist ?? null
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
    const key = songKey(artist, verdict.song)
    // 같은 곡을 유통사와 아티스트 채널이 따로 올린 경우. 조회수가 나뉘니 어느 쪽을 쓸지 사람이 고른다
    if (songs.has(key)) {
      ask('duplicate')
      continue
    }
    songs.add(key)

    if (!match) {
      newArtists.push({ name: parsedArtist, type: null, aliases: verdict.aliases.map(stripParens).filter(Boolean) })
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

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))))
  }
  return results
}
