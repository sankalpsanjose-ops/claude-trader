import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { loadTraderProfileFromFile } from '@/lib/claude'

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
    .select('version')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (current?.version ?? 0) + 1

  const { error } = await supabaseAdmin.from('trader_profile').insert({
    version: nextVersion,
    content,
    change_notes: 'Manual sync from docs/trader-profile.md',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, version: nextVersion })
}
