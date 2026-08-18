// String-catalog discipline (MVP spec): components never hardcode
// user-facing text; every label lives here, enforced by
// i18next/no-literal-string. zh-TW is the app's primary and only MVP
// language. English later is a second catalog typed as StringCatalog, so the
// compiler enforces its completeness.
const zhTW = {
  signIn: {
    wordmark: 'daily-wlog',
    promise: '每天五分鐘，留下你的生活',
    google: '使用 Google 帳戶登入',
    error: '登入失敗，請再試一次',
  },
  home: {
    signOut: '登出',
  },
  month: {
    title: (month: number) => `${month}月`,
    yearLabel: (year: number) => `${year}年`,
    prevMonth: '上一個月',
    nextMonth: '下一個月',
    emptyDay: '這天沒有紀錄',
    dateLabel: (month: number, day: number, weekday: string) => `${month}月${day}日 ${weekday}`,
    weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'],
    weekdaysFull: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  },
  day: {
    addEntry: '新增紀錄',
    back: '返回',
    empty: '今天還沒有紀錄',
    loadFailed: '無法載入紀錄',
    unreadable: '（無法讀取的紀錄）',
  },
  entryForm: {
    cancel: '取消',
    save: '儲存',
    titlePlaceholder: '標題',
    notePlaceholder: '備註（選填）',
    saveFailed: '儲存失敗，請再試一次',
  },
  health: {
    loading: '連線中…',
    ok: '系統狀態:正常',
    schemaVersion: (version: number) => `資料庫版本:${version}`,
    unreachable: '無法連線到伺服器',
  },
  specimen: {
    title: '設計樣本',
    semanticColors: '語意色',
    categoryPalette: '類別色版',
    typeRoles: '文字樣式',
    dotGeometry: '圓點與年曆方塊',
    typeSample: '週末去河濱公園騎車,傍晚和朋友吃了火鍋',
    dotOverflow: (count: number) => `+${count}`,
    yearBoxNumeral: '8',
  },
} as const;

export type StringCatalog = typeof zhTW;
export const strings: StringCatalog = zhTW;
