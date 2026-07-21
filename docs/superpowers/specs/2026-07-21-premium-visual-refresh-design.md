# Premium Visual Refresh — Design Spec

**Date:** 2026-07-21
**Status:** Approved, pending implementation plan

## Goal

The dashboard currently reads as a competent but generic dark-mode SaaS template
(GitHub-dark palette, everything at equal visual weight, filled-pill badges
everywhere). The ask: make it feel considered and premium — the kind of
hierarchy and restraint a design studio would ship — without changing any
functionality, data, or component structure that already works.

**Hard constraint: nothing may break.** This is a pure visual/token-level
refresh. No logic changes, no data flow changes, no removal of information
that's currently load-bearing (BUY/SELL color, PASS/WARN color, table
structure on data-dense tabs).

## Non-goals (explicitly out of scope for this pass)

- Light mode. Everything discussed adapts *within* the existing dark base.
- Restructuring tables/cards on Trades, Audit, Holdings, or the mobile card
  layouts added earlier this session. Those are scan surfaces, not decorative
  layout — the "quiet unless it's the point" rule (below) does not apply to
  them.
- The sector-allocation chart's categorical palette (separate, already-known
  colorblind-accessibility issue — tracked independently, not part of this
  spec).
- Any component not explicitly listed under "Where this applies" below. Tabs
  not named there (Holdings, Changelog, Trail's agent-pipeline badges, Ask's
  chat bubbles) inherit the new color tokens automatically (see below) but
  keep their current structure/badge treatment unless a future pass decides
  otherwise.

## Design system

### Color tokens (mechanical swap, semantics unchanged)

Verified via `grep` that color usage across the 15 component files that use
hardcoded hex values resolves to ~10 core values reused hundreds of times
each (e.g. `#8b949e` ×138, `#30363d` ×85, `#e6edf3` ×65). This is a scoped,
mechanical find-and-replace, not a per-file redesign.

| Role | Old | New |
|---|---|---|
| Page base | `#0d1117` | `#0a0b0d` |
| Surface | `#161b22` | `#12151a` |
| Surface 2 | `#21262d` | `#161819` |
| Border / hairline | `#30363d` | `#1f242c` |
| Primary text | `#e6edf3` | `#f4f2ec` |
| Muted text | `#8b949e` | `#7a7f88` |
| Dim text | `#484f58` / `#6e7681` | `#5a5f65` |
| **Accent** (replaces GitHub blue `#1f6feb` / `#58a6ff`) | — | `#d4af6a` (gold) |
| P&L / status green | `#3fb950` | **unchanged** |
| P&L / status red | `#f85149` | **unchanged** |

Green/red are financial convention, not decoration — not part of the "stale"
problem, not touched.

### Typography

Keep Ubuntu / Ubuntu Mono (`next/font/google`, already deliberately chosen —
the fonts were never the issue). Two changes:
- Hero numerals (portfolio value in the header) go to weight 300 at large
  scale (~64px desktop) — the one real hierarchy jump in the whole system.
- Uppercase labels (`STAT LABEL`, `JUMP TO SECTION`, etc.) increase
  letter-spacing from the current `tracking-wider` (~0.05em) to ~0.08–0.12em
  consistently. This one small change does most of the "designed, not
  default" work.

### The "quiet unless it's the point" rule

This is the actual design decision, not a token. Two lists:

**Applies** — filled boxes/pills become thin dividers or outlined text:
- Header: status pills ("Paper Trading", "Solo Agent", freshness badge)
  collapse into one quiet text line with a small static gray dot indicator,
  as shown in the approved hero mockup (`Paper trading · Solo agent ·
  Updated 4:20 PM IST`). The freshness warning does not stay in this line —
  see the Summary stat-row change below for where it moves.
- Header: portfolio value becomes the sole hero element — large, alone,
  nothing competing at the same weight.
- Summary tab: the 4-stat-card row (Portfolio Value / Total P&L / Run Rate /
  Today's P&L) loses its bordered boxes, becomes thin vertical dividers
  between columns. A box implied four equally-important facts; they aren't.
  The stale-analysis warning (when present) moves into this row directly
  (in red) rather than living as a separate header pill.
- Tab navigation: filled active-tab background → letter-spaced uppercase
  text with a single gold underline on the active tab.
- Strategy tab: "Jump to Section" pills go from filled gray to outlined,
  gold text.
- Audit tab: the `WARN` badge specifically goes from filled-red to a gold
  outline (a warning is not the same severity as an outright rejection —
  reserve red-fill for genuine rule breaches).

**Does not apply** — stays exactly as-is structurally, only inherits new
color tokens:
- Trades, Audit, Holdings tables and their mobile card equivalents (added
  earlier this session) — these are scan surfaces where structure carries
  information.
- BUY/SELL badges (Trades) and PASS badges (Audit) — stay solid-color-filled.
  That color is load-bearing in a 33+ row table, not decoration.
- Trail tab's agent-pipeline badges (ALPHA/BRAVO/CHARLIE/...), Changelog's
  version pills, Ask tab's chat bubbles — not discussed/mocked this round;
  inherit new color tokens only, no structural change, until a future pass
  explicitly addresses them.

### Charts

- `PerformanceChart.tsx` / `NiftyChart.tsx`: the Nifty-benchmark line moves
  off GitHub-blue (`#58a6ff`) to a muted neutral gray. Gold is reserved for
  the app's own brand/accent moments — a third-party index benchmark isn't
  one of them.
- Claude's own performance line keeps its semantic green/red (up/down) —
  unchanged.
- Reference lines (starting-capital dashed line, live-start marker) shift to
  match the new neutral/gold tokens but keep their current dash/position
  logic.
- `SectorChart.tsx` categorical palette: **not touched** in this pass (see
  Non-goals).

## Where this applies (file-level)

Structural + token changes:
- `components/dashboard/DashboardClient.tsx` — header hero treatment, status
  line, tab navigation styling.
- `components/dashboard/SummaryTab.tsx` + `components/dashboard/StatCard.tsx`
  — stat row becomes thin-divided columns; freshness-warning integration.
- `components/dashboard/StrategyTab.tsx` — ToC pill treatment (structural,
  on top of the anchor-nav work already shipped).
- `components/dashboard/AuditTab.tsx` — `WARN` badge treatment only (desktop
  table + the mobile card view already shipped both get this).
- `components/dashboard/PerformanceChart.tsx`, `NiftyChart.tsx` — benchmark
  line / reference line colors.

Token-only (inherit new palette, no structural change):
- `components/dashboard/HoldingsTab.tsx`, `TradesTab.tsx` (BUY/SELL badges
  keep their fill, just new hex), `ChangelogTab.tsx`, `DecisionTrailTab.tsx`,
  `AskTab.tsx`, `SectorChart.tsx` (borders/text only — categorical fills
  excluded per Non-goals).
- `app/globals.css` if any base color is set there.

## Verification plan (matches the rigor used throughout this session)

For every file touched:
1. `npx tsc --noEmit` and `npx eslint .` — must stay clean.
2. `npm run build` — must succeed.
3. Live browser check via a local dev server against real production data
   (not just types) — screenshot before/after for each changed tab, check
   console for errors, confirm no regressions on the mobile card layouts
   added earlier this session.
4. Explicit re-check that BUY/SELL, PASS/WARN, and P&L green/red are still
   instantly scannable after the token swap — this is the one place a purely
   visual change could accidentally hurt usability, so it gets a deliberate
   look, not just a diff review.

## Open items for the implementation plan to resolve

- Exact `.name`/hex mapping should become real Tailwind theme tokens or CSS
  custom properties (not another round of hardcoded hex) — this was
  identified as worth doing while touching these files anyway, since it
  removes the "700 scattered hex literals" problem for good and makes any
  future palette change a one-line edit instead of a 15-file grep. Implementer
  should decide CSS custom properties vs. Tailwind theme extension based on
  what fits the existing `globals.css` setup with minimal disruption.
- Order of implementation (header first since it's already validated via
  mockup, then global token swap, then the per-component structural changes)
  is a plan-level decision, not a spec-level one.
