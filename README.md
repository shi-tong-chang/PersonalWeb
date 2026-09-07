# PersonalWeb

現代風個人網站 MVP：個人介紹 → 專案經歷 → 擅長技能 → 聯繫方式。

網站：https://shi-tong-chang.github.io/PersonalWeb/

## 開發

需要 Node.js 24 與 npm。

```sh
npm ci
npm run dev
```

開啟終端機顯示的 `/PersonalWeb/` 網址。

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

## 修改內容

- `src/data/profile.ts`：姓名、介紹、專案、技能、GitHub、Email。尚未提供的經歷與技能明確標記為待補。
- 設定 `profile.email` 後，自動顯示寄信與複製 Email 功能。請只填願意公開的地址。
- `src/styles/global.css`：四幕配色、排版與動態效果。
- `src/pages/index.astro`：網站結構。
- `src/scripts/chapters.ts`：滾輪、鍵盤、章節導覽與手機版狀態。

MVP 只展示本站這一個已知專案。加入更多專案後會產生更多作品區塊；若內容超出桌面一幕，需同步改為專案選擇器或詳情頁，避免超出固定高度。

## 操作與降級

桌面寬度至少 900px、高度至少 700px 且未開啟減少動態效果時，使用 Swiper 整幕切換；支援滾輪、上下方向鍵、Page Up / Down、Home / End、導覽連結。章節 hash 可直接分享。

手機、較矮視窗、減少動態效果與 JavaScript 不可用時，各章節以自然捲動呈現。插圖以 SVG/CSS 製作，沒有引用遊戲素材。字體透過 Google Fonts 載入，離線或載入失敗時使用系統字體。

## GitHub Pages

`main` 推送會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 已設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊個人介紹、真實經歷、技能與公開 Email。
2. 新增專案切換器、圖片與作品詳情頁。
3. 視需要加入文章、中英切換與分享預覽圖。
