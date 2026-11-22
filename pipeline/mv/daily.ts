import { writeFile } from 'node:fs/promises'
import { bootstrapFromSample } from './bootstrap'
import { collectSnapshot } from './collect'
import { addDays, kstDate, kstHour, kstWeekday } from './dates'
import { discoverNewMvs, type DiscoverResult } from './discover'
import { dailyIssue, weeklyDigest } from './report'
import {
  artistsSchema,
  channelsSchema,
  registrySchema,
  seenSchema,
  snapshotSchema,
  stateSchema,
  type RegistryEntry,
  type Snapshot,
} from './schema'
import { exists, mvPaths, readJson, snapshotDates, writeJson } from './store'
import type { YoutubeClient } from './youtube-api'

/**
 * 하루 한 번 도는 MV 수집. 순서가 중요하다.
 *
 *   1. 조회수 기록 — 가장 먼저, registry.json 하나만 읽고 한다.
 *      0시 기록은 놓치면 되돌릴 수 없어서, 사람이 다른 파일을 잘못 고쳐도 이 단계는 돌게 한다.
 *      registry.json마저 깨졌으면 가장 최근 기록의 영상 목록으로 기록한다.
 *   2. 새 MV 찾기 — 실패해도 1은 이미 끝나 있다.
 *   3. 새로 찾은 곡의 조회수를 오늘 기록에 덧붙인다 (공개 첫날 기준값).
 *   4. 사람이 볼 이슈 본문, 월요일이면 주간 요약.
 */

/** 조회수 기록은 0시~6시(KST)에만 남긴다. 낮에 손으로 돌려서 그날 0시 기록이 낮 값으로 채워지는 걸 막는다 */
export const SNAPSHOT_CUTOFF_HOUR = 6
/** 검색 기준 시각을 이보다 오래 거슬러 가지 않는다 */
const MAX_SEARCH_LOOKBACK_DAYS = 7
const MONDAY = 1

export interface Logger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface DailyInput {
  readonly client: YoutubeClient
  readonly dataDir: string
  readonly now: Date
  /** MV 검색(100유닛)을 할지. 해도 하루 한 번만 한다 */
  readonly search: boolean
  readonly forceSnapshot?: boolean
  /** 사람이 볼 것이 있으면 이슈 본문을 이 파일에 쓴다 */
  readonly issueOut?: string
  /** 월요일이면 주간 요약을 이 파일에 쓴다 */
  readonly digestOut?: string
  readonly log?: Logger
}

export interface DailyOutcome {
  readonly failures: readonly string[]
  readonly snapshot: Snapshot | null
  readonly discovery: DiscoverResult | null
}

export async function runDaily({
  client,
  dataDir,
  now,
  search,
  forceSnapshot = false,
  issueOut,
  digestOut,
  log = console,
}: DailyInput): Promise<DailyOutcome> {
  const today = kstDate(now)
  const paths = mvPaths(dataDir)
  const failures: string[] = []
  const fail = (label: string, error: unknown) => {
    const message = `${label}: ${error instanceof Error ? error.message : String(error)}`
    failures.push(message)
    log.error(message)
  }

  // 0. mv 폴더가 통째로 없을 때만(처음 실행) 샘플 데이터로 시작한다.
  //    파일 하나가 없어졌다고 다시 만들면 사람이 채운 아티스트 구분 등을 덮어쓴다.
  if (!(await exists(paths.root))) {
    const seed = await bootstrapFromSample(client, now)
    await writeJson(paths.registry, seed.registry)
    await writeJson(paths.artists, seed.artists)
    await writeJson(paths.channels, seed.channels)
    seed.warnings.forEach((w) => log.warn(w))
    log.info(`처음 목록을 만들었습니다: 곡 ${seed.registry.length}, 아티스트 ${seed.artists.length}, 채널 ${seed.channels.length}`)
  }

  let registry: RegistryEntry[] | null = null
  try {
    registry = await readJson(paths.registry, registrySchema)
  } catch (error) {
    fail('registry.json 읽기 실패', error)
  }

  // 1. 조회수 기록
  const snapshotPath = paths.snapshot(today)
  let snapshot: Snapshot | null = null
  if (await exists(snapshotPath)) {
    log.info(`${today} 기록이 이미 있어 건너뜁니다`)
  } else if (kstHour(now) >= SNAPSHOT_CUTOFF_HOUR && !forceSnapshot) {
    log.warn(`지금은 ${kstHour(now)}시(KST)라 조회수 기록을 건너뜁니다 (0~${SNAPSHOT_CUTOFF_HOUR}시에만 기록)`)
  } else {
    try {
      const ids = registry ? registry.map((r) => r.yt) : await idsFromLatestSnapshot(paths)
      snapshot = await collectSnapshot(client, ids, today, now)
      await writeJson(snapshotPath, snapshot)
      log.info(`${today} 조회수 기록: ${Object.keys(snapshot.views).length}곡, 못 받음 ${snapshot.missing.length}`)
    } catch (error) {
      snapshot = null
      fail('조회수 기록 실패', error)
    }
  }

  // 2. 새 MV 찾기
  let discovery: DiscoverResult | null = null
  const writeIssue = async () => {
    const issue = dailyIssue(today, discovery ?? EMPTY_DISCOVERY, failures)
    if (issue && issueOut) await writeFile(issueOut, issue)
  }
  if (registry) {
    try {
      const [artists, channels, seen, state] = await Promise.all([
        readJson(paths.artists, artistsSchema, []),
        readJson(paths.channels, channelsSchema, []),
        readJson(paths.seen, seenSchema, {}),
        readJson(paths.state, stateSchema, {}),
      ])
      const searchSince = search ? nextSearchSince(state.lastSearchAt, now) : null
      if (search && !searchSince) log.info('오늘은 이미 검색했습니다')

      discovery = await discoverNewMvs({ client, registry, artists, channels, seen, now, options: { searchSince } })
      discovery.warnings.forEach((w) => log.warn(w))
      log.info(
        `새 MV ${discovery.added.length}곡 추가, 새 아티스트 ${discovery.newArtists.length}, 확인 필요 ${discovery.unsure.length}`,
      )

      // 확인이 필요한 영상은 seen에 들어가 다시 묻지 않으니, 이슈 본문부터 남기고 저장한다
      await writeIssue()
      registry = [...registry, ...discovery.added]
      await writeJson(paths.registry, registry)
      await writeJson(paths.artists, [...artists, ...discovery.newArtists])
      await writeJson(paths.seen, discovery.seen)
      if (discovery.searched) await writeJson(paths.state, { ...state, lastSearchAt: now.toISOString() })
    } catch (error) {
      fail('새 MV 찾기 실패', error)
    }
  }

  // 3. 새로 찾은 곡도 오늘 기록에 넣는다
  if (snapshot && discovery?.added.length) {
    try {
      const extra = await collectSnapshot(client, discovery.added.map((a) => a.yt), today, now)
      snapshot = {
        ...snapshot,
        views: { ...snapshot.views, ...extra.views },
        missing: [...snapshot.missing, ...extra.missing],
      }
      await writeJson(snapshotPath, snapshot)
    } catch (error) {
      log.warn(`새 곡 조회수를 오늘 기록에 넣지 못했습니다: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 4. 보고서
  await writeIssue()
  if (registry && digestOut && kstWeekday(now) === MONDAY) {
    try {
      const artists = await readJson(paths.artists, artistsSchema, [])
      const digest = weeklyDigest(today, addDays(today, -7), registry, artists)
      if (digest) await writeFile(digestOut, digest)
    } catch (error) {
      log.warn(`주간 요약을 만들지 못했습니다: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { failures, snapshot, discovery }
}

/**
 * 다음 검색은 마지막 검색 이후 올라온 영상을 찾는다 (실행이 며칠 빠져도 놓치지 않게).
 * 오늘 이미 검색했으면 null — 재실행해도 하루 한 번만 검색한다.
 */
export function nextSearchSince(lastSearchAt: string | undefined, now: Date): Date | null {
  const oneDayAgo = new Date(now.getTime() - 86_400_000)
  if (!lastSearchAt) return oneDayAgo
  const last = new Date(lastSearchAt)
  if (Number.isNaN(last.getTime())) return oneDayAgo
  if (kstDate(last) === kstDate(now)) return null
  const oldest = new Date(now.getTime() - MAX_SEARCH_LOOKBACK_DAYS * 86_400_000)
  return last < oldest ? oldest : last
}

/** registry.json을 못 읽을 때, 가장 최근 기록에 있던 영상들을 대신 기록한다 */
async function idsFromLatestSnapshot(paths: ReturnType<typeof mvPaths>): Promise<string[]> {
  const latest = (await snapshotDates(paths.snapshots)).at(-1)
  if (!latest) throw new Error('registry.json도, 이전 기록도 없어 기록할 영상 목록이 없습니다')
  const prev = await readJson(paths.snapshot(latest), snapshotSchema)
  return [...Object.keys(prev.views), ...prev.missing]
}

const EMPTY_DISCOVERY: DiscoverResult = { added: [], newArtists: [], unsure: [], seen: {}, searched: false, warnings: [] }
