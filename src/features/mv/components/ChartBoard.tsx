'use client'

import Link from 'next/link'
import { PERIOD_NAMES, PERIOD_ORDER, describeChart } from '../lib/periods'
import { chartPath } from '../lib/routes'
import type { ChartEntry, ChartSlot, ChartView } from '../types'
import { CHART_COLUMNS, ChartRow, type ChartExtra } from './ChartRow'
import { EmptyChart } from './EmptyChart'
import { PeriodPicker } from './PeriodPicker'

/** 차트에 보여줄 최대 순위 */
const CHART_SIZE = 150

interface Props {
  view: ChartView
  /** 이 기간 종류(일간/주간/…)에서 고를 수 있는 기간 (최근부터) */
  slots: readonly ChartSlot[]
}

/**
 * 기간 탭 + 기간 고르기 + 순위 표.
 * 차트는 그 기간이 속한 해에 공개된 곡만 보여준다 (누적·공개연도 고르기는 잠시 숨겼다).
 */
export function ChartBoard({ view, slots }: Props) {
  const { period } = view
  const rows = view.rows.slice(0, CHART_SIZE)
  const maxViews = Math.max(rows[0]?.views ?? 0, 1)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-stretch gap-2">
        <nav aria-label="기간" className="inline-flex gap-1 rounded-full bg-surface p-1.5">
          {PERIOD_ORDER.map((p) => (
            <Link
              key={p}
              href={chartPath(p)}
              scroll={false}
              aria-current={p === period ? 'page' : undefined}
              className="rounded-full px-[26px] py-2 text-lg font-bold text-muted aria-[current=page]:bg-fill aria-[current=page]:text-ink max-md:px-[18px] max-md:text-base"
            >
              {PERIOD_NAMES[p]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-5">
        <div className="mb-2 text-[15px] font-semibold text-muted">
          <p>{describeChart(period, view.releaseYear)}</p>
          {view.note && <p>{view.note}</p>}
        </div>
        <PeriodPicker period={period} slots={slots} current={view.slot} />
      </div>

      {rows.length === 0 ? (
        <EmptyChart available={view.available} availableFrom={view.availableFrom} releaseYear={view.releaseYear} />
      ) : (
        <ChartTable rows={rows} maxViews={maxViews} extra={period === 'year' ? 'released' : 'change'} />
      )}
    </>
  )
}

function ChartTable({ rows, maxViews, extra }: { rows: readonly ChartEntry[]; maxViews: number; extra: ChartExtra }) {
  return (
    <>
      <div aria-hidden="true" className={`grid gap-4 px-5 pb-2 text-[13px] font-semibold text-muted max-md:hidden ${CHART_COLUMNS[extra]}`}>
        <span>순위</span>
        <span>노래</span>
        {extra === 'released' && <span className="text-center">공개일</span>}
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
