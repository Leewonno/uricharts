import type { ReactNode } from 'react'

/** 본문 폭: wide는 홈·차트 (푸터 본문과 같은 폭), medium은 문의처럼 카드를 두 줄로 놓는 화면, narrow는 소개처럼 읽는 글 */
const WIDTHS = {
  wide: 'max-w-[1184px]',
  medium: 'max-w-[960px]',
  narrow: 'max-w-[720px]',
} as const

interface Props {
  children: ReactNode
  width?: keyof typeof WIDTHS
  /** 페이지마다 다른 위아래 여백과 블록 사이 간격 (pt-*, pb-*, gap-*) */
  className?: string
}

/**
 * 페이지 본문(main)의 가장 바깥 틀. 좌우 여백은 여기서만 주고, 안의 블록은 가로를 꽉 채운 채
 * 세로 flex의 gap으로 띄운다. 블록에는 바깥 여백(padding·margin)을 주지 않는다.
 */
export function PageContainer({ children, width = 'wide', className = '' }: Props) {
  return (
    <main className="w-full px-12 max-sm:px-4">
      <div className={`mx-auto flex w-full flex-col ${WIDTHS[width]} ${className}`}>{children}</div>
    </main>
  )
}
