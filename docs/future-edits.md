# Future Edits Tracker

Items we want to build eventually but haven't prioritised yet.
Add context so it's easy to pick up later.

---

## Charts & Visualisation

- **Trading fees visual** *(do first — once we have a few trades)* — fees (STT + DP charges) are already deducted from cash on execution but not surfaced anywhere in the UI. Add a cumulative "fees paid" stat somewhere — either a stat card on the Summary tab or a column in the Trades tab — so the drag on returns is visible. Useful for sizing decisions: a ₹15k position carries a ~3% headwind from fees alone.

- **Nifty 50 TRI benchmarking** *(do later — once we have a 3–6 month track record)* — we currently benchmark against the plain Nifty 50 price index (`^NSEI`). SEBI-regulated funds use TRI (Total Return Index), which reinvests dividends and runs ~1–2% higher annually. Switch to TRI for a more rigorous comparison. Yahoo Finance's `^NSEI` doesn't carry TRI; may need NSE's own data feed or a separate source.

---

## Infrastructure

- **Nifty anchor env vars on Vercel** — `NIFTY_ANCHOR_DATE=2026-04-30` and `NIFTY_ANCHOR_CLOSE=23997.55` need to be added to Vercel environment variables. Currently hardcoded as fallback in `lib/data.ts` but explicit env vars are cleaner.

---

## Ideas / Exploratory

*(nothing yet)*
