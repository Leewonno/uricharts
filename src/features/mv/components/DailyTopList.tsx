import { SectionHeading } from '@/components/SectionHeading'
import { chartPath } from '../lib/routes'
import type { RankedMv } from '../types'
import { RankRow } from './RankRow'

/** 어제 TOP 5: 일간 순위 상위 몇 곡 */
export function DailyTopList({ items }: { items: readonly RankedMv[] }) {
  const maxViews = Math.max(items[0]?.views ?? 0, 1)
  return (
    <section aria-labelledby="daily-top" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading id="daily-top" title={`어제 TOP ${items.length}`} more={{ href: chartPath('day'), label: '차트 전체 보기' }} />
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
