'use client'

import { formatShort } from '@/lib/format'
import type { RankedMv } from '../types'
import { useMvPlayer } from './MvPlayer'
import { MvThumbnail } from './MvThumbnail'
import { RowGo, rowLabel } from './RowParts'

/**
 * 홈 "연간 조회수 TOP 5"의 순위 한 줄. 순위 변동은 표시하지 않는다. 누르면 뮤직비디오 모달이 열린다.
 * 마우스를 올리면 >>> 가 한 번 지나가고 끝에 > 버튼이 나타난다.
 * 조회수는 평소 오른쪽 끝(버튼 자리)에 있다가, 마우스를 올리면 왼쪽으로 비켜 버튼 자리를 내준다.
 * 터치 기기는 버튼이 항상 보이므로 조회수를 처음부터 버튼 왼쪽에 둔다.
 */
export function RankRow({ mv, maxViews }: { mv: RankedMv; maxViews: number }) {
  const openPlayer = useMvPlayer()
  return (
    <button
      type="button"
      onClick={() => openPlayer(mv)}
      aria-haspopup="dialog"
      aria-label={rowLabel(mv)}
      className="group relative grid w-full cursor-pointer text-left grid-cols-[32px_1fr_auto_auto] items-center gap-4 overflow-hidden rounded-xl bg-surface px-5 py-3 transition-colors duration-200 hover:bg-fill-soft focus-visible:bg-fill-soft sm:grid-cols-[56px_1fr_120px_100px]"
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-fill/50" style={{ width: `${(mv.views / maxViews) * 100}%` }} />
      <div className="relative text-[22px] font-semibold tabular-nums max-sm:text-lg">{mv.rank}</div>
      <div className="relative flex min-w-0 items-center gap-3.5">
        {/* 조회수 막대(cyan-200 반투명) 위라 자리 색을 한 단계 진하게 */}
        <MvThumbnail videoId={mv.yt} sizes="80px" className="w-14 rounded-md bg-fill sm:w-20" />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold max-sm:text-base">{mv.title}</div>
          <div className="truncate text-sm text-muted max-sm:text-xs">{mv.artist}</div>
        </div>
      </div>
      {/* 116px = 버튼 칸(100px) + 칸 사이 간격(gap-4, 16px). grid-cols의 값과 맞춘다 */}
      <div className="relative text-right text-[19px] font-semibold tracking-[-0.06em] tabular-nums transition-transform duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-focus-visible:translate-x-0 motion-reduce:transition-none sm:can-hover:translate-x-[116px] max-sm:text-sm">
        {formatShort(mv.views)}
      </div>
      <RowGo />
    </button>
  )
}
