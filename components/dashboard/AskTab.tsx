'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const TEAM_WELCOME: Message = {
  role: 'assistant',
  content: "I'm KingPin — the voice of our 8-agent trading team. We cover global markets, geopolitics, technical signals, fundamental research, portfolio decisions, and risk management.\n\nAsk us anything: why we bought or sold a stock, what our macro intelligence is seeing, how geopolitical events like oil shocks are shaping our thinking, what patterns we're noticing in our own behaviour, or how our risk review has been pushing back on decisions. We're an open book.",
}

const SOLO_WELCOME: Message = {
  role: 'assistant',
  content: "I'm KingPin — speaking for the trading system, currently running as a single decision-making agent plus rules validation and risk auditing (no specialist team active right now).\n\nAsk us anything: why we bought or sold a stock, what patterns we're noticing in our own behaviour, or how our risk review has been pushing back on decisions. We're an open book.",
}

const MAX_CHARS = 500
const WARN_THRESHOLD = 450

export function AskTab({ usingTradingTeam }: { usingTradingTeam: boolean }) {
  const [messages, setMessages] = useState<Message[]>([usingTradingTeam ? TEAM_WELCOME : SOLO_WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || trimmed.length > MAX_CHARS || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`)
      }
      const data: { answer: string; blocked?: boolean } = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= WARN_THRESHOLD

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden flex flex-col h-[70vh] min-h-[420px] max-h-[700px]">

      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1f6feb] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            K
          </div>
          <div>
            <span className="text-[#e6edf3] font-semibold text-sm">KingPin</span>
            <div className="text-[10px] text-[#8b949e]">{usingTradingTeam ? 'Voice of the 8-agent team' : 'Voice of the trading system (solo mode)'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#484f58]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shrink-0" />
          Grounded in actual trading data
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) =>
          msg.role === 'assistant' ? (
            <div key={i} className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-[#1f6feb] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                K
              </div>
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg rounded-tl-none px-4 py-3 text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[75%] bg-[#1f6feb]/20 border border-[#1f6feb]/40 rounded-lg rounded-tr-none px-4 py-3 text-sm text-[#e6edf3] leading-relaxed">
                {msg.content}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-[#1f6feb] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
              K
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg rounded-tl-none px-4 py-3">
              <span className="inline-flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg flex items-center justify-between gap-2 shrink-0">
          <span className="text-[12px] text-[#f85149]">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[#f85149] hover:text-[#ff7b72] text-sm font-bold shrink-0 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[#30363d] p-3 flex flex-col gap-1.5 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask KingPin about a trade, holding, or strategy..."
            disabled={loading}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] resize-none focus:outline-none focus:border-[#58a6ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            style={{ minHeight: '38px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim() || overLimit}
            className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shrink-0 h-[38px]"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <div className={`text-[11px] self-end ${nearLimit ? (overLimit ? 'text-[#f85149]' : 'text-[#e3b341]') : 'text-[#484f58]'}`}>
          {charCount}/{MAX_CHARS}
        </div>
      </div>

    </div>
  )
}
