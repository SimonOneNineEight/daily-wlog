# daily-wlog Design Brief

Ratified by Simon (designer/owner), 2026-08-17. This is the guardrail brief a design session must obey; the produced design system fills in exact values within these rules.

## Identity

A mobile-first personal life journal. Aesthetic family: **Apple Calendar's airiness × Apple Journal's warmth**. The UI chrome is quiet and neutral; color belongs to the user's categories and nowhere else. The calendar is the product's face: a month filling with colored dots should feel like a life filling up.

**Primary language: Traditional Chinese (zh-TW).** All UI copy, all design mocks, and all layout decisions are made on zh-TW text first; English arrives post-MVP as a translation.

## Typography

- iOS system font stack everywhere: **PingFang TC is the face users actually read** (zh-TW copy and entries), with SF Pro carrying Latin text and numerals. No custom or display faces in MVP.
- Line heights, cell paddings, and truncation rules are set against Chinese text: CJK runs denser and taller than Latin, so a layout that only works on English placeholder text is wrong.
- Recorded evolution: a warm reading face for entry content and the printed book, chosen later against real entries — not now against placeholder text.
- Day numbers and titles: regular weight; today and selected states get semibold, never color alone.
- One type scale, few sizes. Entry titles are short by design (they live in calendar cells and day lists).

## Color

- Primary colors of the app: white, grey, black. Chrome (backgrounds, bars, buttons, grid lines) is neutral only — **no brand accent color exists**. The "+" button and today's marker carry weight through shape, fill, and depth, never through hue.
- Category colors are the only saturated colors on screen. **Preset palette of 10 muted, dusty mid-tones** that harmonize with the neutral chrome — no neon, no pastel — with lightness deliberately varied across the ten so all remain mutually distinguishable at dot size (6–8px) on white. Exact values are chosen in the design session on the real month-view mock, plus a custom color picker for users.
- Dots may run a point or two larger than saturated equivalents would, compensating for the muted palette.
- A day cell shows up to 4 dots in entry order; overflow is a "+n", never a fifth dot.
- Year view: a day with entries gets a rounded box in the day's FIRST entry's category color, rendered as a solid fill with the day numeral punched out in white. One color per day, never stripes.

## Theming

- **MVP ships light mode only**, declared to iOS as light-only so the system never half-inverts screens.
- Token discipline is mandatory from the first component: every color is a semantic token (background, surface, textPrimary, …); hardcoded hex values are banned in implementation.
- Dark mode is a planned later pass: a second token value column plus ten dark-tuned siblings of the preset palette. The design session designs light screens only; at most a rough dark token column as reference, zero polish.

## Screens (MVP)

1. **Month view** (landing): Apple Calendar-style grid, horizontal swipe between months, today marked, colored dots per day, selected-day panel beneath the grid listing that day's entry titles with category icons. Persistent "+" for today.
2. **Day view**: the date's entries as cards (title, category icon, note preview, photo thumbnails), drag to reorder.
3. **Entry form**: category picker first (with inline "Create …" when typing a new name), short title field, optional note, photo grid up to 10 with drag order. Fast path: category + title + save in under a minute.
4. **Year view**: 12 mini-month grids, rounded single-color highlights on entry days, tap a month to enter it.
5. **Category management**: two-level list (categories with their subcategories), colored icon editing (preset + custom), rename; delete only offered when unused (in-use categories rename instead — entries follow).
6. **Category create/edit sheet**: one sheet serving both create and edit — name, optional parent category (making it a subcategory), icon picker, color (10 presets + custom picker). Reached only from category management; inline creation in the entry form never opens it (auto-assigns icon and color instead, editable here later).
7. **Sign-in**: wordmark, one line of promise, Sign in with Apple + Google buttons per their official styling rules (never restyled), on calm neutral ground. The only brand-moment screen; restraint is the design.
8. **Custom color drawer**: opened from the category sheet's 自訂顏色 option (Apple Journal-like). Hue and lightness/saturation controls, the 10 presets as a reference row, and a live preview rendering the chosen color as an actual dot on a mini month grid beside the user's existing category colors — so distinguishability is seen, not policed.

Settings and other long-tail screens (dialogs, errors, empty states, account deletion) are derived from the system during implementation, not designed in the session; any derived moment that feels wrong gets taken back into a design session individually.

## Explicit bans

1. No blinking or pulsing status dots.
2. No three-column feature grids or marketing-style layouts.
3. No decorative microcopy or labels that repeat what an icon already says.
4. No deep container nesting: the grid, one panel, one card level; stop.
5. No serif fonts, no teal-by-default accents.
6. No empty-state illustrations that outweigh the content they replace.
7. No gradients on chrome — depth comes from shadow and layering only.
8. No emoji as category icons; the icon set is a drawn, consistent-weight family (SF Symbols style).
9. No onboarding carousel: sign in, land on today's month; the seeded categories and the "+" teach everything.
10. No gamification visuals and no cheerleading microcopy: no streak flames, badges, confetti, or "Great job!" — the month filling with color is the reward system.
11. No horizontal carousels for photos in the day view; photos lay out as grids or stacks.

## Feel

Calm, precise, a little joyful when color appears. The user's five minutes should feel like closing a small ritual, not operating software.
