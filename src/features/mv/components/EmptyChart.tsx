import { formatDateKo } from '@/lib/format'

interface Props {
  /** false면 아직 집계 중인 기간 */
  available: boolean
  /** 집계 중일 때 볼 수 있게 되는 날 YYYY-MM-DD (알 수 없으면 null) */
  availableFrom: string | null
  /** 차트가 공개 연도로 좁혀져 있으면 그 연도 */
  releaseYear?: string
}

/**
 * 순위를 보여줄 수 없을 때의 안내. 순위 목록과 같은 자리·너비를 차지한다.
 * - 집계 중: 비교할 기록이 아직 없는 기간
 * - 곡 없음: 기간은 집계됐지만 그 공개 연도에 곡이 없음
 */
export function EmptyChart({ available, availableFrom, releaseYear }: Props) {
  const title = available ? '이 기간에 집계된 곡이 없어요' : '아직 집계 중이에요'
  const detail = available
    ? releaseYear
      ? `${releaseYear}년에 공개된 곡이 아직 없어요.`
      : '다른 기간을 골라 보세요.'
    : availableFrom
      ? `${formatDateKo(availableFrom)}부터 볼 수 있어요.`
      : null
  return (
    <div className="rounded-[20px] bg-surface px-6 py-16 text-center">
      <p className="text-xl font-bold text-strong">{title}</p>
      {detail && <p className="mt-2 font-semibold text-muted">{detail}</p>}
    </div>
  )
}
