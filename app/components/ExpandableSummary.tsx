'use client'

import { useState } from 'react'

export function ExpandableSummary({ summary, wordLimit = 25 }: { summary: string; wordLimit?: number }) {
  const [expanded, setExpanded] = useState(false)
  const words = summary.split(' ')
  const needsTruncation = words.length > wordLimit
  const teaser = words.slice(0, wordLimit).join(' ') + '...'

  return (
    <>
      {/* Mobile: expandable */}
      <div className="md:hidden">
        <p className="text-neutral-300 leading-relaxed text-base">
          {expanded || !needsTruncation ? summary : teaser}
        </p>
        {needsTruncation && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-fuchsia-400 text-sm mt-2 hover:text-fuchsia-300 transition-colors"
          >
            {expanded ? '← less' : 'more →'}
          </button>
        )}
      </div>

      {/* Desktop: full text */}
      <p className="hidden md:block text-neutral-300 leading-relaxed text-lg">
        {summary}
      </p>
    </>
  )
}
