'use client'

import { YoutubeFill } from 'akar-icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef } from 'react'

// 홈은 로고로 들어간다. 선택 표시(알약)가 메뉴 사이를 미끄러져 다닌다.
// 소개(/about, "우리의차트는?" · Sparkles 아이콘)는 공개 전이라 메뉴에서 뺐다. 공개할 때 다시 넣는다.
const NAV = [{ href: '/mv/chart/day', match: '/mv', label: 'K-POP MV 조회수', Icon: YoutubeFill }] as const

/** 로고 막대 3개의 높이(모바일은 작게)와 출렁이는 시차 */
const LOGO_BARS = [
  { size: 'h-[11px] max-sm:h-2', delay: '0s' },
  { size: 'h-5 max-sm:h-4', delay: '0.15s' },
  { size: 'h-[15px] max-sm:h-3', delay: '0.3s' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const current = NAV.findIndex((item) => pathname.startsWith(item.match))
  const navRef = useRef<HTMLElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)

  // 선택된 버튼 자리로 알약을 옮긴다. 화면 폭이나 글꼴이 바뀌어 버튼 크기가 달라져도 다시 잰다.
  useLayoutEffect(() => {
    const nav = navRef.current
    const thumb = thumbRef.current
    if (!nav || !thumb) return

    const place = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current=page]')
      if (!active) {
        delete nav.dataset.ready
        return
      }
      thumb.style.width = `${active.offsetWidth}px`
      thumb.style.translate = `${active.offsetLeft}px 0`
      // 처음 자리를 잡을 때는 미끄러지지 않게, 위치를 먼저 반영한 뒤 ready를 켠다
      if (!('ready' in nav.dataset)) {
        void thumb.offsetWidth
        nav.dataset.ready = ''
      }
    }

    place()
    const observer = new ResizeObserver(place)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [current])

  return (
    <header className="scroll-shadow sticky top-0 z-30 flex items-center justify-between gap-3 bg-page/80 px-12 py-5 backdrop-blur-md max-sm:gap-2 max-sm:px-4 max-sm:py-2">
      <Link href="/" aria-label="우리의차트 홈" className="group flex shrink-0 items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.04em] max-sm:gap-2 max-sm:text-lg">
        {/* 로고 타일: 진한 cyan 둥근 사각형 안에 흰 막대. 마우스를 올리면 막대가 이퀄라이저처럼 출렁인다 */}
        <i
          aria-hidden="true"
          className="flex size-9.5 shrink-0 items-end justify-center gap-0.75 rounded-[11px] bg-accent pb-2.25 max-sm:size-7.5 max-sm:gap-0.5 max-sm:rounded-[9px] max-sm:pb-1.75"
        >
          {LOGO_BARS.map((bar) => (
            <b
              key={bar.delay}
              className={`w-1.25 origin-bottom rounded-xs bg-white group-hover:animate-equalizer motion-reduce:group-hover:animate-none max-sm:w-1 ${bar.size}`}
              style={{ animationDelay: bar.delay }}
            />
          ))}
        </i>
        <span className="flex flex-col leading-[1.1]">
          우리의차트
          <small className="mt-[3px] text-[10.5px] font-bold tracking-normal text-muted max-sm:text-[8.5px]">URICHARTS</small>
        </span>
      </Link>
      <nav
        ref={navRef}
        className="group/nav relative flex shrink-0 rounded-full bg-surface p-1"
      >
        {/* 선택 표시(알약). 위치와 폭은 선택된 버튼을 재서 정한다. 재기 전(첫 화면)에는 버튼 자신이 배경을 칠한다 */}
        <span
          ref={thumbRef}
          aria-hidden="true"
          className="absolute inset-y-1 left-0 rounded-full bg-accent opacity-0 group-data-ready/nav:opacity-100 group-data-ready/nav:transition-[translate,width,opacity] group-data-ready/nav:duration-350 group-data-ready/nav:ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none!"
        />
        {NAV.map(({ href, label, Icon }, index) => (
          <Link
            key={href}
            href={href}
            aria-current={index === current ? 'page' : undefined}
            className="relative flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-2.5 text-xs font-bold whitespace-nowrap text-muted transition-colors duration-250 hover:text-ink aria-[current=page]:bg-accent aria-[current=page]:text-white group-data-ready/nav:aria-[current=page]:bg-transparent sm:py-[7px] sm:pr-4 sm:pl-3 sm:text-[15px]"
          >
            <Icon size={17} strokeWidth={2.4} aria-hidden="true" className="hidden shrink-0 sm:block" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
