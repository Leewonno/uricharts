import { SiteHeader } from '@/components/SiteHeader'
import { DailyTopList } from '@/features/mv/components/DailyTopList'
import { PeriodCards } from '@/features/mv/components/PeriodCards'
import { YearTopMv } from '@/features/mv/components/YearTopMv'
import { PERIOD_ORDER, PERIODS, REF_YEAR, SAMPLE_MVS } from '@/features/mv/data/sample'
import { rankMvs } from '@/features/mv/lib/ranking'

const TOP_COUNT = 5

export default function HomePage() {
  // 올해 공개곡끼리는 연간 조회수 = 누적 조회수
  const yearTop = rankMvs(SAMPLE_MVS, 'year', { releaseYear: REF_YEAR })[0]
  const dailyTop = rankMvs(SAMPLE_MVS, 'day').slice(0, TOP_COUNT)

  return (
    <>
      {/* 바탕 그라데이션 원: 화면 아래 가운데에 고정 */}
      <div aria-hidden="true" className="bg-glow pointer-events-none fixed top-full left-1/2 -z-10 size-[600px] -translate-1/2 rounded-full" />
      <SiteHeader current="home" />
      <main>
        <h1 className="sr-only">우리의차트 · K-pop 뮤직비디오 유튜브 조회수 차트</h1>
        {yearTop && <YearTopMv mv={yearTop} year={REF_YEAR} />}
        <DailyTopList items={dailyTop} />
        <PeriodCards periods={PERIOD_ORDER.map((key) => PERIODS[key])} />
      </main>
      <footer className="p-8 text-center text-[13px] text-muted">유튜브 공개 조회수 기준 · 일간/주간/월간/연간 조회수는 예시 수치</footer>
    </>
  )
}
