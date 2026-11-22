import { kstIso } from './dates'
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
