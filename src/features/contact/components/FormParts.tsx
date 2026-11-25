import type { ReactNode } from 'react'

/** 입력칸: 바탕색 칸. 마우스를 올리면 조금 진해지고, 입력 중에는 흰 바탕에 테두리가 생긴다 */
export const inputClass =
  'w-full rounded-2xl border-2 border-transparent bg-page px-[18px] py-3.5 text-base text-ink max-sm:text-sm transition-colors duration-200 placeholder:text-muted/55 hover:bg-fill-soft focus:border-accent focus:bg-surface focus:outline-none'

export const textareaClass = `${inputClass} min-h-40 resize-y leading-[1.6]`

/** 라벨 + 입력칸 + 도움말 한 묶음. optional이면 라벨 옆에 "선택"을 붙인다 */
export function Field({
  id,
  label,
  optional = false,
  hint,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[15px] font-bold text-strong max-sm:text-base">
        {label}
        {optional && <span className="ml-1 text-xs font-medium text-muted">선택</span>}
      </label>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </div>
  )
}

/** 입력칸 두 개를 나란히 (모바일은 한 줄에 하나) */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">{children}</div>
}
