/** Category management: two-level list, colored icon editing, rename;
    delete only offered when a category is unused. */
function CategoriesScreen({ nav }) {
  const { NavBar, ListRow, CategoryIcon, Button, TextField, ColorPresetPicker, IconButton, Icon } = window.DailyWlogDesignSystem_afe7e1;
  const D = window.WLOG;
  const [cats, setCats] = React.useState(D.categories);
  const [open, setOpen] = React.useState(null);
  const used = (id) => Object.values(D.entries).some((day) => day.some((e) => e.cat === id));
  const editing = cats.find((c) => c.id === open);

  if (editing) {
    const inUse = used(editing.id);
    return (
      <window.Phone>
        <NavBar
          title={editing.name}
          leading={<window.BackAction label="類別" onClick={() => setOpen(null)} />}
          trailing={<Button variant="ghost" size="small" onClick={() => setOpen(null)}>完成</Button>}
        />
        <window.ScreenBody style={{ padding: 'var(--space-6) var(--screen-gutter) 40px', display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <CategoryIcon icon={editing.icon} color={editing.color} size="large" filled />
            <TextField value={editing.name} onChange={(e) => setCats((c) => c.map((x) => (x.id === editing.id ? { ...x, name: e.target.value } : x)))} style={{ flex: 1 }} />
          </div>
          <ColorPresetPicker value={editing.color} onChange={(color) => setCats((c) => c.map((x) => (x.id === editing.id ? { ...x, color } : x)))} onCustom={() => {}} />
          <div>
            <p style={{ font: 'var(--type-meta)', color: 'var(--text-tertiary)', margin: '0 0 var(--space-4) var(--space-2)' }}>子類別</p>
            <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              {editing.subs.map((s, i) => (
                <ListRow key={s} first={i === 0} last={false} title={s} trailing={<Icon name="pencil" size={16} color="var(--text-quaternary)" />} />
              ))}
              <ListRow last title="新增子類別" leading={<Icon name="plus" size={17} color="var(--icon-default)" />} />
            </div>
          </div>
          {inUse ? (
            <p style={{ font: 'var(--type-meta)', color: 'var(--text-tertiary)', margin: '0 var(--space-2)' }}>
              已有紀錄使用這個類別。重新命名會一併帶著走，因此不提供刪除。
            </p>
          ) : (
            <Button variant="destructive" icon="trash-2" onClick={() => { setCats((c) => c.filter((x) => x.id !== editing.id)); setOpen(null); }}>刪除類別</Button>
          )}
        </window.ScreenBody>
      </window.Phone>
    );
  }

  return (
    <window.Phone>
      <NavBar
        large
        title="類別"
        leading={<window.BackAction label="" onClick={() => nav('month')} />}
        trailing={<IconButton icon="plus" label="新增類別" />}
      />
      <window.ScreenBody style={{ padding: 'var(--space-5) var(--screen-gutter) 40px' }}>
        <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          {cats.map((c, i) => (
            <ListRow
              key={c.id}
              first={i === 0}
              last={i === cats.length - 1}
              leading={<CategoryIcon icon={c.icon} color={c.color} size="small" />}
              title={c.name}
              subtitle={c.subs.length ? c.subs.join('、') : undefined}
              chevron
              onClick={() => setOpen(c.id)}
            />
          ))}
        </div>
      </window.ScreenBody>
    </window.Phone>
  );
}

Object.assign(window, { CategoriesScreen });
