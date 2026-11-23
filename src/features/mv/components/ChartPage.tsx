import type { Metadata } from 'next'
import { YoutubeFill } from 'akar-icons'
import type { ChartSlot, ChartView } from '../types'
import { ChartBoard } from './ChartBoard'
import { MvPlayerProvider } from './MvPlayer'

/** 차트 페이지 제목. 브라우저 탭 제목과 본문 맨 위 제목이 같다 */
const CHART_TITLE = 'YouTube K-POP MV 조회수'

/** 차트 페이지 메타데이터 (탭 제목은 기간과 상관없이 본문 제목 그대로) */
export const CHART_METADATA: Metadata = { title: CHART_TITLE }

/** 기간 차트 페이지 본문 (가장 최근 차트와 기간별 차트가 같이 쓴다) */
export function ChartPage({ view, slots }: { view: ChartView; slots: readonly ChartSlot[] }) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-[clamp(16px,4vw,48px)] pt-4 pb-16">
      <h1 className="mt-3 mb-6 text-[clamp(28px,3.5vw,40px)] leading-[1.1] font-bold tracking-[-0.04em] text-strong">
        <YoutubeFill aria-hidden="true" className="mr-[0.25em] inline-block size-[1.15em] align-[-0.24em]" />
        {CHART_TITLE}
      </h1>
      <MvPlayerProvider>
        <ChartBoard view={view} slots={slots} />
      </MvPlayerProvider>
    </main>
  )
}
