# EntryCard
Day view's unit: category icon, title, category/subcategory line, note, photo grid.

```jsx
<EntryCard title="Morning swim" category={{ name: "Sport", color: "green", icon: "dumbbell" }} subcategory="swim" note="Long, slow lengths." photos={[{}, {}]} draggable />
```

Use `dragging` while reordering to lift the shadow. One card level only — never nest cards inside cards.
