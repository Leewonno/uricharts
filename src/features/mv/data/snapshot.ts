import { join } from 'node:path'
import { exists, mvPaths, readJson, snapshotDates } from '../../../../pipeline/mv/store'
import { registrySchema, snapshotSchema, type Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartBook, type ChartBook } from '../lib/chart-book'
import { buildChartData, chartSnapshotDates, type ChartSource } from '../lib/chart-data'
import type { MvSnapshot } from '../types'
import { PERIODS, REF_DATE, SAMPLE_MVS, sampleChartSource } from './sample'

/**
 * 수집 기록이 있는 폴더 (data 브랜치를 꺼내 둔 곳).
 * - MV_DATA_DIR를 주면 그 폴더를 쓰고, 기록이 없으면 빌드를 멈춘다 (배포에서 샘플이 나가지 않게)
 * - 안 주면 저장소의 .data를 쓰고, 그것도 없으면 샘플을 쓴다 (로컬 개발)
 */
async function resolveDataDir(): Promise<string | null> {
  const configured = process.env.MV_DATA_DIR
  if (configured) {
    if (!(await exists(mvPaths(configured).registry))) {
      throw new Error(`MV_DATA_DIR(${configured})에 mv/registry.json이 없습니다. data 브랜치를 꺼냈는지 확인하세요.`)
    }
    return configured
  }
  const local = join(process.cwd(), '.data')
  return (await exists(mvPaths(local).registry)) ? local : null
}

async function loadFromData(dataDir: string): Promise<MvSnapshot> {
  const paths = mvPaths(dataDir)
  const [registry, dates] = await Promise.all([readJson(paths.registry, registrySchema), snapshotDates(paths.snapshots)])
  const latestDate = dates.at(-1)
  if (!latestDate) throw new Error(`${paths.snapshots}에 조회수 기록이 없습니다`)

  const available = new Set(dates)
  const needed = chartSnapshotDates(latestDate).filter((d) => available.has(d))
  const snapshots = new Map<string, Snapshot>(
    await Promise.all(needed.map(async (d) => [d, await readJson(paths.snapshot(d), snapshotSchema)] as const)),
  )

  return buildChartData({ registry, snapshots, firstDate: dates[0], latestDate })
}

const load = async (): Promise<MvSnapshot> => {
  const dir = await resolveDataDir()
  return dir ? loadFromData(dir) : { asOf: REF_DATE, mvs: SAMPLE_MVS, periods: PERIODS }
}

let cached: Promise<MvSnapshot> | null = null

/**
 * MV 조회수와 그 집계 기준일, 기간 정보를 함께 가져온다.
 * 빌드할 때는 한 번 읽어 페이지끼리 같이 쓰고, 개발 서버에서는 기록이 바뀌면 바로 보이도록 요청마다 읽는다.
 * 화면에서 기준일을 오늘 날짜로 계산하지 말고 이 값을 쓴다 (집계가 늦어지면 날짜가 어긋난다).
 */
export function getMvSnapshot(): Promise<MvSnapshot> {
  if (process.env.NODE_ENV !== 'production') return load()
  cached ??= load()
  return cached
}

/** 모든 기록을 읽는다 (차트 페이지에서 지난 기간도 고를 수 있게) */
async function loadSource(dataDir: string): Promise<ChartSource> {
  const paths = mvPaths(dataDir)
  const [registry, dates] = await Promise.all([readJson(paths.registry, registrySchema), snapshotDates(paths.snapshots)])
  const latestDate = dates.at(-1)
  if (!latestDate) throw new Error(`${paths.snapshots}에 조회수 기록이 없습니다`)
  const snapshots = new Map<string, Snapshot>(
    await Promise.all(dates.map(async (d) => [d, await readJson(paths.snapshot(d), snapshotSchema)] as const)),
  )
  return { registry, snapshots, firstDate: dates[0], latestDate }
}

const loadBook = async (): Promise<ChartBook> => {
  const dir = await resolveDataDir()
  return buildChartBook(dir ? await loadSource(dir) : sampleChartSource())
}

let cachedBook: Promise<ChartBook> | null = null

/**
 * 차트 페이지용: 기간(하루·주·달·해)마다 고를 수 있는 차트 묶음.
 * getMvSnapshot처럼 빌드할 때는 한 번만 읽고, 개발 서버에서는 요청마다 읽는다.
 */
export function getMvChartBook(): Promise<ChartBook> {
  if (process.env.NODE_ENV !== 'production') return loadBook()
  cachedBook ??= loadBook()
  return cachedBook
}
