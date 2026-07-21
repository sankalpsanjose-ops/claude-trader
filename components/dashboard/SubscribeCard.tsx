'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export function SubscribeCard() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'loading') return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.')
        setState('error')
      } else {
        setState('success')
      }
    } catch {
      setErrorMsg('Connection error. Please try again.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-[#1a3a1a] flex items-center justify-center shrink-0">
          <span className="text-[#3fb950] text-sm font-bold">✓</span>
        </div>
        <div>
          <div className="text-[#e6edf3] font-semibold text-sm">You&apos;re subscribed</div>
          <div className="text-[#8b949e] text-xs mt-0.5">KingPin&apos;s daily brief will arrive after market close each trading day.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-[#1f6feb] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
          K
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#e6edf3] font-semibold text-sm">KingPin&apos;s Daily Brief</div>
          <div className="text-[#8b949e] text-xs mt-0.5 mb-4">
            Market reads, trade decisions, and one insight — delivered after market close each trading day.
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={state === 'loading'}
              className="flex-1 min-w-0 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === 'loading' || !email.trim()}
              className="px-4 py-2 bg-[#1f6feb] hover:bg-[#e0c088] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shrink-0 whitespace-nowrap"
            >
              {state === 'loading' ? '…' : 'Subscribe'}
            </button>
          </form>
          {state === 'error' && (
            <p className="text-[#f85149] text-xs mt-2">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
