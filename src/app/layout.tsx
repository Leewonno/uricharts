import type { Metadata } from 'next'
// 한글 글자를 쓰는 만큼만 나눠 받는 Pretendard (가변 굵기)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './globals.css'

export const metadata: Metadata = {
  title: '우리의차트 URICHARTS — K-pop 뮤직비디오 조회수 차트',
  description: 'K-pop 뮤직비디오 유튜브 조회수 일간 · 주간 · 월간 · 연간 차트',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}
