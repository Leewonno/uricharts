import Link from 'next/link'
import { ChevronRight } from 'akar-icons'

interface Props {
  /** 섹션을 aria-labelledby로 가리킬 때 쓰는 제목 id */
  id?: string
  title: string
  /** 제목 옆 작은 설명 */
  description?: string
  /** 오른쪽 "더 보기" 링크 */
  more?: { href: string; label: string }
}

export function SectionHeading({ id, title, description, more }: Props) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id={id} className="text-[28px] font-bold tracking-[-0.03em] text-strong">{title}</h2>
        {description && <span className="text-[15px] font-medium tracking-[-0.02em] text-muted">{description}</span>}
      </div>
      {more && (
        <Link href={more.href} className="inline-flex items-center gap-1.5 font-bold text-accent">
          {more.label}
          <ChevronRight size={15} strokeWidth={3.2} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
