'use client'

import { useState } from 'react'
import type { DailyAnalysis } from '@/types'

interface Props {
  analysis: DailyAnalysis
}

export function ClaudeJournal({ analysis }: Props) {
  const [expanded, setExpanded] = useState(false)

  const date = new Date(analysis.date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Split into paragraphs — Claude tends to write with newlines between thoughts
  const paragraphs = analysis.journal
    .split(/\n{2,}/)
    .flatMap(p => p.split(/\n/))
    .map(p => p.trim())
    .filter(Boolean)

  const PREVIEW_COUNT = 2
  const isLong = paragraphs.length > PREVIEW_COUNT
  const visible = expanded || !isLong ? paragraphs : paragraphs.slice(0, PREVIEW_COUNT)

  return (
    <div className="bg-[#12151a] border border-[#1f242c] border-l-4 border-l-[#d4af6a] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.1em] text-[#d4af6a] font-semibold">
          Claude&apos;s Market View
        </div>
        <div className="text-[11px] text-[#5a5f65]">{date}</div>
      </div>

      <div className="space-y-3">
        {visible.map((p, i) => (
          <p key={i} className="text-sm text-[#c9d1d9] leading-7">{p}</p>
        ))}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-[12px] text-[#d4af6a] hover:text-[#e0c088] transition-colors font-medium"
        >
          {expanded ? '↑ Show less' : `↓ Read more (${paragraphs.length - PREVIEW_COUNT} more paragraph${paragraphs.length - PREVIEW_COUNT !== 1 ? 's' : ''})`}
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-[#161819] text-[12px] text-[#5a5f65] italic">
        {analysis.market_summary}
      </div>
    </div>
  )
}
