import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = body.email
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('subscribers')
    .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })

  if (error) {
    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
