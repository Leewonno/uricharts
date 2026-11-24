import Link from 'next/link'
import { InfoFill } from 'akar-icons'

/** 마감된 해의 차트 위 안내. 다음 해 차트가 있으면 그쪽으로 가는 버튼을 단다 */
export function ClosedNotice({ year, nextYearHref }: { year: string; nextYearHref: string | null }) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-[18px] bg-strong px-5 py-3.5 text-cyan-50">
      <InfoFill size={20} aria-hidden="true" className="shrink-0 text-cyan-300" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{year}년 차트는 마감됐어요</p>
        <p className="text-sm font-semibold text-cyan-200">{year}년 12월 31일까지의 최종 순위예요.</p>
      </div>
      {nextYearHref && (
        <Link href={nextYearHref} scroll={false} className="shrink-0 rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-strong transition-colors hover:bg-fill">
          {Number(year) + 1}년 차트 보기
        </Link>
      )}
    </div>
  )
}
