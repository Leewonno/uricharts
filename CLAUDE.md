@AGENTS.md

# 우리의차트 / URICHARTS (kpop-chart)

- 한글 이름: 우리의차트 / 영문 이름: URICHARTS (표기는 대문자, 도메인·계정은 소문자 `uricharts`)
- 지금은 K-pop 뮤직비디오 유튜브 조회수 차트(주간 / 월간 / 연간)로 시작하고, 나중에 웹툰 순위 등 다른 카테고리 차트를 추가할 예정이다. 라우팅·데이터 모델·네비게이션을 카테고리 단위(`/mv`, `/webtoon` …)로 확장 가능하게 만든다.
현재 디자인 기준: Next.js 페이지 (`/` 홈, `/mv/chart/[period]` 차트 · Pretendard, Tailwind cyan 팔레트). HTML 시안(`mockups/`)은 Next.js로 옮긴 뒤 지웠다.

## PR 생성 시 디자인 전/후 캡처 (필수)

디자인을 수정할 때마다 캡처하지 않는다. **사용자가 PR 생성을 요청할 때 한 번**, base 브랜치 대비 화면이 어떻게 바뀌었는지 캡처해 기록한다. 사용자가 나중에 변경 이력을 비교하는 데 쓴다.

PR에 화면에 보이는 변경(색, 폰트, 레이아웃, 문구, 인터랙션 등 — 페이지/컴포넌트, CSS)이 있을 때만 한다. 로직/데이터/문서만 바뀐 PR은 건너뛴다.

1. 기록 폴더 이름을 정한다: `design-history/NN-YYYYMMDD-브랜치이름/`
   - `NN`은 `design-history/`의 마지막 번호 + 1, 날짜는 PR 생성일
2. **캡처할 페이지를 고른다**: base 대비 diff를 보고, 이 PR에서 화면이 실제로 바뀐 페이지만 `PAGES` 이름으로 고른다.
   - 공용 부품(헤더·푸터·`globals.css` 등)이 바뀌었으면 그 부품이 보이는 페이지 중 대표 하나만 찍는다 (예: `home`).
   - **PC 화면(너비 1360)만 찍는다.** 모바일 너비 캡처(`-430` 등)는 만들지 않는다.
3. **변경 후** (현재 브랜치, 개발 서버 `localhost:3000`이 떠 있어야 한다):
   `scripts/capture-design.sh design-history/<폴더>/after <페이지이름...>`
4. **변경 전** (base 브랜치를 임시 worktree로 꺼내 다른 포트로 개발 서버를 띄워서):
   ```
   git worktree add <스크래치패드>/base-capture <base브랜치>
   (cd <스크래치패드>/base-capture && npm ci && npx next dev -p 3101)   # 백그라운드로
   BASE_URL=http://localhost:3101 scripts/capture-design.sh design-history/<폴더>/before <페이지이름...>
   # 개발 서버를 끄고
   git worktree remove --force <스크래치패드>/base-capture
   ```
   - base에 없는 페이지(200이 아닌 응답)는 자동으로 건너뛴다 (새 페이지).
5. 캡처 이미지를 직접 열어 확인한다.
6. `design-history/README.md` 맨 위에 항목을 추가한다: PR 제목, 바뀐 점 요약, 전/후 비교 표.
7. 기록을 커밋에 포함한 뒤 PR을 만든다. PR 본문에도 전/후 비교 표를 넣는다.
   이미지 주소는 커밋 SHA 기준 `https://github.com/<owner>/<repo>/blob/<sha>/design-history/...png?raw=true` 로 쓴다.

- 캡처 대상 페이지는 `scripts/capture-design.sh`의 `PAGES` 목록에서 관리한다. 새 페이지가 생기면 목록을 먼저 갱신한다.
- 호버 같은 상호작용은 스크린샷으로 남기기 어려우니, 바뀌었다면 README 항목에 글로 적는다.
