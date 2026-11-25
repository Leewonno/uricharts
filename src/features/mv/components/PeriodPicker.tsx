'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'akar-icons'
import type { NavSlot } from '../lib/chart-nav'
import { PERIOD_NAMES } from '../lib/periods'
import type { ChartSlot, Period } from '../types'

interface Props {
  period: Period
  /** 지금 보는 해의 고를 수 있는 기간 (최근부터) */
  slots: readonly NavSlot[]
  /** 지금 보는 기간 */
  current: ChartSlot
  /** 그 해에 고를 수 있는 기간이 아직 없음 (집계 중). 기간 이름만 흐리게 둔다 */
  disabled: boolean
}

/**
 * 차트 목록 위의 기간 고르기: ‹ 11월 23일 (월) ›
 * - ‹ › 로 그 해 안에서 이전/다음 기간으로 넘어간다. 다른 해로는 연도 드롭다운으로만 간다
 * - 글자를 누르면 일간은 달력, 주간·월간은 목록이 열린다 (기록이 있는 기간만 고를 수 있다)
 * - 바깥을 누르거나 Esc를 누르면 닫힌다
 */
export function PeriodPicker({ period, slots, current, disabled }: Props) {
  const popupId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const index = slots.findIndex((s) => s.key === current.key)
  const older = index >= 0 ? slots[index + 1] : undefined
  const newer = index > 0 ? slots[index - 1] : undefined
  const name = PERIOD_NAMES[period]

  // 바깥을 누르거나 Esc를 누르면 닫는다.
  // Esc는 document에서 받는다: Safari는 클릭으로 버튼에 포커스를 주지 않아 피커 안에서 키 입력을 못 받을 수 있다
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
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center">
        <StepLink href={older?.href} label={`이전 ${name}`} dir="prev" />
        <div
          ref={rootRef}
          className="relative"
          // 키보드로 창 밖의 다른 요소로 나가면 닫는다.
          // 창 안의 빈 곳(흐린 날짜, 여백)을 누르면 포커스가 body로 가 relatedTarget이 없는데, 이때는 닫지 않는다
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null
            if (open && next && !rootRef.current?.contains(next)) setOpen(false)
          }}
        >
          {!disabled && slots.length > 0 ? (
            <button
              ref={buttonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={popupId}
              aria-label={`${current.label}, 다른 ${name} 고르기`}
              onClick={() => setOpen((v) => !v)}
              className={`${LABEL} cursor-pointer text-strong decoration-fill decoration-2 underline-offset-[5px] hover:underline aria-expanded:text-accent`}
            >
              {current.label}
            </button>
          ) : (
            <span className={`${LABEL} ${disabled ? 'text-muted/40' : 'text-strong'}`}>{current.label}</span>
          )}
          {open && (
            <div id={popupId} role="dialog" aria-label={`${name} 고르기`} className="absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 animate-fade-in">
              {period === 'day' ? (
                <DayCalendar slots={slots} current={current} onPick={() => setOpen(false)} />
              ) : (
                <SlotList slots={slots} current={current} onPick={() => setOpen(false)} />
              )}
            </div>
          )}
        </div>
        <StepLink href={newer?.href} label={`다음 ${name}`} dir="next" />
      </div>
      {current.range && <span className="text-[15px] font-semibold text-muted">{current.range}</span>}
    </div>
  )
}

const LABEL = 'block rounded-lg px-1 text-xl leading-tight font-semibold tracking-[-0.02em] max-sm:text-base'
const CARD = 'rounded-3xl bg-surface shadow-lg shadow-cyan-900/10'

/** ‹ › 이전/다음 기간. 갈 곳이 없으면 흐리게만 둔다 */
function StepLink({ href, label, dir }: { href: string | undefined; label: string; dir: 'prev' | 'next' }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  const icon = <Icon size={18} strokeWidth={2.6} aria-hidden="true" className="max-sm:size-3.5" />
  if (!href) {
    return (
      <span aria-hidden="true" className="grid size-8 place-items-center text-muted/25">
        {icon}
      </span>
    )
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className="grid size-8 place-items-center rounded-full text-strong transition-colors hover:text-accent">
      {icon}
    </Link>
  )
}

/** 주간·월간·연간: 기간 목록 (최근부터). 열면 지금 기간이 보이게 스크롤한다 */
function SlotList({ slots, current, onPick }: { slots: readonly NavSlot[]; current: ChartSlot; onPick: () => void }) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const list = listRef.current
    const picked = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (list && picked) list.scrollTop = picked.offsetTop - list.clientHeight / 2 + picked.clientHeight / 2
  }, [])

  return (
    <ul ref={listRef} className={`${CARD} grid max-h-80 min-w-64 gap-0.5 overflow-y-auto p-1.5`}>
      {slots.map((slot) => {
        const selected = slot.key === current.key
        const sub = slot.inProgress ? '집계 중' : slot.range
        return (
          <li key={slot.key}>
            <Link
              href={slot.href}
              scroll={false}
              onClick={onPick}
              aria-current={selected ? 'page' : undefined}
              className="flex items-baseline justify-between gap-6 rounded-full px-5 py-2 text-[17px] font-bold whitespace-nowrap text-muted hover:bg-fill-soft hover:text-ink aria-[current=page]:bg-fill aria-[current=page]:text-ink"
            >
              <span>{slot.label}</span>
              {sub && <span className="text-sm font-semibold opacity-80">{sub}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const monthOf = (date: string) => date.slice(0, 7)
const shiftMonth = (month: string, n: number) => {
  const d = new Date(`${month}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 7)
}

/** 일간: 달력. 기록이 있는 날만 누를 수 있고, 달은 기록이 있는 범위 안에서만 넘긴다 */
function DayCalendar({ slots, current, onPick }: { slots: readonly NavSlot[]; current: ChartSlot; onPick: () => void }) {
  const [month, setMonth] = useState(() => monthOf(current.key))
  const hrefOf = new Map(slots.map((s) => [s.key, s.href]))
  const newest = monthOf(slots[0].key)
  const oldest = monthOf(slots.at(-1)!.key)

  const [y, m] = month.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()

  const arrow = (dir: -1 | 1) => {
    const target = shiftMonth(month, dir)
    const enabled = dir < 0 ? target >= oldest : target <= newest
    const Icon = dir < 0 ? ChevronLeft : ChevronRight
    return (
      <button
        type="button"
        aria-disabled={!enabled}
        onClick={() => enabled && setMonth(target)}
        aria-label={dir < 0 ? '이전 달' : '다음 달'}
        className="grid size-9 cursor-pointer place-items-center rounded-full text-ink hover:bg-fill-soft aria-disabled:cursor-default aria-disabled:text-muted/30 aria-disabled:hover:bg-transparent max-sm:size-7"
      >
        <Icon size={16} strokeWidth={3.2} aria-hidden="true" className="max-sm:size-3.5" />
      </button>
    )
  }

  return (
    <div className={`${CARD} w-[316px] p-4 max-sm:w-[250px] max-sm:p-3`}>
      <div className="mb-2 flex items-center justify-between">
        {arrow(-1)}
        <span className="text-[17px] font-bold text-strong max-sm:text-[15px]">
          {y}년 {m}월
        </span>
        {arrow(1)}
      </div>
      <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`grid h-7 place-items-center text-xs font-semibold max-sm:h-6 max-sm:text-[11px] ${i === 0 ? 'text-pink-600' : 'text-muted'}`}>
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`
          const sunday = (firstWeekday + i) % 7 === 0
          const cell = 'grid size-10 place-items-center rounded-full text-[15px] font-semibold tabular-nums max-sm:size-8 max-sm:text-[13px]'
          if (!hrefOf.has(date)) {
            return (
              <span key={date} className={`${cell} text-muted/30`}>
                {i + 1}
              </span>
            )
          }
          return (
            <Link
              key={date}
              href={hrefOf.get(date)!}
              scroll={false}
              onClick={onPick}
              aria-current={date === current.key ? 'page' : undefined}
              aria-label={slots.find((s) => s.key === date)?.label}
              className={`${cell} ${sunday ? 'text-pink-600' : 'text-ink'} hover:bg-fill-soft aria-[current=page]:bg-fill aria-[current=page]:text-ink`}
            >
              {i + 1}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
