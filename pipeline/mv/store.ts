import { access, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { z } from 'zod'

/** data 브랜치(로컬에서는 .data/ 워크트리) 안의 MV 수집 파일 위치 */
export function mvPaths(dataDir: string) {
  const root = join(dataDir, 'mv')
  return {
    root,
    snapshots: join(root, 'snapshots'),
    state: join(root, 'state.json'),
    registry: join(root, 'registry.json'),
    artists: join(root, 'artists.json'),
    channels: join(root, 'channels.json'),
    seen: join(root, 'seen.json'),
    snapshot: (date: string) => join(root, 'snapshots', `${date}.json`),
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** JSON 파일을 읽어 스키마로 검사한다. 파일이 없으면 fallback (없으면 오류) */
export async function readJson<T>(path: string, schema: z.ZodType<T>, fallback?: T): Promise<T> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (fallback !== undefined && (error as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw error
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    throw new Error(`${path} JSON 문법이 잘못됐습니다: ${error instanceof Error ? error.message : String(error)}`)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`${path} 형식이 잘못됐습니다:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`)
  }
  return parsed.data
}

/**
 * 사람이 GitHub에서 읽고 고치기 쉽게 들여쓰기해서 저장한다.
 * 임시 파일에 다 쓴 뒤 바꿔치기해서, 도중에 멈춰도 반쯤 쓴 JSON이 남지 않게 한다.
 */
export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`)
  await rename(tmp, path)
}

/** 기록 파일 날짜 목록 (오래된 것부터) */
export async function snapshotDates(snapshotsDir: string): Promise<string[]> {
  try {
    return (await readdir(snapshotsDir))
      .flatMap((f) => (/^\d{4}-\d{2}-\d{2}\.json$/.test(f) ? [f.slice(0, 10)] : []))
      .toSorted()
  } catch {
    return []
  }
}
