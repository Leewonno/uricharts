import type { YoutubeClient, YtChannel, YtVideo } from './youtube-api'

/** 테스트용 가짜 유튜브 클라이언트. 넘겨준 데이터만 돌려준다 */
export function fakeClient({
  uploads = {},
  popular = [],
  search = [],
  videos = [],
  channelStats = [],
}: {
  uploads?: Record<string, { videoId: string; publishedAt?: string }[]>
  popular?: string[]
  search?: string[]
  videos?: YtVideo[]
  channelStats?: YtChannel[]
}): YoutubeClient & { videoRequests: string[][]; searches: Date[] } {
  const state = { videoRequests: [] as string[][], searches: [] as Date[] }
  return {
    get videoRequests() {
      return state.videoRequests
    },
    get searches() {
      return state.searches
    },
    unitsUsed: 0,
    async videos(ids) {
      state.videoRequests.push([...ids])
      return videos.filter((v) => ids.includes(v.id))
    },
    async channels(ids) {
      return channelStats.filter((c) => ids.includes(c.id))
    },
    async recentUploads(channelId, since) {
      if (!(channelId in uploads)) throw new Error('playlistNotFound')
      return uploads[channelId].filter((u) => !u.publishedAt || Date.parse(u.publishedAt) >= since.getTime())
    },
    async mostPopularMusic() {
      return popular
    },
    async searchRecentMvs(publishedAfter) {
      state.searches.push(publishedAfter)
      return search
    },
  }
}
