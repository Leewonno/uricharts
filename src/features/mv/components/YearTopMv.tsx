import { CountUp } from '@/components/CountUp'
import { SectionHeading } from '@/components/SectionHeading'
import { embedUrl } from '../lib/youtube'
import type { RankedMv } from '../types'

/** 올해의 MV: 올해 공개된 MV 중 누적 조회수 1위. 홈에서 바로 볼 수 있게 플레이어를 넣는다 */
export function YearTopMv({ mv, year }: { mv: RankedMv; year: string }) {
  return (
    <section aria-labelledby="year-top-mv" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pt-6 pb-14">
      <SectionHeading id="year-top-mv" title="올해의 MV" description={`${year}년 공개곡 중 누적 조회수 1위`} />
      {/* 제목 왼쪽, 아티스트·누적 조회수 오른쪽. 좁은 화면에서는 아래로 내려간다 */}
      <div className="mt-1 mb-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <p className="text-[clamp(48px,7vw,96px)] leading-none font-bold tracking-[-0.04em] max-sm:text-[32px]">{mv.title}</p>
        <dl className="flex flex-wrap gap-x-14 gap-y-4">
          <div>
            <dt className="text-sm font-semibold text-muted max-sm:text-xs">아티스트</dt>
            <dd className="mt-0.5 text-3xl leading-[1.1] font-semibold max-sm:text-xl">{mv.artist}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted max-sm:text-xs">누적 조회수</dt>
            <dd className="mt-0.5 text-3xl leading-[1.1] font-semibold tracking-[-0.04em] text-accent tabular-nums max-sm:text-xl">
              <CountUp value={mv.total} />
            </dd>
          </div>
        </dl>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl(mv.yt, { autoplay: false })}
          title={`${mv.artist} ${mv.title} 뮤직비디오`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
      </div>
    </section>
  )
}
