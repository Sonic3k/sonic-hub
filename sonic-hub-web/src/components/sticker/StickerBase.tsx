import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { StickerColor } from '../../types'

interface Props {
  color: StickerColor
  rotation?: string
  children: ReactNode
  onClick?: () => void
  faded?: boolean
  className?: string
}

// Alternating pin/tape per sticker
const PIN = (
  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
    <div className="w-3.5 h-3.5 rounded-full mx-auto"
      style={{ background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b1e10)', boxShadow: '0 2px 4px rgba(0,0,0,.4)' }} />
    <div className="w-0.5 h-2 mx-auto rounded-b"
      style={{ background: '#7b1e10' }} />
  </div>
)

const TAPE = (
  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 w-8 h-3.5 rounded-sm"
    style={{ background: 'rgba(255,248,220,.75)', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }} />
)

let stickerIndex = 0
const getStickerDecor = () => {
  stickerIndex++
  return stickerIndex % 2 === 0 ? PIN : TAPE
}

export default function StickerBase({ color, rotation = 'r-0', children, onClick, faded, className }: Props) {
  const decor = getStickerDecor()

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative rounded-sm cursor-pointer select-none',
        'sticker-lift sticker-fold',
        color, rotation,
        faded && 'opacity-40 grayscale-[0.3]',
        className
      )}
      style={{ boxShadow: '3px 5px 14px rgba(80,50,10,.14)' }}
    >
      {decor}
      {/* Ruled lines */}
      <div className="sk-lines" />
      {/* Top rule bar */}
      <div className="sk-rule h-[3px] rounded-t-sm opacity-60" />
      {children}
    </div>
  )
}

export function stickerColor(index: number): StickerColor {
  const colors: StickerColor[] = ['sk-ecru', 'sk-blush', 'sk-mist', 'sk-dusk', 'sk-wheat', 'sk-sage', 'sk-ivory']
  return colors[index % colors.length]
}

export function stickerRotation(index: number): string {
  const rots = ['r-n2', 'r-1', 'r-n1', 'r-2', 'r-n3', 'r-3', 'r-0']
  return rots[index % rots.length]
}
