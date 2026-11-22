import { z } from 'zod'

/**
 * YouTube Data API v3 클라이언트. 이 수집기에 필요한 호출만 담았다.
 * 할당량: 하루 10,000유닛. 목록 조회는 1유닛, 검색은 100유닛이다.
 * https://developers.google.com/youtube/v3/determine_quota_cost
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3'
/** videos.list / channels.list가 한 번에 받는 ID 수 */
const MAX_IDS_PER_CALL = 50

const COST = { videos: 1, channels: 1, playlistItems: 1, search: 100 } as const
type Endpoint = keyof typeof COST

const videoSchema = z.object({
  id: z.string(),
  snippet: z
    .object({
      title: z.string(),
      channelId: z.string(),
      channelTitle: z.string(),
      publishedAt: z.string(),
      liveBroadcastContent: z.string().optional(),
    })
    .optional(),
  contentDetails: z.object({ duration: z.string().optional() }).optional(),
  statistics: z.object({ viewCount: z.string().optional() }).optional(),
  liveStreamingDetails: z.object({ actualStartTime: z.string().optional() }).optional(),
})
export type YtVideo = z.infer<typeof videoSchema>

const channelSchema = z.object({
  id: z.string(),
  snippet: z.object({ title: z.string() }).optional(),
  statistics: z
    .object({
      subscriberCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
    })
    .optional(),
})
export type YtChannel = z.infer<typeof channelSchema>

const playlistItemSchema = z.object({
  contentDetails: z.object({ videoId: z.string(), videoPublishedAt: z.string().optional() }),
})
const searchItemSchema = z.object({ id: z.object({ videoId: z.string().optional() }) })

const listOf = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item).default([]), nextPageToken: z.string().optional() })

/** 채널 업로드 목록을 이 페이지 수(×50개)까지만 넘긴다. 숏츠를 많이 올리는 유통사 채널도 며칠치는 덮는다 */
const MAX_UPLOAD_PAGES = 4

export class YoutubeApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    readonly reason: string,
    message: string,
  ) {
    // 요청 주소에는 API 키가 들어 있으니 메시지에 넣지 않는다
    super(`YouTube API ${endpoint} 실패 (${status}${reason ? ` ${reason}` : ''}): ${message}`)
    this.name = 'YoutubeApiError'
  }
}

export interface YoutubeClient {
  /** 영상 정보. 없거나 비공개인 영상은 결과에서 빠진다 */
  videos(ids: readonly string[], parts: readonly string[]): Promise<YtVideo[]>
  channels(ids: readonly string[], parts: readonly string[]): Promise<YtChannel[]>
  /** 채널에 이 시각 이후 올라온 영상 (최신순) */
  recentUploads(channelId: string, since: Date): Promise<{ videoId: string; publishedAt?: string }[]>
  /** 지역별 인기 음악 영상 ID */
  mostPopularMusic(regionCode: string): Promise<string[]>
  /** 이 시각 이후 올라온 MV 검색 결과 ID (100유닛) */
  searchRecentMvs(publishedAfter: Date, regionCode: string): Promise<string[]>
  /** 지금까지 쓴 할당량 (유닛) */
  readonly unitsUsed: number
}

export interface YoutubeClientOptions {
  readonly apiKey: string
  readonly fetch?: typeof fetch
  readonly maxAttempts?: number
  readonly retryDelayMs?: number
}

export function createYoutubeClient({
  apiKey,
  fetch: doFetch = fetch,
  maxAttempts = 3,
  retryDelayMs = 1000,
}: YoutubeClientOptions): YoutubeClient {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY가 없습니다')
  let unitsUsed = 0

  async function call<T>(endpoint: Endpoint, params: Record<string, string>, schema: z.ZodType<T>): Promise<T> {
    const url = new URL(`${API_BASE}/${endpoint}`)
    Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v))

    for (let attempt = 1; ; attempt++) {
      const retry = attempt < maxAttempts
      let res: Response
      try {
        res = await doFetch(url)
      } catch (error) {
        if (retry) {
          await sleep(retryDelayMs * attempt)
          continue
        }
        throw new YoutubeApiError(endpoint, 0, 'network', error instanceof Error ? error.message : String(error))
      }
      // 실패한 요청도 할당량을 쓴다
      unitsUsed += COST[endpoint]

      if (res.ok) return schema.parse(await res.json())
      if ((res.status >= 500 || res.status === 429) && retry) {
        await sleep(retryDelayMs * attempt)
        continue
      }
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string; errors?: { reason?: string }[] }
      } | null
      throw new YoutubeApiError(
        endpoint,
        res.status,
        body?.error?.errors?.[0]?.reason ?? '',
        body?.error?.message ?? res.statusText,
      )
    }
  }

  async function listByIds<T>(
    endpoint: 'videos' | 'channels',
    ids: readonly string[],
    parts: readonly string[],
    schema: z.ZodType<T>,
  ): Promise<T[]> {
    const unique = [...new Set(ids)]
    const pages = await Promise.all(
      chunk(unique, MAX_IDS_PER_CALL).map((batch) =>
        call(endpoint, { part: parts.join(','), id: batch.join(','), maxResults: String(MAX_IDS_PER_CALL) }, listOf(schema)),
      ),
    )
    return pages.flatMap((p) => p.items)
  }

  return {
    get unitsUsed() {
      return unitsUsed
    },

    videos: (ids, parts) => listByIds('videos', ids, parts, videoSchema),

    channels: (ids, parts) => listByIds('channels', ids, parts, channelSchema),

    async recentUploads(channelId, since) {
      // 채널의 "업로드" 재생목록 ID는 채널 ID의 UC를 UU로 바꾼 것이다
      const playlistId = `UU${channelId.slice(2)}`
      const found: { videoId: string; publishedAt?: string }[] = []
      let pageToken: string | undefined
      for (let page = 0; page < MAX_UPLOAD_PAGES; page++) {
        const res = await call(
          'playlistItems',
          { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) },
          listOf(playlistItemSchema),
        )
        const items = res.items.map((i) => ({
          videoId: i.contentDetails.videoId,
          publishedAt: i.contentDetails.videoPublishedAt,
        }))
        // 비공개 예정 영상 등은 공개 시각이 없다. 기간 안으로 보고 일단 후보에 넣는다
        const recent = items.filter((i) => !i.publishedAt || Date.parse(i.publishedAt) >= since.getTime())
        found.push(...recent)
        if (recent.length < items.length || !res.nextPageToken) break
        pageToken = res.nextPageToken
      }
      return found
    },

    async mostPopularMusic(regionCode) {
      const res = await call(
        'videos',
        { part: 'id', chart: 'mostPopular', regionCode, videoCategoryId: '10', maxResults: '50' },
        listOf(z.object({ id: z.string() })),
      )
      return res.items.map((i) => i.id)
    },

    async searchRecentMvs(publishedAfter, regionCode) {
      const res = await call(
        'search',
        {
          part: 'id',
          type: 'video',
          q: 'MV|M/V|뮤직비디오',
          order: 'viewCount',
          regionCode,
          relevanceLanguage: 'ko',
          publishedAfter: publishedAfter.toISOString(),
          maxResults: '50',
        },
        listOf(searchItemSchema),
      )
      return res.items.flatMap((i) => (i.id.videoId ? [i.id.videoId] : []))
    },
  }
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
