import { z } from 'zod'

/**
 * data 브랜치에 저장하는 MV 수집 파일들의 형식.
 * 사람이 GitHub 웹에서 직접 고치는 파일도 있으니, 읽을 때마다 이 스키마로 검사한다.
 * 모르는 키는 오류로 본다 ("hiden": true 같은 오타가 조용히 사라지지 않게).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')

export const mvTypeSchema = z.enum(['걸그룹', '보이그룹', '솔로'])

/** 차트에 올리는 곡 하나 (mv/registry.json) */
export const registryEntrySchema = z.strictObject({
  /** 유튜브 영상 ID */
  yt: z.string().min(1),
  /** 화면에 보일 곡명 (유튜브 영상 제목에서 정리한 값) */
  title: z.string().min(1),
  /** artists.json의 name과 같은 값. 그룹/솔로 구분은 거기서 가져온다 */
  artist: z.string().min(1),
  /** 공개일 (KST) */
  released: isoDate,
  /** 목록에 들어온 날 (KST). 이날부터 조회수를 기록한다 */
  addedAt: isoDate,
  /** seed: 샘플 데이터에서 옮김 / auto: 자동 발견 / manual: 사람이 직접 넣음 */
  source: z.enum(['seed', 'auto', 'manual']),
  channelId: z.string().optional(),
  /** true면 차트에서 뺀다. 기록을 이어가려고 지우지 않고 숨긴다 */
  hidden: z.boolean().optional(),
})
export type RegistryEntry = z.infer<typeof registryEntrySchema>
export const registrySchema = z.array(registryEntrySchema)

/** 아티스트 (mv/artists.json). 제목에서 뽑은 이름을 여기 이름·별칭과 맞춰 본다 */
export const artistSchema = z.strictObject({
  name: z.string().min(1),
  /** null이면 아직 분류 전. 사람이 채워 넣는다 */
  type: mvTypeSchema.nullable(),
  aliases: z.array(z.string()).default([]),
})
export type Artist = z.infer<typeof artistSchema>
export const artistsSchema = z.array(artistSchema)

/** 새 MV를 확인하는 채널 (mv/channels.json) */
export const channelSchema = z.strictObject({
  id: z.string().regex(/^UC[\w-]{22}$/, '유튜브 채널 ID(UC로 시작하는 24자)여야 합니다'),
  name: z.string(),
  addedAt: isoDate,
  source: z.enum(['seed', 'auto', 'manual']),
  /** 한 아티스트 전용 채널이면 그 아티스트. 제목에 아티스트가 없을 때 쓴다 */
  artist: z.string().optional(),
})
export type Channel = z.infer<typeof channelSchema>
export const channelsSchema = z.array(channelSchema)

/** 이미 판단한 영상 ID → 판단한 날 (mv/seen.json). 같은 영상을 매일 다시 판단하지 않는다 */
export const seenSchema = z.record(z.string(), isoDate)
export type Seen = z.infer<typeof seenSchema>

/** 하루치 누적 조회수 기록 (mv/snapshots/YYYY-MM-DD.json) */
export const snapshotSchema = z.strictObject({
  /** 이날 0시(KST) 무렵의 누적값. 즉 전날까지의 조회수다 */
  date: isoDate,
  /** 실제로 받은 시각 (ISO, KST) */
  fetchedAt: z.string(),
  views: z.record(z.string(), z.number().int().nonnegative()),
  /** 삭제·비공개·조회수 비공개 등으로 값을 못 받은 영상 */
  missing: z.array(z.string()),
  /** 0시 기록을 놓쳐 나중에 받은 값을 그날 0시 기록으로 쓰기로 한 것 (사람이 --as-midnight로 남김) */
  asMidnight: z.literal(true).optional(),
})
export type Snapshot = z.infer<typeof snapshotSchema>

/** 실행 상태 (mv/state.json) */
export const stateSchema = z.strictObject({
  /** 마지막으로 MV 검색(100유닛)에 성공한 시각 (ISO). 하루 한 번만 검색하고, 다음 검색은 이 시각 이후를 찾는다 */
  lastSearchAt: z.string().optional(),
})
export type State = z.infer<typeof stateSchema>
