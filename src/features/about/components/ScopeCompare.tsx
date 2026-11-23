'use client'

import { useState } from 'react'
import type { AboutMv } from '../lib/about-data'
import { MiniRankList } from './MiniRankList'
import { SegmentedButtons } from './SegmentedButtons'

type Scope = 'all' | 'year'

/** 모든 곡을 누적으로 세운 순위와 올해 공개곡끼리 세운 순위를 바꿔 보는 부품 */
export function ScopeCompare({ year, allTime, thisYear }: { year: string; allTime: readonly AboutMv[]; thisYear: readonly AboutMv[] }) {
  const [scope, setScope] = useState<Scope>('year')
  const options = [
    { key: 'all', label: '모든 곡 · 누적' },
    { key: 'year', label: `${year}년 공개곡` },
  ] as const

  return (
    <>
      <SegmentedButtons label="순위를 세울 곡" options={options} value={scope} onChange={setScope} />
      {scope === 'year' && thisYear.length === 0 ? (
        <p className="rounded-xl bg-page px-4 py-6 text-center font-semibold text-muted">{year}년에 공개된 곡의 순위는 아직 집계 중이에요.</p>
      ) : (
        <MiniRankList items={scope === 'all' ? allTime : thisYear} />
      )}
    </>
  )
}
