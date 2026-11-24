import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CHART_METADATA, ChartPage } from '@/features/mv/components/ChartPage'
import { getMvChartBook } from '@/features/mv/data/snapshot'
import { chartNav } from '@/features/mv/lib/chart-nav'
import { PERIOD_ORDER, isPeriod } from '@/features/mv/lib/periods'

// 정적 export: 일간/주간/월간/연간의 가장 최근 차트 네 페이지
export const dynamicParams = false

export function generateStaticParams() {
  return PERIOD_ORDER.map((period) => ({ period }))
}

export const metadata: Metadata = CHART_METADATA

export default async function LatestChartPage(props: PageProps<'/mv/chart/[period]'>) {
  const { period } = await props.params
  if (!isPeriod(period)) notFound()

  const book = await getMvChartBook()
  const view = book.view(period)
  if (!view) notFound()
  return <ChartPage view={view} nav={chartNav(book, view)} />
}
