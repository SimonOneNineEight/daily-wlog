/** Entry form: category first, short title, optional note, photo grid up to 10. */
function EntryFormScreen({ nav, day, month, entry }) {
  const { NavBar, Button, TextField, CategoryPicker, CategoryIcon, PhotoGrid, ColorPresetPicker, Icon } = window.DailyWlogDesignSystem_afe7e1;
  const D = window.WLOG;
  const [categories, setCategories] = React.useState(D.categories);
  const initial = entry ? D.byId[entry.cat] : null;
  const [category, setCategory] = React.useState(initial);
  const [title, setTitle] = React.useState(entry ? entry.title : '');
  const [note, setNote] = React.useState(entry && entry.note ? entry.note : '');
  const [photos, setPhotos] = React.useState(Array.from({ length: (entry && entry.photos) || 0 }, () => ({})));
  const [creating, setCreating] = React.useState(null);
  const [newColor, setNewColor] = React.useState('sage');

  const create = (name) => setCreating({ name });
  const confirmCreate = () => {
    const cat = { id: creating.name.toLowerCase(), name: creating.name, color: newColor, icon: 'tag', subs: [] };
    setCategories((c) => [...c, cat]);
    setCategory(cat);
    setCreating(null);
  };

  return (
    <window.Phone>
      <NavBar
        title={entry ? '紀錄' : '新增紀錄'}
        subtitle={D.dateLabel(D.year, month, day)}
        leading={<Button variant="ghost" size="small" onClick={() => nav('back')}>取消</Button>}
        trailing={<Button variant="primary" size="small" disabled={!category || !title.trim()} onClick={() => nav('back')}>儲存</Button>}
      />
      <window.ScreenBody style={{ padding: 'var(--space-6) var(--screen-gutter) 40px' }}>
        {creating ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
              <CategoryIcon icon="tag" color={newColor} size="large" />
              <span style={{ font: 'var(--type-entry-title)', color: 'var(--text-primary)' }}>{creating.name}</span>
            </div>
            <ColorPresetPicker value={newColor} onChange={setNewColor} onCustom={() => {}} />
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Button variant="primary" onClick={confirmCreate}>建立類別</Button>
              <Button variant="ghost" onClick={() => setCreating(null)}>返回</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {category ? (
              <button type="button" onClick={() => setCategory(null)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', background: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-card)', padding: 'var(--space-5) var(--card-padding)', cursor: 'pointer', textAlign: 'left' }}>
                <CategoryIcon icon={category.icon} color={category.color} />
                <span style={{ flex: 1, font: 'var(--type-entry-title)', color: 'var(--text-primary)' }}>{category.name}</span>
                <Icon name="chevron-down" size={17} color="var(--text-quaternary)" strokeWidth={2} />
              </button>
            ) : (
              <CategoryPicker categories={categories} value={category} onChange={setCategory} onCreate={create} />
            )}
            {category ? (
              <React.Fragment>
                <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="標題" autoFocus maxLength={40} />
                <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註（選填）" multiline rows={5} />
                <PhotoGrid photos={photos} editable columns={4} onAdd={() => setPhotos((p) => [...p, {}])} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} />
              </React.Fragment>
            ) : null}
          </div>
        )}
      </window.ScreenBody>
    </window.Phone>
  );
}

Object.assign(window, { EntryFormScreen });
