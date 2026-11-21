'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PillDropdown, type PillOption } from '@/components/PillDropdown'
import { dailyAverage, rankMvs } from '../lib/ranking'
import { chartPath } from '../lib/routes'
import { RELEASED_PARAM, parseReleaseYear, scopeQuery } from '../lib/scope'
import type { Mv, Period, PeriodInfo } from '../types'
import { CHART_COLUMNS, ChartRow } from './ChartRow'

interface BoardProps {
  period: Period
  periods: readonly PeriodInfo[]
  mvs: readonly Mv[]
  /** 공개연도 드롭다운에 보여줄 연도 (최근 연도부터) */
  years: readonly string[]
  /** 하루 평균을 계산할 기준일 YYYY-MM-DD */
  refDate: string
}

/** 차트에 보여줄 최대 순위 */
const CHART_SIZE = 100

const SCOPE_OPTIONS: readonly PillOption<'all' | 'release'>[] = [
  { value: 'all', label: '누적' },
  { value: 'release', label: '공개연도' },
]

/**
 * 범위(누적/공개연도) 드롭다운 + 기간 탭 + 순위 표.
 * releaseYear가 null이면 누적(모든 곡), 연도면 그 해에 공개된 곡만 보여준다.
 */
export function ChartBoard({ period, periods, mvs, years, refDate, releaseYear }: BoardProps & { releaseYear: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const setReleaseYear = (year: string | null) => router.replace(`${pathname}${scopeQuery(year)}`, { scroll: false })

  const info = periods.find((p) => p.key === period)
  const rows = rankMvs(mvs, period, { releaseYear }).slice(0, CHART_SIZE)
  const maxViews = Math.max(rows[0]?.views ?? 0, 1)
  // 연간 + 올해 공개곡이면 연간 조회수 = 누적이라, 오른쪽 칸은 하루 평균으로 바꿔 보여준다
  const showDailyAverage = period === 'year' && releaseYear === info?.year

  return (
    <>
      <div className="mb-5 flex flex-wrap items-stretch gap-2">
        <PillDropdown
          label="순위 범위"
          value={releaseYear ? 'release' : 'all'}
          options={SCOPE_OPTIONS}
          onChange={(scope) => setReleaseYear(scope === 'release' ? (years[0] ?? null) : null)}
        />
        {releaseYear && (
          <PillDropdown
            label="공개 연도"
            value={releaseYear}
            options={years.map((y) => ({ value: y, label: `${y}년` }))}
            onChange={setReleaseYear}
          />
        )}
        <nav aria-label="기간" className="inline-flex gap-1 rounded-full bg-surface p-1.5">
          {periods.map((p) => (
            <Link
              key={p.key}
              href={`${chartPath(p.key)}${scopeQuery(releaseYear)}`}
              scroll={false}
              aria-current={p.key === period ? 'page' : undefined}
              className="rounded-full px-[26px] py-2 text-lg font-bold text-muted aria-[current=page]:bg-fill aria-[current=page]:text-ink max-md:px-[18px] max-md:text-base"
            >
              {p.name}
            </Link>
          ))}
        </nav>
      </div>

      <div aria-hidden="true" className={`grid gap-4 px-5 pb-2 text-[13px] font-semibold text-muted max-md:hidden ${CHART_COLUMNS}`}>
        <span>순위</span>
        <span>노래</span>
        <span className="text-right">조회수</span>
        <span className="text-center">변동</span>
        <span className="text-right">{showDailyAverage ? '하루 평균' : '누적'}</span>
        <span />
      </div>
      <ol className="grid gap-2">
        {rows.map((mv) => (
          <li key={mv.yt}>
            <ChartRow mv={mv} maxViews={maxViews} sub={showDailyAverage ? dailyAverage(mv, refDate) : undefined} />
          </li>
        ))}
      </ol>
    </>
  )
}

/** 주소의 ?released=연도 를 읽어 ChartBoard에 넘긴다. Suspense 안에서 써야 한다 (정적 export). */
export function ChartBoardFromUrl(props: BoardProps) {
  const searchParams = useSearchParams()
  return <ChartBoard {...props} releaseYear={parseReleaseYear(searchParams.get(RELEASED_PARAM), props.years)} />
}
