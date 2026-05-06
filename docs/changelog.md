# Changelog

Major changes to the trading system, newest first.

---

## 2026-05-06

### Agents Delta & Echo upgraded to Sonnet
Delta (Fundamental Research) and Echo (Synthesis/Supervisor) upgraded from `claude-haiku-4-5` to `claude-sonnet-4-6`. Charlie (News & Sentiment) remains on Haiku as it processes large volumes of text where speed matters more than depth. Alpha, Bravo, and Foxtrot were already on Sonnet.

Full agent model lineup:
| Agent | Role | Model |
|-------|------|-------|
| Alpha | Global Markets | claude-sonnet-4-6 |
| Bravo | Technical Analysis | claude-sonnet-4-6 |
| Charlie | News & Sentiment | claude-haiku-4-5 |
| Delta | Fundamental Research | claude-sonnet-4-6 |
| Echo | Synthesis / Supervisor | claude-sonnet-4-6 |
| Foxtrot | Portfolio Manager / Decisions | claude-sonnet-4-6 |

---

## 2026-05-01

### Season 2 started — ₹5,00,000 fresh capital
Season 1 holdings closed, portfolio reset to ₹5,00,000 starting capital. Key changes:
- `STARTING_CAPITAL` now an env var (500000)
- `MIN_CASH_RESERVE` set to 10% (₹50,000)
- Zerodha delivery fees added: STT 0.1% on buy + sell, DP ₹15.34 per sell
- Trader profile updated with Season 2 sizing guide and handoff notes from Season 1 learnings
