import { describe, expect, it } from 'vitest'
import { collectSnapshot } from './collect'
import { addDays, kstDate, kstHour, kstIso } from './dates'
import { discoverNewMvs, findArtist } from './discover'
import type { Artist, Channel, RegistryEntry } from './schema'
import { fakeClient } from './testing'
import type { YtChannel, YtVideo } from './youtube-api'

// 2026-11-23 00:05 KST
const NOW = new Date('2026-11-22T15:05:00Z')
const HYBE = 'UC3IZKseVpdzPSBaWxBxundA'
const FAN = 'UCfanfanfanfanfanfanfanf'
const NEW_LABEL = 'UCnewlabelnewlabelnewlab'

const channels: Channel[] = [{ id: HYBE, name: 'HYBE LABELS', addedAt: '2026-11-22', source: 'seed' }]
const artists: Artist[] = [{ name: 'ILLIT', type: '걸그룹', aliases: ['아일릿'] }]
const registry: RegistryEntry[] = [
  { yt: 'old', title: 'Magnetic', artist: 'ILLIT', released: '2024-03-25', addedAt: '2026-11-22', source: 'seed' },
]

const video = (id: string, title: string, channelId: string, extra: Partial<YtVideo> = {}): YtVideo => ({
  id,
  snippet: { title, channelId, channelTitle: channelId, publishedAt: '2026-11-22T09:00:00Z', liveBroadcastContent: 'none' },
  contentDetails: { duration: 'PT3M20S' },
  ...extra,
})

const stats = (id: string, subscriberCount: number | null): YtChannel => ({
  id,
  statistics: subscriberCount === null ? { hiddenSubscriberCount: true } : { subscriberCount: String(subscriberCount) },
})

const base = { registry, artists, channels, seen: {}, now: NOW }

describe('discoverNewMvs', () => {
  it('지켜보는 채널의 새 MV를 정리된 곡명·아티스트로 추가한다', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'new1', publishedAt: '2026-11-22T09:00:00Z' }] },
      videos: [video('new1', "ILLIT (아일릿) 'NOT CUTE ANYMORE' Official MV", HYBE)],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([
      {
        yt: 'new1',
        title: 'NOT CUTE ANYMORE',
        artist: 'ILLIT',
        released: '2026-11-22',
        addedAt: '2026-11-23',
        source: 'auto',
        channelId: HYBE,
      },
    ])
    expect(result.newArtists).toEqual([])
    expect(result.unsure).toEqual([])
    expect(result.seen).toEqual({ new1: '2026-11-23' })
  })

  it('한글 표기만 맞아도 같은 아티스트로 찾는다', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'k' }] },
      videos: [video('k', "[MV] 아일릿 (ILLIT!) - Tick-Tack", HYBE)],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added.map((a) => a.artist)).toEqual(['ILLIT'])
    expect(result.newArtists).toEqual([])
  })

  it('구독자 10만 명 미만이거나 구독자 수를 숨긴 채널은 묻지도 않고 뺀다', async () => {
    const client = fakeClient({
      popular: ['small', 'hidden'],
      videos: [
        video('small', "ILLIT (아일릿) 'It's Me' Official MV", FAN),
        video('hidden', "ILLIT (아일릿) 'It's Me' Official MV", NEW_LABEL),
      ],
      channelStats: [stats(FAN, 99_999), stats(NEW_LABEL, null)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([])
    expect(result.unsure).toEqual([])
    expect(Object.keys(result.seen)).toEqual(['small', 'hidden'])
  })

  it('지켜보는 채널은 구독자 수와 상관없이 본다 (VEVO 채널은 구독자가 수천 명으로 나온다)', async () => {
    const vevo: Channel = { id: NEW_LABEL, name: 'LISAOfficialVEVO', addedAt: '2026-11-22', source: 'seed', artist: 'LISA' }
    const client = fakeClient({
      uploads: { [NEW_LABEL]: [{ videoId: 'lisa' }] },
      videos: [video('lisa', 'LISA - Leave With Me (Featured in Always Lalisa) (Official Music Video)', NEW_LABEL)],
      channelStats: [stats(NEW_LABEL, 3_890)],
    })

    const result = await discoverNewMvs({ ...base, channels: [...channels, vevo], client })

    expect(result.added.map((a) => [a.artist, a.title])).toEqual([['LISA', 'Leave With Me (Featured in Always Lalisa)']])
  })

  it('같은 곡의 다른 버전 MV는 원곡과 따로 셀지 묻는다', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'v1' }, { videoId: 'v2' }] },
      videos: [
        video('v1', '[MV] KWON IN SEO(권인서) _ Cotton Candy(솜사탕)(Drama Ver.)', HYBE),
        video('v2', "ILLIT (아일릿) 'Magnetic (Japanese Ver.)' Official MV", HYBE),
      ],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([])
    expect(result.unsure.map((u) => [u.yt, u.reason])).toEqual([
      ['v1', 'alt-version'],
      ['v2', 'alt-version'],
    ])
  })

  it('구독자가 많은 채널이라도 FMV는 뺀다', async () => {
    const client = fakeClient({
      popular: ['fmv'],
      videos: [video('fmv', 'ILLIT - It’s Me [FMV]', FAN)],
      channelStats: [stats(FAN, 500_000)],
    })

    const result = await discoverNewMvs({ ...base, client })
    expect(result.added).toEqual([])
    expect(result.unsure).toEqual([])
  })

  it('처음 보는 채널의 MV는 자동으로 넣지 않고 묻는다 (재업로드 채널, 해외 가수)', async () => {
    const client = fakeClient({
      popular: ['gaga'],
      videos: [video('gaga', 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)', NEW_LABEL)],
      channelStats: [stats(NEW_LABEL, 30_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([])
    expect(result.newArtists).toEqual([])
    expect(result.unsure).toEqual([
      {
        yt: 'gaga',
        youtubeTitle: 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)',
        channelId: NEW_LABEL,
        channelTitle: NEW_LABEL,
        subscribers: 30_000_000,
        reason: 'new-channel',
      },
    ])
  })

  it('지켜보는 채널에서 처음 보는 아티스트는 추가하고, 그룹/솔로 구분은 비워 둔다', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'rookie' }] },
      videos: [video('rookie', "NEWGRP (뉴그룹) 'Debut' Official MV", HYBE)],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added.map((a) => [a.title, a.artist])).toEqual([['Debut', 'NEWGRP']])
    expect(result.newArtists).toEqual([{ name: 'NEWGRP', type: null, aliases: ['뉴그룹'] }])
  })

  it('이미 목록에 있는 곡을 다른 채널이 올리면 묻는다 (조회수가 나뉜다)', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'dup' }] },
      videos: [video('dup', "[MV] ILLIT(아일릿) _ Magnetic", HYBE)],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([])
    expect(result.unsure.map((u) => u.reason)).toEqual(['duplicate'])
  })

  it('제목에서 아티스트를 못 뽑으면 아티스트 전용 채널의 아티스트를 쓰고, 그것도 없으면 묻는다', async () => {
    const solo: Channel = { id: NEW_LABEL, name: 'ILLIT', addedAt: '2026-11-22', source: 'seed', artist: 'ILLIT' }
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'q2' }], [NEW_LABEL]: [{ videoId: 'q1' }] },
      videos: [video('q1', "'Tick-Tack' MV", NEW_LABEL), video('q2', "'Tick-Tack' MV", HYBE)],
      channelStats: [stats(HYBE, 76_000_000), stats(NEW_LABEL, 2_000_000)],
    })

    const result = await discoverNewMvs({ ...base, channels: [...channels, solo], client })

    expect(result.added.map((a) => [a.yt, a.artist])).toEqual([['q1', 'ILLIT']])
    expect(result.unsure.map((u) => [u.yt, u.reason])).toEqual([['q2', 'title-parse']])
  })

  it('이미 목록에 있거나 판단한 영상, 기간 밖의 업로드는 다시 보지 않는다', async () => {
    const client = fakeClient({
      uploads: {
        [HYBE]: [
          { videoId: 'old', publishedAt: '2026-11-22T09:00:00Z' },
          { videoId: 'judged', publishedAt: '2026-11-22T09:00:00Z' },
          { videoId: 'stale', publishedAt: '2026-10-01T09:00:00Z' },
        ],
      },
    })

    const result = await discoverNewMvs({ ...base, seen: { judged: '2026-11-20' }, client })

    expect(client.videoRequests).toEqual([])
    expect(result.seen).toEqual({ judged: '2026-11-20' })
  })

  it('프리미어 공개 전 영상은 판단하지 않고 다음에 다시 본다', async () => {
    const title = "ILLIT (아일릿) 'It's Me' Official MV"
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'premiere' }] },
      videos: [
        video('premiere', title, HYBE, {
          snippet: { title, channelId: HYBE, channelTitle: 'HYBE LABELS', publishedAt: '2026-11-20T00:00:00Z', liveBroadcastContent: 'upcoming' },
        }),
      ],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, client })

    expect(result.added).toEqual([])
    expect(result.seen).toEqual({})
  })

  it('프리미어로 공개된 MV는 실제 공개 시각을 공개일로 쓴다', async () => {
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'p' }] },
      videos: [
        video('p', "ILLIT (아일릿) 'It's Me' Official MV", HYBE, {
          snippet: {
            title: "ILLIT (아일릿) 'It's Me' Official MV",
            channelId: HYBE,
            channelTitle: 'HYBE LABELS',
            publishedAt: '2026-11-10T00:00:00Z',
            liveBroadcastContent: 'none',
          },
          liveStreamingDetails: { actualStartTime: '2026-11-22T09:00:00Z' },
        }),
      ],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    expect((await discoverNewMvs({ ...base, client })).added[0].released).toBe('2026-11-22')
  })

  it('채널 하나가 실패해도 나머지는 계속하고 경고를 남긴다', async () => {
    const broken: Channel = { id: NEW_LABEL, name: 'Gone', addedAt: '2026-11-22', source: 'seed' }
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'new1' }] },
      videos: [video('new1', "ILLIT (아일릿) 'It's Me' Official MV", HYBE)],
      channelStats: [stats(HYBE, 76_000_000)],
    })

    const result = await discoverNewMvs({ ...base, channels: [...channels, broken], client })

    expect(result.added).toHaveLength(1)
    expect(result.warnings).toEqual([`채널 업로드 목록 Gone (${NEW_LABEL}): playlistNotFound`])
  })

  it('검색 기준 시각이 있을 때만 검색하고, 성공 여부를 알려준다', async () => {
    const noSearch = fakeClient({})
    expect((await discoverNewMvs({ ...base, client: noSearch })).searched).toBe(false)
    expect(noSearch.searches).toEqual([])

    const withSearch = fakeClient({})
    const since = new Date('2026-11-21T15:05:00Z')
    const result = await discoverNewMvs({ ...base, client: withSearch, options: { searchSince: since } })
    expect(withSearch.searches).toEqual([since])
    expect(result.searched).toBe(true)
  })

  it('판단 기록은 30일이 지나면 지운다', async () => {
    const client = fakeClient({})
    const result = await discoverNewMvs({ ...base, seen: { a: '2026-10-23', b: '2026-10-24' }, client })
    expect(result.seen).toEqual({ b: '2026-10-24' })
  })
})

describe('findArtist', () => {
  it('대소문자·공백·기호와 별칭을 무시하고 찾는다', () => {
    const list: Artist[] = [
      { name: 'ROSÉ & Bruno Mars', type: '솔로', aliases: [] },
      { name: 'ILLIT', type: '걸그룹', aliases: ['아일릿'] },
    ]
    expect(findArtist(list, 'rosé & bruno mars')?.name).toBe('ROSÉ & Bruno Mars')
    expect(findArtist(list, '(아일릿)')?.name).toBe('ILLIT')
    expect(findArtist(list, 'NewJeans')).toBeUndefined()
    expect(findArtist(list, '()')).toBeUndefined()
  })
})

describe('collectSnapshot', () => {
  it('조회수를 받고, 못 받은 영상은 missing에 남긴다', async () => {
    const client = fakeClient({
      videos: [
        { id: 'a', statistics: { viewCount: '1200' } },
        { id: 'b', statistics: {} }, // 조회수 비공개
      ],
    })

    expect(await collectSnapshot(client, ['a', 'b', 'gone'], '2026-11-23', NOW)).toEqual({
      date: '2026-11-23',
      fetchedAt: '2026-11-23T00:05:00+09:00',
      views: { a: 1200 },
      missing: ['b', 'gone'],
    })
  })
})

describe('dates', () => {
  it('UTC 시각을 한국 날짜·시로 바꾼다', () => {
    expect(kstDate(NOW)).toBe('2026-11-23')
    expect(kstHour(NOW)).toBe(0)
    expect(kstIso(NOW)).toBe('2026-11-23T00:05:00+09:00')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
