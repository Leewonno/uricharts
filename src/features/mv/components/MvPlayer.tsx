'use client'

import { Cross } from 'akar-icons'
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react'
import { embedUrl } from '../lib/youtube'
import type { Mv } from '../types'

/** 모달에 필요한 값만 받는다 (순위 행 어디서든 열 수 있게) */
type PlayableMv = Pick<Mv, 'yt' | 'title' | 'artist'>

type OpenPlayer = (mv: PlayableMv) => void

const MvPlayerContext = createContext<OpenPlayer | null>(null)

/** 순위 행에서 뮤직비디오 모달을 연다. MvPlayerProvider 안에서만 쓸 수 있다. */
export function useMvPlayer(): OpenPlayer {
  const open = use(MvPlayerContext)
  if (!open) throw new Error('useMvPlayer는 MvPlayerProvider 안에서만 쓸 수 있습니다')
  return open
}

/** 페이지에 뮤직비디오 모달을 하나 두고, 안쪽 순위 행들이 같이 쓰게 한다. */
export function MvPlayerProvider({ children }: { children: ReactNode }) {
  const [mv, setMv] = useState<PlayableMv | null>(null)
  return (
    <MvPlayerContext value={setMv}>
      {children}
      <MvPlayerDialog mv={mv} onClose={() => setMv(null)} />
    </MvPlayerContext>
  )
}

/**
 * 시네마 모달: 화면을 거의 검게 덮고 영상과 닫기 버튼만 둔다.
 * 브라우저 기본 <dialog>를 써서 포커스 가두기 · Esc로 닫기 · 닫은 뒤 원래 행으로 포커스 돌려주기를 맡긴다.
 * 닫으면 iframe을 지워 재생을 멈춘다.
 */
function MvPlayerDialog({ mv, onClose }: { mv: PlayableMv | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (mv && !dialog.open) dialog.showModal()
    if (!mv && dialog.open) dialog.close()
  }, [mv])

  const label = mv ? `${mv.artist} ${mv.title} 뮤직비디오` : undefined

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // 바깥 어두운 부분(::backdrop)을 누르면 target이 dialog 자신이다
      onClick={(event) => event.target === event.currentTarget && onClose()}
      // dialog에는 transform 애니메이션을 걸지 않는다. 걸면 그동안 fixed 닫기 버튼이 화면이 아니라 dialog 기준으로 놓여 위치가 튄다
      // 너비: 최대 1200px, 화면 좌우 여백 24px, 위아래로 닫기 버튼 자리(각 64px)를 빼고 남은 높이에 16:9로 맞는 만큼
      className="m-auto w-[min(1200px,calc(100vw_-_48px),calc((100dvh_-_128px)_*_16_/_9))] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-[rgb(2_16_22/0.94)] backdrop:backdrop-blur-[6px]"
    >
      {mv && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="fixed top-3 right-4 grid size-11 animate-fade-in place-items-center text-white/75 transition-colors duration-200 hover:text-white motion-reduce:animate-none"
          >
            <Cross size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <div className="aspect-video animate-cinema-in overflow-hidden rounded-xl bg-black motion-reduce:animate-none">
            <iframe
              src={embedUrl(mv.yt)}
              title={label}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          </div>
        </>
      )}
    </dialog>
  )
}
