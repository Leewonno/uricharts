'use client'

import Link from 'next/link'
import type { ChartNav } from '../lib/chart-nav'
import { PERIOD_NAMES } from '../lib/periods'
import type { ChartEntry, ChartView } from '../types'
import { CHART_COLUMNS, ChartRow, type ChartExtra } from './ChartRow'
import { ClosedNotice } from './ClosedNotice'
import { EmptyChart } from './EmptyChart'
import { PeriodPicker } from './PeriodPicker'
import { YearSelect } from './YearSelect'

/** 차트에 보여줄 최대 순위 */
const CHART_SIZE = 150

interface Props {
  view: ChartView
  /** 연도·기간 탭·기간 이동 주소 */
  nav: ChartNav
}

/**
 * 연도 드롭다운 + 기간 탭 + 기간 고르기 + (마감 안내) + 순위 표.
 * 차트는 고른 해에 공개된 곡만 보여주고, 기간 이동은 그 해 안에서만 된다.
 */
export function ChartBoard({ view, nav }: Props) {
  const { period } = view
  const rows = view.rows.slice(0, CHART_SIZE)
  const maxViews = Math.max(rows[0]?.views ?? 0, 1)

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-stretch gap-2">
        <YearSelect years={nav.years} />
        <nav aria-label="기간" className="inline-flex gap-1 rounded-full bg-surface p-1.5 max-sm:p-1">
          {nav.tabs.map((tab) => (
            <Link
              key={tab.period}
              href={tab.href}
              scroll={false}
              aria-current={tab.current ? 'page' : undefined}
              className="rounded-full px-[26px] py-2 text-lg font-bold text-muted aria-[current=page]:bg-fill aria-[current=page]:text-ink max-sm:px-4 max-sm:py-1.5 max-sm:text-[13px] max-sm:leading-5"
            >
              {PERIOD_NAMES[tab.period]}
            </Link>
          ))}
        </nav>
      </div>

      {view.note && <p className="mb-2 text-[15px] font-semibold text-muted">{view.note}</p>}
      {/* 연간은 연도를 이미 골랐으니 기간 이동이 없다 */}
      {period !== 'year' && (
        <div className="mb-5">
          <PeriodPicker period={period} slots={nav.slots} current={view.slot} disabled={!view.available} />
        </div>
      )}

      {view.closed && <ClosedNotice year={view.releaseYear} nextYearHref={nav.nextYearHref} />}

      {rows.length === 0 ? (
        // 집계 중이면 언제부터 볼 수 있는지는 적지 않는다 ("아직 집계 중이에요"만)
        <EmptyChart available={view.available} availableFrom={null} releaseYear={view.releaseYear} />
      ) : (
        <ChartTable rows={rows} maxViews={maxViews} extra={period === 'year' ? 'released' : 'change'} />
      )}
    </div>
  )
}

function ChartTable({ rows, maxViews, extra }: { rows: readonly ChartEntry[]; maxViews: number; extra: ChartExtra }) {
  return (
    <>
      <div aria-hidden="true" className={`grid gap-4 px-5 pb-2 text-[13px] font-semibold text-muted max-sm:hidden ${CHART_COLUMNS[extra]}`}>
        <span>순위</span>
        <span>노래</span>
        {extra === 'released' && <span className="text-center">공개일</span>}
        {extra === 'change' && <span className="text-right">누적</span>}
        <span className="text-right">조회수</span>
        {extra === 'change' && <span className="text-center">변동</span>}
        <span />
      </div>
      <ol className="grid gap-2">
        {rows.map((mv) => (
          <li key={mv.yt}>
            <ChartRow mv={mv} maxViews={maxViews} extra={extra} />
          </li>
        ))}
      </ol>
    </>
  )
}
