import { CountUp } from '@/components/CountUp'
import { SectionHeading } from '@/components/SectionHeading'
import type { RankedMv } from '../types'
import { MvThumbnail } from './MvThumbnail'

/** 올해의 MV: 올해 공개된 MV 중 누적 조회수 1위 */
export function YearTopMv({ mv, year }: { mv: RankedMv; year: string }) {
  return (
    <section aria-labelledby="year-top-mv" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pt-6 pb-14">
      <SectionHeading id="year-top-mv" title="올해의 MV" description={`${year}년 공개곡 중 누적 조회수 1위`} />
      <p className="mt-1 mb-5 text-[clamp(48px,7vw,96px)] leading-none font-bold tracking-[-0.04em]">{mv.title}</p>
      <div className="flex items-center gap-6">
        <MvThumbnail videoId={mv.yt} sizes="(max-width: 767px) 120px, 240px" priority className="w-[120px] rounded-[10px] bg-fill-soft md:w-60" />
        <dl>
          <dt className="text-sm font-semibold text-muted">아티스트</dt>
          <dd className="text-[22px] font-semibold">{mv.artist}</dd>
          <dt className="mt-4 text-sm font-semibold text-muted">누적 조회수</dt>
          <dd className="mt-0.5 text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-accent tabular-nums">
            <CountUp value={mv.total} />
          </dd>
        </dl>
      </div>
    </section>
  )
}
