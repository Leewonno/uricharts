import Image from 'next/image'
import { thumbUrl } from '../lib/youtube'

interface Props {
  videoId: string
  /** 화면에 그려지는 가로 크기 (srcset 선택용) */
  sizes: string
  className?: string
  priority?: boolean
}

/**
 * 16:9 유튜브 썸네일. 곡 제목이 바로 옆에 있으므로 대체 텍스트는 비워 둔다.
 * 이미지가 뜨기 전 자리 색(bg-*)은 놓이는 바탕에 맞춰 className으로 준다.
 */
export function MvThumbnail({ videoId, sizes, className = '', priority = false }: Props) {
  return (
    <div className={`relative aspect-video shrink-0 overflow-hidden ${className}`}>
      <Image src={thumbUrl(videoId)} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  )
}
