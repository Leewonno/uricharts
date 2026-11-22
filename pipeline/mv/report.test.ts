import { describe, expect, it } from 'vitest'
import type { DiscoverResult } from './discover'
import { dailyIssue, md, weeklyDigest } from './report'

const empty: DiscoverResult = { added: [], newArtists: [], unsure: [], seen: {}, searched: false, warnings: [] }

describe('md', () => {
  it('유튜브 제목이 표를 깨거나 멘션·이슈 링크를 걸지 않게 한다', () => {
    expect(md('A | B [x](y) @user #12\nnext')).toBe('A \\| B \\[x\\](y) @​user #​12 next')
  })
})

describe('md (자동 링크·제어 문자)', () => {
  it('GH-123 이슈 링크, URL 자동 링크, 글자 방향 제어 문자를 막는다', () => {
    expect(md('see GH-123 https://evil.example')).toBe('see GH-​123 https:/​/evil.example')
    expect(md('a‮b')).toBe('ab')
  })
})

describe('dailyIssue', () => {
  it('사람이 볼 것이 없으면 이슈를 만들지 않는다 (자동 추가만 있는 날)', () => {
    const added = [
      { yt: 'a', title: 'Song', artist: 'ILLIT', released: '2026-11-22', addedAt: '2026-11-23', source: 'auto' as const },
    ]
    expect(dailyIssue('2026-11-23', { ...empty, added }, [])).toBeNull()
  })

  it('분류가 필요한 아티스트, 확인할 영상, 실패를 모두 적는다', () => {
    const issue = dailyIssue(
      '2026-11-23',
      {
        ...empty,
        added: [{ yt: 'r1', title: 'Debut', artist: 'NEWGRP', released: '2026-11-22', addedAt: '2026-11-23', source: 'auto' }],
        newArtists: [{ name: 'NEWGRP', type: null, aliases: [] }],
        unsure: [
          { yt: 'u1', youtubeTitle: "'Tick-Tack' MV", channelId: 'UCa', channelTitle: 'HYBE LABELS', subscribers: 76_000_000, reason: 'title-parse' },
          { yt: 'u2', youtubeTitle: 'X - Y (Official Video)', channelId: 'UCnew', channelTitle: 'New `Label`', subscribers: 120_000, reason: 'new-channel' },
        ],
      },
      ['조회수 기록 실패: quotaExceeded'],
    )!

    expect(issue).toContain('**NEWGRP**: Debut (https://youtu.be/r1)')
    expect(issue).toContain('제목에서 아티스트·곡명을 못 찾음')
    expect(issue).toContain('조회수 기록 실패: quotaExceeded')
    expect(issue).toContain('### 오늘 자동 추가한 곡 (1)')
    expect(issue).toContain('HYBE LABELS (7,600만)')
    // 처음 보는 채널은 channels.json에 붙여넣을 JSON을 준다 (백틱은 코드 블록을 끝내지 않게 바뀐다)
    expect(issue).toContain('"id": "UCnew"')
    expect(issue).toContain('"name": "New \'Label\'"')
  })
})

describe('weeklyDigest', () => {
  it('지난 7일 자동 추가한 곡만 모은다', () => {
    const digest = weeklyDigest(
      '2026-11-30',
      '2026-11-23',
      [
        { yt: 'a', title: 'New', artist: 'X', released: '2026-11-24', addedAt: '2026-11-24', source: 'auto' },
        { yt: 'b', title: 'Old', artist: 'X', released: '2026-11-01', addedAt: '2026-11-02', source: 'auto' },
        { yt: 'c', title: 'Seed', artist: 'X', released: '2026-01-01', addedAt: '2026-11-24', source: 'seed' },
      ],
      [{ name: 'X', type: '걸그룹', aliases: [] }],
    )!

    expect(digest).toContain('### 자동 추가한 곡 (1)')
    expect(digest).toContain('| X | New |')
    expect(digest).not.toContain('Old')
  })

  it('보여줄 것이 없으면 만들지 않는다', () => {
    expect(weeklyDigest('2026-11-30', '2026-11-23', [], [])).toBeNull()
  })
})
