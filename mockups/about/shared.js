/*
 * 소개 페이지 시안 공통: 헤더·푸터·시안 바꾸기 막대를 끼워 넣고, 실제 수집 기록에서 뽑은 숫자를 준다.
 * 숫자는 data 브랜치의 2026-11-22 0시 기록 (= 2026년 11월 21일까지의 조회수).
 */

const URI = {
  asOf: '2026-11-21',
  firstRecord: '2026-11-22',
  year: '2026',
  tracked: 116,
  releasedThisYear: 26,
  totalThisYear: 1901838063,
  byType: { 걸그룹: 962371656, 보이그룹: 653618069, 솔로: 246643108, '분류 전': 39205230 },

  /** 2026년에 공개된 MV, 누적 조회수 순 (연간 차트 공개연도 2026 범위 1~10위) */
  year2026: [
    { yt: 'FyS5dAywkEo', title: 'SaWaDiKa', artist: 'LISA', released: '2026-09-04', views: 242309839, type: '솔로' },
    { yt: 'bMhDJ0S0OBA', title: "It's Me", artist: 'ILLIT', released: '2026-04-30', views: 221382918, type: '걸그룹' },
    { yt: '_gyultVTesk', title: '2.0', artist: 'BTS', released: '2026-04-02', views: 219691144, type: '보이그룹' },
    { yt: 'x3eqqoZPV_E', title: 'CHOOM', artist: 'BABYMONSTER', released: '2026-05-04', views: 212564153, type: '걸그룹' },
    { yt: '27C4pfRsf9g', title: 'ICONIC BY MISTAKE', artist: 'LE SSERAFIM x ILLIT x KATSEYE', released: '2026-06-11', views: 209376413, type: '걸그룹' },
    { yt: 'b4iVv91Z6lY', title: 'SWIM', artist: 'BTS', released: '2026-03-20', views: 176369437, type: '보이그룹' },
    { yt: 'F7sGJVUrkjQ', title: 'RUDE!', artist: 'Hearts2Hearts', released: '2026-02-20', views: 165841730, type: '걸그룹' },
    { yt: 'naoGk-Zjc1s', title: 'SUGAR HONEY ICE TEA', artist: 'BABYMONSTER', released: '2026-06-08', views: 153206442, type: '걸그룹' },
    { yt: 'BZ4UzthYTss', title: 'This & That', artist: 'Stray Kids', released: '2026-08-07', views: 130699859, type: '보이그룹' },
    { yt: 'QERKD90hG98', title: 'IF I', artist: 'TREASURE', released: '2026-06-01', views: 126857629, type: '보이그룹' },
  ],

  /** 11월에 막 공개된 곡들 (공개연도 2026 범위 11위~) */
  fresh2026: [
    { yt: 'M9G4guYg-i8', title: 'Angel Bite', artist: 'TXT', released: '2026-11-16', views: 26855270 },
    { yt: '0JQ9k6kcKVs', title: 'BABY ANGEL', artist: 'NAYEON', released: '2026-11-20', views: 7220439 },
    { yt: 'j_Z3_4aFQxQ', title: 'ORIGAMI', artist: 'SANTOS BRAVOS x &TEAM', released: '2026-11-20', views: 3918512 },
  ],

  /** 누적(모든 곡) 범위 상위. 올해 곡과 출발선이 다르다는 걸 보여줄 때 쓴다 */
  allTime: [
    { yt: '9bZkp7q19f0', title: 'GANGNAM STYLE', artist: 'PSY', released: '2012-07-15', views: 6137533175 },
    { yt: 'ekr2nIex040', title: 'APT.', artist: 'ROSÉ & Bruno Mars', released: '2024-10-18', views: 2769007605 },
    { yt: 'IHNzOHi8sJs', title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', released: '2018-06-15', views: 2420785311 },
    { yt: '2S24-y0Ij3Y', title: 'Kill This Love', artist: 'BLACKPINK', released: '2019-04-04', views: 2254379685 },
    { yt: 'gdZLi9oWNZg', title: 'Dynamite', artist: 'BTS', released: '2020-08-20', views: 2169622548 },
  ],
}

const fmt = new Intl.NumberFormat('ko-KR')
const formatNumber = (n) => fmt.format(n)

/** 실제 사이트 format.ts와 같은 규칙: 억은 소수 둘째 자리에서 자르고, 만은 반올림 */
function formatShort(n) {
  if (n >= 1e8) {
    const hundredths = Math.floor(n / 1e6)
    return `${formatNumber(Math.floor(hundredths / 100))}.${String(hundredths % 100).padStart(2, '0')}억`
  }
  if (n >= 1e4) return `${formatNumber(Math.round(n / 1e4))}만`
  return formatNumber(n)
}

function formatDateKo(iso) {
  const [y, m, d] = iso.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

const thumbUrl = (yt) => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`

const MOCKS = [
  { file: '01-scroll-story.html', name: '스크롤 이야기' },
  { file: '02-midnight-log.html', name: '0시의 기록' },
  { file: '03-questions.html', name: '묻고 답하기' },
  { file: '04-numbers.html', name: '숫자로 보는 2026' },
  { file: '05-how-to-read.html', name: '차트 읽는 법' },
]

const ICON_YOUTUBE =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>'
const ICON_SPARKLES =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4c.5 3.5 2.5 5.5 6 6-3.5.5-5.5 2.5-6 6-.5-3.5-2.5-5.5-6-6 3.5-.5 5.5-2.5 6-6z"/><path d="M18.5 15c.2 1.5 1 2.3 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.2 2.3-1 2.5-2.5z"/></svg>'

function mountChrome() {
  const header = document.querySelector('[data-site-header]')
  if (header) {
    header.outerHTML = `
      <header class="site-header">
        <a class="logo" href="#" aria-label="우리의차트 홈">
          <i class="logo-tile" aria-hidden="true"><b></b><b></b><b></b></i>
          <span class="logo-name">우리의차트<small>URICHARTS</small></span>
        </a>
        <nav class="site-nav">
          <a href="#">${ICON_YOUTUBE}K-POP MV 조회수</a>
          <a href="#" aria-current="page">${ICON_SPARKLES}우리의차트는?</a>
        </nav>
      </header>`
  }

  const footer = document.querySelector('[data-site-footer]')
  if (footer) {
    footer.outerHTML = `
      <footer class="site-footer">
        <div class="inner">
          <p class="slogan">오늘의 데이터를<br /><em>기록으로 남깁니다</em></p>
          <ul><li><a href="#">소개</a></li><li><a href="#">문의</a></li></ul>
        </div>
        <p class="copy">© ${URI.year} 우리의차트 URICHARTS</p>
        <span class="wordmark" aria-hidden="true">URICHARTS</span>
      </footer>`
  }

  const current = location.pathname.split('/').pop()
  const switcher = document.createElement('nav')
  switcher.className = 'mock-switcher'
  switcher.setAttribute('aria-label', '시안 바꾸기')
  switcher.innerHTML =
    `<span>소개 페이지 시안</span>` +
    MOCKS.map(
      (m, i) =>
        `<a href="${m.file}" title="${m.name}"${m.file === current ? ' aria-current="page"' : ''}>${i + 1}</a>`,
    ).join('')
  document.body.append(switcher)
}

mountChrome()
