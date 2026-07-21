# Premium Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the dashboard's dark palette (warmer near-black + gold accent replacing GitHub blue), restructure the header/Summary-stat-row/tab-nav/Strategy-ToC/Audit-WARN-badge into a quieter hierarchy, and update chart benchmark colors — with zero changes to logic, data, table/card structure on Trades/Audit/Holdings, or the 3 categorical agent/sector/learning-type color schemes discovered during investigation.

**Architecture:** Two kinds of change, kept strictly separate: (1) a mechanical color-token swap across "safe" files with no categorical color maps, executed via a verified script; (2) precise, hand-written edits for files containing categorical color maps (must skip those exact regions) and for the structural hierarchy changes approved in the spec. Every task ends in `tsc`/`eslint`/`build` plus a live browser check against real production data — the verification pattern used throughout this project's session history, since there's no component-level test suite to run instead.

**Tech Stack:** Next.js 16 / React / Tailwind arbitrary-value classes (no CSS-in-JS, no existing color token system — colors are literal hex strings in `className`).

---

## Critical context: 3 categorical color maps that MUST NOT be touched

Discovered during investigation — a blind global find-and-replace would corrupt all three by merging distinct categories into the same new accent color. Confirmed via `grep -rn "Record<string" components/dashboard --include="*.tsx"` — exactly 6 matches, 3 of which are real color maps (the other 3 are text-only label/role maps with no color values):

1. **`components/dashboard/SectorChart.tsx:5`** — `COLORS` map, 11 sector entries (Banking, IT, Energy, Auto, Pharma, FMCG, Consumer, Telecom, Materials, Other, Cash). **Entire file excluded from this pass** — matches the spec's explicit Non-goals ("sector-allocation chart's categorical palette... not part of this spec").
2. **`components/dashboard/DecisionTrailTab.tsx:12-20`** — `styles` map inside the `AgentTag` function, 7 agent-identity entries (alpha/bravo/charlie/delta/echo/foxtrot/india). Must be skipped; the rest of the file (buttons, borders, backgrounds, the separate `actionColors` map at line 329 which is safe — see below) gets the normal swap.
3. **`components/dashboard/StrategyTab.tsx`** — two maps: `AGENTS[].typeColour` (lines 25,33,41,49,57,65,73,81,89 — 4 distinct role-type styles reused across 9 agent entries) and `CATEGORY_COLOURS` (lines 95-103, 7 learning-category entries). Both must be skipped; the rest of the file gets the normal swap plus the structural header/ToC changes from the spec.

`DecisionTrailTab.tsx`'s `actionColors` map (line 329: `BUY: text-[#3fb950]`, `SELL: text-[#f85149]`, `HOLD: text-[#8b949e]`) is **safe to include** in the normal swap — it maps to P&L green/red (unchanged by spec) and the standard muted-text token (swaps consistently everywhere else too), not a distinct identity scheme.

## Color mapping reference

**One non-color rule bundled into every task's swap:** the spec also calls for uppercase
label letter-spacing to increase from `tracking-wider` (~0.05em) to ~0.08–0.12em
consistently, app-wide. Confirmed via `grep -n "tracking-wider" components/dashboard/*.tsx
| grep -v uppercase` (zero results) that all 60 usages across 9 files are always paired
with `uppercase` — it's used exclusively as the small-label idiom in this codebase, so
`'uppercase tracking-wider'` → `'uppercase tracking-[0.1em]'` is safe to fold into every
task's swap (scripted in Tasks 1-3's MAP objects; must be applied by hand in Tasks 6-7,
which edit files manually rather than via script — each of those tasks' steps below
include it explicitly).

**General swap** (applies everywhere except the 3 excluded regions above and the chart-benchmark exception below):

| Old | New | Role |
|---|---|---|
| `#0d1117` | `#0a0b0d` | page base |
| `#161b22` | `#12151a` | surface |
| `#21262d` | `#161819` | surface 2 |
| `#1c2128` | `#181a1e` | hover surface (derived, same relationship to new surface as old had to old surface) |
| `#30363d` | `#1f242c` | border/hairline |
| `#e6edf3` | `#f4f2ec` | primary text |
| `#8b949e` | `#7a7f88` | muted text |
| `#484f58` | `#5a5f65` | dim text |
| `#6e7681` | `#5a5f65` | dim text (second existing gray — both collapse to one new value) |
| `#1f6feb` | `#d4af6a` | accent (general) |
| `#58a6ff` | `#d4af6a` | accent (general) — **except** chart benchmark, see below |
| `#79c0ff` | `#d4af6a` | accent (general) — **except inside the 3 excluded regions** |
| `#cae8ff` | `#f4f2ec` | text-on-accent (was light-blue-on-blue-pill; header pill is being restructured anyway, see Task 5) |

**Unchanged (do not touch anywhere):** `#3fb950` (green), `#f85149` (red) — financial convention, explicitly out of scope.

**Chart-benchmark exception:** In `PerformanceChart.tsx` and `NiftyChart.tsx` only, every `#58a6ff` occurrence (the Nifty line's `stroke`, legend dot, `activeDot.fill`) maps to `#7a7f88` (the new muted-text token) instead of gold — reusing an existing palette value rather than introducing a new one, per spec: "gold is reserved for the app's own brand/accent moments — a third-party index benchmark isn't one of them."

---

### Task 1: Bulk color swap on categorical-map-free files

**Files (script-verified, no manual review needed per-file — verified by count, not by reading):**
- `components/dashboard/HoldingsTab.tsx`
- `components/dashboard/TradesTab.tsx`
- `components/dashboard/AskTab.tsx`
- `components/dashboard/ChangelogTab.tsx`
- `components/dashboard/SubscribeCard.tsx`
- `components/dashboard/ClaudeJournal.tsx`

(`DashboardClient.tsx`, `SummaryTab.tsx`, `StatCard.tsx`, `AuditTab.tsx` are excluded from this task — they get structural changes in later tasks and are handled there to avoid touching each file twice. `DecisionTrailTab.tsx` and `StrategyTab.tsx` are excluded — categorical maps, handled in Task 2/3. `SectorChart.tsx` is permanently excluded this pass. `PerformanceChart.tsx`/`NiftyChart.tsx` are excluded — benchmark exception, handled in Task 4.)

- [ ] **Step 1: Record exact pre-swap counts for verification**

Run:
```bash
for hex in "#0d1117" "#161b22" "#21262d" "#1c2128" "#30363d" "#e6edf3" "#8b949e" "#484f58" "#6e7681" "#1f6feb" "#58a6ff" "#79c0ff" "#cae8ff"; do
  echo -n "$hex: "
  grep -oh "$hex" components/dashboard/HoldingsTab.tsx components/dashboard/TradesTab.tsx components/dashboard/AskTab.tsx components/dashboard/ChangelogTab.tsx components/dashboard/SubscribeCard.tsx components/dashboard/ClaudeJournal.tsx 2>/dev/null | wc -l
done
```

Save this output — Step 4 compares against it.

- [ ] **Step 2: Write the swap script**

Create `scripts/_palette_swap_task1.mjs`:

```js
import fs from 'fs'

const files = [
  'components/dashboard/HoldingsTab.tsx',
  'components/dashboard/TradesTab.tsx',
  'components/dashboard/AskTab.tsx',
  'components/dashboard/ChangelogTab.tsx',
  'components/dashboard/SubscribeCard.tsx',
  'components/dashboard/ClaudeJournal.tsx',
]

const MAP = {
  '#0d1117': '#0a0b0d',
  '#161b22': '#12151a',
  '#21262d': '#161819',
  '#1c2128': '#181a1e',
  '#30363d': '#1f242c',
  '#e6edf3': '#f4f2ec',
  '#8b949e': '#7a7f88',
  '#484f58': '#5a5f65',
  '#6e7681': '#5a5f65',
  '#1f6feb': '#d4af6a',
  '#58a6ff': '#d4af6a',
  '#79c0ff': '#d4af6a',
  '#cae8ff': '#f4f2ec',
  'uppercase tracking-wider': 'uppercase tracking-[0.1em]',
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  for (const [oldHex, newHex] of Object.entries(MAP)) {
    content = content.split(oldHex).join(newHex)
  }
  fs.writeFileSync(file, content)
  console.log(`swapped: ${file}`)
}
```

- [ ] **Step 3: Run it**

Run: `node scripts/_palette_swap_task1.mjs`
Expected: 6 lines of `swapped: <file>`

- [ ] **Step 4: Verify — old hex values are gone, new ones are present in expected counts**

Run:
```bash
echo "=== old values remaining (every line must print 0) ==="
for hex in "#0d1117" "#161b22" "#21262d" "#1c2128" "#30363d" "#e6edf3" "#8b949e" "#484f58" "#6e7681" "#1f6feb" "#58a6ff" "#79c0ff" "#cae8ff"; do
  echo -n "$hex: "
  grep -oh "$hex" components/dashboard/HoldingsTab.tsx components/dashboard/TradesTab.tsx components/dashboard/AskTab.tsx components/dashboard/ChangelogTab.tsx components/dashboard/SubscribeCard.tsx components/dashboard/ClaudeJournal.tsx 2>/dev/null | wc -l
done
```
Expected: every count is `0`.

- [ ] **Step 5: Delete the temporary script**

Run: `rm scripts/_palette_swap_task1.mjs`

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/HoldingsTab.tsx components/dashboard/TradesTab.tsx components/dashboard/AskTab.tsx components/dashboard/ChangelogTab.tsx components/dashboard/SubscribeCard.tsx components/dashboard/ClaudeJournal.tsx`
Expected: no output (clean) from both.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/HoldingsTab.tsx components/dashboard/TradesTab.tsx components/dashboard/AskTab.tsx components/dashboard/ChangelogTab.tsx components/dashboard/SubscribeCard.tsx components/dashboard/ClaudeJournal.tsx
git commit -m "$(cat <<'EOF'
feat: palette swap for Holdings/Trades/Ask/Changelog/Subscribe/Journal

Mechanical color-token swap per docs/superpowers/specs/2026-07-21-premium-visual-refresh-design.md.
No categorical color maps in these files, verified via grep before
running - safe for a full script-driven swap. Counts verified before
and after.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: DecisionTrailTab.tsx — swap everything except the AgentTag identity map

**Files:**
- Modify: `components/dashboard/DecisionTrailTab.tsx`

- [ ] **Step 1: Record the exact `AgentTag` styles block to protect (must remain byte-identical after this task)**

Read lines 12-20 now and confirm they read exactly:
```tsx
  const styles: Record<string, string> = {
    alpha:   'text-[#79c0ff] border-[#79c0ff40] bg-[#79c0ff0d]',
    bravo:   'text-[#a5d6ff] border-[#a5d6ff40] bg-[#a5d6ff0d]',
    charlie: 'text-[#f0883e] border-[#f0883e40] bg-[#f0883e0d]',
    delta:   'text-[#d2a8ff] border-[#d2a8ff40] bg-[#d2a8ff0d]',
    echo:    'text-[#56d364] border-[#56d36440] bg-[#56d3640d]',
    foxtrot: 'text-[#ffa657] border-[#ffa65740] bg-[#ffa6570d]',
    india:   'text-[#3fb950] border-[#3fb95040] bg-[#3fb9500d]',
  }
```
If it differs, stop and re-read the current file before proceeding — do not guess.

- [ ] **Step 2: Run the same swap script scoped to this one file**

Create `scripts/_palette_swap_task2.mjs`:

```js
import fs from 'fs'

const file = 'components/dashboard/DecisionTrailTab.tsx'
const PROTECTED = `  const styles: Record<string, string> = {
    alpha:   'text-[#79c0ff] border-[#79c0ff40] bg-[#79c0ff0d]',
    bravo:   'text-[#a5d6ff] border-[#a5d6ff40] bg-[#a5d6ff0d]',
    charlie: 'text-[#f0883e] border-[#f0883e40] bg-[#f0883e0d]',
    delta:   'text-[#d2a8ff] border-[#d2a8ff40] bg-[#d2a8ff0d]',
    echo:    'text-[#56d364] border-[#56d36440] bg-[#56d3640d]',
    foxtrot: 'text-[#ffa657] border-[#ffa65740] bg-[#ffa6570d]',
    india:   'text-[#3fb950] border-[#3fb95040] bg-[#3fb9500d]',
  }`
const PLACEHOLDER = '__PROTECTED_AGENTTAG_STYLES__'

const MAP = {
  '#0d1117': '#0a0b0d',
  '#161b22': '#12151a',
  '#21262d': '#161819',
  '#1c2128': '#181a1e',
  '#30363d': '#1f242c',
  '#e6edf3': '#f4f2ec',
  '#8b949e': '#7a7f88',
  '#484f58': '#5a5f65',
  '#6e7681': '#5a5f65',
  '#1f6feb': '#d4af6a',
  '#58a6ff': '#d4af6a',
  '#79c0ff': '#d4af6a',
  '#cae8ff': '#f4f2ec',
  'uppercase tracking-wider': 'uppercase tracking-[0.1em]',
}

let content = fs.readFileSync(file, 'utf-8')
if (!content.includes(PROTECTED)) {
  throw new Error('Protected AgentTag styles block not found verbatim - aborting, do not proceed blind')
}
content = content.split(PROTECTED).join(PLACEHOLDER)
for (const [oldHex, newHex] of Object.entries(MAP)) {
  content = content.split(oldHex).join(newHex)
}
content = content.split(PLACEHOLDER).join(PROTECTED)
fs.writeFileSync(file, content)
console.log('swapped with AgentTag styles protected')
```

- [ ] **Step 3: Run it**

Run: `node scripts/_palette_swap_task2.mjs`
Expected: `swapped with AgentTag styles protected`. If it instead throws `Protected AgentTag styles block not found verbatim`, stop — the file has drifted from Step 1's recorded text and needs manual reconciliation, not a forced run.

- [ ] **Step 4: Verify the AgentTag block is untouched and everything else swapped**

Run:
```bash
grep -A8 "const styles: Record<string, string>" components/dashboard/DecisionTrailTab.tsx
```
Expected: byte-identical to the block recorded in Step 1 (still has `#79c0ff`, `#a5d6ff`, `#f0883e`, `#d2a8ff`, `#56d364`, `#ffa657`, `#3fb950` — none of these swapped).

Run:
```bash
grep -c "#0d1117\|#161b22\|#21262d\|#1c2128\|#30363d\|#e6edf3\|#8b949e\|#484f58\|#6e7681\|#1f6feb\|#cae8ff" components/dashboard/DecisionTrailTab.tsx
```
Expected: `0` (all old values outside the protected block are gone). Note `#58a6ff` and `#79c0ff` are deliberately excluded from this check since they legitimately remain inside the protected block.

Run:
```bash
grep -n "#58a6ff\|#79c0ff" components/dashboard/DecisionTrailTab.tsx
```
Expected: every remaining match is inside the `styles` block from Step 1 (lines ~12-20) — manually confirm no match falls outside that range.

- [ ] **Step 5: Delete the temporary script**

Run: `rm scripts/_palette_swap_task2.mjs`

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/DecisionTrailTab.tsx`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/DecisionTrailTab.tsx
git commit -m "$(cat <<'EOF'
feat: palette swap for DecisionTrailTab, AgentTag identity colors protected

The AgentTag styles map (7 per-agent identity colors) is a categorical
scheme, not accent/surface tokens - swapping it would merge distinct
agent identities into the same new accent color. Verified the block
is byte-identical before and after via grep.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: StrategyTab.tsx — palette swap + structural header/ToC changes

**Files:**
- Modify: `components/dashboard/StrategyTab.tsx`

This task combines the token swap (protecting `AGENTS[].typeColour` and `CATEGORY_COLOURS`) with the structural "Jump to Section" pill treatment from the spec, since both touch this file and doing it once avoids re-diffing the same file twice.

- [ ] **Step 1: Record the two protected blocks verbatim**

Confirm the `AGENTS` array's `typeColour` lines currently read exactly (in order): `'bg-[#21262d] text-[#8b949e]'` (×2, Alpha/Bravo), `'bg-[#2d1a3a] text-[#d2a8ff]'` (×4, Charlie/Delta/Echo/Foxtrot), `'bg-[#21262d] text-[#8b949e]'` (Golf), `'bg-[#1f3a5f] text-[#79c0ff]'` (Hotel), `'bg-[#1a3a2a] text-[#3fb950]'` (India).

Confirm `CATEGORY_COLOURS` (lines 95-103) currently reads exactly:
```tsx
const CATEGORY_COLOURS: Record<string, string> = {
  sizing:   'bg-[#1f3a5f] text-[#79c0ff]',
  exits:    'bg-[#3d1a1a] text-[#f85149]',
  patience: 'bg-[#1a3a1a] text-[#3fb950]',
  sector:   'bg-[#2d2a1a] text-[#e3b341]',
  risk:     'bg-[#3a1a2d] text-[#db61a2]',
  process:  'bg-[#1a2d3a] text-[#58a6ff]',
  monthly:  'bg-[#21262d] text-[#8b949e]',
}
```
If either differs, stop and re-read the file before proceeding.

- [ ] **Step 2: Write and run the protected swap script**

Create `scripts/_palette_swap_task3.mjs`:

```js
import fs from 'fs'

const file = 'components/dashboard/StrategyTab.tsx'
const PROTECTED_CATEGORY = `const CATEGORY_COLOURS: Record<string, string> = {
  sizing:   'bg-[#1f3a5f] text-[#79c0ff]',
  exits:    'bg-[#3d1a1a] text-[#f85149]',
  patience: 'bg-[#1a3a1a] text-[#3fb950]',
  sector:   'bg-[#2d2a1a] text-[#e3b341]',
  risk:     'bg-[#3a1a2d] text-[#db61a2]',
  process:  'bg-[#1a2d3a] text-[#58a6ff]',
  monthly:  'bg-[#21262d] text-[#8b949e]',
}`
const CATEGORY_PLACEHOLDER = '__PROTECTED_CATEGORY_COLOURS__'

// AGENTS[].typeColour values, matched individually since they're not one contiguous block
const PROTECTED_TYPECOLOURS = [
  "'bg-[#21262d] text-[#8b949e]'",
  "'bg-[#2d1a3a] text-[#d2a8ff]'",
  "'bg-[#1f3a5f] text-[#79c0ff]'",
  "'bg-[#1a3a2a] text-[#3fb950]'",
]

const MAP = {
  '#0d1117': '#0a0b0d',
  '#161b22': '#12151a',
  '#21262d': '#161819',
  '#1c2128': '#181a1e',
  '#30363d': '#1f242c',
  '#e6edf3': '#f4f2ec',
  '#8b949e': '#7a7f88',
  '#484f58': '#5a5f65',
  '#6e7681': '#5a5f65',
  '#1f6feb': '#d4af6a',
  '#58a6ff': '#d4af6a',
  '#79c0ff': '#d4af6a',
  '#cae8ff': '#f4f2ec',
  'uppercase tracking-wider': 'uppercase tracking-[0.1em]',
}

let content = fs.readFileSync(file, 'utf-8')
if (!content.includes(PROTECTED_CATEGORY)) {
  throw new Error('CATEGORY_COLOURS block not found verbatim - aborting')
}
content = content.split(PROTECTED_CATEGORY).join(CATEGORY_PLACEHOLDER)

// Protect each typeColour literal with a unique placeholder (indexed, since
// the same string can appear more than once and split/join would hit all of them)
const typeColourPlaceholders = PROTECTED_TYPECOLOURS.map((_, i) => `__PROTECTED_TYPECOLOUR_${i}__`)
// Only protect the FIRST occurrence found each time we haven't already protected
// that many instances - since these strings legitimately repeat (Alpha and Bravo
// both use the same 'Pure Data'/'Pure TS' style), we must protect exactly as many
// instances as exist in the AGENTS array, not fewer. Count expected occurrences:
const EXPECTED_COUNTS = {
  "'bg-[#21262d] text-[#8b949e]'": 2, // Alpha, Bravo (+ Golf = 3 total, see below)
  "'bg-[#2d1a3a] text-[#d2a8ff]'": 4, // Charlie, Delta, Echo, Foxtrot
  "'bg-[#1f3a5f] text-[#79c0ff]'": 1, // Hotel
  "'bg-[#1a3a2a] text-[#3fb950]'": 1, // India
}
// Golf also uses 'bg-[#21262d] text-[#8b949e]' - actual count is 3, not 2
EXPECTED_COUNTS["'bg-[#21262d] text-[#8b949e]'"] = 3

for (const [literal, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  const actualCount = content.split(literal).length - 1
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} occurrences of ${literal}, found ${actualCount} - aborting, do not proceed blind`)
  }
}

// Since 'bg-[#21262d] text-[#8b949e]' is used by 3 AGENTS entries AND would also
// match the general #21262d/#8b949e swap pattern identically either way (same
// target values), it does NOT need protection - swapping it in place produces
// the correct 'bg-[#161819] text-[#7a7f88]' result, consistent with every other
// use of those two tokens in the file. Only 'bg-[#2d1a3a] text-[#d2a8ff]' (purple,
// used nowhere else as an accent) and 'bg-[#1f3a5f] text-[#79c0ff]' /
// 'bg-[#1a3a2a] text-[#3fb950]' need real protection, since #79c0ff and #d2a8ff
// are swap targets (#79c0ff -> gold) or otherwise not part of the general map
// (#d2a8ff, #1f3a5f, #1a3a2a are not in MAP at all, so they pass through
// unchanged regardless - meaning NONE of the typeColour values need protection
// beyond what CATEGORY_COLOURS already covers, because #d2a8ff/#1f3a5f/#1a3a2a
// simply aren't swap targets, and #79c0ff only appears in this file inside
// CATEGORY_COLOURS.sizing (already protected) and Hotel's typeColour.
// Hotel's typeColour is the one real remaining risk: protect it explicitly.
const PROTECTED_HOTEL = "text-[#79c0ff]"
// But this exact substring also appears inside the already-protected
// CATEGORY_PLACEHOLDER block (no longer present as literal #79c0ff there) and
// nowhere else per the earlier file read - safe to protect the remaining
// standalone occurrence(s) by placeholder.
const hotelOccurrences = content.split(PROTECTED_HOTEL).length - 1
if (hotelOccurrences !== 1) {
  throw new Error(`Expected exactly 1 remaining standalone "text-[#79c0ff]" (Hotel's typeColour) after protecting CATEGORY_COLOURS, found ${hotelOccurrences} - aborting`)
}
content = content.replace(PROTECTED_HOTEL, '__PROTECTED_HOTEL_TYPECOLOUR__')

for (const [oldHex, newHex] of Object.entries(MAP)) {
  content = content.split(oldHex).join(newHex)
}

content = content.split(CATEGORY_PLACEHOLDER).join(PROTECTED_CATEGORY)
content = content.replace('__PROTECTED_HOTEL_TYPECOLOUR__', PROTECTED_HOTEL)

fs.writeFileSync(file, content)
console.log('swapped with CATEGORY_COLOURS and Hotel typeColour protected')
```

- [ ] **Step 3: Run it**

Run: `node scripts/_palette_swap_task3.mjs`
Expected: `swapped with CATEGORY_COLOURS and Hotel typeColour protected`. If it throws any of the count-mismatch errors, stop — re-read the current file state and adjust the expected counts to match reality before re-running; do not force it through.

- [ ] **Step 4: Verify**

Run:
```bash
grep -A8 "const CATEGORY_COLOURS" components/dashboard/StrategyTab.tsx
```
Expected: byte-identical to Step 1's recorded block.

Run:
```bash
grep -n "typeColour: 'bg-\[#1f3a5f\] text-\[#79c0ff\]'" components/dashboard/StrategyTab.tsx
```
Expected: 1 match (Hotel's entry, unchanged).

Run:
```bash
grep -c "#0d1117\|#161b22\|#1c2128\|#30363d\|#e6edf3\|#8b949e\|#484f58\|#6e7681\|#1f6feb\|#cae8ff" components/dashboard/StrategyTab.tsx
```
Expected: `0`.

- [ ] **Step 5: Delete the temporary script**

Run: `rm scripts/_palette_swap_task3.mjs`

- [ ] **Step 6: Now apply the structural "Jump to Section" pill change**

In `components/dashboard/StrategyTab.tsx`, find the ToC rendering block (added earlier this session — the `<a>` elements inside the `parsed.headings.map` loop). Replace:

```tsx
              <a
                key={h.id}
                href={`#${h.id}`}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#161819] text-[#7a7f88] hover:bg-[#1f242c] transition-colors whitespace-nowrap"
              >
                {h.text}
              </a>
```

with:

```tsx
              <a
                key={h.id}
                href={`#${h.id}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#2a2f38] text-[#d4af6a] hover:bg-[#161819] transition-colors whitespace-nowrap"
              >
                {h.text}
              </a>
```

(Note: the `bg-[#161819] text-[#7a7f88]` in the *original* pre-Task-3 source read `bg-[#21262d] text-[#8b949e]` — by the time Step 6 runs, Step 2's swap has already updated it to `#161819`/`#7a7f88`, so match against the post-swap values shown above, not the pre-swap ones.)

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/StrategyTab.tsx`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/StrategyTab.tsx
git commit -m "$(cat <<'EOF'
feat: palette swap + quiet ToC pills for StrategyTab

CATEGORY_COLOURS (7 learning categories) and Hotel's typeColour
protected during the swap - both are categorical schemes, not accent
tokens. Jump to Section pills go from filled to outlined-gold per
spec, matching the approved mockup treatment.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Chart benchmark color — PerformanceChart.tsx and NiftyChart.tsx

**Files:**
- Modify: `components/dashboard/PerformanceChart.tsx`
- Modify: `components/dashboard/NiftyChart.tsx`

- [ ] **Step 1: Confirm both files have no `#0d1117`/`#161b22`/etc. surface tokens to worry about**

Run: `grep -n "#" components/dashboard/PerformanceChart.tsx components/dashboard/NiftyChart.tsx`

Expected: only `#3fb950`, `#f85149` (unchanged, P&L), `#58a6ff` (benchmark, changes below), `#161b22`/`#30363d` (tooltip background/border — these DO need the general swap since they're just the standard surface/border tokens, not benchmark-specific).

- [ ] **Step 2: Edit `PerformanceChart.tsx`**

Replace the legend dot:
```tsx
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: '#58a6ff', opacity: 0.6 }} />
```
with:
```tsx
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: '#7a7f88', opacity: 0.6 }} />
```

Replace the tooltip surface colors:
```tsx
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
```
with:
```tsx
            contentStyle={{ background: '#12151a', border: '1px solid #1f242c', borderRadius: 6, fontSize: 12 }}
```

Replace the Nifty line stroke and dot fill:
```tsx
              stroke="#58a6ff"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 3, fill: '#58a6ff' }}
```
with:
```tsx
              stroke="#7a7f88"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 3, fill: '#7a7f88' }}
```

- [ ] **Step 3: Edit `NiftyChart.tsx`**

Replace the tooltip surface colors:
```tsx
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
```
with:
```tsx
            contentStyle={{ background: '#12151a', border: '1px solid #1f242c', borderRadius: 6, fontSize: 12 }}
```

Replace the line stroke and dot fill:
```tsx
            stroke="#58a6ff"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#58a6ff' }}
```
with:
```tsx
            stroke="#7a7f88"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#7a7f88' }}
```

- [ ] **Step 4: Verify no `#58a6ff`, `#161b22`, or `#30363d` remain in either file**

Run: `grep -c "#58a6ff\|#161b22\|#30363d" components/dashboard/PerformanceChart.tsx components/dashboard/NiftyChart.tsx`
Expected: `0` for both files.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/PerformanceChart.tsx components/dashboard/NiftyChart.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/PerformanceChart.tsx components/dashboard/NiftyChart.tsx
git commit -m "$(cat <<'EOF'
feat: chart benchmark line moves off accent-blue to neutral gray

Per spec: gold is reserved for the app's own accent moments, not a
third-party index benchmark. Reuses the existing muted-text token
(#7a7f88) rather than introducing a new color.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: DashboardClient.tsx — header hero + status line + tab nav

**Files:**
- Modify: `components/dashboard/DashboardClient.tsx`

This is the structural change validated in the approved mockup. No categorical maps in this file (confirmed — not in the `Record<string` grep results).

- [ ] **Step 1: Read the current top-bar and tab-nav JSX**

Read `components/dashboard/DashboardClient.tsx` lines 50-120 (the top bar through the `TabsList` block) to get exact current text before editing — this file has been edited twice already this session (freshness badge, AskTab prop), so re-read rather than trust memory of its shape from earlier in this conversation.

- [ ] **Step 2: Replace the top bar**

Replace the entire top-bar `<div className="bg-[#161b22] border-b ...">...</div>` block (logo, status pills, portfolio value, P&L, freshness badge, "Updated" timestamp) with the hero structure from the approved mockup:
- Quiet top strip: small logo mark + "CLAUDE TRADER" wordmark (left), single status line "Paper trading · Solo agent · Updated {time}" with a small static gray dot (right) — replaces the 3 separate pills.
- Hero block below it: "PORTFOLIO VALUE · DAY {days_running} OF SEASON 2" label, then the 64px/weight-300 value + signed P&L delta on the same baseline, then a muted context line ("Started ₹X on {inception date} · vs Nifty 50 {benchmark %} since inception").
- The freshness-stale warning does NOT go in the status line — it moves to Task 6's stat row.

Use the real props already available in this component (`portfolioValue`, `totalPnl`, `totalPnlPct`, `lastUpdated`, `usingTradingTeam`, `daysSinceAnalysis`, `latestAnalysisDate`, `summary?.portfolio.inception_date`, `startingCapital`) — do not introduce new props; everything needed is already threaded through from `page.tsx` per this session's earlier work.

- [ ] **Step 3: Replace the tab navigation styling**

Change the `TabsTrigger` className from the filled-underline style to letter-spaced uppercase text with a single gold underline on the active tab, matching the mockup (`text-[11px] letterspacing... data-[state=active]:border-[#d4af6a]` pattern) — keep the existing `Tabs`/`TabsList`/`TabsTrigger` component usage from `@/components/ui/tabs`, only the className changes.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/DashboardClient.tsx`
Expected: clean.

- [ ] **Step 5: Live browser verification (required — this is the highest-visibility change in the whole plan)**

Start the dev server, screenshot the header at both desktop (1440px) and mobile (390px) viewports, confirm:
- No console errors.
- The hero value renders with real data (not `NaN`/`undefined`).
- The freshness indicator context (inception date, benchmark %) computes correctly against real production data.
- Tab navigation still switches tabs correctly (click each of the 8 tabs, confirm content changes).

Follow the exact dev-server start/stop and Playwright pattern used throughout this session (`lsof -ti:3000 ... | xargs kill`, `nohup npm run dev`, poll `curl -sf localhost:3000`, Python Playwright script at `/usr/bin/python3`, screenshot to the scratchpad directory, `lsof -ti:3000 ... | xargs kill` when done).

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/DashboardClient.tsx
git commit -m "$(cat <<'EOF'
feat: header hero treatment - portfolio value as the sole hero element

Replaces 3 status pills with one quiet text line; portfolio value
becomes a 64px/weight-300 hero instead of a 15px corner figure; tab
nav goes from filled-underline to letter-spaced text with a single
gold underline. Matches the mockup approved during brainstorming.
Verified live at desktop and mobile viewports against real production
data.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: SummaryTab.tsx + StatCard.tsx — stat row becomes thin-divided columns

**Files:**
- Modify: `components/dashboard/SummaryTab.tsx`
- Modify: `components/dashboard/StatCard.tsx`

No categorical maps in either file.

- [ ] **Step 1: Read both files' current state**

Read `components/dashboard/SummaryTab.tsx` (the 4-`StatCard` row, lines ~29-60 per the version read earlier this session) and `components/dashboard/StatCard.tsx` in full — re-read rather than trust earlier-session memory, since `SummaryTab.tsx` was edited once already (the "(calendar)" label fix).

- [ ] **Step 2: Restructure `StatCard.tsx` directly**

Confirmed via `grep -rn "StatCard" components/dashboard/ --include="*.tsx"`: `StatCard` is imported only by `SummaryTab.tsx` (4 call sites, no other tab uses it) — safe to restructure the shared component directly rather than forking a separate inline layout. Change it from an individually-bordered, individually-rounded box to a flex-child column with a `border-l` divider on every item except the first (matching the mockup: no `border`, no `rounded-lg` per-card, just `border-l border-[#1f242c]` on non-first children — parent `SummaryTab.tsx` already renders the 4 `StatCard`s inside a `flex` row, so add `first:border-l-0` or equivalent to the divider class and drop the individual box styling from `StatCard.tsx`).

- [ ] **Step 3: Apply the new palette tokens to whichever file(s) end up changing**, per the general mapping table (page base, surface, border, text tokens) — same swap values as every other task, applied by hand here since the structural change touches every line anyway. Also apply the `uppercase tracking-wider` → `uppercase tracking-[0.1em]` label-spacing change from the mapping reference section — every `StatCard` label uses this pairing.

- [ ] **Step 4: Integrate the freshness warning into the stat row**

Add a "LAST ANALYSIS" column (or repurpose one of the 4 existing stats — confirm with the current 4: Portfolio Value / Total P&L / Run Rate / Today's P&L — the mockup showed a 4-column row of Run Rate / Today's P&L / Open Positions / Last Analysis, since Portfolio Value moved to the header hero in Task 5). Value: `daysSinceAnalysis === 0 ? 'Today' : daysSinceAnalysis === 1 ? 'Yesterday' : `${daysSinceAnalysis} days ago`` colored red (`#f85149`... reconfirm this exact red is still the unchanged P&L-red token) when `daysSinceAnalysis >= 2`, muted otherwise — reuse the exact threshold logic already implemented in `DashboardClient.tsx` this session, don't reinvent it in a second file; import or pass `daysSinceAnalysis` as a prop from `DashboardClient.tsx` down to `SummaryTab.tsx` rather than recomputing it.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/SummaryTab.tsx components/dashboard/StatCard.tsx`
Expected: clean.

- [ ] **Step 6: Live browser verification**

Screenshot the Summary tab at desktop and mobile, confirm real numbers render, confirm the freshness warning shows the actual current staleness (expect to still see a real "N days ago" figure reflecting whatever the analyze cron's status is by the time this runs — do not hardcode an expected number, read whatever's actually there).

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/SummaryTab.tsx components/dashboard/StatCard.tsx
git commit -m "$(cat <<'EOF'
feat: Summary stat row becomes thin-divided columns, folds in freshness warning

A bordered box implied four equally-important facts; they aren't. The
freshness warning moves here from the header (Task 5) since this is
where stats are actually scanned together.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: AuditTab.tsx — WARN badge treatment only

**Files:**
- Modify: `components/dashboard/AuditTab.tsx`

No categorical maps in this file. This task is deliberately narrow — only the `WARN` badge's fill-vs-outline treatment changes; table structure (desktop table + the mobile card view added earlier this session) is explicitly unchanged per spec.

- [ ] **Step 1: Read the current file**

Re-read `components/dashboard/AuditTab.tsx` in full — this file has been edited twice already this session (mobile cards, apostrophe lint fixes).

- [ ] **Step 2: Apply the general palette swap** to this file (surfaces, borders, text — the standard mapping table, including `uppercase tracking-wider` → `uppercase tracking-[0.1em]`), by hand or via the same protected-script pattern as Task 1 (no protection needed here, no categorical map exists in this file — safe for the simple script from Task 1, scoped to this one file).

- [ ] **Step 3: Change the `WARN` badge specifically** (both the desktop-table `Badge` usage and the mobile-card `Badge` usage — there are two call sites, added in the same session as the mobile cards, both must change identically) from:
```tsx
                    className={`text-[10px] ${a.sanity_passed
                      ? 'border-[#3fb950] text-[#3fb950]'
                      : 'border-[#f85149] text-[#f85149]'}`}
```
to:
```tsx
                    className={`text-[10px] ${a.sanity_passed
                      ? 'border-[#3fb950] text-[#3fb950]'
                      : 'border-[#d4af6a] text-[#d4af6a]'}`}
```
(PASS stays green/unchanged; WARN moves from red to gold-outline per spec: "a warning is not the same severity as an outright rejection — reserve red-fill for genuine rule breaches." Note this file already uses an *outlined* `Badge` variant for both states, not filled — so this task only changes WARN's color, not fill-vs-outline structure, which was already outline-only from when the mobile cards were built.)

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint components/dashboard/AuditTab.tsx`
Expected: clean.

- [ ] **Step 5: Live browser verification**

Screenshot the Audit tab at desktop and mobile (both views were built earlier this session and must both still work), specifically scroll to a real `WARN` row (there's at least one in production data as of this session, e.g. the 12 Jul entry) and confirm it renders gold-outlined, not red.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/AuditTab.tsx
git commit -m "$(cat <<'EOF'
feat: palette swap for AuditTab, WARN badge moves from red to gold outline

Table structure and mobile card layout (added earlier this session)
are unchanged - this is a token swap plus one color change on the
WARN state specifically, distinguishing "flagged for review" from
"rejected outright" (which stays red, unchanged, since that's a real
rule breach caught by validateDecisions()).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Full-app verification pass

**Files:** none modified — verification only.

- [ ] **Step 1: Full typecheck, lint, build**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint . && npm run build`
Expected: all three clean, matching the pattern used after every change this entire session.

- [ ] **Step 2: Confirm `SectorChart.tsx` was never touched**

Run: `git log --oneline -- components/dashboard/SectorChart.tsx`
Expected: no new commits from this plan appear (only pre-existing history) — confirms the explicit exclusion held throughout Tasks 1-7.

- [ ] **Step 3: Live walk of all 8 tabs at desktop (1440px)**

Start the dev server (same start/poll/kill pattern used all session), screenshot Summary, Holdings, Trades, Audit, Trail, Strategy, Changelog, Ask. Check console for errors on every tab.

- [ ] **Step 4: Live walk of Trades, Audit, Summary at mobile (390px)**

These three have mobile-specific layouts (Trades/Audit cards from earlier this session, Summary's stat row restructured in Task 6) — re-verify all three still render correctly and without horizontal overflow, same check used when the mobile cards were first built (`document.documentElement.scrollWidth > document.documentElement.clientWidth` must be `false`).

- [ ] **Step 5: Exercise the Ask tab live**

Submit one real question through the chat (same pattern as the #8 model-migration verification earlier this session) and confirm the response still renders correctly against the new palette — this tab got a Task 1 token swap and should be functionally unaffected, but confirm rather than assume.

- [ ] **Step 6: Stop the dev server, confirm no leftover processes or worktrees**

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
git worktree list
git status --short
```
Expected: no dev server running, no unexpected worktrees, `git status --short` shows only the untracked `docs/superpowers/` entries already present before this plan started (nothing else uncommitted).

- [ ] **Step 7: Report a summary of what changed, tab by tab, for final human review before anything is pushed**

No commit for this task — it's a checkpoint, not a change.
