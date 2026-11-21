import type { CSSProperties } from 'react'

/** 오른쪽 꺾쇠(>) 아이콘. 크기는 className으로, 색은 currentColor로 정한다. */
export function Chevron({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" className={className} style={style}>
      <path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
