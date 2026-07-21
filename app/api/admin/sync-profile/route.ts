import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { loadTraderProfileFromFile } from '@/lib/claude'

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const content = loadTraderProfileFromFile()
  if (!content) {
    return NextResponse.json({ error: 'Could not read docs/trader-profile.md' }, { status: 500 })
  }

  const { data: current } = await supabaseAdmin
    .from('trader_profile')
    .select('version, content')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (current?.version ?? 0) + 1

  // Distinguishes consecutive manual syncs in the Changelog tab, which otherwise
  // all show the identical generic "Manual sync..." text with no signal on
  // whether anything actually changed.
  let changeNotes = 'Manual sync from docs/trader-profile.md'
  if (current?.content) {
    const delta = wordCount(content) - wordCount(current.content)
    changeNotes += delta === 0
      ? ' (no word-count change vs previous version)'
      : ` (${delta > 0 ? '+' : ''}${delta} words vs v${current.version})`
  }

  const { error } = await supabaseAdmin.from('trader_profile').insert({
    version: nextVersion,
    content,
    change_notes: changeNotes,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, version: nextVersion })
}
