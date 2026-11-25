import { MvThumbnail } from '@/features/mv/components/MvThumbnail'
import { formatNumber, formatShort } from '@/lib/format'
import type { AboutMv } from '../lib/about-data'

/** 말풍선 안에 넣는 작은 순위 목록 (순위 · 썸네일 · 곡 · 줄인 조회수) */
export function MiniRankList({ items }: { items: readonly AboutMv[] }) {
  return (
    <ol className="grid gap-1.5">
      {items.map((mv, i) => (
        <li
          key={mv.yt}
          className="grid grid-cols-[28px_72px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-linear-to-r from-fill-soft to-page to-70% py-2 pr-3.5 pl-2 max-sm:grid-cols-[22px_56px_minmax(0,1fr)]"
        >
          <span className="text-center text-lg font-semibold tabular-nums">{i + 1}</span>
          <MvThumbnail videoId={mv.yt} sizes="72px" className="w-[72px] rounded-md bg-fill max-sm:w-14" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-strong">{mv.title}</span>
            <span className="block truncate text-xs text-muted">{mv.artist}</span>
          </span>
          <span className="text-[15px] font-semibold tabular-nums max-sm:col-start-3 max-sm:text-[13px]" title={`${formatNumber(mv.views)}회`}>
            {formatShort(mv.views)}
          </span>
        </li>
      ))}
    </ol>
  )
}
