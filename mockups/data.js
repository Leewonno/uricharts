// 시안용 샘플 데이터. 곡/아티스트는 실제지만 조회수는 모두 예시 수치입니다.
(function () {
  const REF_DATE = new Date('2025-11-20')

  const mvs = [
    { title: 'APT.', artist: 'ROSÉ & Bruno Mars', type: '솔로', released: '2024-10-18', total: 2410000000, week: 31200000, month: 142000000, prevW: 1, prevM: 1, color: '#F25C8C' },
    { title: 'JUMP', artist: 'BLACKPINK', type: '걸그룹', released: '2025-07-11', total: 468000000, week: 14600000, month: 61300000, prevW: 2, prevM: 2, color: '#FF7BB0' },
    { title: 'like JENNIE', artist: 'JENNIE', type: '솔로', released: '2025-03-07', total: 512000000, week: 9800000, month: 44100000, prevW: 3, prevM: 3, color: '#E04848' },
    { title: 'Rich Man', artist: 'aespa', type: '걸그룹', released: '2025-09-05', total: 121000000, week: 6900000, month: 30500000, prevW: 4, prevM: 5, color: '#9B7CFF' },
    { title: 'CEREMONY', artist: 'Stray Kids', type: '보이그룹', released: '2025-08-22', total: 138000000, week: 5400000, month: 24800000, prevW: 6, prevM: 4, color: '#E8343A' },
    { title: 'Born Again', artist: 'LISA', type: '솔로', released: '2025-02-28', total: 214000000, week: 4200000, month: 19900000, prevW: 5, prevM: 6, color: '#F2C230' },
    { title: 'THIS IS FOR', artist: 'TWICE', type: '걸그룹', released: '2025-07-11', total: 97000000, week: 3100000, month: 14200000, prevW: 8, prevM: 7, color: '#FF8A3D' },
    { title: 'earthquake', artist: 'JISOO', type: '솔로', released: '2025-02-14', total: 173000000, week: 2700000, month: 12600000, prevW: 7, prevM: 8, color: '#C9A0FF' },
    { title: 'REBEL HEART', artist: 'IVE', type: '걸그룹', released: '2025-01-13', total: 156000000, week: 2300000, month: 10800000, prevW: 10, prevM: 9, color: '#FF4D6D' },
    { title: 'Dirty Work', artist: 'aespa', type: '걸그룹', released: '2025-06-27', total: 132000000, week: 2100000, month: 9900000, prevW: 11, prevM: 10, color: '#7C6CFF' },
    { title: 'TOO BAD', artist: 'G-DRAGON', type: '솔로', released: '2025-02-25', total: 118000000, week: 1900000, month: 9400000, prevW: 9, prevM: 11, color: '#F5D547' },
    { title: 'HOT', artist: 'LE SSERAFIM', type: '걸그룹', released: '2025-03-14', total: 104000000, week: 1600000, month: 7900000, prevW: 12, prevM: 12, color: '#3D7BFF' },
    { title: 'ATTITUDE', artist: 'IVE', type: '걸그룹', released: '2025-02-03', total: 91000000, week: 1300000, month: 6400000, prevW: 14, prevM: 14, color: '#FF6F91' },
    { title: 'MONA LISA', artist: 'j-hope', type: '솔로', released: '2025-06-13', total: 88000000, week: 1200000, month: 6100000, prevW: 13, prevM: 13, color: '#36C28B' },
    { title: 'KNOW ABOUT ME', artist: 'NMIXX', type: '걸그룹', released: '2025-03-17', total: 54000000, week: 1050000, month: 5000000, prevW: null, prevM: 15, color: '#2EC4D6' },
  ]

  // 결정적(seeded) 스파크라인: 최근 8주 주간 조회수
  mvs.forEach((m, i) => {
    let s = (i + 3) * 9301
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    m.spark = Array.from({ length: 8 }, (_, k) => Math.round(m.week * (0.7 + rnd() * 0.5 + (k / 7) * 0.15)))
    m.spark[7] = m.week
    m.days = Math.max(1, Math.round((REF_DATE - new Date(m.released)) / 86400000))
    m.daily = Math.round(m.total / m.days)
  })

  const PERIODS = {
    week: { key: 'week', name: '주간', label: '2025년 47주차', range: '11월 14일 ~ 11월 20일', metric: '주간 조회수', prev: 'prevW' },
    month: { key: 'month', name: '월간', label: '2025년 10월', range: '10월 1일 ~ 10월 31일', metric: '월간 조회수', prev: 'prevM' },
    year: { key: 'year', name: '연간', label: '2025년', range: '2025년 공개 뮤직비디오', metric: '누적 조회수', prev: null },
  }

  function ranking(period) {
    const p = PERIODS[period]
    const list = period === 'year'
      ? mvs.filter(m => m.released.startsWith('2025'))
      : mvs.slice()
    const field = period === 'year' ? 'total' : period
    return list
      .sort((a, b) => b[field] - a[field])
      .map((m, i) => {
        const rank = i + 1
        const prev = p.prev ? m[p.prev] : undefined
        let change = { kind: 'none', text: '–' }
        if (p.prev) {
          if (prev == null) change = { kind: 'new', text: '재진입' }
          else if (prev > rank) change = { kind: 'up', text: String(prev - rank) }
          else if (prev < rank) change = { kind: 'down', text: String(rank - prev) }
          else change = { kind: 'same', text: '–' }
        }
        return { ...m, rank, views: m[field], change }
      })
  }

  const num = n => n.toLocaleString('ko-KR')
  function short(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 1 : 2).replace(/\.?0+$/, '') + '억'
    if (n >= 1e4) return num(Math.round(n / 1e4)) + '만'
    return num(n)
  }
  const date = s => s.replace(/-/g, '.')

  function sparkPath(values, w, h) {
    const max = Math.max(...values), min = Math.min(...values)
    const span = max - min || 1
    return values.map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
    }).join(' ')
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  window.KCHART = { mvs, PERIODS, ranking, num, short, date, sparkPath, esc }
})()
