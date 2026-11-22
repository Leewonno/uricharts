import { join } from 'node:path'
import { exists, mvPaths, readJson, snapshotDates } from '../../../../pipeline/mv/store'
import { artistsSchema, registrySchema, snapshotSchema, type Snapshot } from '../../../../pipeline/mv/schema'
import { buildChartData, chartSnapshotDates } from '../lib/chart-data'
import type { MvSnapshot } from '../types'
import { PERIODS, REF_DATE, SAMPLE_MVS } from './sample'

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
  const [registry, artists, dates] = await Promise.all([
    readJson(paths.registry, registrySchema),
    readJson(paths.artists, artistsSchema, []),
    snapshotDates(paths.snapshots),
  ])
  const latestDate = dates.at(-1)
  if (!latestDate) throw new Error(`${paths.snapshots}에 조회수 기록이 없습니다`)

  const available = new Set(dates)
  const needed = chartSnapshotDates(latestDate).filter((d) => available.has(d))
  const snapshots = new Map<string, Snapshot>(
    await Promise.all(needed.map(async (d) => [d, await readJson(paths.snapshot(d), snapshotSchema)] as const)),
  )

  return buildChartData({ registry, artists, snapshots, firstDate: dates[0], latestDate })
}

let cached: Promise<MvSnapshot> | null = null

/**
 * MV 조회수와 그 집계 기준일, 기간 정보를 함께 가져온다. 빌드할 때 한 번 읽고 페이지끼리 같이 쓴다.
 * 화면에서 기준일을 오늘 날짜로 계산하지 말고 이 값을 쓴다 (집계가 늦어지면 날짜가 어긋난다).
 */
export function getMvSnapshot(): Promise<MvSnapshot> {
  cached ??= resolveDataDir().then((dir) =>
    dir ? loadFromData(dir) : { asOf: REF_DATE, mvs: SAMPLE_MVS, periods: PERIODS },
  )
  return cached
}
