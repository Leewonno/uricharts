import type { Metadata } from 'next'
import Link from 'next/link'
import { PageContainer } from '@/components/PageContainer'
import { Bubble, Qna } from '@/features/about/components/Qna'
import { MiniRankList } from '@/features/about/components/MiniRankList'
import { PeriodGuideBox } from '@/features/about/components/PeriodGuideBox'
import { ScopeCompare } from '@/features/about/components/ScopeCompare'
import { buildAboutData } from '@/features/about/lib/about-data'
import { getMvChartBook, getMvSnapshot } from '@/features/mv/data/snapshot'
import { chartPath } from '@/features/mv/lib/routes'
import { formatDateKo } from '@/lib/format'

export const metadata: Metadata = {
  title: '우리의차트는? — 우리의차트 URICHARTS',
  description: '우리의차트가 K-pop 뮤직비디오 유튜브 조회수를 기록하고 순위를 매기는 방법',
  // 아직 공개 전: 헤더·푸터에 메뉴가 없고, 검색에도 나오지 않게 한다
  robots: { index: false, follow: false },
}

/** 맨 위 "질문 바로 가기"와 아래 질문들이 같은 id를 쓴다 */
const QUESTIONS = [
  { id: 'what', short: '뭐 하는 곳이에요?' },
  { id: 'source', short: '숫자는 어디서 와요?' },
  { id: 'same-year', short: '왜 그해 곡끼리예요?' },
  { id: 'periods', short: '일간이랑 연간은 뭐가 달라요?' },
  { id: 'history', short: '예전 기록은요?' },
  { id: 'next', short: '앞으로는요?' },
] as const

/** 1~3 → "한 곡이" / "두 곡이" / "세 곡이" */
const COUNT_WORDS = ['', '한', '두', '세']

/** 첫 기록부터 7일 달력의 칸 모양과 화면 읽기용 이름 */
const DAY_STYLES = {
  recorded: { cell: 'bg-fill-soft text-strong', dot: 'bg-accent', label: '기록함' },
  missed: { cell: 'bg-page text-muted', dot: 'border-2 border-muted/40', label: '기록 없음' },
  upcoming: { cell: 'bg-page text-muted', dot: 'border-2 border-dashed border-cyan-300', label: '아직 오지 않은 날' },
} as const

/** 지금 있는 차트와 앞으로 더할 차트 */
const CATEGORIES = [
  { label: 'K-POP MV 조회수', ready: true },
  { label: '웹툰 순위 (준비 중)', ready: false },
  { label: '그다음은?', ready: false },
]

/**
 * "우리의차트는?" 소개 페이지. 처음 온 사람이 물어볼 만한 질문에 말풍선으로 답한다.
 * 숫자는 모두 차트와 같은 수집 기록에서 나온다.
 */
export default async function AboutPage() {
  const [book, snapshot] = await Promise.all([getMvChartBook(), getMvSnapshot()])
  const data = buildAboutData(book, snapshot.mvs)
  const { year } = data
  const top3 = data.yearTop.slice(0, 3)
  const hasMissed = data.firstWeek.some((day) => day.state === 'missed')

  return (
    <PageContainer width="narrow" className="gap-14 pt-[clamp(48px,9vh,96px)] pb-28">
      <section className="w-full">
        <h1 className="text-[clamp(34px,5vw,56px)] leading-[1.15] font-extrabold tracking-[-0.05em] text-strong">
          우리의차트가 처음이라면,
          <br />
          이것부터 물어보세요
        </h1>
        <p className="mt-4 text-lg text-muted">자주 듣는 질문 여섯 개에 차근차근 답해 드릴게요.</p>
        <nav aria-label="질문 바로 가기" className="mt-7 flex flex-wrap gap-2">
          {QUESTIONS.map(({ id, short }) => (
            <a key={id} href={`#${id}`} className="rounded-full bg-surface px-4 py-[9px] text-sm font-bold transition-colors duration-200 hover:bg-fill">
              {short}
            </a>
          ))}
        </nav>
      </section>

      <Qna id="what" question="우리의차트는 뭐 하는 곳이에요?">
        <Bubble>
          K-pop 뮤직비디오가 유튜브에서 몇 번 재생됐는지 <strong>순위로 보여주는 곳</strong>이에요.{' '}
          {top3.length > 0
            ? `${year}년에 공개된 MV 중에서는 ${formatDateKo(data.asOf)}까지 이 ${COUNT_WORDS[top3.length]} 곡이 가장 많이 재생됐어요.`
            : `${year}년에 공개된 MV의 순위는 아직 집계 중이에요.`}
        </Bubble>
        {top3.length > 0 && (
          <Bubble wide>
            <MiniRankList items={top3} />
          </Bubble>
        )}
      </Qna>

      <Qna id="source" question="조회수는 어디서 가져와요?">
        <Bubble>
          유튜브가 영상마다 공개하는 조회수예요. 우리는 그 숫자를 <strong>매일 0시에 한 번</strong> 받아 적어 둬요.
        </Bubble>
        <Bubble>오늘 0시 숫자에서 어제 0시 숫자를 빼면 하루 동안 재생된 횟수가 나와요. 순위는 모두 이 빼기에서 시작해요.</Bubble>
      </Qna>

      <Qna id="same-year" question="왜 그해에 공개된 곡끼리만 겨뤄요?">
        <Bubble>모든 곡을 한 줄에 세우면 오래전에 나와 조회수를 많이 쌓은 곡이 늘 위에 있거든요. 아래에서 직접 바꿔 보세요.</Bubble>
        <Bubble wide>
          <ScopeCompare year={year} allTime={data.allTimeTop} thisYear={data.yearTop} />
        </Bubble>
        <Bubble>
          그래서 차트는 <strong>그 기간이 속한 해에 공개된 곡</strong>만 모아요. {year}년의 주간 차트라면 {year}년에 공개된 곡끼리 겨뤄요. 같은 해에 출발했으니 같은 출발선이에요.
        </Bubble>
      </Qna>

      <Qna id="periods" question="일간, 주간, 월간, 연간은 뭐가 달라요?">
        <Bubble>
          조회수를 <strong>얼마 동안 모았는지</strong>가 달라요. 하나씩 눌러 보세요.
        </Bubble>
        <Bubble wide>
          <PeriodGuideBox periods={data.periods} asOf={data.asOf} />
        </Bubble>
      </Qna>

      <Qna id="history" question="그럼 예전 기록은 없어요?">
        <Bubble>
          네, 없어요. 기록은 <strong>{formatDateKo(data.firstRecord)}</strong>에 처음 적었어요. 다른 곳의 지난 숫자를 가져다 채우지 않고, 우리가 직접 적은 숫자만 써요.
        </Bubble>
        <Bubble wide>
          <ol aria-label="첫 기록부터 7일" className="grid grid-cols-7 gap-1.5">
            {data.firstWeek.map((day) => {
              const style = DAY_STYLES[day.state]
              return (
                <li key={day.date} className={`grid justify-items-center gap-1.5 rounded-xl px-0.5 py-2.5 text-xs font-bold ${style.cell}`}>
                  <i aria-hidden="true" className={`size-2.5 rounded-full ${style.dot}`} />
                  {day.label}
                  <span className="sr-only">{style.label}</span>
                </li>
              )
            })}
          </ol>
          <p aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {(hasMissed ? (['recorded', 'missed', 'upcoming'] as const) : (['recorded', 'upcoming'] as const)).map((state) => (
              <span key={state} className="inline-flex items-center gap-1.5">
                <i className={`size-2.5 rounded-full ${DAY_STYLES[state].dot}`} />
                {DAY_STYLES[state].label}
              </span>
            ))}
          </p>
        </Bubble>
        <Bubble>
          지금까지 {data.recordCount}번 적었어요. 그래서 비교할 기록이 쌓이기 전인 기간은 차트에 ‘집계 중’이라고 보여요.
        </Bubble>
      </Qna>

      <Qna id="next" question="앞으로 다른 차트도 생겨요?">
        <Bubble>네. 지금은 K-pop 뮤직비디오 하나로 시작했고, 같은 방식으로 기록할 수 있는 순위를 하나씩 더할 거예요.</Bubble>
        <Bubble wide>
          <ul className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ label, ready }) => (
              <li
                key={label}
                className={`rounded-[14px] px-4 py-2.5 text-[15px] font-bold ${ready ? 'bg-accent text-white' : 'border-2 border-dashed border-fill text-muted'}`}
              >
                {label}
              </li>
            ))}
          </ul>
        </Bubble>
      </Qna>

      <section className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-strong py-6 pr-6 pl-7 text-white">
          <p className="text-xl font-extrabold tracking-[-0.03em]">더 궁금한 건 차트에서 직접 확인해 보세요</p>
          <Link
            href={chartPath('year')}
            className="rounded-full bg-cyan-300 px-6 py-3.5 text-[17px] font-extrabold tracking-[-0.02em] text-strong transition-colors duration-250 hover:bg-cyan-200"
          >
            {year}년 공개곡 차트 보기
          </Link>
        </div>
      </section>
    </PageContainer>
  )
}
