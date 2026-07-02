# 台股全市場研究平台

正式網站：<https://claw.terry878.org/>

## 部署架構

- GitHub 儲存原始碼，GitHub Pages 僅發布不含密鑰的靜態入口頁。
- Cloudflare Worker 提供 SSR、公開 API、登入與管理 API。
- Cloudflare D1 保存市場資料、分類與使用者交易帳本。
- `.dev.vars`、Cloudflare secrets 與任何管理權杖不得提交 Git。

## API 防護

- 公開 API：每個 IP 每分鐘 180 次。
- 高成本 API：每個 IP 每分鐘 30 次。
- 登入及寫入 API：每個 IP 每分鐘 20 次。
- 管理 API：每個 IP 每分鐘 12 次，並強制 Bearer secret。
- 管理 API 僅允許正式自訂網域與本機測試，不在 `workers.dev` 網域公開。
- 一般寫入請求上限 64 KiB，管理匯入上限 6 MB。
- 熱門唯讀 API 使用 Cloudflare 邊緣快取，降低 D1 與 Worker CPU 負擔。

## 驗證

```powershell
node --check src/index.js
node --check public/sw.js
node --test test/integration.test.mjs
node --test test/security.test.mjs test/taxonomy.test.mjs
```
