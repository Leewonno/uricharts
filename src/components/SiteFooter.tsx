import Link from 'next/link'

// 소개(/about)는 페이지는 있지만 공개 전이라 링크를 뺐다. 공개할 때 { href: '/about', label: '소개' }를 앞에 다시 넣는다.
const FOOTER_LINKS = [{ href: '/contact', label: '문의' }] as const

// 헤더 메뉴와 같은 알약 묶음. 어두운 판 위라 바탕은 반투명 흰색으로 깐다
const linkClass =
  'block rounded-full px-4 py-[7px] text-[15px] font-bold text-cyan-100 transition-colors duration-250 hover:bg-white/10 hover:text-white max-sm:py-1.5 max-sm:text-[13px]'

/**
 * 모든 페이지 아래를 닫는 깊은 청록 판 ("엔딩 크레딧").
 * 맨 아래 큰 URICHARTS 글자는 판 밖으로 잘려 걸린다.
 * asOf: 서버가 준 집계 기준일 (YYYY-MM-DD). © 연도에 쓴다
 */
export function SiteFooter({ asOf }: { asOf: string }) {
  return (
    <footer className="relative mx-4 mt-auto overflow-hidden rounded-t-[32px] bg-strong px-12 pt-14 text-cyan-100 max-sm:mx-0 max-sm:px-6 max-sm:pt-10">
      <div className="mx-auto flex max-w-[1184px] flex-wrap justify-between gap-10">
        <div className="max-w-[420px]">
          <p className="text-[32px] leading-[1.3] font-extrabold tracking-[-0.04em] text-white max-sm:text-2xl">
            우리의 오늘을
            <br />
            <em className="text-cyan-300 not-italic">기록으로 남깁니다</em>
          </p>
        </div>
        <nav aria-label="우리의차트">
          <ul className="flex rounded-full bg-white/10 p-1">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-[1184px] text-xs text-cyan-200/60">
        © {asOf.slice(0, 4)} 우리의차트 URICHARTS
      </p>
      <span
        aria-hidden="true"
        className="mt-7 block translate-y-[12%] bg-linear-to-b from-cyan-700 to-cyan-900 to-85% bg-clip-text text-center text-[198px] max-sm:text-[clamp(64px,15.5vw,228px)] leading-[0.78] font-black tracking-[-0.05em] whitespace-nowrap text-transparent select-none"
      >
        URICHARTS
      </span>
    </footer>
  )
}
