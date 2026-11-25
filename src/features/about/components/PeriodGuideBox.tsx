'use client'

import { useState } from 'react'
import type { Period } from '@/features/mv/types'
import type { PeriodGuide } from '../lib/about-data'
import { SegmentedButtons } from './SegmentedButtons'

/** 기간마다 "얼마 동안 모은 조회수인가" */
const MEANING: Readonly<Record<Period, string>> = {
  day: '하루 동안 재생된 횟수예요. 그날 0시부터 다음 날 0시까지 늘어난 만큼이에요.',
  week: '월요일부터 일요일까지, 한 주 동안 재생된 횟수예요. 한 주가 다 끝나야 순위를 매겨요.',
  month: '한 달 동안 재생된 횟수예요. 이번 달은 지금까지 늘어난 만큼 보여 줘요.',
  year: '1월 1일부터 재생된 횟수예요. 그해 공개곡끼리 겨루니, 공개된 날부터 지금까지 전부예요.',
}

/**
 * 일간 · 주간 · 월간 · 연간을 눌러 보며 차이를 익히는 부품.
 * 아래 막대는 올해 1월 1일부터 기준일까지 중에서 그 기간이 차지하는 길이다.
 */
export function PeriodGuideBox({ periods, asOf }: { periods: readonly PeriodGuide[]; asOf: string }) {
  const [period, setPeriod] = useState<Period>('year')
  const current = periods.find((p) => p.period === period) ?? periods[0]
  const options = periods.map((p) => ({ key: p.period, label: p.name }))

  return (
    <>
      <SegmentedButtons label="기간" options={options} value={period} onChange={setPeriod} />
      <div aria-live="polite">
        <p className="text-base leading-[1.7]">{MEANING[current.period]}</p>
        <p className={`mt-1 text-sm font-bold ${current.open ? 'text-accent' : 'text-muted'}`}>{current.status}</p>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-[34px] overflow-hidden rounded-[10px] bg-page">
        <i
          className="absolute inset-y-0 right-0 min-w-1 rounded-lg bg-accent transition-[width] duration-500 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none"
          style={{ width: `${current.span}%` }}
        />
      </div>
      <p aria-hidden="true" className="mt-1.5 flex justify-between text-xs text-muted">
        <span>1월 1일</span>
        <span>{`${Number(asOf.slice(5, 7))}월 ${Number(asOf.slice(8, 10))}일`}</span>
      </p>
    </>
  )
}
