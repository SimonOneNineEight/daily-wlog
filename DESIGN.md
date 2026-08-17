# daily-wlog Design Brief

## Identity

A mobile-first personal life journal. Aesthetic family: **Apple Calendar's airiness × Apple Journal's warmth**. The UI chrome is quiet and neutral; color belongs to the user's categories and nowhere else. The calendar is the product's face: a month filling with colored dots should feel like a life filling up.

## Typography

- iOS system font (SF Pro) throughout; no custom display fonts.
- Day numbers and titles: regular weight; today and selected states get semibold, never color alone.
- One type scale, few sizes. Entry titles are short by design (they live in calendar cells and day lists).

## Color

- Chrome (backgrounds, bars, grid lines): neutral grays on white. No brand accent color competing with category colors.
- Category colors are the only saturated colors on screen. Preset palette of 10: red, orange, yellow, green, teal, blue, indigo, purple, pink, brown — plus a custom color picker.
- A day cell shows up to 4 dots in entry order; overflow is a "+n", never a fifth dot.
- Year view: a day with entries gets a rounded highlight box tinted with the day's FIRST entry's category color. One color per day, never stripes.
- Light mode first; keep every color a token so dark mode is a later pass, not a redesign.

## Screens (MVP)

1. **Month view** (landing): Apple Calendar-style grid, horizontal swipe between months, today marked, colored dots per day, selected-day panel beneath the grid listing that day's entry titles with category icons. Persistent "+" for today.
2. **Day view**: the date's entries as cards (title, category icon, note preview, photo thumbnails), drag to reorder.
3. **Entry form**: category picker first (with inline "Create …" when typing a new name), short title field, optional note, photo grid up to 10 with drag order. Fast path: category + title + save in under a minute.
4. **Year view**: 12 mini-month grids, rounded single-color highlights on entry days, tap a month to enter it.
5. **Category management**: two-level list (categories with their subcategories), colored icon editing (preset + custom), rename; delete only offered when unused.

## Explicit bans

- No blinking or pulsing status dots.
- No three-column feature grids or marketing-style layouts.
- No decorative microcopy or labels that repeat what an icon already says.
- No deep container nesting: the grid, one panel, one card level; stop.
- No serif fonts, no teal-by-default accents.
- No empty-state illustrations that outweigh the content they replace.

## Feel

Calm, precise, a little joyful when color appears. The user's five minutes should feel like closing a small ritual, not operating software.
