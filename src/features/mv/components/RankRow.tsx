import { formatShort } from '@/lib/format'
import type { RankedMv } from '../types'
import { watchUrl } from '../lib/youtube'
import { MvThumbnail } from './MvThumbnail'
import { ChangeBadge, RowGo, rowLabel } from './RowParts'

/**
 * 홈 "어제 TOP 5"의 순위 한 줄. 누르면 유튜브 뮤직비디오로 이동한다.
 * 마우스를 올리면 >>> 가 한 번 지나가고 끝에 > 버튼이 나타난다.
 */
export function RankRow({ mv, maxViews }: { mv: RankedMv; maxViews: number }) {
  return (
    <a
      href={watchUrl(mv.yt)}
      target="_blank"
      rel="noopener"
      aria-label={rowLabel(mv)}
      className="group relative grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 overflow-hidden rounded-xl bg-surface px-5 py-3 transition-colors duration-200 hover:bg-fill-soft focus-visible:bg-fill-soft md:grid-cols-[56px_1fr_120px_56px_100px]"
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-fill/50" style={{ width: `${(mv.views / maxViews) * 100}%` }} />
      <div className="relative text-[22px] font-semibold tabular-nums">{mv.rank}</div>
      <div className="relative flex min-w-0 items-center gap-3.5">
        {/* 조회수 막대(cyan-200 반투명) 위라 자리 색을 한 단계 진하게 */}
        <MvThumbnail videoId={mv.yt} sizes="80px" className="w-14 rounded-md bg-fill md:w-20" />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{mv.title}</div>
          <div className="truncate text-sm text-muted">{mv.artist}</div>
        </div>
      </div>
      <div className="relative text-right text-[19px] font-semibold tracking-[-0.02em] tabular-nums">{formatShort(mv.views)}</div>
      <div className="relative text-right text-sm font-bold max-md:hidden">
        <ChangeBadge change={mv.change} />
      </div>
      <RowGo />
    </a>
  )
}
