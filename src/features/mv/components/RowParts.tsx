import { ChevronRight } from 'akar-icons'
import { formatNumber } from '@/lib/format'
import type { ChartEntry, RankChange } from '../types'

/** 순위 변동: ▲2 / ▼1 / 재진입 / – */
export function ChangeBadge({ change }: { change: RankChange }) {
  switch (change.kind) {
    case 'up':
      return <span className="text-accent">▲{change.amount}</span>
    case 'down':
      return <span className="text-muted">▼{change.amount}</span>
    case 'reentry':
      return <span className="text-pink-600">재진입</span>
    default:
      return <span className="text-muted">–</span>
  }
}

/** 화면 읽기 프로그램용 변동 설명. 변동을 표시하지 않으면 빈 문자열 */
function changeLabel(change: RankChange): string {
  switch (change.kind) {
    case 'up':
      return `${change.amount}계단 상승`
    case 'down':
      return `${change.amount}계단 하락`
    case 'same':
      return '변동 없음'
    case 'reentry':
      return '재진입'
    default:
      return ''
  }
}

/**
 * 순위 행 링크의 접근성 이름. aria-label이 안쪽 글자를 대신하므로 조회수·변동까지 담는다.
 * 예: "2위 BTS 2.0, 조회수 1,182,000회, 1계단 상승. 뮤직비디오 보기"
 */
export function rowLabel(mv: ChartEntry): string {
  const parts = [`${mv.rank}위 ${mv.artist} ${mv.title}`, `조회수 ${formatNumber(mv.views)}회`, changeLabel(mv.change)].filter(Boolean)
  return `${parts.join(', ')}. 뮤직비디오 보기`
}

/** >>> 가 한 번 지나가는 시차 (--animate-race 길이와 맞춘다) */
const TRAIL_DELAYS = ['0s', '0.22s', '0.44s']

/**
 * 행 오른쪽 끝 "보러가기" 표시. 부모에 group 클래스가 있어야 한다.
 * 마우스를 올리면 >>> 가 한 번 오른쪽으로 지나가고 끝에 > 버튼이 나타난다.
 * 터치 기기에서는 버튼만 항상 보인다.
 */
export function RowGo() {
  return (
    <div aria-hidden="true" className="relative flex items-center justify-end gap-1">
      <span className={`relative h-5 w-[52px] overflow-hidden max-md:hidden no-hover:hidden motion-reduce:hidden text-accent`}>
        {TRAIL_DELAYS.map((delay) => (
          <ChevronRight
            key={delay}
            size={18}
            strokeWidth={3.2}
            className="absolute top-px -left-1 opacity-0 group-hover:animate-race group-focus-visible:animate-race"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>
      <span
        className={`grid size-9 shrink-0 -translate-x-3.5 scale-85 place-items-center rounded-full opacity-0 transition-[opacity,translate,scale] duration-200 ease-[cubic-bezier(.2,.9,.3,1.3)] group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 no-hover:size-8 no-hover:translate-x-0 no-hover:scale-100 no-hover:opacity-100 motion-reduce:transition-none bg-fill text-ink`}
      >
        <ChevronRight size={18} strokeWidth={3.2} className="ml-px" />
      </span>
    </div>
  )
}
