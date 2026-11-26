/**
 * MV 수집 실행 파일. 매일 0시(KST)에 GitHub Actions가 돌린다 (.github/workflows/collect-mv.yml).
 * 하는 일과 순서는 daily.ts 참고.
 *
 *   npm run mv:collect -- --data .data [--search] [--issue-out 파일] [--digest-out 파일]
 *
 * --search 를 줘야 MV 검색(100유닛)을 한다. 그래도 하루 한 번만 한다.
 * --skip-if-done 은 백업 실행용: 오늘 조회수 기록·검색이 끝났으면 유튜브 API를 부르지 않고 마친다.
 * 로컬에서는 .env.local의 YOUTUBE_API_KEY를 읽는다.
 */
import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { runDaily } from './daily'
import { createYoutubeClient } from './youtube-api'

async function main() {
  const { values: args } = parseArgs({
    options: {
      data: { type: 'string', default: '.data' },
      search: { type: 'boolean', default: false },
      'force-snapshot': { type: 'boolean', default: false },
      'as-midnight': { type: 'boolean', default: false },
      'skip-if-done': { type: 'boolean', default: false },
      'issue-out': { type: 'string' },
      'digest-out': { type: 'string' },
    },
  })
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')

  const client = createYoutubeClient({ apiKey: process.env.YOUTUBE_API_KEY ?? '' })
  const { failures } = await runDaily({
    client,
    dataDir: args.data,
    now: new Date(),
    search: args.search,
    forceSnapshot: args['force-snapshot'],
    asMidnight: args['as-midnight'],
    skipIfDone: args['skip-if-done'],
    issueOut: args['issue-out'],
    digestOut: args['digest-out'],
  })

  console.info(`쓴 할당량: ${client.unitsUsed}유닛 / 하루 10,000`)
  // 일부라도 실패하면 Actions job을 실패로 끝내 메일이 오게 한다 (받은 만큼은 다음 단계에서 커밋한다)
  if (failures.length) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
