import type { MvSnapshot } from '../types'
import { REF_DATE, SAMPLE_MVS } from './sample'

/**
 * MV 조회수와 그 집계 기준일을 함께 가져온다.
 * 지금은 샘플 데이터를 돌려주고, 수집 서버가 생기면 그 응답으로 바꾼다.
 * 화면에서 기준일을 오늘 날짜로 계산하지 말고 이 값을 쓴다 (집계가 늦어지면 날짜가 어긋난다).
 */
export async function getMvSnapshot(): Promise<MvSnapshot> {
  return { asOf: REF_DATE, mvs: SAMPLE_MVS }
}
