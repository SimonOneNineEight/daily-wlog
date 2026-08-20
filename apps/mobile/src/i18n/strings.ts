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
    devLogin: '以測試帳號登入（開發用）',
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
    reorderFailed: '排序失敗，請再試一次',
    unreadable: '（無法讀取的紀錄）',
  },
  photos: {
    addPhoto: '新增照片',
    takePhoto: '拍照',
    fromLibrary: '從相簿選擇',
    removeConfirmTitle: '移除這張照片？',
    remove: '移除',
    uploadFailed: '照片上傳失敗，稍後可在編輯這筆紀錄時重新加入',
  },
  entryForm: {
    cancel: '取消',
    save: '儲存',
    editTitle: '紀錄',
    delete: '刪除紀錄',
    deleteConfirmTitle: '刪除這筆紀錄？',
    deleteConfirm: '刪除',
    categoryPlaceholder: '類別',
    createRow: (name: string) => `建立「${name}」`,
    confirmCreate: '建立類別',
    createBack: '返回',
    addSubcategory: '新增子類別',
    subcategoryPlaceholder: '子類別',
    confirmSubcategory: '建立',
    titlePlaceholder: '標題',
    notePlaceholder: '備註（選填）',
    saveFailed: '儲存失敗，請再試一次',
  },
  categories: {
    title: '類別',
    add: '新增類別',
    editTitle: '編輯類別',
    save: '儲存',
    // The color drawer's confirm.
    done: '完成',
    namePlaceholder: '名稱',
    // Canvas parent section: the collapsible 上層分類 row and its hints.
    parentHeader: '上層分類（選填）',
    noParent: '無',
    parentHintTop: '獨立類別',
    parentHintSub: '子類別',
    inheritHint: '子類別沿用上層分類的圖示與顏色。',
    colorHeader: '顏色',
    iconHeader: '圖示',
    subcategoriesHeader: '子類別',
    addSubcategory: '新增子類別',
    deleteCategory: '刪除類別',
    deleteConfirmTitle: (name: string) => `刪除「${name}」？`,
    // The designed lifecycle copy (issue #10 AC).
    inUseExplanation: '已有紀錄使用這個類別。重新命名會一併帶著走，因此不提供刪除。',
    // Derived copy: the canvas specifies only the in-use case.
    hasChildrenExplanation: '請先刪除底下的子類別。',
    saveFailed: '儲存失敗，請再試一次',
  },
  filter: {
    title: '篩選',
    open: '篩選',
    clearAll: '全部清除',
    done: '完成',
    expand: '展開子類別',
    collapse: '收合子類別',
  },
  year: {
    title: (year: number) => `${year}年`,
    monthLabel: (month: number) => `${month}月`,
    countLabel: (count: number) => `今年到目前為止 ${count} 則紀錄`,
    // Derived copy: the canvas labels only the current year.
    totalLabel: (count: number) => `共 ${count} 則紀錄`,
    prevYear: '上一年',
    nextYear: '下一年',
    open: '年',
    today: '今天',
  },
  colorDrawer: {
    custom: '自訂顏色',
    // Canvas labels.
    saved: '已存的顏色',
    previewTitle: '在月曆上的樣子',
    sideBySide: '與現有類別並排',
    // Accessibility-only labels for the area and hue strip.
    hue: '色相',
    areaLabel: '飽和度與亮度',
    lighter: '增加亮度',
    darker: '減少亮度',
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
    yearBoxNumeral: '8',
  },
} as const;

export type StringCatalog = typeof zhTW;
export const strings: StringCatalog = zhTW;
