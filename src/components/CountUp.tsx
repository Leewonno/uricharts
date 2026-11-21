'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/format'

/**
 * 숫자가 0부터 목표값까지 올라가는 애니메이션.
 * 정적 HTML에는 최종값이 들어가고, 화면이 뜬 뒤에만 애니메이션한다.
 * 화면 읽기 프로그램에는 최종값만 읽히게 한다. 모션 감소 설정이면 애니메이션하지 않는다.
 */
export function CountUp({ value, durationMs = 1400 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      // 첫 프레임의 now는 start보다 앞설 수 있다 (프레임 시작 시각). 음수 진행률이면 음수가 잠깐 보인다
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs))
      const eased = 1 - Math.pow(1 - progress, 4)
      setShown(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return (
    <>
      <span aria-hidden="true">{formatNumber(shown)}</span>
      <span className="sr-only">{formatNumber(value)}</span>
    </>
  )
}
