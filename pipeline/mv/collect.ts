import { kstDate, kstHour, kstIso } from './dates'
import type { Snapshot } from './schema'
import type { YoutubeClient } from './youtube-api'

/**
 * 영상들의 지금 누적 조회수를 받아 하루치 기록을 만든다.
 * 요청이 하나라도 끝내 실패하면 예외를 던진다. 반쪽짜리 기록은 남기지 않는다.
 */
export async function collectSnapshot(
  client: YoutubeClient,
  ids: readonly string[],
  date: string,
  now: Date,
): Promise<Snapshot> {
  const videos = await client.videos(ids, ['statistics'])
  const views = Object.fromEntries(
    videos.flatMap((v) => {
      const count = v.statistics?.viewCount
      return count !== undefined && /^\d+$/.test(count) ? [[v.id, Number(count)]] : []
    }),
  )
  return {
    date,
    fetchedAt: kstIso(now),
    views,
    missing: [...new Set(ids)].filter((id) => !(id in views)),
  }
}

/** 0시 기록이 늦어져도 이 시각(KST) 전에 받았으면 그날 0시 기록으로 본다 */
export const MIDNIGHT_CUTOFF_HOUR = 6

/** 그날 0시 기록으로 쓸 수 있는가: 0~6시에 받았거나, 놓친 0시 기록 대신 쓰기로 한 기록 */
export function isMidnightRecord(s: Snapshot): boolean {
  if (s.asMidnight) return true
  const at = new Date(s.fetchedAt)
  return kstDate(at) === s.date && kstHour(at) < MIDNIGHT_CUTOFF_HOUR
}
