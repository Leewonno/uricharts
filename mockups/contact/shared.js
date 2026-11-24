/*
 * 문의 페이지 시안 공통: 헤더·푸터·시안 바꾸기 막대를 끼워 넣는다.
 * 시안이라 실제로 보내지는 않는다. 보내기를 누르면 각 시안이 "받았어요" 화면만 보여준다.
 * 메일 주소는 자리만 잡아 둔 것 (도메인을 정하면 바꾼다).
 */

const CONTACT = {
  email: 'hello@uricharts.com',
  year: '2026',
  asOf: '2026-11-23',
  tracked: 116,
}

/** 문의 종류: 모든 시안이 같은 네 가지를 쓴다 */
const TOPICS = [
  { id: 'add', label: '곡 추가 요청', short: '이 MV도 넣어 주세요', icon: '＋' },
  { id: 'fix', label: '숫자·정보 오류', short: '순위나 정보가 이상해요', icon: '!' },
  { id: 'biz', label: '제휴·광고', short: '함께 일하고 싶어요', icon: '✦' },
  { id: 'etc', label: '그 밖의 이야기', short: '의견, 응원, 질문', icon: '…' },
]

const MOCKS = [
  { file: '01-simple-form.html', name: '반듯한 폼' },
  { file: '02-crossroads.html', name: '갈림길' },
  { file: '03-chat.html', name: '대화로 묻기' },
  { file: '04-postcard.html', name: '엽서' },
  { file: '05-faq-first.html', name: '자주 묻는 질문 먼저' },
]

/** 유튜브 주소에서 영상 ID를 꺼낸다 (watch?v=, youtu.be/, shorts/) */
function youtubeId(url) {
  const m = String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

const thumbUrl = (yt) => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`

function formatDateKo(iso) {
  const [y, m, d] = iso.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

const ICON_YOUTUBE =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>'
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>'
const ICON_COPY =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'

/** 유튜브 입력칸 밑에 썸네일 미리보기를 붙인다 */
function bindYoutubePreview(input, preview) {
  const update = () => {
    const id = youtubeId(input.value)
    preview.classList.toggle('show', Boolean(id))
    if (id) {
      preview.innerHTML = `<img class="thumb" src="${thumbUrl(id)}" alt="" /><span><b>이 영상이 맞나요?</b>영상 ID ${id}</span>`
    }
  }
  input.addEventListener('input', update)
}

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
        </nav>
      </header>`
  }

  const footer = document.querySelector('[data-site-footer]')
  if (footer) {
    footer.outerHTML = `
      <footer class="site-footer">
        <div class="inner">
          <p class="slogan">오늘의 데이터를<br /><em>기록으로 남깁니다</em></p>
          <ul><li><a href="#" aria-current="page">문의</a></li></ul>
        </div>
        <p class="copy">© ${CONTACT.year} 우리의차트 URICHARTS</p>
        <span class="wordmark" aria-hidden="true">URICHARTS</span>
      </footer>`
  }

  const current = location.pathname.split('/').pop()
  const switcher = document.createElement('nav')
  switcher.className = 'mock-switcher'
  switcher.setAttribute('aria-label', '시안 바꾸기')
  switcher.innerHTML =
    `<span>문의 페이지 시안</span>` +
    MOCKS.map(
      (m, i) =>
        `<a href="${m.file}" title="${m.name}"${m.file === current ? ' aria-current="page"' : ''}>${i + 1}</a>`,
    ).join('')
  document.body.append(switcher)
}

mountChrome()
