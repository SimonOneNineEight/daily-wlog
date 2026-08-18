# MonthGrid
The landing screen's grid: weekday header, six week rows separated by hairlines, dots per day.

```jsx
<MonthGrid year={2026} month={7} today={17} selected={12} entries={{ 3: ["green"], 12: ["clay", "orange", "blue", "violet", "pink"] }} onSelectDay={setDay} />
```

`entries` keys are day numbers; the array is in entry order, so the first color is also the one the year view uses.
