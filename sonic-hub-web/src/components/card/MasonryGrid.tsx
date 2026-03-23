import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function MasonryGrid({ children }: Props) {
  return (
    <div
      className="w-full"
      style={{
        columnCount: 1,
        columnGap: '12px',
      }}
      // responsive via CSS
    >
      <style>{`
        @media (min-width: 640px) {
          .masonry { column-count: 2 !important; }
        }
        @media (min-width: 1024px) {
          .masonry { column-count: 3 !important; }
        }
      `}</style>
      <div className="masonry w-full" style={{ columnCount: 1, columnGap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

// Wrapper to prevent cards from breaking across columns
export function MasonryItem({ children }: { children: ReactNode }) {
  return (
    <div style={{ breakInside: 'avoid', marginBottom: '12px' }}>
      {children}
    </div>
  )
}
