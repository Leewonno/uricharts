#!/usr/bin/env bash
# PR의 디자인 변경 전/후 비교용 스크린샷을 찍는다.
#
# 사용법: scripts/capture-design.sh <저장폴더> [프로젝트 루트]
#   변경 후(현재 브랜치):  scripts/capture-design.sh design-history/02-20261125-feat-x/after
#   변경 전(base 브랜치): git worktree로 base를 꺼낸 뒤 그 경로를 루트로 넘긴다
#     git worktree add <임시경로> main
#     scripts/capture-design.sh design-history/02-20261125-feat-x/before <임시경로>
#     git worktree remove <임시경로>
#
# 캡처 대상은 아래 PAGES 목록에서 관리한다.
#   형식: "파일이름|경로 또는 URL|창 높이|옵션"
#   옵션 hover  → 3번째 행에 마우스를 올린 상태를 강제로 만들어 캡처
# Next.js 페이지로 넘어가면 경로 대신 http://localhost:3000/... URL을 넣으면 된다.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "사용법: $0 <저장폴더>" >&2
  exit 1
fi

OUT="$1"
ROOT="$(cd "${2:-$(dirname "$0")/..}" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WIDTH=1360

PAGES=(
  "home|mockups/1-scoreboard/home.html|1400|"
  "chart|mockups/1-scoreboard/chart.html|1900|"
  "chart-hover|mockups/1-scoreboard/chart.html|900|hover"
)

mkdir -p "$OUT"

shoot() {
  # 모션 감소 모드로 찍어서 카운트업 등 애니메이션이 최종 상태로 고정되게 한다
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
    --window-size="$WIDTH,$2" --virtual-time-budget=5000 \
    --screenshot="$3" "$1" >/dev/null 2>&1
}

for entry in "${PAGES[@]}"; do
  IFS='|' read -r name target height option <<< "$entry"
  tmp=""
  if [[ "$target" != http* && ! -f "$ROOT/$target" ]]; then
    # base 브랜치에 아직 없는 페이지 (새로 추가된 페이지)
    echo "건너뜀: $name ($target 없음)"
    continue
  fi
  if [[ "$target" == http* ]]; then
    url="$target"
  elif [[ "$option" == "hover" ]]; then
    # 같은 폴더에 임시 사본을 만들어야 ../data.js 같은 상대 경로가 유지된다
    tmp="$ROOT/$(dirname "$target")/.capture-hover.html"
    sed -E 's/\.(row|row-item):hover/.\1:nth-child(3)/g' "$ROOT/$target" > "$tmp"
    url="file://$tmp"
  else
    url="file://$ROOT/$target"
  fi

  shoot "$url" "$height" "$OUT/$name.png"
  [[ -n "$tmp" ]] && rm -f "$tmp"
  echo "저장: $OUT/$name.png"
done
