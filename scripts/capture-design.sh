#!/usr/bin/env bash
# PR의 디자인 변경 전/후 비교용 스크린샷을 찍는다. 대상은 개발 서버에 떠 있는 Next.js 페이지다.
#
# 사용법: [BASE_URL=http://localhost:3000] scripts/capture-design.sh <저장폴더> <페이지이름...>
#   PC 화면(너비 1360)만 찍는다. 페이지이름은 아래 PAGES의 첫 칸이며, 그 PR에서 바뀐 페이지만 넘긴다.
#   변경 후(현재 브랜치): 개발 서버(npm run dev)를 띄워 두고
#     scripts/capture-design.sh design-history/02-20261125-feat-x/after home chart
#   변경 전(base 브랜치): git worktree로 base를 꺼내 다른 포트로 개발 서버를 띄운 뒤
#     git worktree add <임시경로> main && (cd <임시경로> && npm ci && npx next dev -p 3101)
#     BASE_URL=http://localhost:3101 scripts/capture-design.sh design-history/02-20261125-feat-x/before home chart
#     git worktree remove <임시경로>
#
# 캡처 대상은 아래 PAGES 목록에서 관리한다.
#   형식: "페이지이름|경로|창 높이"
#   200으로 응답하지 않는 페이지(base에 아직 없는 새 페이지)는 건너뛴다.
set -euo pipefail

OUT="${1:-}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WIDTH=1360

PAGES=(
  "home|/|2000"
  "chart|/mv/chart/day|1900"
  "chart-year|/mv/chart/year|1900"
  "about|/about|2600"
  "contact|/contact|1500"
)

page_names() {
  local entry
  for entry in "${PAGES[@]}"; do echo "${entry%%|*}"; done
}

if [[ -z "$OUT" || $# -lt 2 ]]; then
  echo "사용법: [BASE_URL=http://localhost:3000] $0 <저장폴더> <페이지이름...>" >&2
  echo "페이지이름: $(page_names | tr '\n' ' ')" >&2
  exit 1
fi
shift
WANTED=("$@")

for want in "${WANTED[@]}"; do
  if ! page_names | grep -qx "$want"; then
    echo "알 수 없는 페이지: $want (가능: $(page_names | tr '\n' ' '))" >&2
    exit 1
  fi
done

mkdir -p "$OUT"

shoot() {
  # 모션 감소 모드로 찍어서 카운트업 등 애니메이션이 최종 상태로 고정되게 한다
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
    --window-size="$WIDTH,$2" --virtual-time-budget=8000 \
    --screenshot="$3" "$1" >/dev/null 2>&1
}

for entry in "${PAGES[@]}"; do
  IFS='|' read -r name path height <<< "$entry"
  [[ " ${WANTED[*]} " == *" $name "* ]] || continue
  url="$BASE_URL$path"
  status="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  if [[ "$status" != 200 ]]; then
    echo "건너뜀: $name ($url → $status)"
    continue
  fi
  shoot "$url" "$height" "$OUT/$name.png"
  echo "저장: $OUT/$name.png"
done
