import Link from 'next/link'

// 소개 · 문의 페이지는 아직 없다 (헤더의 소개 메뉴와 같은 주소)
const FOOTER_LINKS = [
  { href: '/about', label: '소개' },
  { href: '/contact', label: '문의' },
] as const

// 헤더 메뉴와 같은 알약 묶음. 어두운 판 위라 바탕은 반투명 흰색으로 깐다
const linkClass =
  'block rounded-full px-4 py-[7px] text-[15px] font-bold text-cyan-100 transition-colors duration-250 hover:bg-white/10 hover:text-white'

/**
 * 모든 페이지 아래를 닫는 깊은 청록 판 ("엔딩 크레딧").
 * 맨 아래 큰 URICHARTS 글자는 판 밖으로 잘려 걸린다.
 * asOf: 서버가 준 집계 기준일 (YYYY-MM-DD). © 연도에 쓴다
 */
export function SiteFooter({ asOf }: { asOf: string }) {
  return (
    <footer className="relative mx-[clamp(8px,1.5vw,16px)] mt-auto overflow-hidden rounded-t-[32px] bg-strong px-[clamp(16px,4vw,48px)] pt-14 text-cyan-100">
      <div className="mx-auto flex max-w-[1184px] flex-wrap justify-between gap-10">
        <div className="max-w-[420px]">
          <p className="text-[clamp(24px,3vw,32px)] leading-[1.3] font-extrabold tracking-[-0.04em] text-white">
            오늘의 데이터를
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
      <p className="mx-auto mt-4 max-w-[1184px] text-[12.5px] text-cyan-200/60">
        © {asOf.slice(0, 4)} 우리의차트 URICHARTS
      </p>
      <span
        aria-hidden="true"
        className="mt-7 block translate-y-[12%] bg-linear-to-b from-cyan-700 to-cyan-900 to-85% bg-clip-text text-center text-[clamp(64px,15.5vw,228px)] leading-[0.78] font-black tracking-[-0.05em] whitespace-nowrap text-transparent select-none"
      >
        URICHARTS
      </span>
    </footer>
  )
}
