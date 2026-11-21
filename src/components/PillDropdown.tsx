'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'akar-icons'

export interface PillOption<T extends string> {
  value: T
  label: string
}

interface PillDropdownProps<T extends string> {
  /** 스크린리더용 이름 (화면에는 보이지 않음) */
  label: string
  value: T
  options: readonly PillOption<T>[]
  onChange: (value: T) => void
}

/**
 * 알약 모양 드롭다운 (기본 select 대신 직접 그림). 높이는 부모 flex 줄에 맞춰 늘어난다.
 * WAI-ARIA select-only combobox 패턴: 포커스는 버튼에 그대로 두고 aria-activedescendant로 고르는 중인 항목을 알린다.
 * 키보드: ↑↓/Enter/Space로 열기, ↑↓/Home/End로 이동, Enter/Space로 고르기, Esc/Tab으로 닫기.
 */
export function PillDropdown<T extends string>({ label, value, options, onChange }: PillDropdownProps<T>) {
  const id = useId()
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-option-${index}`

  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selectedIndex = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  )
  const last = options.length - 1

  const openList = () => {
    setActive(selectedIndex)
    setOpen(true)
  }

  const choose = (index: number) => {
    setOpen(false)
    const option = options[index]
    if (option && option.value !== value) onChange(option.value)
  }

  // 바깥을 누르면 닫는다 (Safari는 클릭으로 버튼에 포커스를 주지 않아 blur만으로는 부족하다)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // 키보드로 옮긴 항목이 목록 밖에 있으면 보이게 스크롤
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, id])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    const moves: Record<string, (i: number) => number> = {
      ArrowDown: (i) => Math.min(i + 1, last),
      ArrowUp: (i) => Math.max(i - 1, 0),
      Home: () => 0,
      End: () => last,
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      setActive(move)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative grid">
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className="flex cursor-pointer items-center gap-3 rounded-full bg-surface pr-5 pl-6 text-lg font-bold text-ink transition-colors duration-200 hover:bg-fill-soft focus-visible:bg-fill-soft focus-visible:outline-none aria-expanded:bg-fill-soft max-md:pr-4 max-md:pl-5 max-md:text-base"
      >
        {options[selectedIndex]?.label}
        <ChevronDown size={15} strokeWidth={3.2} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          // 항목을 눌러도 버튼 포커스가 빠지지 않게 (빠지면 blur로 먼저 닫혀 클릭이 안 먹는다)
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 z-20 mt-2 grid max-h-72 min-w-full animate-fade-in gap-0.5 overflow-y-auto rounded-3xl bg-surface p-1.5 shadow-lg shadow-cyan-900/10"
        >
          {options.map((option, index) => {
            const selected = index === selectedIndex
            const tone = selected ? 'bg-fill text-ink' : index === active ? 'bg-fill-soft text-ink' : 'text-muted'
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onClick={() => choose(index)}
                onMouseMove={() => setActive(index)}
                className={`cursor-pointer rounded-full px-5 py-2 text-lg font-bold whitespace-nowrap max-md:px-4 max-md:text-base ${tone}`}
              >
                {option.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
