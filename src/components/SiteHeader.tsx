import Link from 'next/link'

const NAV = [
  { key: 'home', href: '/', label: '홈' },
  { key: 'chart', href: '/mv/chart/day', label: '차트' },
  { key: 'about', href: '/about', label: '소개' },
] as const

type NavKey = (typeof NAV)[number]['key']

export function SiteHeader({ current }: { current: NavKey }) {
  return (
    <header className="flex items-center justify-between px-[clamp(16px,4vw,48px)] py-5">
      <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.04em]">
        <i aria-hidden="true" className="flex h-8 items-end gap-[3px]">
          <b className="h-3.5 w-1.5 rounded-[2px] bg-accent" />
          <b className="h-8 w-1.5 rounded-[2px] bg-accent" />
          <b className="h-[22px] w-1.5 rounded-[2px] bg-accent" />
        </i>
        <span className="flex flex-col leading-[1.1]">
          우리의차트
          <small className="mt-[3px] text-[10.5px] font-bold tracking-[0.2em] text-muted">URICHARTS</small>
        </span>
      </Link>
      <nav className="flex gap-1.5">
        {NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.key === current ? 'page' : undefined}
            className="rounded-full px-3.5 py-2 text-[15px] font-semibold hover:bg-surface aria-[current=page]:bg-surface max-sm:px-2.5"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
