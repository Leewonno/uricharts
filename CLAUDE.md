@AGENTS.md

# 우리의차트 / URICHARTS (kpop-chart)

- 한글 이름: 우리의차트 / 영문 이름: URICHARTS (표기는 대문자, 도메인·계정은 소문자 `uricharts`)
- 지금은 K-pop 뮤직비디오 유튜브 조회수 차트(주간 / 월간 / 연간)로 시작하고, 나중에 웹툰 순위 등 다른 카테고리 차트를 추가할 예정이다. 라우팅·데이터 모델·네비게이션을 카테고리 단위(`/mv`, `/webtoon` …)로 확장 가능하게 만든다.
현재 디자인 기준: `mockups/1-scoreboard/` (Pretendard, 라벤더 톤).

## PR 생성 시 디자인 전/후 캡처 (필수)

디자인을 수정할 때마다 캡처하지 않는다. **사용자가 PR 생성을 요청할 때 한 번**, base 브랜치 대비 화면이 어떻게 바뀌었는지 캡처해 기록한다. 사용자가 나중에 변경 이력을 비교하는 데 쓴다.

PR에 화면에 보이는 변경(색, 폰트, 레이아웃, 문구, 인터랙션 등 — `mockups/`, 페이지/컴포넌트, CSS)이 있을 때만 한다. 로직/데이터/문서만 바뀐 PR은 건너뛴다.

1. 기록 폴더 이름을 정한다: `design-history/NN-YYYYMMDD-브랜치이름/`
   - `NN`은 `design-history/`의 마지막 번호 + 1, 날짜는 PR 생성일
2. **변경 후** (현재 브랜치):
   `scripts/capture-design.sh design-history/<폴더>/after`
3. **변경 전** (base 브랜치를 임시 worktree로 꺼내서):
   ```
   git worktree add <스크래치패드>/base-capture <base브랜치>
   scripts/capture-design.sh design-history/<폴더>/before <스크래치패드>/base-capture
   git worktree remove <스크래치패드>/base-capture
   ```
   - base에 없는 페이지는 자동으로 건너뛴다 (새 페이지).
   - Next.js 페이지가 대상이면 base worktree에서 개발 서버를 따로 띄워(다른 포트) 캡처한다.
4. 캡처 이미지를 직접 열어 확인한다.
5. `design-history/README.md` 맨 위에 항목을 추가한다: PR 제목, 바뀐 점 요약, 전/후 비교 표.
6. 기록을 커밋에 포함한 뒤 PR을 만든다. PR 본문에도 전/후 비교 표를 넣는다.
   이미지 주소는 커밋 SHA 기준 `https://github.com/<owner>/<repo>/blob/<sha>/design-history/...png?raw=true` 로 쓴다.

- 캡처 대상 페이지는 `scripts/capture-design.sh`의 `PAGES` 목록에서 관리한다. 새 페이지가 생기거나 Next.js로 옮기면(`http://localhost:3000/...`) 목록을 먼저 갱신한다.
- 호버 같은 상호작용이 바뀌었다면 `hover` 옵션 항목으로 그 상태도 캡처한다.
