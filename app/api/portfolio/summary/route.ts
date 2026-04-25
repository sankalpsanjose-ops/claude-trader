import { NextResponse } from 'next/server'
import { getSummary } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const summary = await getSummary()
  if (!summary) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json(summary)
}
