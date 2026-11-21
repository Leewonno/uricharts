import type { Mv, Period, PeriodInfo } from '../types'

/**
 * 샘플 데이터 (2026-11-20 기준). 실제 수집 파이프라인이 생기면 교체한다.
 * - 실제 값: 곡/아티스트/공개일, 유튜브 영상 ID(yt), 누적 조회수(total).
 *   2026-11-21 유튜브에서 확인했고, 영상 ID는 oEmbed로 공식 MV인지 검증했다.
 * - 예시 값: 일간/주간/월간/연간 조회수(day/week/month/yearViews)와 이전 순위(prev*).
 *   연간 조회수는 올해 공개곡이면 누적과 같고, 그 전 공개곡은 월간의 약 11배(누적의 60% 이하)로 만들었다.
 *   일간 이전 순위는 아직 따로 없어 주간 이전 순위를 그대로 쓴다.
 */
export const REF_DATE = '2026-11-20'
export const REF_YEAR = REF_DATE.slice(0, 4)

export const SAMPLE_MVS: readonly Mv[] = [
  { yt: 'FyS5dAywkEo', title: 'SaWaDiKa', artist: 'LISA', type: '솔로', released: '2026-09-04', total: 241490802, day: 1573000, week: 9800000, month: 43500000, yearViews: 241490802, prevD: 1, prevW: 1, prevM: 1 },
  { yt: '_gyultVTesk', title: '2.0', artist: 'BTS', type: '보이그룹', released: '2026-04-02', total: 219088671, day: 1182000, week: 7400000, month: 31900000, yearViews: 219088671, prevD: 3, prevW: 3, prevM: 2 },
  { yt: 'bMhDJ0S0OBA', title: "It's Me", artist: 'ILLIT', type: '걸그룹', released: '2026-04-30', total: 220516909, day: 970000, week: 6100000, month: 27800000, yearViews: 220516909, prevD: 2, prevW: 2, prevM: 4 },
  { yt: 'x3eqqoZPV_E', title: 'CHOOM', artist: 'BABYMONSTER', type: '걸그룹', released: '2026-05-04', total: 212298699, day: 886000, week: 5600000, month: 25400000, yearViews: 212298699, prevD: 4, prevW: 4, prevM: 3 },
  { yt: '27C4pfRsf9g', title: 'ICONIC BY MISTAKE', artist: 'LE SSERAFIM x ILLIT x KATSEYE', type: '걸그룹', released: '2026-06-11', total: 208724951, day: 819000, week: 5200000, month: 23100000, yearViews: 208724951, prevD: 6, prevW: 6, prevM: 5 },
  { yt: 'ekr2nIex040', title: 'APT.', artist: 'ROSÉ & Bruno Mars', type: '솔로', released: '2024-10-18', total: 2767419100, day: 752000, week: 4800000, month: 21000000, yearViews: 224820000, prevD: 5, prevW: 5, prevM: 7 },
  { yt: 'b4iVv91Z6lY', title: 'SWIM', artist: 'BTS', type: '보이그룹', released: '2026-03-20', total: 176182182, day: 670000, week: 4300000, month: 19800000, yearViews: 176182182, prevD: 7, prevW: 7, prevM: 6 },
  { yt: 'BZ4UzthYTss', title: 'This & That', artist: 'Stray Kids', type: '보이그룹', released: '2026-08-07', total: 130276403, day: 605000, week: 3900000, month: 18200000, yearViews: 130276403, prevD: 9, prevW: 9, prevM: 8 },
  { yt: 'naoGk-Zjc1s', title: 'SUGAR HONEY ICE TEA', artist: 'BABYMONSTER', type: '걸그룹', released: '2026-06-08', total: 153013311, day: 540000, week: 3500000, month: 15800000, yearViews: 153013311, prevD: 8, prevW: 8, prevM: 10 },
  { yt: 'F7sGJVUrkjQ', title: 'RUDE!', artist: 'Hearts2Hearts', type: '걸그룹', released: '2026-02-20', total: 165550933, day: 492000, week: 3200000, month: 14900000, yearViews: 165550933, prevD: 10, prevW: 10, prevM: 9 },
  { yt: 'CgCVZdcKcqY', title: 'JUMP', artist: 'BLACKPINK', type: '걸그룹', released: '2025-07-11', total: 451048223, day: 443000, week: 2900000, month: 13400000, yearViews: 142360000, prevD: 12, prevW: 12, prevM: 11 },
  { yt: 'QERKD90hG98', title: 'IF I', artist: 'TREASURE', type: '보이그룹', released: '2026-06-01', total: 126832269, day: 411000, week: 2700000, month: 12300000, yearViews: 126832269, prevD: 11, prevW: 11, prevM: 13 },
  { yt: 'JSFG-IE8n_c', title: 'like JENNIE', artist: 'JENNIE', type: '솔로', released: '2025-03-07', total: 306000441, day: 363000, week: 2400000, month: 11000000, yearViews: 118700000, prevD: 13, prevW: 13, prevM: 12 },
  { yt: '5oQVTnq-UKk', title: 'Rich Man', artist: 'aespa', type: '걸그룹', released: '2025-09-05', total: 68297737, day: 226000, week: 1500000, month: 7200000, yearViews: 40980000, prevD: 14, prevW: 14, prevM: 14 },
  { yt: 'eHHQaoEW30Q', title: 'THIS IS FOR', artist: 'TWICE', type: '걸그룹', released: '2025-07-11', total: 154215999, day: 180000, week: 1200000, month: 5600000, yearViews: 61360000, prevD: null, prevW: null, prevM: 15 },
]

export const PERIODS: Readonly<Record<Period, PeriodInfo>> = {
  day: { key: 'day', name: '일간', label: '11월 20일', range: '2026년 11월 20일 (금)', year: REF_YEAR },
  week: { key: 'week', name: '주간', label: '2026년 47주차', range: '2026년 47주차 (11월 14일 ~ 11월 20일)', year: REF_YEAR },
  month: { key: 'month', name: '월간', label: '2026년 10월', range: '2026년 10월 (10월 1일 ~ 10월 31일)', year: REF_YEAR },
  year: { key: 'year', name: '연간', label: `${REF_YEAR}년`, range: `${REF_YEAR}년 (1월 1일 ~ 11월 20일)`, year: REF_YEAR },
}

export const PERIOD_ORDER: readonly Period[] = ['day', 'week', 'month', 'year']
