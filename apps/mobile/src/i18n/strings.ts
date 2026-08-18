// String-catalog discipline (MVP spec): components never hardcode
// user-facing text; every label lives here, enforced by
// i18next/no-literal-string. zh-TW is the app's primary and only MVP
// language. English later is a second catalog typed as StringCatalog, so the
// compiler enforces its completeness.
const zhTW = {
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
