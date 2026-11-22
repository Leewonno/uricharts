import type { PeriodInfo } from '../types'

/**
 * 순위를 보여줄 수 없을 때의 안내. 순위 목록과 같은 자리·너비를 차지한다.
 * - 집계 중: 비교할 기록이 아직 없는 기간
 * - 곡 없음: 기간은 집계됐지만 고른 범위(공개 연도)에 곡이 없음
 */
export function EmptyChart({ info }: { info: PeriodInfo | undefined }) {
  const available = info?.available ?? true
  const title = available ? '이 범위에 집계된 곡이 없어요' : '아직 집계 중이에요'
  const detail = available ? '다른 공개 연도를 골라 보세요.' : '매일 0시에 조회수를 기록해요.'
  return (
    <div className="rounded-[20px] bg-surface px-6 py-16 text-center">
      <p className="text-xl font-bold text-strong">{title}</p>
      <p className="mt-2 font-semibold text-muted">{detail}</p>
    </div>
  )
}
