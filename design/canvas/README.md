# daily-wlog 核心畫面 — design canvas

Pulled from the Claude Design project **"Daily-wlog iOS prototype"**
(`https://claude.ai/design/p/9dca8ca9-1042-4f06-ae22-137ec2d24c04`), 2026-08-18.

`daily-wlog-核心畫面.dc.html` is the canvas holding **all nine designed surfaces** as
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

Notes:

- The canvas references its design system at `_ds/daily-wlog-design-system-…/` (tokens,
  styles, compiled bundle, 79 icon SVGs). Those tokens are byte-identical to `design/tokens/`
  in this repo, so the repo copy is authoritative; the `_ds/` tree was not duplicated here.
  To render the canvas standalone in a browser, fetch the `_ds/` tree from the prototype
  project alongside `support.js` (the generic dc-runtime, included here).
- The icon set grew to 79 vendored Lucide glyphs in the prototype (icon picker inventory);
  see `../assets/icons.md` for the manifest.
