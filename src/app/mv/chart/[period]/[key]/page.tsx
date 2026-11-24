import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CHART_METADATA, ChartPage } from '@/features/mv/components/ChartPage'
import { getMvChartBook } from '@/features/mv/data/snapshot'
import { chartNav } from '@/features/mv/lib/chart-nav'
import { PERIOD_ORDER, isPeriod } from '@/features/mv/lib/periods'

// 정적 export: 기록이 있는 기간마다 한 페이지 (예: /mv/chart/week/2026-W47)
export const dynamicParams = false

export async function generateStaticParams() {
  const book = await getMvChartBook()
  return PERIOD_ORDER.flatMap((period) => book.slots[period].map((slot) => ({ period, key: slot.key })))
}

export const metadata: Metadata = CHART_METADATA

export default async function PeriodChartPage(props: PageProps<'/mv/chart/[period]/[key]'>) {
  const { period, key } = await props.params
  if (!isPeriod(period)) notFound()

  const book = await getMvChartBook()
  const view = book.view(period, key)
  if (!view) notFound()
  return <ChartPage view={view} nav={chartNav(book, view)} />
}
