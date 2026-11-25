import type { ReactNode } from 'react'
import { TypingReveal } from './TypingReveal'

/** 로고와 같은 막대 세 개 (우리의차트가 답하는 자리 표시) */
const AVATAR_BARS = ['h-2.5', 'h-[18px]', 'h-3.5']

/**
 * 질문 하나와 그 답. 질문은 오른쪽 진한 말풍선, 답은 왼쪽에 로고를 달고 흰 말풍선으로 이어진다.
 * children에는 Bubble을 여러 개 넣는다.
 */
export function Qna({ id, question, children }: { id: string; question: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-q`} id={id} className="grid w-full scroll-mt-28 gap-3">
      <h2
        id={`${id}-q`}
        className="max-w-[80%] justify-self-end rounded-3xl rounded-br-md bg-accent px-5 py-3.5 text-[clamp(18px,2vw,21px)] font-bold tracking-[-0.02em] text-white"
      >
        {question}
      </h2>
      <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3 max-sm:grid-cols-1">
        <span aria-hidden="true" className="flex size-10 items-end justify-center gap-[3px] rounded-xl bg-strong pb-2.5 max-sm:hidden">
          {AVATAR_BARS.map((height) => (
            <b key={height} className={`w-[5px] rounded-xs bg-cyan-300 ${height}`} />
          ))}
        </span>
        <TypingReveal>{children}</TypingReveal>
      </div>
    </section>
  )
}

/** 답 말풍선. 첫 말풍선만 로고 쪽 모서리를 덜 둥글게. wide면 안에 부품을 넣을 수 있게 줄 전체를 쓴다 */
export function Bubble({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`max-w-full rounded-3xl bg-surface first:rounded-tl-md ${wide ? 'w-full p-4' : 'px-5 py-4 text-[17px] leading-[1.7] [&_strong]:font-bold [&_strong]:text-strong'}`}
    >
      {children}
    </div>
  )
}
