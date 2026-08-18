/** Landing screen: month grid, selected-day panel, persistent + for today. */
function MonthScreen({ nav }) {
  const { NavBar, IconButton, MonthGrid, DayPanel, AddButton } = window.DailyWlogDesignSystem_afe7e1;
  const D = window.WLOG;
  const [month, setMonth] = React.useState(D.month);
  const [selected, setSelected] = React.useState(11);
  const isCurrent = month === D.month;
  const dots = isCurrent ? D.dotMap : {};
  const panelEntries = (isCurrent ? D.entries[selected] || [] : []).map((e, i) => ({
    id: i, title: e.title, color: D.byId[e.cat].color, icon: D.byId[e.cat].icon, photos: Boolean(e.photos),
  }));
  return (
    <window.Phone>
      <NavBar
        large
        title={D.MONTHS[month]}
        subtitle={D.year + '年'}
        bordered={false}
        trailing={
          <React.Fragment>
            <IconButton icon="chevron-left" label="上一個月" onClick={() => setMonth((m) => (m + 11) % 12)} />
            <IconButton icon="chevron-right" label="下一個月" onClick={() => setMonth((m) => (m + 1) % 12)} />
            <IconButton icon="list" label="年" onClick={() => nav('year')} />
          </React.Fragment>
        }
      />
      <window.ScreenBody>
        <MonthGrid
          year={D.year}
          month={month}
          entries={dots}
          today={isCurrent ? D.today : undefined}
          selected={selected}
          onSelectDay={setSelected}
          style={{ background: 'transparent' }}
        />
        <div style={{ padding: 'var(--panel-gap) var(--screen-gutter) 0' }}>
          <DayPanel
            dateLabel={D.dateLabel(D.year, month, selected)}
            entries={panelEntries}
            onOpenDay={() => nav('day', { day: selected, month })}
            onOpenEntry={() => nav('day', { day: selected, month })}
          />
        </div>
      </window.ScreenBody>
      <AddButton onClick={() => nav('form', { day: D.today, month: D.month })} />
    </window.Phone>
  );
}

Object.assign(window, { MonthScreen });
