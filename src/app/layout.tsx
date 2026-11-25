import type { Metadata } from 'next'
// 한글 글자를 쓰는 만큼만 나눠 받는 Pretendard (가변 굵기)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getMvSnapshot } from '@/features/mv/data/snapshot'
import './globals.css'

export const metadata: Metadata = {
  title: '우리의차트',
  description: 'K-pop 뮤직비디오 유튜브 조회수 일간 · 주간 · 월간 · 연간 차트',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // 푸터의 집계 기준일도 조회수와 같은 스냅샷에서 받는다
  const { asOf } = await getMvSnapshot()

  return (
    <html lang="ko">
      {/* PC(640px 이상)는 화면 폭을 1280px(본문 1184px + 좌우 여백 48px)로 고정한다. 창이 더 좁으면 줄어들지 않고 가로 스크롤이 생긴다 */}
      <body className="flex min-h-screen flex-col font-sans antialiased sm:min-w-[1280px]">
        {/* 헤더는 레이아웃에 둬서 페이지를 옮겨도 유지된다 (메뉴 선택 표시가 미끄러지며 이동) */}
        <SiteHeader />
        {children}
        <SiteFooter asOf={asOf} />
      </body>
    </html>
  )
}
