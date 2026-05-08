import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(page('Invalid link', 'This unsubscribe link is invalid.'), {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    })
  }

  const { error } = await supabaseAdmin
    .from('subscribers')
    .delete()
    .eq('unsubscribe_token', token)

  if (error) {
    return new NextResponse(page('Something went wrong', 'Please try again or contact us.'), {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    })
  }

  return new NextResponse(page('Unsubscribed', "You've been removed from KingPin's daily brief. No more emails."), {
    headers: { 'Content-Type': 'text/html' },
  })
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;padding:40px 20px;max-width:400px;">
    <div style="width:48px;height:48px;border-radius:50%;background:#1f6feb;text-align:center;line-height:48px;font-weight:700;font-size:18px;color:#fff;margin:0 auto 20px;">K</div>
    <h1 style="color:#e6edf3;font-size:22px;font-weight:700;margin:0 0 10px;">${title}</h1>
    <p style="color:#8b949e;font-size:15px;line-height:1.6;margin:0 0 28px;">${message}</p>
    <a href="https://claude-trader-delta.vercel.app" style="display:inline-block;background:#1f6feb;color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:10px 24px;border-radius:8px;">View Dashboard</a>
  </div>
</body>
</html>`
}
