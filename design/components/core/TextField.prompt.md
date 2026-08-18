# TextField
Inset field for an entry title (single line) or note (`multiline`).

```jsx
<TextField value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" autoFocus />
<TextField multiline rows={5} placeholder="Note (optional)" />
```

Titles are short by design — they live in calendar cells and day lists. Focus is a 1px near-black inset ring.
