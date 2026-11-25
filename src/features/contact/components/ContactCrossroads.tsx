'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MvThumbnail } from '@/features/mv/components/MvThumbnail'
import { parseYoutubeId } from '@/features/mv/lib/youtube'
import { buildMailto, CONTACT_EMAIL, TOPICS, type Topic, type TopicId } from '../lib/contact'
import { Field, FieldRow, inputClass, textareaClass } from './FormParts'

/** 카드마다 다른 바탕: 진한 청록, 흰색, 가장 진한 청록, 옅은 청록 */
const TONES: Record<TopicId, string> = {
  add: 'bg-accent text-white',
  fix: 'bg-surface text-strong',
  biz: 'bg-strong text-cyan-100',
  etc: 'bg-fill text-strong',
}

/**
 * 문의 페이지의 "갈림길": 큰 카드 네 장 중 하나를 고르면 그 일에 꼭 맞는 짧은 폼이 아래에 펼쳐진다.
 * 고른 뒤에는 카드가 낮아지고, 고른 카드만 또렷하게 테두리가 둘린다.
 * 폼은 모두 그려 둔 채 숨기기만 해서, 다른 카드를 눌렀다 돌아와도 쓰던 내용이 남는다.
 */
export function ContactCrossroads() {
  const [picked, setPicked] = useState<TopicId | null>(null)
  const [done, setDone] = useState(false)
  const panels = useRef<Partial<Record<TopicId, HTMLElement | null>>>({})

  // 고른 폼이 화면 밖이면 보이는 곳까지 내린다
  useEffect(() => {
    if (!picked) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panels.current[picked]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [picked])

  const pick = (id: TopicId) => {
    setPicked(id)
    setDone(false)
  }

  // 받아 줄 서버가 없어서, 쓴 내용을 채운 메일 앱을 연다 (lib/contact 참고)
  const send = (topic: Topic) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = [...new FormData(event.currentTarget)].map(([name, value]) => [name, String(value)] as const)
    window.location.assign(buildMailto({ to: CONTACT_EMAIL, topic: topic.label, fields }))
    setDone(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {TOPICS.map((topic) => {
          const on = picked === topic.id
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(topic.id)}
              className={`group relative grid cursor-pointer overflow-hidden rounded-[28px] text-left transition-[min-height,opacity,box-shadow] duration-400 ease-pop motion-reduce:transition-none ${TONES[topic.id]} ${
                picked ? 'min-h-24 content-start px-6 py-5' : 'min-h-[220px] content-end p-7 max-sm:min-h-40'
              } ${picked && !on ? 'opacity-45' : ''} ${on ? 'ring-[3px] ring-accent ring-offset-4 ring-offset-page' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -right-1.5 leading-none font-black opacity-14 transition-transform duration-500 ease-pop group-hover:scale-108 group-hover:-rotate-8 motion-reduce:transition-none ${
                  picked ? '-bottom-5 text-[110px]' : '-bottom-[38px] text-[200px]'
                }`}
              >
                {topic.icon}
              </span>
              <span>
                <strong className={`block font-extrabold tracking-[-0.045em] ${picked ? 'text-lg max-sm:text-base' : 'text-2xl max-sm:text-xl'}`}>
                  {topic.label}
                </strong>
                {!picked && <span className="mt-1 block text-base font-medium tracking-tight opacity-80">{topic.short}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {TOPICS.map((topic) => {
        const showDone = done && picked === topic.id
        return (
          <section
            key={topic.id}
            ref={(el) => {
              panels.current[topic.id] = el
            }}
            hidden={picked !== topic.id}
            aria-labelledby={`${topic.id}-title`}
            className="animate-pop-in rounded-[32px] bg-surface p-10 motion-reduce:animate-none max-sm:p-6"
          >
            <form onSubmit={send(topic)} hidden={showDone}>
              <h2 id={`${topic.id}-title`} className="text-2xl font-extrabold tracking-[-0.04em] text-strong max-sm:text-xl">
                {topic.title}
              </h2>
              <p className="mt-1.5 text-base text-muted">{lead(topic.id)}</p>
              <div className="mt-7 grid gap-5.5">
                <TopicFields id={topic.id} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="ml-auto cursor-pointer rounded-full bg-accent px-[26px] py-2 text-lg font-bold text-white transition-colors duration-250 hover:bg-cyan-700 max-sm:px-4 max-sm:py-1.5 max-sm:text-[13px] max-sm:leading-5"
                  >
                    {topic.submit}
                  </button>
                </div>
              </div>
            </form>
            <div role="status">
              {showDone && (
                <div className="animate-pop-in pt-10 pb-4 text-center motion-reduce:animate-none">
                  <b aria-hidden="true" className="block text-6xl leading-none">
                    {topic.doneIcon}
                  </b>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.04em] text-strong">메일 앱에서 보내기를 눌러 주세요</h3>
                  <p className="mt-2 text-muted">
                    {topic.doneNote}
                    <br />
                    메일 앱이 열리지 않았다면 {CONTACT_EMAIL} 으로 보내 주세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDone(false)}
                    className="mt-5 cursor-pointer rounded-full bg-page px-4 py-2 text-sm font-bold text-muted transition-colors duration-200 hover:bg-fill-soft hover:text-ink"
                  >
                    다시 쓰기
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** 폼 제목 아래 한 줄 */
function lead(id: TopicId): string {
  switch (id) {
    case 'add':
      return '빠진 곡이 있으면 주소를 알려주세요.'
    case 'fix':
      return '문제의 페이지 링크를 알려주시면 바로 확인해 볼게요.'
    case 'biz':
      return '데이터 활용, 광고, 협업 제안 모두 환영해요.'
    case 'etc':
      return '쓰면서 불편했던 점, 있었으면 하는 차트, 응원 한마디도 좋아요.'
  }
}

/** 문의 종류마다 묻는 칸. name은 메일 본문의 항목 이름이 된다 */
function TopicFields({ id }: { id: TopicId }) {
  switch (id) {
    case 'add':
      return <YoutubeField />
    case 'fix':
      return (
        <>
          <Field id="fix-link" label="페이지 링크">
            <input className={inputClass} id="fix-link" name="페이지 링크" type="url" placeholder="https://..." required />
          </Field>
          <Field id="fix-msg" label="무엇이 이상한가요?">
            <textarea
              className={textareaClass}
              id="fix-msg"
              name="내용"
              placeholder="예) 아티스트 이름이 잘못 적혀 있어요 / 조회수가 유튜브와 너무 달라요"
              required
            />
          </Field>
        </>
      )
    case 'biz':
      return (
        <>
          <FieldRow>
            <Field id="biz-org" label="회사·팀">
              <input className={inputClass} id="biz-org" name="회사·팀" required />
            </Field>
            <Field id="biz-name" label="담당자">
              <input className={inputClass} id="biz-name" name="담당자" required />
            </Field>
          </FieldRow>
          <Field id="biz-contact" label="연락처">
            <input className={inputClass} id="biz-contact" name="연락처" type="tel" autoComplete="tel" placeholder="010-0000-0000" required />
          </Field>
          <Field id="biz-msg" label="제안 내용">
            <textarea className={textareaClass} id="biz-msg" name="제안 내용" required />
          </Field>
        </>
      )
    case 'etc':
      return (
        <>
          <Field id="etc-msg" label="내용">
            <textarea className={textareaClass} id="etc-msg" name="내용" required />
          </Field>
        </>
      )
  }
}

/** 유튜브 주소 칸. 주소에서 영상을 알아보면 바로 아래에 썸네일을 띄워 맞는지 확인하게 한다 */
function YoutubeField() {
  const [videoId, setVideoId] = useState<string | null>(null)
  return (
    <Field id="add-yt" label="주소" hint="공식 채널에 올라온 뮤직비디오여야 해요.">
      <input
        className={inputClass}
        id="add-yt"
        name="유튜브 주소"
        type="url"
        placeholder="https://youtu.be/..."
        required
        onChange={(event) => setVideoId(parseYoutubeId(event.target.value))}
      />
      {videoId && (
        <div className="grid animate-pop-in grid-cols-[120px_minmax(0,1fr)] items-center gap-3.5 rounded-2xl bg-fill-soft p-2.5 text-sm text-ink motion-reduce:animate-none">
          <MvThumbnail videoId={videoId} sizes="120px" className="rounded-lg bg-fill" />
          <span>
            <b className="block text-[15px] text-strong">이 영상이 맞나요?</b>
            영상 ID {videoId}
          </span>
        </div>
      )}
    </Field>
  )
}
