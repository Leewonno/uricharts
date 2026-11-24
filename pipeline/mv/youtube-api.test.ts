import { describe, expect, it, vi } from 'vitest'
import { chunk, createYoutubeClient, YoutubeApiError } from './youtube-api'

const KEY = 'test-secret-key'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function fakeFetch(handler: (url: URL) => Response) {
  return vi.fn(async (input: string | URL | Request) => handler(new URL(String(input))))
}

describe('chunk', () => {
  it('정해진 크기로 나눈다', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 50)).toEqual([])
  })
})

describe('createYoutubeClient', () => {
  it('API 키가 없으면 바로 실패한다', () => {
    expect(() => createYoutubeClient({ apiKey: '' })).toThrow('YOUTUBE_API_KEY')
  })

  it('영상 ID를 50개씩 나눠 요청하고 할당량을 센다', async () => {
    const fetch = fakeFetch((url) => {
      const ids = url.searchParams.get('id')!.split(',')
      return json({ items: ids.map((id) => ({ id, statistics: { viewCount: '10' } })) })
    })
    const client = createYoutubeClient({ apiKey: KEY, fetch })
    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`)

    const videos = await client.videos(ids, ['statistics'])

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(videos).toHaveLength(120)
    expect(client.unitsUsed).toBe(3)
    const first = new URL(String(fetch.mock.calls[0][0]))
    expect(first.pathname).toBe('/youtube/v3/videos')
    expect(first.searchParams.get('part')).toBe('statistics')
    expect(first.searchParams.get('key')).toBe(KEY)
  })

  it('채널 업로드 목록은 UC를 UU로 바꾼 재생목록에서, 기간 안의 영상이 이어지는 동안 다음 페이지까지 가져온다', async () => {
    const item = (videoId: string, at: string) => ({ contentDetails: { videoId, videoPublishedAt: at } })
    const fetch = fakeFetch((url) =>
      url.searchParams.get('pageToken')
        ? json({ items: [item('b', '2026-11-20T09:00:00Z'), item('old', '2026-11-01T09:00:00Z')], nextPageToken: 'p3' })
        : json({ items: [item('a', '2026-11-21T09:00:00Z')], nextPageToken: 'p2' }),
    )
    const client = createYoutubeClient({ apiKey: KEY, fetch })

    const uploads = await client.recentUploads('UCabcdefghijklmnopqrstuv', new Date('2026-11-15T00:00:00Z'))

    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('playlistId')).toBe('UUabcdefghijklmnopqrstuv')
    expect(uploads.map((u) => u.videoId)).toEqual(['a', 'b'])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('재생목록은 새 영상이 나오지 않는 페이지에서 멈춘다 (유튜브 뮤직 재생목록은 다음 페이지가 같은 영상을 되풀이한다)', async () => {
    const item = (videoId: string) => ({ contentDetails: { videoId, videoPublishedAt: '2026-11-20T09:00:00Z' } })
    const pages: Record<string, unknown> = {
      first: { items: [item('a'), item('b')], nextPageToken: 'p2' },
      p2: { items: [item('a'), item('b'), item('c')], nextPageToken: 'p3' },
      p3: { items: [item('a'), item('b')], nextPageToken: 'p2' },
    }
    const fetch = fakeFetch((url) => json(pages[url.searchParams.get('pageToken') ?? 'first']))
    const client = createYoutubeClient({ apiKey: KEY, fetch })

    const videos = await client.playlistVideos('RDCLAK5uy_latest')

    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('playlistId')).toBe('RDCLAK5uy_latest')
    expect(videos.map((v) => v.videoId)).toEqual(['a', 'b', 'c'])
    expect(videos[0].publishedAt).toBe('2026-11-20T09:00:00Z')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('검색은 100유닛으로 센다', async () => {
    const fetch = fakeFetch(() => json({ items: [{ id: { videoId: 'a' } }, { id: { channelId: 'x' } }] }))
    const client = createYoutubeClient({ apiKey: KEY, fetch })

    expect(await client.searchRecentMvs(new Date('2026-11-21T00:00:00Z'), 'KR')).toEqual(['a'])
    expect(client.unitsUsed).toBe(100)
  })

  it('서버 오류(5xx)와 요청 과다(429)는 다시 시도한다', async () => {
    let calls = 0
    const fetch = fakeFetch(() => (++calls === 1 ? json({}, 503) : calls === 2 ? json({}, 429) : json({ items: [] })))
    const client = createYoutubeClient({ apiKey: KEY, fetch, retryDelayMs: 0 })

    await expect(client.videos(['a'], ['statistics'])).resolves.toEqual([])
    expect(calls).toBe(3)
  })

  it('할당량 초과 같은 요청 오류는 바로 실패하고, 메시지에 API 키를 넣지 않는다', async () => {
    const fetch = fakeFetch(() =>
      json({ error: { message: 'quota exceeded', errors: [{ reason: 'quotaExceeded' }] } }, 403),
    )
    const client = createYoutubeClient({ apiKey: KEY, fetch, retryDelayMs: 0 })

    const error = await client.videos(['a'], ['statistics']).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(YoutubeApiError)
    expect((error as YoutubeApiError).reason).toBe('quotaExceeded')
    expect((error as Error).message).not.toContain(KEY)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
