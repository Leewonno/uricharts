import { formatNumber, formatShort } from '@/lib/format'
import type { RankedMv } from '../types'
import { watchUrl } from '../lib/youtube'
import { MvThumbnail } from './MvThumbnail'
import { ChangeBadge, RowGo, rowLabel } from './RowParts'

/** 차트 표의 칸: 순위 · 노래 · 조회수 · 변동 · 누적(또는 하루 평균) · 보러가기 */
export const CHART_COLUMNS = 'md:grid-cols-[64px_1fr_170px_72px_110px_100px]'

interface Props {
  mv: RankedMv
  /** 조회수 막대 길이의 기준 (1위 조회수) */
  maxViews: number
  /** 1위 행: 채움 색으로 강조하고 막대는 숨긴다 */
  lead: boolean
  /** 오른쪽 칸에 누적 대신 보여줄 값 (예: 하루 평균). 없으면 누적 */
  sub?: number
}

/** 차트 페이지의 순위 한 줄. 누르면 유튜브 뮤직비디오로 이동한다. */
export function ChartRow({ mv, maxViews, lead, sub }: Props) {
  return (
    <a
      href={watchUrl(mv.yt)}
      target="_blank"
      rel="noopener"
      aria-label={rowLabel(mv)}
      className={`group relative grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 overflow-hidden rounded-[14px] px-5 py-3.5 transition-colors duration-200 md:gap-4 ${CHART_COLUMNS} ${
        lead ? 'bg-fill' : 'bg-surface hover:bg-fill-soft focus-visible:bg-fill-soft'
      }`}
    >
      {!lead && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-linear-to-r from-fill/50 to-transparent"
          style={{ width: `${(mv.views / maxViews) * 100}%` }}
        />
      )}
      <div className="relative text-[26px] leading-none font-semibold tabular-nums max-sm:text-xl">{mv.rank}</div>
      <div className="relative flex min-w-0 items-center gap-3.5">
        <MvThumbnail videoId={mv.yt} sizes="96px" className="w-16 rounded-lg bg-fill-soft max-sm:hidden md:w-24" />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-bold">{mv.title}</div>
          <div className="truncate text-sm text-muted">{mv.artist}</div>
        </div>
      </div>
      <div className="relative text-right text-xl font-semibold tracking-[-0.04em] tabular-nums max-sm:text-[15px]">{formatNumber(mv.views)}</div>
      <div className="relative text-center text-sm font-bold max-md:hidden">
        <ChangeBadge change={mv.change} lead={lead} />
      </div>
      <div className="relative text-right text-[15px] text-muted max-md:hidden">{formatShort(sub ?? mv.total)}</div>
      <RowGo lead={lead} />
    </a>
  )
}
