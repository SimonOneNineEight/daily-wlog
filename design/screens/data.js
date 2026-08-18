window.WLOG = (function () {
  const categories = [
    { id: 'work', name: '工作', color: 'blue', icon: 'briefcase', subs: ['會議', '專案'] },
    { id: 'sport', name: '運動', color: 'green', icon: 'dumbbell', subs: ['健身房', '游泳', '籃球'] },
    { id: 'food', name: '美食', color: 'ochre', icon: 'utensils', subs: ['下廚', '外食'] },
    { id: 'travel', name: '旅遊', color: 'clay', icon: 'plane', subs: ['週末', '機票'] },
    { id: 'personal', name: '個人', color: 'violet', icon: 'book-open', subs: ['閱讀', '家人', '散步'] },
  ];
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const entries = {
    2: [{ title: '陽明山步道', cat: 'personal', sub: '散步' }],
    4: [{ title: '專案週會', cat: 'work', sub: '會議' }, { title: '熬了一鍋高湯', cat: 'food', sub: '下廚', photos: 2 }],
    5: [{ title: '上健身房', cat: 'sport', sub: '健身房' }],
    7: [{ title: '讀完石黑一雄', cat: 'personal', sub: '閱讀' }],
    9: [{ title: '跟 Amy 喝咖啡', cat: 'personal', photos: 3 }, { title: '練琴一小時', cat: 'personal' }],
    11: [
      { title: '早上游泳', cat: 'sport', sub: '游泳', note: '慢慢游了二十趟。七點前的泳池沒有人。', photos: 3 },
      { title: '專案週會', cat: 'work', sub: '會議', note: '日曆的左右滑動上線了。沒有人問起那些色點，感覺是好事。' },
      { title: '一蘭拉麵', cat: 'food', sub: '外食', photos: 2 },
      { title: '番茄終於紅了', cat: 'personal', photos: 1 },
      { title: '打電話給爸爸', cat: 'personal', sub: '家人' },
    ],
    12: [{ title: '訂了托斯卡尼的機票', cat: 'travel', sub: '機票' }],
    14: [{ title: '跟 Tom 去抱石', cat: 'sport' }, { title: '把無花果換盆', cat: 'personal' }],
    16: [{ title: '慢慢煮一個週日', cat: 'food', sub: '下廚', photos: 4 }],
    17: [{ title: '上班前游泳', cat: 'sport', sub: '游泳' }, { title: '看設計文件', cat: 'work' }],
    19: [{ title: '第四章', cat: 'personal', sub: '閱讀' }],
    21: [{ title: '媽媽來訪', cat: 'personal', sub: '家人', photos: 2 }],
    24: [{ title: '除草兩小時', cat: 'personal' }, { title: '游泳', cat: 'sport', sub: '游泳' }],
    26: [{ title: '練 Satie', cat: 'personal' }],
    27: [{ title: '市場採買', cat: 'food', photos: 3 }],
    29: [{ title: '海岸步道', cat: 'personal', sub: '散步', photos: 2 }],
  };
  const colorsFor = (day) => (entries[day] || []).map((e) => byId[e.cat].color);
  const dotMap = Object.fromEntries(Object.keys(entries).map((d) => [d, colorsFor(Number(d))]));
  const firstColors = Object.fromEntries(Object.keys(entries).map((d) => [d, colorsFor(Number(d))[0]]));
  const yearSeed = (month) => {
    const out = {};
    const pool = categories.map((c) => c.color);
    for (let d = 1; d <= 31; d++) {
      const h = (d * 7 + month * 13) % pool.length;
      if ((d * 3 + month * 5) % 4 !== 0) out[d] = pool[h];
    }
    return out;
  };
  const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
  const dateLabel = (year, month, day) => (month + 1) + '月' + day + '日 ' + WEEKDAYS[new Date(year, month, day).getDay()];
  const dateShort = (year, month, day) => (month + 1) + '月' + day + '日';
  return { categories, byId, entries, dotMap, firstColors, yearSeed, MONTHS, WEEKDAYS, WEEKDAYS_SHORT, dateLabel, dateShort, year: 2026, month: 7, today: 17 };
})();
