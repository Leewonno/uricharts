import { SectionHeading } from '@/components/SectionHeading'
import { formatDateKo } from '@/lib/format'
import { chartPath } from '../lib/routes'
import type { PeriodInfo, RankedMv } from '../types'
import { EmptyChart } from './EmptyChart'
import { RankRow } from './RankRow'

interface Props {
  /** 누적 범위 일간 차트의 상위 곡들 (집계 중이면 빈 배열) */
  items: readonly RankedMv[]
  /** 보여줄 곡 수 (제목의 TOP n) */
  count: number
  /** 일간 기간 정보 (집계 중 안내에 쓴다) */
  day: PeriodInfo
  /** 서버가 준 집계 기준일 YYYY-MM-DD */
  asOf: string
}

/** 누적 일간 조회수 TOP 5: 누적 범위(공개일과 관계없이 모든 곡) 일간 차트의 1~5위. 더보기는 그 차트로 간다 */
export function DayTopList({ items, count, day, asOf }: Props) {
  const maxViews = Math.max(items[0]?.views ?? 0, 1)
  return (
    <section aria-labelledby="day-top" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading id="day-top" title={`누적 일간 조회수 TOP ${count}`} description={formatDateKo(asOf)} more={{ href: chartPath('day'), label: '더보기' }} />
      {items.length === 0 ? (
        <EmptyChart info={day} />
      ) : (
        <ol className="grid gap-2">
          {items.map((mv) => (
            <li key={mv.yt}>
              <RankRow mv={mv} maxViews={maxViews} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
