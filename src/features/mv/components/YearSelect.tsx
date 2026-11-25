'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'akar-icons'
import type { YearOption } from '../lib/chart-nav'

/**
 * 기간 탭 왼쪽의 연도 고르기: [2026년 ⌄]
 * 차트는 그 해에 공개된 곡만 순위를 매기므로, 해를 먼저 고르고 그 안에서 기간을 고른다.
 * 펼치면 최근 해부터, 아직 집계 중인 해에는 "집계 중"이 붙는다. 바깥을 누르거나 Esc를 누르면 닫힌다.
 */
export function YearSelect({ years }: { years: readonly YearOption[] }) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const current = years.find((y) => y.current) ?? years[0]

  // 바깥을 누르거나 Esc를 누르면 닫는다 (Esc는 document에서 받는다: PeriodPicker와 같은 이유)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null
        if (open && next && !rootRef.current?.contains(next)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${current.year}년, 다른 연도 고르기`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-full cursor-pointer items-center gap-2 rounded-full bg-strong pr-4 pl-6 text-lg font-bold text-cyan-50 tabular-nums transition-colors hover:bg-ink max-sm:pl-5 max-sm:text-base"
      >
        {current.year}년
        <ChevronDown size={16} strokeWidth={3} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          id={listId}
          role="dialog"
          aria-label="연도 고르기"
          className="absolute top-full left-0 z-20 mt-2 grid min-w-52 animate-fade-in gap-0.5 rounded-3xl bg-surface p-1.5 shadow-lg shadow-cyan-900/10"
        >
          {years.map((y) => (
            <li key={y.year}>
              <Link
                href={y.href}
                scroll={false}
                onClick={() => setOpen(false)}
                aria-current={y.current ? 'page' : undefined}
                className="flex items-center justify-between gap-6 rounded-full px-5 py-2 text-[17px] font-bold whitespace-nowrap text-muted tabular-nums hover:bg-fill-soft hover:text-ink aria-[current=page]:bg-fill aria-[current=page]:text-ink"
              >
                <span>{y.year}년</span>
                {y.inProgress && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-accent">
                    <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
                    집계 중
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
