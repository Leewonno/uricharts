import Link from 'next/link'
import { ChevronRight, Moon, Planet, Star, Sun } from 'akar-icons'
import { SectionHeading } from '@/components/SectionHeading'
import { chartPath } from '../lib/routes'
import type { Period, PeriodInfo } from '../types'

/** 제목 왼쪽 아이콘: 해 · 별 · 달 · 행성 */
const PERIOD_ICONS: Record<Period, typeof Sun> = {
  day: Sun,
  week: Star,
  month: Moon,
  year: Planet,
}

/**
 * 기간별 차트로 가는 카드 (일간 / 주간 / 월간 / 연간).
 * 마우스를 올리면 흐르는 그라데이션이 서서히 나타난다. 그라데이션은 바로 전환할 수 없어 겹친 층의 투명도를 바꾼다.
 */
export function PeriodCards({ periods }: { periods: readonly PeriodInfo[] }) {
  return (
    <section aria-labelledby="period-charts" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pb-14">
      <SectionHeading id="period-charts" title="기간별 차트" />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {periods.map((p) => {
          const Icon = PERIOD_ICONS[p.key]
          return (
            <li key={p.key}>
              <Link
                href={chartPath(p.key)}
                className="group relative isolate flex flex-col gap-1 overflow-hidden rounded-[20px] bg-surface py-6 pr-14 pl-6 hover:text-ink"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-flow opacity-0 transition-opacity duration-350 ease-out group-hover:animate-flow group-hover:opacity-100 motion-reduce:group-hover:animate-none"
                />
                <h3 className="flex items-center gap-2 text-[28px] font-bold tracking-[-0.03em]">
                  <Icon size={26} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-accent transition-colors duration-200 group-hover:text-ink" />
                  {p.name}
                </h3>
                <p className="text-[15px] font-semibold text-muted group-hover:text-ink">{p.available ? p.label : '집계 중'}</p>
                <ChevronRight size={22} strokeWidth={3} aria-hidden="true" className="absolute top-1/2 right-5 -translate-y-1/2 text-accent transition-colors duration-200 group-hover:text-ink" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
