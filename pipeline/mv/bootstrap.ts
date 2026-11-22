import { SAMPLE_MVS } from '../../src/features/mv/data/sample'
import { kstDate } from './dates'
import { normalizeName } from './discover'
import type { Artist, Channel, RegistryEntry } from './schema'
import type { YoutubeClient } from './youtube-api'

/**
 * 처음 한 번, 샘플 데이터의 100곡으로 차트 목록·아티스트·지켜볼 채널을 만든다.
 * 채널은 각 곡이 올라온 채널을 API로 확인해서 모은다.
 */
export async function bootstrapFromSample(
  client: YoutubeClient,
  now: Date,
): Promise<{ registry: RegistryEntry[]; artists: Artist[]; channels: Channel[]; warnings: string[] }> {
  const today = kstDate(now)
  const videos = await client.videos(
    SAMPLE_MVS.map((m) => m.yt),
    ['snippet'],
  )
  const channelOf = new Map(videos.flatMap((v) => (v.snippet ? [[v.id, v.snippet.channelId] as const] : [])))
  const warnings = SAMPLE_MVS.filter((m) => !channelOf.has(m.yt)).map(
    (m) => `샘플 곡 ${m.artist} - ${m.title} (${m.yt}) 영상 정보를 못 받았습니다`,
  )

  const registry: RegistryEntry[] = SAMPLE_MVS.map((m) => ({
    yt: m.yt,
    title: m.title,
    artist: m.artist,
    released: m.released,
    addedAt: today,
    source: 'seed',
    ...(channelOf.has(m.yt) ? { channelId: channelOf.get(m.yt) } : {}),
  }))

  const artists: Artist[] = [...new Map(SAMPLE_MVS.map((m) => [m.artist, m.type])).entries()].map(([name, type]) => ({
    name,
    type,
    aliases: [],
  }))

  const channelIds = [...new Set(channelOf.values())]
  const info = channelIds.length ? await client.channels(channelIds, ['snippet']) : []
  const channels: Channel[] = info.map((c) => {
    const name = c.snippet?.title ?? c.id
    const artist = soleArtist(name, registry.filter((r) => r.channelId === c.id).map((r) => r.artist))
    return { id: c.id, name, addedAt: today, source: 'seed', ...(artist ? { artist } : {}) }
  })

  return { registry, artists, channels, warnings }
}

/**
 * 채널 이름에 아티스트 이름이 들어 있고 그 채널의 곡이 모두 그 아티스트 것이면 아티스트 전용 채널로 본다.
 * (BLACKPINK 채널 → BLACKPINK. HYBE LABELS처럼 여러 아티스트가 올리는 채널은 아니다)
 */
function soleArtist(channelName: string, artistsInChannel: readonly string[]): string | undefined {
  const unique = [...new Set(artistsInChannel)]
  if (unique.length !== 1) return undefined
  return normalizeName(channelName).includes(normalizeName(unique[0])) ? unique[0] : undefined
}
