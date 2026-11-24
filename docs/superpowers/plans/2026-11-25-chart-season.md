# 공개연도별 차트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 차트를 공개연도(해)별로 나눠 보이게 하고(연도 드롭다운·해 안에서만 이동·짧은 경계 주·끝난 달만·누적 칸·NEW), 해가 바뀌면 지난해 공개곡의 조회수 기록을 멈춘다.

**Architecture:** 데이터는 그대로 두고 `chart-book.ts`가 기간 목록을 "해 단위"로 만든다(경계 주를 해에서 자름, 끝난 달만, 해 목록·마감 여부·기간별 누적). 새 `chart-nav.ts`가 화면에 필요한 주소(연도별·기간 탭별·기간별 href)를 미리 계산하고, 컴포넌트는 그 값을 그리기만 한다. 수집은 `daily.ts`에서 기록할 영상을 "기록 날짜 전날의 해에 공개된 곡"으로 거른다.

**Tech Stack:** Next.js 16 (정적 export, `node_modules/next/dist/docs/` 참고), React 19, Tailwind 4, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-25-chart-season-design.md` · 시안 `mockups/chart-season.html` 1번 (로컬 파일, `?v=0&s=1&p=month` 같은 주소로 상황별 화면을 볼 수 있다)

## Global Constraints

- 제목·탭 제목: `K-POP MV 조회수 순위` (앞에 유튜브 아이콘 유지)
- 주 번호: 1월 1일이 든 주 = 1주차. 주는 해에서 자른다 (2026-12-28~12-31 = 2026년 53주차 4일, 2027-01-01~01-03 = 2027년 1주차 3일). 키 형식 `YYYY-Www` 유지
- 월간: 끝난 달만. 연간: 집계 중인 올해도 보여준다
- 기간 이름에는 연도를 넣지 않는다: 일간 `11월 23일 (월)`, 주간 `47주차`, 월간 `11월`, 연간 `2026년`
- 주간 범위: `11월 16일(월) ~ 11월 22일(일)`, 7일이 아니면 뒤에 ` · 4일`
- 해 목록 = 첫 기록의 해 ~ 기준일(`asOf`)의 해. 마감 = `asOf >= YYYY-12-31`
- 마감 카드: 제목 `2026년 차트는 마감됐어요`, 본문 `2026년 12월 31일까지의 최종 순위예요.`, 버튼 `2027년 차트 보기` (다음 해가 목록에 있을 때만)
- 집계 중 빈 화면: `아직 집계 중이에요` 한 줄만 (날짜 줄 없음)
- 안내 카드는 마감 카드 하나뿐. 설명 문장·`?` 아이콘·"다른 해로" 버튼 없음
- 변동: 첫 기간(1월 1일·1주차·1월)은 모두 `–`. 직전 기간에 없고 이번 기간에 공개된 곡은 `NEW`, 그 밖에 없던 곡은 `재진입`
- 수집: 날짜 D 기록에는 `released`의 해 == (D−1)의 해인 곡만
- 코드 주석·테스트 이름은 한국어, 기존 스타일(불변 업데이트, `console.log` 금지)

## Review Focus

1. **1월 1일 0시 기록이 막 들어온 날** (asOf = 12-31): 해 목록에 2027이 없어야 하고, 2026년이 마감으로 보이며 "2027년 차트 보기" 버튼은 없어야 한다 → Task 2 테스트
2. **새해 직후 월간 기본 주소** (`/mv/chart/month`, 1월 5일): 지난해 12월이 아니라 흐린 `1월` + `아직 집계 중이에요` → Task 2 테스트
3. **지난해를 고른 채 기간 탭 이동**: 2026년을 보다가 주간→월간을 눌러도 2026년에 남아야 한다 → Task 3 테스트
4. **기록이 중간에 빠진 주**: 시작이나 끝 기록이 없는 주·달은 목록에서 빠지고, 화살표가 그 기간을 건너뛴다 → Task 2 테스트
5. **registry가 깨진 날의 대체 기록**: 최근 기록의 영상 목록으로 기록할 때는 공개일을 몰라 거를 수 없다. 이 경로는 거르지 않는 것으로 두고 테스트로 고정한다 → Task 1 테스트

---

### Task 1: 수집 — 지난해 공개곡은 기록하지 않기

**Files:**
- Modify: `pipeline/mv/daily.ts` (1단계 `ids` 만들기, 3단계 새 곡 추가)
- Test: `pipeline/mv/daily.test.ts`

**Interfaces:**
- Produces: `export function recordableIds(registry: readonly RegistryEntry[], date: string): string[]` (daily.ts) — `date`는 기록 날짜(KST YYYY-MM-DD). `addDays(date, -1)`의 연도와 `released.slice(0, 4)`가 같은 곡의 `yt`

- [ ] **Step 1: 실패하는 테스트**

```ts
describe('recordableIds', () => {
  it('기록 날짜 전날이 속한 해에 공개된 곡만 기록한다 (1월 1일 0시 기록까지 지난해 곡)', () => {
    const reg = [
      { ...entry('y25'), released: '2025-06-01' },
      { ...entry('y26'), released: '2026-12-31' },
      { ...entry('y27'), released: '2027-01-01' },
    ]
    expect(recordableIds(reg, '2026-12-31')).toEqual(['y26'])
    expect(recordableIds(reg, '2027-01-01')).toEqual(['y26'])
    expect(recordableIds(reg, '2027-01-02')).toEqual(['y27'])
  })
})
```

runDaily 테스트 하나 추가: `2027-01-02 00:05` 실행 시 registry `[a(2026-03-03), n(2027-01-01)]`이면 기록 views 키가 `['n']`뿐이고 `missing`에도 `a`가 없다. 새로 찾은 곡을 기록에 더하는 3단계도 같은 규칙을 따른다(이미 있는 "새로 찾은 MV도 오늘 기록에 넣는다" 테스트는 그대로 통과해야 함).

registry가 깨진 날 대체 기록 테스트(기존 "registry.json이 깨지면…")는 그대로 통과해야 한다 — 이 경로는 거르지 않는다.

- [ ] **Step 2:** `npx vitest run pipeline/mv/daily.test.ts` → 새 테스트 FAIL (`recordableIds` 없음)
- [ ] **Step 3:** `recordableIds` 구현, 1단계 `registry ? registry.map((r) => r.yt)`를 `recordableIds(registry, today)`로, 3단계 `discovery.added.map(...)`도 같은 함수로 거른다. 거른 곡이 하나도 없으면 3단계는 건너뛴다
- [ ] **Step 4:** `npx vitest run pipeline` → 전부 PASS
- [ ] **Step 5:** 커밋 `feat: 해가 바뀌면 지난해 공개곡은 조회수를 기록하지 않음`

---

### Task 2: chart-book — 해 단위 기간 · 마감 · 누적 · NEW

**Files:**
- Modify: `src/features/mv/lib/chart-book.ts`, `src/features/mv/types.ts`
- Modify: `src/features/mv/components/RowParts.tsx` (`ChangeBadge`·`changeLabel`에 `new`)
- Test: `src/features/mv/lib/chart-book.test.ts` (기존 테스트를 새 규칙으로 고친다. `isoWeekOf`와 그 테스트는 지운다)

**Interfaces:**
- Produces (types.ts):
  - `ChartSlot`에 `readonly year: string` 추가 (그 기간이 속한 해 = 공개연도)
  - `ChartEntry`에 `readonly total: number` (기간 끝 기록의 누적 조회수)
  - `RankChange`에 `| { readonly kind: 'new' }`
  - `ChartView`에 `readonly closed: boolean` (그 해 마감 여부)
  - `export interface ChartYear { readonly year: string; readonly closed: boolean }`
- Produces (chart-book.ts, `ChartBook`):
  - `years: readonly ChartYear[]` — 최근 해부터
  - `slots: Record<Period, readonly ChartSlot[]>` — 모든 해, 최근부터 (지금과 같음, 각 slot에 `year`)
  - `view(period, key?)` — key 없으면 **가장 최근 해(`years[0]`)**의 최근 기간, 그 해에 기간이 없으면 그 해의 집계 중 자리(`available: false`, `slot`은 그 해 첫 기간 이름: 일간 `1월 1일 (금)`, 주간 `1주차`, 월간 `1월`). 단 첫 기록이 그 해 중간이면 첫 기록 이후 처음 끝나는 기간 (지금 `pending`과 같은 계산을 해 안으로)

- [ ] **Step 1: 테스트를 새 규칙으로 고치고 추가** (한 번에 쓰고 한 번에 FAIL 확인)
  - 기존 "일간은…주간은…": 라벨이 `11월 23일 (월)`, 주 slot이 `{ key: '2026-W47', year: '2026', label: '47주차', range: '11월 16일(월) ~ 11월 22일(일)', inProgress: false }`
  - 기존 "끝난 달과 이번 달": 이름을 `끝난 달만 고를 수 있고…`로, 기대값 `[{ key: '2026-10', year: '2026', label: '10월', range: null, inProgress: false }]`. `view('month')`는 10월
  - 기존 "기록이 하나뿐이면": 집계 중 자리 라벨이 `11월 22일 (일)` / `48주차` / `12월`
  - 새 "해가 바뀌는 주는 해에서 자르고, 새해 1주차는 1월 1일이 든 주다": 2026-12-21~2027-01-12 매일 기록(지난해 곡 `a`는 01-01까지만, 새해 곡 `n` 01-01 공개는 01-02부터) →
    - `slots.week`에 `{ key: '2027-W02', label: '2주차', range: '1월 4일(월) ~ 1월 10일(일)' }`, `{ key: '2027-W01', label: '1주차', range: '1월 1일(금) ~ 1월 3일(일) · 3일' }`, `{ key: '2026-W53', label: '53주차', range: '12월 28일(월) ~ 12월 31일(목) · 4일' }` 가 이 순서로 있다
    - `view('week','2026-W53').rows`는 `a`만, 조회수 = 01-01 기록 − 12-28 기록
    - `view('week','2027-W01').rows`의 change가 모두 `{ kind: 'none' }`, `view('week','2027-W02')`에서 1주차에 있던 `n`은 `same/up/down`
  - 새 "해 목록과 마감": 마지막 기록 2027-01-01 → `years` = `[{ year: '2026', closed: true }]`, `view('year').closed === true`. 마지막 기록 2027-01-05 → `years` = `[{ year: '2027', closed: false }, { year: '2026', closed: true }]`
  - 새 "가장 최근 해에 끝난 달이 없으면 기본 월간은 그 해 1월 집계 중": 마지막 기록 2027-01-05, 2026-11-01·12-01·2027-01-01 기록 있음 → `view('month')` = `{ available: false, releaseYear: '2027', slot: { label: '1월', year: '2027' } }`, `view('month','2026-12')`는 고를 수 있다
  - 새 "누적과 NEW": 행에 `total` = 기간 끝 기록 값. 직전 기간에 없고 `released >= 이번 기간 시작`인 곡은 `{ kind: 'new' }`, 공개일이 그 전인데 직전에 없던 곡은 `reentry`
  - 새 "기록이 빠진 주는 목록에서 빠진다": 12-07 기록만 없을 때 12-07이 시작이나 끝인 주(49·50주차 중 해당하는 것)가 slots에 없다
- [ ] **Step 2:** `npx vitest run src/features/mv/lib/chart-book.test.ts` → FAIL 확인
- [ ] **Step 3: 구현** (chart-book.ts)
  - 주: 해 y마다 `m = mondayOnOrBefore(y-01-01)`부터 7일씩, `start = max(m, y-01-01)`, `end = min(m+7, (y+1)-01-01)`(기록 날짜, 끝 제외), 번호 n=1,2,…. `has(start) && has(end)`인 주만. 직전 기간 = 같은 해의 직전 주 창, 1주차면 `null`
  - 일간: 1월 1일이면 `prev: null`. 라벨에서 연도 제거
  - 월간: `has(f) && has(next)`인 달만 (집계 중 분기 삭제). 1월이면 `prev: null`
  - 연간: 지금과 같다(집계 중 허용). 라벨 `YYYY년`
  - `years`, `closed`(`asOf >= y-12-31`), 기본 view = `years[0]` 해 안에서, 집계 중 자리도 그 해 안에서
  - `rankChange(prev, rank, isNew)`: `prev === undefined`이면 `isNew ? new : reentry`
  - `isoWeekOf` 삭제
- [ ] **Step 4:** RowParts: `ChangeBadge` `new` → `<span className="text-pink-600">NEW</span>`, `changeLabel` `new` → `'새로 진입'`. `rowLabel`에 `누적 N회` 추가 (조회수 다음)
- [ ] **Step 5:** 소개 페이지 문구 유지: `src/features/about/lib/about-data.ts`의 상태 문구를 `${slot.year}년 ${slot.label}`(연간은 `slot.label` 그대로)로 바꿔 `지금 볼 수 있는 차트: 2026년 47주차 (…)` 꼴을 지킨다. 범위가 요일 포함으로 바뀐 것은 `about-data.test.ts` 기대값만 고친다. `npx vitest run` → 전부 PASS
- [ ] **Step 6:** `npx tsc --noEmit -p .` → 타입 오류는 화면 컴포넌트(Task 4)에서만 남아도 된다. 남은 오류 목록을 Task 4 시작 때 확인한다
- [ ] **Step 7:** 커밋 `feat: 차트 기간을 공개연도 단위로 (경계 주 자르기, 끝난 달만, 누적·NEW)`

---

### Task 3: chart-nav — 화면 주소 계산

**Files:**
- Create: `src/features/mv/lib/chart-nav.ts`
- Test: `src/features/mv/lib/chart-nav.test.ts`

**Interfaces:**
- Consumes: `ChartBook`(Task 2), `chartPath`(routes.ts)
- Produces:
  ```ts
  export interface NavSlot extends ChartSlot { readonly href: string }
  export interface YearOption { readonly year: string; readonly inProgress: boolean; readonly href: string; readonly current: boolean }
  export interface PeriodTab { readonly period: Period; readonly href: string; readonly current: boolean }
  export interface ChartNav {
    readonly years: readonly YearOption[]   // 최근 해부터
    readonly tabs: readonly PeriodTab[]     // PERIOD_ORDER 순
    readonly slots: readonly NavSlot[]      // 지금 보는 해·기간의 기간들, 최근부터
    readonly nextYearHref: string | null    // 마감 카드 버튼 (다음 해가 있을 때)
  }
  export function chartNav(book: ChartBook, view: ChartView): ChartNav
  ```
- 규칙: `hrefFor(period, year)` = year가 `book.years[0].year`면 `chartPath(period)`, 아니면 그 해 그 기간의 최근 slot `chartPath(period, key)`, 그런 slot이 없으면 `chartPath(period)`. slot href = 그 key가 `book.view(period)`의 key와 같고 그 view가 `available`이면 `chartPath(period)`, 아니면 `chartPath(period, key)` (지금 PeriodPicker의 `slotHref`와 같은 뜻)

- [ ] **Step 1: 테스트** — 2026-12-21~2027-01-12 기록 책으로:
  - 2026 주간 보기 → `years` = `[{year:'2027', inProgress:true, href:'/mv/chart/week', current:false}, {year:'2026', inProgress:false, href:'/mv/chart/week/2026-W53', current:true}]`
  - 같은 보기의 `tabs` 월간 href = `/mv/chart/month/2026-12` (해 유지), 2027 보기의 월간 탭 = `/mv/chart/month`
  - `slots`는 2026 주간만, 첫 항목 key `2026-W53`; 2027 주간 `slots[0].href` = `/mv/chart/week`
  - `nextYearHref`: 2026 보기 `/mv/chart/week`, 2027 보기 `null`
- [ ] **Step 2:** `npx vitest run src/features/mv/lib/chart-nav.test.ts` → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS 확인
- [ ] **Step 5:** 커밋 `feat: 차트 화면의 연도·기간 주소 계산`

---

### Task 4: 화면 — 연도 드롭다운 · 기간 이동 · 누적 칸 · 마감 카드

**Files:**
- Create: `src/features/mv/components/YearSelect.tsx` (client), `src/features/mv/components/ClosedNotice.tsx`
- Modify: `ChartPage.tsx`, `ChartBoard.tsx`, `PeriodPicker.tsx`, `ChartRow.tsx`, `src/app/mv/chart/[period]/page.tsx`, `src/app/mv/chart/[period]/[key]/page.tsx`, `src/features/mv/lib/periods.ts` (`describeChart` 삭제)

**Interfaces:**
- Consumes: `chartNav(book, view)`(Task 3), `ChartView.closed`, `ChartEntry.total`
- `ChartPage({ view, nav }: { view: ChartView; nav: ChartNav })` — 두 page.tsx가 `chartNav(book, view)`를 넘긴다
- `YearSelect({ years }: { years: readonly YearOption[] })`
- `PeriodPicker({ period, slots, current, disabled }: { period: Period; slots: readonly NavSlot[]; current: ChartSlot; disabled: boolean })`
- `ClosedNotice({ year, nextYearHref }: { year: string; nextYearHref: string | null })`

- [ ] **Step 1: 제목** `CHART_TITLE = 'K-POP MV 조회수 순위'`
- [ ] **Step 2: YearSelect** — 시안 1번의 연도 버튼: `rounded-full bg-strong text-cyan-50 pl-6 pr-4 text-lg font-bold`, 기간 탭과 같은 높이(부모 `items-stretch`), `2026년` + 아래 화살표(akar-icons `ChevronDown`, 열리면 180° 회전). 펼침 목록은 PeriodPicker의 `SlotList` 카드 스타일, 항목은 `Link`, 집계 중인 해만 오른쪽에 `● 집계 중`(점 `size-1.5 animate-pulse rounded-full bg-accent`, 글자 `text-sm font-bold text-accent`, 배경 없음). 바깥 클릭·Esc·포커스 밖으로 닫기는 PeriodPicker와 같은 방식
- [ ] **Step 3: ChartBoard** — 한 줄에 `YearSelect` + 기간 탭(`nav.tabs`의 href), 설명 문장 삭제. 연간이 아니면 `PeriodPicker`. 마감이면 표 위 `ClosedNotice`. 빈 화면: 집계 중이면 `EmptyChart available={false} availableFrom={null}` (→ `아직 집계 중이에요`만), 곡이 없으면 지금처럼
- [ ] **Step 4: PeriodPicker** — `slotHref` 대신 `slot.href`. ‹ ›는 `slots` 안에서만(해 밖으로 안 감). `disabled`면 라벨을 `text-muted/40`으로 흐리게 하고 버튼 대신 span, 화살표 둘 다 흐림. 일간 달력·목록은 그대로(받은 해의 slot만 들어온다). 범위 줄은 `current.range`
- [ ] **Step 5: ClosedNotice** — `rounded-[18px] bg-strong px-5 py-3.5 text-cyan-50`, 왼쪽 정보 아이콘(akar-icons `InfoFill` 또는 `CircleAlert`, `text-cyan-300`), 제목 `{year}년 차트는 마감됐어요`(bold), 본문 `{year}년 12월 31일까지의 최종 순위예요.`(`text-sm font-semibold text-cyan-200`), `nextYearHref`가 있으면 오른쪽 `Link` 버튼 `{Number(year)+1}년 차트 보기`(`rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-strong hover:bg-fill`)
- [ ] **Step 6: ChartRow** — `CHART_COLUMNS.change`를 `md:grid-cols-[64px_1fr_150px_150px_72px_100px]`로, 조회수 앞에 누적 칸 `relative text-right text-base font-semibold tracking-[-0.04em] text-muted tabular-nums max-md:hidden`. ChartBoard 머리줄에 `누적`(text-right)
- [ ] **Step 7: 확인**
  - `npx tsc --noEmit -p . && npx eslint src && npx vitest run` → 오류 0, 전부 PASS
  - 개발 서버 `npx next dev -p 3000`(백그라운드) 후 headless Chrome으로 `/mv/chart/week`, `/mv/chart/month`, `/mv/chart/year`, `/mv/chart/day` 캡처, 연도 드롭다운을 연 상태는 시안과 눈으로 비교. 실제 데이터에는 2027년이 없으니 해 경계 화면은 테스트로만 확인
  - 브라우저는 열지 않는다(메모리: 사용자는 직접 본다)
- [ ] **Step 8:** 커밋 `feat: 차트 화면에 연도 드롭다운, 누적 칸, 마감 안내`

---

### Task 5: 마무리 확인

- [ ] `npx next build` → 성공, `/mv/chart/[period]/[key]` 정적 페이지 수가 slots 합과 같은지 출력으로 확인
- [ ] 끝난 뒤 개발 서버를 끈다
