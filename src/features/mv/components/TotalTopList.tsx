import { SectionHeading } from '@/components/SectionHeading'
import { formatDateKo } from '@/lib/format'
import { chartPath } from '../lib/routes'
import type { RankedMv } from '../types'
import { RankRow } from './RankRow'

interface Props {
  items: readonly RankedMv[]
  /** 서버가 준 집계 기준일 YYYY-MM-DD */
  asOf: string
}

/** 누적 TOP 5: 기준일까지의 누적 조회수 상위 몇 곡 */
export function TotalTopList({ items, asOf }: Props) {
  const maxViews = Math.max(items[0]?.views ?? 0, 1)
  return (
    <section aria-labelledby="total-top" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading id="total-top" title={`일간 누적 TOP ${items.length}`} description={formatDateKo(asOf)} more={{ href: chartPath('day'), label: '더보기' }} />
      <ol className="grid gap-2">
        {items.map((mv) => (
          <li key={mv.yt}>
            <RankRow mv={mv} maxViews={maxViews} />
          </li>
        ))}
      </ol>
    </section>
  )
}
