import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const DASHBOARD_URL = 'https://claude-trader-delta.vercel.app'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'KingPin <onboarding@resend.dev>'

export interface NewsletterData {
  date: string
  marketSummary: string
  journal: string
  teamBrief?: string
  decisions: Array<{ symbol: string; action: 'BUY' | 'SELL' | 'HOLD'; quantity?: number; rationale: string }>
  learning?: { category: string; insight: string }
  portfolioValue: number
  totalPnlPct: number
  observeOnly: boolean
  executionDate: string
}

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function buildEmailHtml(data: NewsletterData, unsubscribeToken: string): string {
  const pnlColour = data.totalPnlPct >= 0 ? '#3fb950' : '#f85149'
  const pnlSign = data.totalPnlPct >= 0 ? '+' : ''
  const unsubscribeUrl = `${DASHBOARD_URL}/api/unsubscribe?token=${unsubscribeToken}`

  const decisionsHtml = data.observeOnly
    ? `<p style="margin:0;color:#8b949e;font-size:14px;">No trades queued — tomorrow is not a trading day.</p>`
    : data.decisions.filter(d => d.action !== 'HOLD').length === 0
    ? `<p style="margin:0;color:#8b949e;font-size:14px;">No trades queued for tomorrow — holding current positions.</p>`
    : data.decisions
        .filter(d => d.action !== 'HOLD')
        .map(d => {
          const actionColour = d.action === 'BUY' ? '#3fb950' : '#f85149'
          const actionBg = d.action === 'BUY' ? '#1a3a1a' : '#3d1a1a'
          return `
            <div style="padding:12px 0;border-bottom:1px solid #21262d;">
              <div style="margin-bottom:6px;">
                <span style="display:inline-block;background:${actionBg};color:${actionColour};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:8px;">${d.action}</span>
                <span style="color:#e6edf3;font-weight:600;font-size:14px;">${d.symbol}</span>
                ${d.quantity ? `<span style="color:#8b949e;font-size:13px;margin-left:6px;">× ${d.quantity}</span>` : ''}
              </div>
              <p style="margin:0;color:#8b949e;font-size:13px;line-height:1.5;">${d.rationale}</p>
            </div>`
        }).join('')

  const learningHtml = data.learning
    ? `
      <div style="margin-top:28px;">
        <p style="margin:0 0 12px;color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Learning of the Day</p>
        <div style="background:#161b22;border:1px solid #30363d;border-left:3px solid #1f6feb;border-radius:6px;padding:14px 16px;">
          <span style="display:inline-block;background:#1f3a5f;color:#79c0ff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-bottom:8px;">${data.learning.category.toUpperCase()}</span>
          <p style="margin:0;color:#c9d1d9;font-size:14px;line-height:1.6;">${data.learning.insight}</p>
        </div>
      </div>`
    : ''

  const teamIntelHtml = (data.teamBrief || data.journal)
    ? `
      <div style="margin-top:28px;">
        <p style="margin:0 0 12px;color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Team Intelligence</p>
        <p style="margin:0;color:#8b949e;font-size:14px;line-height:1.7;">${(data.teamBrief ?? data.journal).slice(0, 500)}${(data.teamBrief ?? data.journal).length > 500 ? '…' : ''}</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>KingPin Daily Brief — ${data.date}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px 40px;">

    <!-- Header -->
    <div style="margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="width:44px;vertical-align:middle;">
            <div style="width:38px;height:38px;border-radius:50%;background:#1f6feb;text-align:center;line-height:38px;font-weight:700;font-size:15px;color:#fff;">K</div>
          </td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="color:#e6edf3;font-weight:700;font-size:20px;line-height:1.2;">KingPin Daily Brief</div>
            <div style="color:#484f58;font-size:12px;margin-top:2px;">${data.date} &nbsp;·&nbsp; Paper Trading &nbsp;·&nbsp; NSE &amp; BSE</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Portfolio strip -->
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td>
            <div style="color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Portfolio Value</div>
            <div style="color:#e6edf3;font-size:22px;font-weight:700;">${fmt(data.portfolioValue)}</div>
          </td>
          <td style="text-align:right;">
            <div style="color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Total Return</div>
            <div style="color:${pnlColour};font-size:22px;font-weight:700;">${pnlSign}${data.totalPnlPct.toFixed(2)}%</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Market Overview -->
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 12px;color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Market Overview</p>
      <p style="margin:0;color:#c9d1d9;font-size:14px;line-height:1.7;">${data.marketSummary}</p>
    </div>

    <div style="border-top:1px solid #21262d;margin-bottom:28px;"></div>

    <!-- Today's Decisions -->
    <div style="margin-bottom:4px;">
      <p style="margin:0 0 12px;color:#484f58;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
        ${data.observeOnly ? 'Tomorrow\'s Outlook' : `Queued for ${data.executionDate}`}
      </p>
      ${decisionsHtml}
    </div>

    ${teamIntelHtml}
    ${learningHtml}

    <!-- CTA -->
    <div style="margin-top:32px;text-align:center;">
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#1f6feb;color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">View Full Dashboard →</a>
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #21262d;text-align:center;">
      <p style="margin:0 0 6px;color:#484f58;font-size:11px;">Paper trading only · No real money involved · Not financial advice</p>
      <a href="${unsubscribeUrl}" style="color:#484f58;font-size:11px;text-decoration:underline;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`
}

export async function sendNewsletter(data: NewsletterData): Promise<void> {
  const { data: subscribers, error } = await supabaseAdmin
    .from('subscribers')
    .select('email, unsubscribe_token')

  if (error || !subscribers?.length) return

  const subject = `KingPin Daily Brief — ${data.date}`

  const resend = getResend()
  await Promise.allSettled(
    subscribers.map(sub =>
      resend.emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject,
        html: buildEmailHtml(data, sub.unsubscribe_token),
      })
    )
  )
}
