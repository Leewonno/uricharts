#!/usr/bin/env bash
# data 브랜치 워크트리(현재 폴더)의 수집 결과를 커밋해서 올린다. collect-mv.yml에서 .data 안에서 실행한다.
#
# 1) 조회수 기록(mv/snapshots)과 2) 목록 변경(registry·artists·seen 등)을 따로 커밋한다.
# push가 거절되면(그 사이 누가 GitHub에서 data 브랜치를 고쳤다) 최신으로 rebase해서 다시 올린다.
# rebase가 충돌하면 사람이 고친 내용을 지키고, 겹칠 일이 없는 조회수 기록 커밋만 올린다.
# 버린 목록 변경은 seen.json도 같이 버려지므로 다음 실행 때 다시 찾아진다. 이때는 실패로 끝내 메일이 오게 한다.
set -euo pipefail

today=$(TZ=Asia/Seoul date +%F)
git config user.name "github-actions[bot]"
git config user.email "41898783+github-actions[bot]@users.noreply.github.com"

snapshot_commit=""
git add mv/snapshots 2> /dev/null || true
if ! git diff --cached --quiet; then
  git commit -q -m "data: MV 조회수 $today"
  snapshot_commit=$(git rev-parse HEAD)
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "data: MV 목록 $today"
fi

dropped=0
for attempt in 1 2 3; do
  if git push -q origin HEAD:refs/heads/data; then
    if [ "$dropped" = 1 ]; then
      echo "::error::목록 변경이 GitHub에서 고친 내용과 겹쳐 오늘 목록 변경은 버렸습니다 (조회수 기록은 올렸습니다). 다음 실행 때 다시 찾습니다."
      exit 1
    fi
    exit 0
  fi
  echo "push 거절 (${attempt}번째). 최신 data 브랜치로 다시 맞춥니다"
  git fetch -q origin +refs/heads/data:refs/remotes/origin/data
  if git rebase -q origin/data; then
    continue
  fi
  git rebase --abort
  git reset -q --hard origin/data
  if [ -n "$snapshot_commit" ]; then
    git cherry-pick "$snapshot_commit" > /dev/null
  fi
  dropped=1
done

echo "::error::data 브랜치에 올리지 못했습니다"
exit 1
