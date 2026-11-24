import { addDays } from '../../../../pipeline/mv/dates'
import type { ChartBook } from '@/features/mv/lib/chart-book'
import { PERIOD_NAMES, PERIOD_ORDER } from '@/features/mv/lib/periods'
import type { Mv, Period } from '@/features/mv/types'
import { formatDateKo } from '@/lib/format'

/** 소개 페이지에 보여줄 곡 하나 */
export interface AboutMv {
  readonly yt: string
  readonly title: string
  readonly artist: string
  readonly views: number
}

/** 기간 하나를 설명하는 데 필요한 값 */
export interface PeriodGuide {
  readonly period: Period
  /** 일간 · 주간 · 월간 · 연간 */
  readonly name: string
  /** 지금 볼 수 있는 차트가 있는가 */
  readonly open: boolean
  /** "지금 볼 수 있는 차트: 2026년 47주차 (11월 16일 ~ 11월 22일)" 또는 "2026년 11월 23일부터 볼 수 있어요" */
  readonly status: string
  /** 1월 1일부터 기준일까지를 100으로 볼 때 이 기간의 길이 (그림용) */
  readonly span: number
}

export interface AboutData {
  /** 집계 기준일 YYYY-MM-DD */
  readonly asOf: string
  /** 기준일이 속한 해 */
  readonly year: string
  /** 처음 기록한 날 YYYY-MM-DD */
  readonly firstRecord: string
  /** 지금까지 남긴 기록 수 */
  readonly recordCount: number
  /** 첫 기록일부터 7일 */
  readonly firstWeek: readonly RecordDay[]
  /** 올해 공개곡 연간 차트 상위 */
  readonly yearTop: readonly AboutMv[]
  /** 공개 연도와 관계없이 누적 조회수 상위 (올해 공개곡끼리 겨루는 이유를 보여줄 때 쓴다) */
  readonly allTimeTop: readonly AboutMv[]
  readonly periods: readonly PeriodGuide[]
}

/**
 * 기록 달력의 하루.
 * recorded: 기록함 / missed: 최신 기록보다 앞인데 기록이 없음 / upcoming: 아직 오지 않은 날
 */
export interface RecordDay {
  readonly date: string
  /** 예: "11/22" */
  readonly label: string
  readonly state: 'recorded' | 'missed' | 'upcoming'
}

type MvTotal = Pick<Mv, 'yt' | 'title' | 'artist' | 'total'>

/**
 * 소개 페이지("우리의차트는?")에 들어갈 값을 차트 기록에서 뽑는다.
 * book: 차트 페이지와 같은 기간별 차트 묶음 / mvs: 모든 곡의 누적 조회수
 */
export function buildAboutData(book: ChartBook, mvs: readonly MvTotal[], { count = 4 } = {}): AboutData {
  const { asOf, recordDates } = book
  const year = asOf.slice(0, 4)
  const firstRecord = recordDates[0]
  const latestRecord = recordDates.at(-1) ?? firstRecord
  const recorded = new Set(recordDates)

  const firstWeek = Array.from({ length: 7 }, (_, i): RecordDay => {
    const date = addDays(firstRecord, i)
    const state = recorded.has(date) ? 'recorded' : date < latestRecord ? 'missed' : 'upcoming'
    return { date, label: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`, state }
  })

  const yearView = book.view('year')
  const yearTop = (yearView?.rows ?? []).slice(0, count).map(({ yt, title, artist, views }) => ({ yt, title, artist, views }))
  const allTimeTop = mvs
    .toSorted((a, b) => b.total - a.total)
    .slice(0, count)
    .map(({ yt, title, artist, total }) => ({ yt, title, artist, views: total }))

  const elapsed = dayOfYear(asOf)
  const spanDays: Record<Period, number> = { day: 1, week: 7, month: Number(asOf.slice(8, 10)), year: elapsed }

  const periods = PERIOD_ORDER.map((period): PeriodGuide => {
    const latest = book.slots[period][0]
    const pending = latest ? null : book.view(period)
    const status = latest
      ? `지금 볼 수 있는 차트: ${period === 'year' ? latest.label : `${latest.year}년 ${latest.label}`}${latest.range ? ` (${latest.range})` : ''}`
      : pending?.availableFrom
        ? `${formatDateKo(pending.availableFrom)}부터 볼 수 있어요`
        : '기록이 쌓이면 볼 수 있어요'
    return {
      period,
      name: PERIOD_NAMES[period],
      open: Boolean(latest),
      status,
      span: Math.min(100, (spanDays[period] / elapsed) * 100),
    }
  })

  return { asOf, year, firstRecord, recordCount: recordDates.length, firstWeek, yearTop, allTimeTop, periods }
}

/** 1월 1일이 1 */
function dayOfYear(date: string): number {
  const t = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
  return Math.round((t - Date.UTC(Number(date.slice(0, 4)), 0, 1)) / 86_400_000) + 1
}
