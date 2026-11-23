/** 말풍선 안의 알약 버튼 묶음. 하나만 눌린 상태(aria-pressed)로 둔다 */
export function SegmentedButtons<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** 묶음의 접근성 이름 */
  label: string
  options: readonly { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
}) {
  return (
    <div role="group" aria-label={label} className="mb-3.5 inline-flex flex-wrap gap-1 rounded-full bg-page p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
          className="cursor-pointer rounded-full px-4 py-2 text-[14.5px] font-bold text-muted transition-colors duration-250 hover:text-ink aria-pressed:bg-fill aria-pressed:text-strong"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
