import { SectionHeading } from '@/components/SectionHeading'
import { chartPath } from '../lib/routes'
import type { PeriodInfo, RankedMv } from '../types'
import { EmptyChart } from './EmptyChart'
import { RankRow } from './RankRow'

interface Props {
  /** 올해 공개곡 연간 차트의 상위 곡들 (집계 중이면 빈 배열) */
  items: readonly RankedMv[]
  /** 보여줄 곡 수 (제목의 TOP n) */
  count: number
  /** 공개 연도 YYYY (기준일이 속한 해) */
  year: string
  /** 연간 기간 정보 (집계 중 안내에 쓴다) */
  period: PeriodInfo
}

/** 연간 조회수 TOP 5: 올해 공개곡 연간 차트의 1~5위. 더보기는 연간 차트로 간다 */
export function YearTopList({ items, count, year, period }: Props) {
  const maxViews = Math.max(items[0]?.views ?? 0, 1)
  return (
    <section aria-labelledby="year-top" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading
        id="year-top"
        title={`연간 조회수 TOP ${count}`}
        description={`${year}년 공개곡`}
        more={{ href: chartPath('year'), label: '더보기' }}
      />
      {items.length === 0 ? (
        <EmptyChart available={period.available} availableFrom={period.availableFrom} />
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
