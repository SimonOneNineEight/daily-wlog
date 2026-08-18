/** Year view: twelve mini months, solid single-color day boxes, tap a month to enter it. */
function YearScreen({ nav }) {
  const { NavBar, MiniMonth, IconButton } = window.DailyWlogDesignSystem_afe7e1;
  const D = window.WLOG;
  return (
    <window.Phone background="var(--surface)">
      <NavBar
        title={D.year + '年'}
        leading={<window.BackAction label={D.MONTHS[D.month]} onClick={() => nav('month')} />}
        trailing={<IconButton icon="calendar" label="今天" onClick={() => nav('month')} />}
      />
      <window.ScreenBody style={{ padding: 'var(--space-6) var(--screen-gutter) 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-7) var(--space-5)' }}>
          {D.MONTHS.map((_, m) => (
            <MiniMonth
              key={m}
              year={D.year}
              month={m}
              label={D.MONTHS[m]}
              today={m === D.month ? D.today : undefined}
              firstColors={m === D.month ? D.firstColors : m < D.month ? D.yearSeed(m) : {}}
              onClick={() => nav('month')}
            />
          ))}
        </div>
      </window.ScreenBody>
    </window.Phone>
  );
}

Object.assign(window, { YearScreen });
