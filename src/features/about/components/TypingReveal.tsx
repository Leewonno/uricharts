'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** 점 세 개가 차례로 튀는 시차 */
const DOT_DELAYS = ['0s', '0.15s', '0.3s']
/** 답이 화면에 들어온 뒤 "쓰는 중"을 보여주는 시간 */
const TYPING_MS = 700

/**
 * 답 말풍선 묶음. 화면 아래에 있던 답이 처음 보일 때 잠깐 "쓰는 중"(점 세 개)을 보여준 뒤 답을 연다.
 * - 서버가 그린 HTML에는 답이 그대로 있다 (JS가 없어도 읽힌다)
 * - 기다리는 동안에도 답은 자리를 차지한 채 투명하게만 둔다.
 *   그래서 화면 읽기 프로그램 · 브라우저 찾기에 그대로 잡히고, 답이 열릴 때 아래 내용이 밀리지 않는다
 * - 첫 화면에 이미 보이는 답과 모션 감소 설정에서는 바로 보여준다
 * 상태 대신 data-waiting 속성만 바꿔 다시 그리지 않는다.
 */
export function TypingReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < innerHeight) return

    el.dataset.waiting = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        timer = setTimeout(() => delete el.dataset.waiting, TYPING_MS)
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
      delete el.dataset.waiting
    }
  }, [])

  return (
    <div ref={ref} className="group/reveal relative min-w-0">
      <span aria-hidden="true" className="absolute top-0 left-0 hidden gap-[5px] rounded-3xl rounded-tl-md bg-surface px-5 py-[18px] group-data-waiting/reveal:flex">
        {DOT_DELAYS.map((delay) => (
          <i key={delay} className="size-2 animate-typing rounded-full bg-cyan-300" style={{ animationDelay: delay }} />
        ))}
      </span>
      <div className="grid justify-items-start gap-2 transition-opacity duration-300 group-data-waiting/reveal:opacity-0">{children}</div>
    </div>
  )
}
