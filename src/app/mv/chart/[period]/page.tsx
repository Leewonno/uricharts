import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/SiteHeader'
import { ChartBoard, ChartBoardFromUrl } from '@/features/mv/components/ChartBoard'
import { PERIOD_ORDER, PERIODS, REF_DATE, SAMPLE_MVS } from '@/features/mv/data/sample'
import { releaseYears } from '@/features/mv/lib/ranking'
import type { Period } from '@/features/mv/types'

// 정적 export: 일간/주간/월간/연간 네 페이지만 미리 만든다
export const dynamicParams = false

export function generateStaticParams() {
  return PERIOD_ORDER.map((period) => ({ period }))
}

const isPeriod = (value: string): value is Period => (PERIOD_ORDER as readonly string[]).includes(value)

export async function generateMetadata(props: PageProps<'/mv/chart/[period]'>): Promise<Metadata> {
  const { period } = await props.params
  if (!isPeriod(period)) return {}
  return { title: `${PERIODS[period].name} 유튜브 조회수 차트 — 우리의차트 URICHARTS` }
}

export default async function ChartPage(props: PageProps<'/mv/chart/[period]'>) {
  const { period } = await props.params
  if (!isPeriod(period)) notFound()

  const boardProps = {
    period,
    periods: PERIOD_ORDER.map((key) => PERIODS[key]),
    mvs: SAMPLE_MVS,
    years: releaseYears(SAMPLE_MVS),
    refDate: REF_DATE,
  }

  return (
    <>
      <SiteHeader current="chart" />
      <main className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,48px)] pt-4 pb-16">
        <div className="mt-3 mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-[clamp(28px,3.5vw,40px)] leading-[1.1] font-bold tracking-[-0.04em] text-strong">유튜브 조회수</h1>
          <p className="font-semibold text-muted">{PERIODS[period].range} 기준</p>
        </div>
        {/* 정적 HTML에는 누적 차트가 들어가고, 주소에 ?released=연도 가 있으면 화면이 뜬 뒤 바꿔 그린다 */}
        <Suspense fallback={<ChartBoard {...boardProps} releaseYear={null} />}>
          <ChartBoardFromUrl {...boardProps} />
        </Suspense>
      </main>
      <footer className="p-8 text-center text-[13px] text-muted">유튜브 공개 조회수 기준 · 일간/주간/월간/연간 조회수는 예시 수치</footer>
    </>
  )
}
