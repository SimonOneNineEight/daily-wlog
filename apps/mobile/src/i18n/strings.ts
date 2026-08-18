// String-catalog discipline (MVP spec): components never hardcode
// user-facing text; every label lives here. zh-TW is the app's primary
// language. Ticket #3 replaces this module with the full i18n foundation.
export const strings = {
  health: {
    loading: '連線中…',
    ok: '系統狀態:正常',
    schemaVersion: (version: number) => `資料庫版本:${version}`,
    unreachable: '無法連線到伺服器',
  },
} as const;
