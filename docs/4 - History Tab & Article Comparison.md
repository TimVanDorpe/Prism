# 4 — History Tab & Article Comparison

## Overview
Add a History tab displaying all past analyses, and a Compare tab with a visual left-right bias spectrum chart showing up to 5 articles using their website favicons as markers.

---

## New Dependency
```bash
# run from Frontend/Frontend/
npm install recharts
```

---

## Files to Create
| File | Purpose |
|---|---|
| `src/context/ComparisonContext.jsx` | Cross-page state: selected articles (max 5) |
| `src/components/Layout.jsx` | Shared header + tab nav (Analyze / History / Compare) |
| `src/components/Layout.css` | Tab nav styles |
| `src/components/BiasSpectrumChart.jsx` | Recharts scatter chart with favicon markers |
| `src/pages/jsx/HistoryPage.jsx` | History list with selection toggle |
| `src/pages/css/HistoryPage.css` | History page styles |
| `src/pages/jsx/ComparePage.jsx` | Comparison view (chart + detail cards) |
| `src/pages/css/ComparePage.css` | Comparison page styles |

## Files to Modify
| File | Change |
|---|---|
| `src/App.jsx` | Wrap with context provider, add `/history` and `/compare` routes |
| `src/pages/jsx/HomePage.jsx` | Remove `<header>` (moved to Layout), add "Add to Comparison" button on result |

---

## Implementation Steps

### Step 1 — ComparisonContext (`src/context/ComparisonContext.jsx`)
- State: `selectedArticles` — array of up to 5 objects `{ id, url, result: { biasScore, biasedLeaning, summary } }`
- Exports: `addArticle(article)`, `removeArticle(id)`, `clearAll()`, `isSelected(id)`
- Guard: `addArticle` no-ops if already selected or count === 5

### Step 2 — Layout component (`src/components/Layout.jsx`)
- Extracts the Prism header from `HomePage.jsx` (logo + logout button)
- Tab bar below header: **Analyze** (`/home`), **History** (`/history`), **Compare** (`/compare`)
- "Compare" tab shows a count badge `(N)` from context
- `useLocation()` highlights the active tab
- Dark theme: `border-bottom: 1px solid #333`, accent `#646cff`

### Step 3 — Update `App.jsx`
- Wrap with `<ComparisonProvider>`
- Add protected routes: `/history` → `<HistoryPage />`, `/compare` → `<ComparePage />`
- All three protected pages render inside `<Layout>`

### Step 4 — Refactor `HomePage.jsx`
- Remove `<header>` block (lines 66–71) — now provided by Layout
- After analysis result, add "Add to Comparison" / "✓ Added" button
  - Uses `context.addArticle({ id: result.id ?? url, url, result })`
  - Disabled when 5 articles already selected

### Step 5 — `HistoryPage.jsx`
- Calls `getHistory(50)` from existing `apiService.js` on mount
- Filters to `analyzed === true` articles only
- Each row: favicon, URL (truncated), leaning badge, bias score, collapsible summary, Select toggle
- Favicon: `https://www.google.com/s2/favicons?domain={hostname}&sz=32`
- Footer bar when ≥2 selected: "N articles selected — Go to Compare →"
- Loading / error / empty states

### Step 6 — `BiasSpectrumChart.jsx`

**Position formula** (maps score + direction → 0–100 spectrum):
```js
function calcPosition(biasScore, biasedLeaning) {
  if (biasedLeaning === 'neutral') return 50;
  if (biasedLeaning === 'left')   return 50 - biasScore / 2;  // 0 = far left
  if (biasedLeaning === 'right')  return 50 + biasScore / 2;  // 100 = far right
}
```

- Recharts `ScatterChart`, single `XAxis` (0–100), Y axis hidden
- Overlapping points (within 5 units) staggered vertically: offsets `[0, -24, 24, -48, 48]`
- Background gradient strip: blue → purple → red
- Axis labels: "Far Left" | "Center" | "Far Right"

**Custom favicon dot:**
```jsx
const CustomDot = ({ cx, cy, payload }) => {
  const hostname = new URL(payload.url).hostname;
  return (
    <image
      href={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
      x={cx - 16} y={cy - 16} width={32} height={32}
    />
  );
};
```
Falls back to colored circle on `onError`.

### Step 7 — `ComparePage.jsx`
- Empty state (< 2 selected) with link to `/history`
- `<BiasSpectrumChart articles={selectedArticles} />`
- Grid of detail cards: favicon, URL, leaning badge, score, summary, Remove button
- "Clear all" button

---

## CSS Conventions (match existing dark theme)
| Token | Value |
|---|---|
| Panel background | `#1a1a1a` |
| Border | `1px solid #444` |
| Accent | `#646cff` |
| Left badge | `background: #1a3a5c; color: #5b9bd5` |
| Right badge | `background: #3a1a1a; color: #d55b5b` |
| Neutral badge | `background: #2a2a2a; color: #aaa` |

---

## Verification
1. `npm run dev` from `Frontend/Frontend/` — no header duplication on any page
2. Analyze an article → "Add to Comparison" button appears on result card
3. History tab loads past analyses with favicons and leaning badges
4. Select 2–5 articles → Compare tab badge updates
5. Compare tab shows spectrum chart — favicons positioned correctly (left/center/right)
6. Hover favicon → tooltip shows URL, score, leaning
7. Neutral article appears at center (position = 50)
8. 5 articles selected → "Add to Comparison" button disabled everywhere
