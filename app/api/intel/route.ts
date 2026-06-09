import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('user_intel')
    .select('note')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ note: data?.note ?? null })
}

export async function POST(req: NextRequest) {
  let body: { note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const note = body.note?.trim()
  if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 })
  if (note.length > 1000) return NextResponse.json({ error: 'note too long (max 1000 chars)' }, { status: 400 })

  // Replace any existing pending note
  await supabaseAdmin.from('user_intel').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabaseAdmin.from('user_intel').insert({ note })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
