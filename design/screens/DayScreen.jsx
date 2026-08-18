/** Day view: the date's entries as cards, drag to reorder (grip shown; press-and-hold lifts). */
function DayScreen({ nav, day, month }) {
  const { NavBar, IconButton, EntryCard, AddButton, Button } = window.DailyWlogDesignSystem_afe7e1;
  const D = window.WLOG;
  const [order, setOrder] = React.useState(() => (D.entries[day] || []).map((_, i) => i));
  const [dragging, setDragging] = React.useState(null);
  const source = D.entries[day] || [];
  const move = (idx, dir) => {
    setOrder((o) => {
      const next = o.slice();
      const to = idx + dir;
      if (to < 0 || to >= next.length) return o;
      const [item] = next.splice(idx, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragging(idx + dir);
    window.setTimeout(() => setDragging(null), 240);
  };
  return (
    <window.Phone>
      <NavBar
        title={D.dateShort(D.year, month, day)}
        leading={<window.BackAction label={D.MONTHS[month]} onClick={() => nav('month')} />}
        trailing={<IconButton icon="ellipsis" label="更多" />}
      />
      <window.ScreenBody style={{ padding: 'var(--space-5) var(--screen-gutter) 100px' }}>
        {order.length === 0 ? (
          <p style={{ font: 'var(--type-note)', color: 'var(--text-tertiary)', margin: 'var(--space-6) var(--space-2)' }}>這天沒有紀錄</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {order.map((i, pos) => {
              const e = source[i];
              const cat = D.byId[e.cat];
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <EntryCard
                    title={e.title}
                    category={{ name: cat.name, color: cat.color, icon: cat.icon }}
                    subcategory={e.sub}
                    note={e.note}
                    photos={Array.from({ length: e.photos || 0 }, () => ({}))}
                    draggable
                    dragging={dragging === pos}
                    onClick={() => nav('form', { day, month, entry: e })}
                  />
                  <div style={{ position: 'absolute', top: 10, right: 8, display: 'flex', flexDirection: 'column' }}>
                    <IconButton icon="chevron-up" size="small" label="往上移" onClick={(ev) => { ev.stopPropagation(); move(pos, -1); }} />
                    <IconButton icon="chevron-down" size="small" label="往下移" onClick={(ev) => { ev.stopPropagation(); move(pos, 1); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Button variant="ghost" icon="plus" style={{ marginTop: 'var(--space-5)' }} onClick={() => nav('form', { day, month })}>新增紀錄</Button>
      </window.ScreenBody>
      <AddButton onClick={() => nav('form', { day: D.today, month: D.month })} />
    </window.Phone>
  );
}

Object.assign(window, { DayScreen });
