# daily-wlog 核心畫面 — design canvas

Pulled from the Claude Design project **"Daily-wlog iOS prototype"**
(`https://claude.ai/design/p/9dca8ca9-1042-4f06-ae22-137ec2d24c04`), 2026-08-18;
canvas re-pulled 2026-09-10 for the new 設定 artboard (#35).

> **Stale for several surfaces since 2026-09-10** (PM feedback round 1,
> commits 8244699..02cffd8 — Simon waived canvas-first for that round's
> ratified changes). Where this canvas disagrees with the app, the app and
> DESIGN.md are current truth for:
>
> - **月曆視圖**: the filled circle is the selection (moves with taps);
>   today wears the thin ring; + creates into the selected day.
> - **新增日記**: a 日期 row with a compact picker heads the form; the
>   creation rows open the full 分類表單 sheet (the in-form quick step is
>   retired); a typed-but-unconfirmed subcategory renders as a pending pill.
> - **年視圖**: no back button, no chevrons; swipe-only paging; the title
>   opens an endless year wheel.
> - **分類 sheet (篩選 A/B)**: both filter explorations are retired — the
>   類別 sheet is a visibility checklist over a persistent hidden-set
>   (DESIGN.md §9): icon-fill toggles, check-circles for subcategories,
>   family master switch, 全部隱藏/全部顯示.
> - **新增/編輯分類 sheet**: the parent list swaps in for its summary row
>   (accordion); sheet titles center on the sheet, not the button gap.
>
> **Also superseded, 2026-09-12** (PM feedback round 2, #40):
>
> - **今天**: the word, on the month, day and year views, replacing the
>   canvas's `iconBtn('calendar', '今天')`. In an app made entirely of
>   calendars a calendar glyph says "calendar", not "today" — Apple Calendar
>   and most third-party calendars use the word, and Google's icon only reads
>   because it carries the date number inside it. The control also stopped
>   navigating: it returns the surface you are on to now, rather than leaving
>   the year view for today's month.
>
> The prototype project still shows the pre-round designs; redrawing those
> artboards there (then re-pulling) is open design debt.

`daily-wlog-核心畫面.dc.html` is the canvas holding **all ten designed surfaces** as
design-system-driven markup. The project's own screen map:

| Screen (in the canvas) | Built from |
| --- | --- |
| 月曆視圖 (Month) | DESIGN.md § Screens 1, § Color |
| 日視圖 (Day) | DESIGN.md § Screens 2, ban 11 |
| 新增日記 (Entry form) | DESIGN.md § Screens 3, 6 (inline creation rule) |
| 年視圖 (Year) | DESIGN.md § Screens 4, § Color (year view) |
| 分類管理 (Category management) | DESIGN.md § Screens 5, CONTEXT.md |
| 新增/編輯分類 sheet | DESIGN.md § Screens 6, CONTEXT.md (inheritance) |
| 自訂顏色 drawer | DESIGN.md § Color (custom picker, dot-size legibility) |
| 登入 (Sign-in) | DESIGN.md § Screens 7, bans 6 & 9 |
| 篩選 A / 篩選 B (Filter explorations) | Both directions mocked; **direction A (filter sheet) is the ratified decision** per spec issue #1 |
| 設定 (Settings) + 語言選單 sheet | DESIGN.md primary-language amendment (2026-09-10), issue #35: 語言 row under 一般 with value readout; bottom-sheet picker, exactly 系統預設 / 繁體中文 / English (endonyms fixed), trailing check, tap applies instantly |

Notes:

- The canvas references its design system at `_ds/daily-wlog-design-system-…/` (tokens,
  styles, compiled bundle, 79 icon SVGs). Those tokens are byte-identical to `design/tokens/`
  in this repo, so the repo copy is authoritative; the `_ds/` tree was not duplicated here.
  To render the canvas standalone in a browser, fetch the `_ds/` tree from the prototype
  project alongside `support.js` (the generic dc-runtime, included here).
- The icon set grew to 79 vendored Lucide glyphs in the prototype (icon picker inventory);
  see `../assets/icons.md` for the manifest.
