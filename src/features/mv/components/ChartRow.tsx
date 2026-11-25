import { formatDateDot, formatNumber } from '@/lib/format'
import type { ChartEntry } from '../types'
import { useMvPlayer } from './MvPlayer'
import { MvThumbnail } from './MvThumbnail'
import { ChangeBadge, RowGo, rowLabel } from './RowParts'

/**
 * 차트 표의 칸.
 * - 일간·주간·월간: 순위 · 노래 · 누적 · 조회수 · 변동 · 보러가기 (누적은 기간 끝 기록의 전체 조회수)
 * - 연간: 순위 · 노래 · 공개일 · 조회수 · 보러가기 (직전 해와 비교하지 않아 변동 칸이 없다)
 */
export const CHART_COLUMNS = {
  change: 'sm:grid-cols-[64px_1fr_150px_150px_72px_100px]',
  released: 'sm:grid-cols-[64px_1fr_110px_170px_100px]',
} as const

/** 조회수 옆에 붙는 칸: 변동(일간·주간·월간) 또는 공개일(연간) */
export type ChartExtra = keyof typeof CHART_COLUMNS

interface Props {
  mv: ChartEntry
  /** 조회수 막대 길이의 기준 (1위 조회수) */
  maxViews: number
  extra: ChartExtra
}

/** 차트 페이지의 순위 한 줄. 누르면 뮤직비디오 모달이 열린다. */
export function ChartRow({ mv, maxViews, extra }: Props) {
  const openPlayer = useMvPlayer()
  return (
    <button
      type="button"
      onClick={() => openPlayer(mv)}
      aria-haspopup="dialog"
      aria-label={rowLabel(mv)}
      className={`group relative grid w-full cursor-pointer text-left grid-cols-[32px_1fr_auto_auto] items-center gap-2 overflow-hidden rounded-[14px] px-5 py-3.5 max-sm:px-3 transition-colors duration-200 bg-surface hover:bg-fill-soft focus-visible:bg-fill-soft sm:gap-4 ${CHART_COLUMNS[extra]}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-linear-to-r from-fill/50 to-transparent"
        style={{ width: `${(mv.views / maxViews) * 100}%` }}
      />
      <div className="relative text-2xl leading-none font-semibold tabular-nums max-sm:text-base">{mv.rank}</div>
      <div className="relative flex min-w-0 items-center gap-3.5 max-sm:gap-2.5">
        <MvThumbnail videoId={mv.yt} sizes="96px" className="w-24 rounded-lg bg-fill-soft max-sm:w-14 max-sm:rounded-md" />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-bold max-sm:text-sm">{mv.title}</div>
          <div className="truncate text-sm text-muted max-sm:text-xs">{mv.artist}</div>
        </div>
      </div>
      {extra === 'released' && (
        <div className="relative text-center text-sm font-normal tracking-[-0.04em] text-muted tabular-nums max-sm:hidden">{formatDateDot(mv.released)}</div>
      )}
      {extra === 'change' && (
        <div className="relative text-right text-base font-semibold tracking-[-0.04em] text-muted tabular-nums max-sm:hidden">{formatNumber(mv.total)}</div>
      )}
      <div className="relative text-right text-xl font-semibold tracking-[-0.04em] tabular-nums max-sm:text-sm">{formatNumber(mv.views)}</div>
      {extra === 'change' && (
        <div className="relative text-center text-sm font-bold max-sm:hidden">
          <ChangeBadge change={mv.change} />
        </div>
      )}
      <RowGo />
    </button>
  )
}
