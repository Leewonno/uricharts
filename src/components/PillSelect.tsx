import type { ComponentProps } from 'react'

/** 알약 모양 드롭다운 (기본 select에 모양만 입힘). 높이는 부모 flex 줄에 맞춰 늘어난다. */
export function PillSelect({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={`relative grid ${className}`}>
      <select
        {...props}
        className="cursor-pointer appearance-none rounded-full bg-surface pr-11 pl-6 text-lg font-bold text-ink transition-colors duration-200 hover:bg-fill-soft max-md:pr-10 max-md:pl-5 max-md:text-base"
      >
        {children}
      </select>
      <svg viewBox="0 0 16 10" aria-hidden="true" className="pointer-events-none absolute top-1/2 right-5 h-2 w-3 -translate-y-1/2 text-ink max-md:right-4">
        <path d="M2 2l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
