import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_MVS } from '../../src/features/mv/data/sample'
import { nextSearchSince, runDaily, type Logger } from './daily'
import { mvPaths, writeJson } from './store'
import { fakeClient } from './testing'
import type { RegistryEntry } from './schema'
import type { YtVideo } from './youtube-api'

// 2026-11-23(월) 00:05 KST
const MIDNIGHT = new Date('2026-11-22T15:05:00Z')
// 2026-11-23 14:00 KST
const AFTERNOON = new Date('2026-11-23T05:00:00Z')
const HYBE = 'UC3IZKseVpdzPSBaWxBxundA'

const silent: Logger = { info: () => {}, warn: () => {}, error: () => {} }
const views = (id: string, n: number): YtVideo => ({ id, statistics: { viewCount: String(n) } })
const entry = (yt: string): RegistryEntry => ({
  yt,
  title: yt,
  artist: 'ILLIT',
  released: '2026-01-01',
  addedAt: '2026-11-20',
  source: 'seed',
})

let dir: string
let paths: ReturnType<typeof mvPaths>
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mv-daily-'))
  paths = mvPaths(dir)
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const readSnapshot = async (date: string) => JSON.parse(await readFile(paths.snapshot(date), 'utf8'))

async function seedFiles({ registry = [entry('a'), entry('b')] }: { registry?: RegistryEntry[] } = {}) {
  await writeJson(paths.registry, registry)
  await writeJson(paths.artists, [{ name: 'ILLIT', type: '걸그룹', aliases: [] }])
  await writeJson(paths.channels, [{ id: HYBE, name: 'HYBE LABELS', addedAt: '2026-11-20', source: 'seed' }])
}

describe('runDaily', () => {
  it('처음 실행이면 샘플 100곡으로 목록을 만들고 바로 기록한다', async () => {
    const client = fakeClient({ videos: [views(SAMPLE_MVS[0].yt, 100)] })

    const { failures, snapshot } = await runDaily({ client, dataDir: dir, now: MIDNIGHT, search: false, log: silent })

    expect(failures).toEqual([])
    const registry = JSON.parse(await readFile(paths.registry, 'utf8'))
    expect(registry).toHaveLength(SAMPLE_MVS.length)
    expect(snapshot?.views).toEqual({ [SAMPLE_MVS[0].yt]: 100 })
    expect(snapshot?.missing).toHaveLength(SAMPLE_MVS.length - 1)
  })

  it('mv 폴더가 있으면 파일이 없어져도 샘플로 덮어쓰지 않는다', async () => {
    await writeJson(paths.artists, [{ name: '사람이 채운 값', type: '솔로', aliases: [] }])

    const { failures } = await runDaily({ client: fakeClient({}), dataDir: dir, now: MIDNIGHT, search: false, log: silent })

    expect(failures[0]).toContain('registry.json 읽기 실패')
    expect(JSON.parse(await readFile(paths.artists, 'utf8'))[0].name).toBe('사람이 채운 값')
  })

  it('사람이 다른 파일을 잘못 고쳐도 그날 조회수 기록은 남긴다', async () => {
    await seedFiles()
    await writeFile(paths.artists, '[{ "name": "X", "type": "그룹", }]') // 쉼표 오류

    const { failures } = await runDaily({
      client: fakeClient({ videos: [views('a', 10), views('b', 20)] }),
      dataDir: dir,
      now: MIDNIGHT,
      search: false,
      log: silent,
    })

    expect((await readSnapshot('2026-11-23')).views).toEqual({ a: 10, b: 20 })
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('artists.json JSON 문법이 잘못됐습니다')
  })

  it('registry.json이 깨지면 가장 최근 기록의 영상 목록으로 기록한다', async () => {
    await seedFiles()
    await writeJson(paths.snapshot('2026-11-22'), { date: '2026-11-22', fetchedAt: 'x', views: { a: 1 }, missing: ['c'] })
    await writeFile(paths.registry, '[{ "yt": "a", "hiden": true }]')

    const { failures } = await runDaily({
      client: fakeClient({ videos: [views('a', 10), views('c', 5)] }),
      dataDir: dir,
      now: MIDNIGHT,
      search: false,
      log: silent,
    })

    expect((await readSnapshot('2026-11-23')).views).toEqual({ a: 10, c: 5 })
    expect(failures[0]).toContain('registry.json')
  })

  it('새 MV 찾기가 실패해도 조회수 기록은 남기고, 실패를 이슈에 적는다', async () => {
    await seedFiles()
    const base = fakeClient({
      videos: [
        views('a', 10),
        views('b', 20),
        { id: 'new', snippet: { title: 'x MV', channelId: HYBE, channelTitle: 'HYBE', publishedAt: '2026-11-22T09:00:00Z' } },
      ],
      uploads: { [HYBE]: [] },
    })
    const client = {
      ...base,
      unitsUsed: 0,
      channels: async () => {
        throw new Error('quotaExceeded')
      },
      mostPopularMusic: async () => ['new'],
    }
    const issueOut = join(dir, 'issue.md')

    const { failures } = await runDaily({ client, dataDir: dir, now: MIDNIGHT, search: false, issueOut, log: silent })

    expect(Object.keys((await readSnapshot('2026-11-23')).views)).toEqual(['a', 'b'])
    expect(failures).toEqual(['새 MV 찾기 실패: quotaExceeded'])
    expect(await readFile(issueOut, 'utf8')).toContain('새 MV 찾기 실패: quotaExceeded')
  })

  it('조회수를 받다 실패하면 반쪽짜리 기록 파일을 남기지 않는다', async () => {
    await seedFiles()
    const client = {
      ...fakeClient({ uploads: { [HYBE]: [] } }),
      unitsUsed: 0,
      videos: async () => {
        throw new Error('backendError')
      },
    }

    const { failures, snapshot } = await runDaily({ client, dataDir: dir, now: MIDNIGHT, search: false, log: silent })

    expect(snapshot).toBeNull()
    await expect(readFile(paths.snapshot('2026-11-23'))).rejects.toThrow()
    expect(failures[0]).toContain('조회수 기록 실패')
  })

  it('6시 이후에는 기록하지 않지만 새 MV 찾기는 한다', async () => {
    await seedFiles()
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'n1' }] },
      videos: [
        {
          id: 'n1',
          snippet: { title: "ILLIT (아일릿) 'New' Official MV", channelId: HYBE, channelTitle: 'HYBE LABELS', publishedAt: '2026-11-23T03:00:00Z' },
          contentDetails: { duration: 'PT3M' },
        },
      ],
      channelStats: [{ id: HYBE, statistics: { subscriberCount: '76000000' } }],
    })

    const { snapshot, discovery } = await runDaily({ client, dataDir: dir, now: AFTERNOON, search: false, log: silent })

    expect(snapshot).toBeNull()
    expect(discovery?.added.map((a) => a.yt)).toEqual(['n1'])
  })

  it('이미 오늘 기록이 있으면 덮어쓰지 않는다 (재실행·백업 실행)', async () => {
    await seedFiles()
    const existing = { date: '2026-11-23', fetchedAt: 'first', views: { a: 1 }, missing: [] }
    await writeJson(paths.snapshot('2026-11-23'), existing)

    await runDaily({ client: fakeClient({ videos: [views('a', 999)], uploads: { [HYBE]: [] } }), dataDir: dir, now: MIDNIGHT, search: false, log: silent })

    expect(await readSnapshot('2026-11-23')).toEqual(existing)
  })

  it('0시를 놓쳤으면 asMidnight로 지금 값을 그날 0시 기록으로 남긴다 (낮에 남긴 기록은 바꿔 쓴다)', async () => {
    await seedFiles()
    await writeJson(paths.snapshot('2026-11-23'), { date: '2026-11-23', fetchedAt: '2026-11-23T09:15:00+09:00', views: { a: 1 }, missing: [] })

    const { snapshot } = await runDaily({
      client: fakeClient({ videos: [views('a', 10), views('b', 20)], uploads: { [HYBE]: [] } }),
      dataDir: dir,
      now: AFTERNOON,
      search: false,
      asMidnight: true,
      log: silent,
    })

    expect(snapshot?.asMidnight).toBe(true)
    expect(await readSnapshot('2026-11-23')).toMatchObject({ asMidnight: true, views: { a: 10, b: 20 } })
  })

  it('진짜 0시 기록은 asMidnight로도 바꿔 쓰지 않는다', async () => {
    await seedFiles()
    const real = { date: '2026-11-23', fetchedAt: '2026-11-23T00:05:00+09:00', views: { a: 1 }, missing: [] }
    await writeJson(paths.snapshot('2026-11-23'), real)

    await runDaily({ client: fakeClient({ videos: [views('a', 999)], uploads: { [HYBE]: [] } }), dataDir: dir, now: AFTERNOON, search: false, asMidnight: true, log: silent })

    expect(await readSnapshot('2026-11-23')).toEqual(real)
  })

  it('새로 찾은 MV도 오늘 기록에 넣는다 (공개 첫날 기준값)', async () => {
    await seedFiles()
    const client = fakeClient({
      uploads: { [HYBE]: [{ videoId: 'n1' }] },
      videos: [
        views('a', 10),
        views('b', 20),
        {
          id: 'n1',
          snippet: { title: "ILLIT (아일릿) 'New' Official MV", channelId: HYBE, channelTitle: 'HYBE LABELS', publishedAt: '2026-11-22T09:00:00Z' },
          contentDetails: { duration: 'PT3M' },
          statistics: { viewCount: '5000000' },
        },
      ],
      channelStats: [{ id: HYBE, statistics: { subscriberCount: '76000000' } }],
    })

    await runDaily({ client, dataDir: dir, now: MIDNIGHT, search: false, log: silent })

    expect((await readSnapshot('2026-11-23')).views).toEqual({ a: 10, b: 20, n1: 5_000_000 })
    expect(JSON.parse(await readFile(paths.registry, 'utf8')).map((r: RegistryEntry) => r.yt)).toEqual(['a', 'b', 'n1'])
  })

  it('검색은 하루 한 번만 하고, 마지막 검색 시각을 남긴다', async () => {
    await seedFiles()
    const client = fakeClient({ uploads: { [HYBE]: [] } })

    await runDaily({ client, dataDir: dir, now: MIDNIGHT, search: true, log: silent })
    await runDaily({ client, dataDir: dir, now: new Date(MIDNIGHT.getTime() + 3_600_000), search: true, log: silent })

    expect(client.searches).toHaveLength(1)
    expect(JSON.parse(await readFile(paths.state, 'utf8'))).toEqual({ lastSearchAt: MIDNIGHT.toISOString() })
  })

  it('월요일에는 주간 요약을 만든다', async () => {
    await seedFiles({ registry: [{ ...entry('a'), source: 'auto', addedAt: '2026-11-20' }] })
    const digestOut = join(dir, 'digest.md')

    await runDaily({ client: fakeClient({ uploads: { [HYBE]: [] } }), dataDir: dir, now: MIDNIGHT, search: false, digestOut, log: silent })

    expect(await readFile(digestOut, 'utf8')).toContain('### 자동 추가한 곡 (1)')
  })
})

describe('nextSearchSince', () => {
  it('처음이면 하루 전부터, 오늘 이미 했으면 null, 며칠 빠졌으면 마지막 검색부터 (최대 7일)', () => {
    expect(nextSearchSince(undefined, MIDNIGHT)).toEqual(new Date('2026-11-21T15:05:00Z'))
    expect(nextSearchSince('2026-11-22T15:10:00Z', MIDNIGHT)).toBeNull() // 같은 11/23 (KST)
    expect(nextSearchSince('2026-11-19T15:05:00Z', MIDNIGHT)).toEqual(new Date('2026-11-19T15:05:00Z'))
    expect(nextSearchSince('2026-10-01T00:00:00Z', MIDNIGHT)).toEqual(new Date('2026-11-15T15:05:00Z'))
  })
})
