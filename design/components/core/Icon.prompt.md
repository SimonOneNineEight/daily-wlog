# Icon
Inline SVG glyph from the bundled Lucide set — use it for every glyph in chrome; never emoji, never a unicode character.

```jsx
<Icon name="calendar" size={20} color="var(--icon-default)" />
```

Glyphs live in `assets/icons/*.svg` and are resolved relative to the page's `styles.css` link; set `window.__WLOG_ICON_BASE__` to override. Default stroke weight is 1.75 — keep the family's weight consistent rather than mixing.
