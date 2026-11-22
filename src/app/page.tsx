import { DayTopList } from '@/features/mv/components/DayTopList'
import { MvPlayerProvider } from '@/features/mv/components/MvPlayer'
import { PeriodCards } from '@/features/mv/components/PeriodCards'
import { YearTopMv } from '@/features/mv/components/YearTopMv'
import { getMvSnapshot } from '@/features/mv/data/snapshot'
import { PERIOD_ORDER } from '@/features/mv/lib/periods'
import { rankMvs } from '@/features/mv/lib/ranking'

const TOP_COUNT = 5

export default async function HomePage() {
  // 기준일은 조회수와 함께 서버에서 받는다 (화면에서 오늘 날짜로 계산하지 않는다)
  const { asOf, mvs, periods } = await getMvSnapshot()
  const year = asOf.slice(0, 4)
  // 올해 공개곡끼리는 연간 조회수 = 누적 조회수
  const yearTop = rankMvs(mvs, 'year', { releaseYear: year })[0]
  // 누적 범위(모든 곡) 일간 차트의 1~5위. 비교할 기록이 없으면 집계 중
  const dayTop = periods.day.available ? rankMvs(mvs, 'day').slice(0, TOP_COUNT) : []

  return (
    <>
      {/* 바탕 그라데이션 원: 화면 아래 가운데에 고정 */}
      <div aria-hidden="true" className="bg-glow pointer-events-none fixed top-full left-1/2 -z-10 size-[600px] -translate-1/2 rounded-full" />
      <MvPlayerProvider>
        <main>
          <h1 className="sr-only">우리의차트 · K-pop 뮤직비디오 유튜브 조회수 차트</h1>
          {yearTop && <YearTopMv mv={yearTop} year={year} />}
          <DayTopList items={dayTop} count={TOP_COUNT} day={periods.day} asOf={asOf} />
          <PeriodCards periods={PERIOD_ORDER.map((key) => periods[key])} />
        </main>
      </MvPlayerProvider>
    </>
  )
}
