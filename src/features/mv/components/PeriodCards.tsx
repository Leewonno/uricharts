import Link from 'next/link'
import { Chevron } from '@/components/Chevron'
import { SectionHeading } from '@/components/SectionHeading'
import { chartPath } from '../lib/routes'
import type { PeriodInfo } from '../types'

/** 기간별 차트로 가는 카드 (일간 / 주간 / 월간 / 연간) */
export function PeriodCards({ periods }: { periods: readonly PeriodInfo[] }) {
  return (
    <section aria-labelledby="period-charts" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading id="period-charts" title="기간별 차트" />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {periods.map((p) => (
          <li key={p.key}>
            <Link
              href={chartPath(p.key)}
              className="group relative flex flex-col gap-1 rounded-[20px] bg-surface py-6 pr-14 pl-6 transition-colors duration-200 hover:bg-fill hover:text-ink"
            >
              <h3 className="text-[28px] font-bold tracking-[-0.03em]">{p.name}</h3>
              <p className="text-[15px] font-semibold text-muted group-hover:text-ink">{p.label}</p>
              <Chevron className="absolute top-1/2 right-6 h-[19px] w-3 -translate-y-1/2 text-accent transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
