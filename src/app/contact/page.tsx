import type { Metadata } from 'next'
import { PageContainer } from '@/components/PageContainer'
import { ContactCrossroads } from '@/features/contact/components/ContactCrossroads'

export const metadata: Metadata = {
  title: '문의 — 우리의차트 URICHARTS',
  description: '곡 추가 요청, 순위·정보 오류, 제휴·광고, 그 밖의 이야기를 우리의차트에 보내 주세요',
}

/** 문의 페이지. 무슨 일로 왔는지 먼저 고르면 그 일에 필요한 것만 묻는다 */
export default function ContactPage() {
  return (
    <PageContainer width="medium" className="gap-12 pt-[clamp(40px,8vh,88px)] pb-30">
      <header className="text-center">
        <h1 className="text-[38px] leading-[1.1] font-extrabold tracking-[-0.055em] text-strong max-sm:text-2xl">
          무엇이든 물어보세요!
        </h1>
      </header>

      <ContactCrossroads />
    </PageContainer>
  )
}
