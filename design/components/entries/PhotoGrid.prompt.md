# PhotoGrid
Photos for an entry — up to 10, laid out as a grid.

```jsx
<PhotoGrid photos={photos} editable onAdd={pick} onRemove={remove} columns={4} />
```

Read-only in cards, `editable` in the entry form (adds the camera tile with an n/10 count). Horizontal carousels are banned.
