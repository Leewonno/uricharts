#!/usr/bin/env bash
# PR의 디자인 변경 전/후 비교용 스크린샷을 찍는다. 대상은 개발 서버에 떠 있는 Next.js 페이지다.
#
# 사용법: [BASE_URL=http://localhost:3000] scripts/capture-design.sh <저장폴더>
#   변경 후(현재 브랜치): 개발 서버(npm run dev)를 띄워 두고
#     scripts/capture-design.sh design-history/02-20261125-feat-x/after
#   변경 전(base 브랜치): git worktree로 base를 꺼내 다른 포트로 개발 서버를 띄운 뒤
#     git worktree add <임시경로> main && (cd <임시경로> && npm ci && npx next dev -p 3101)
#     BASE_URL=http://localhost:3101 scripts/capture-design.sh design-history/02-20261125-feat-x/before
#     git worktree remove <임시경로>
#
# 캡처 대상은 아래 PAGES 목록에서 관리한다.
#   형식: "파일이름|경로|창 높이"
#   200으로 응답하지 않는 페이지(base에 아직 없는 새 페이지)는 건너뛴다.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "사용법: [BASE_URL=http://localhost:3000] $0 <저장폴더>" >&2
  exit 1
fi

OUT="$1"
BASE_URL="${BASE_URL:-http://localhost:3000}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WIDTH=1360

PAGES=(
  "home|/|2000"
  "chart|/mv/chart/day|1900"
  "chart-year|/mv/chart/year|1900"
)

mkdir -p "$OUT"

shoot() {
  # 모션 감소 모드로 찍어서 카운트업 등 애니메이션이 최종 상태로 고정되게 한다
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
    --window-size="$WIDTH,$2" --virtual-time-budget=8000 \
    --screenshot="$3" "$1" >/dev/null 2>&1
}

for entry in "${PAGES[@]}"; do
  IFS='|' read -r name path height <<< "$entry"
  url="$BASE_URL$path"
  status="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  if [[ "$status" != 200 ]]; then
    echo "건너뜀: $name ($url → $status)"
    continue
  fi
  shoot "$url" "$height" "$OUT/$name.png"
  echo "저장: $OUT/$name.png"
done
