# PersonalWeb

個人編輯誌風格的網站：個人介紹 → 專案經歷 → 擅長技能 → 聯繫方式。

四幕共用暖白、墨黑與朱橘配色、幾何 S 識別、字體與格線。以姓名為首頁主角，搭配微動立體識別、作品預覽與簡潔的聯繫入口。

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

- `src/data/profile.ts`：姓名、介紹、所有主要文案、專案、技能、GitHub、Email。顯示姓名目前取自 GitHub 帳號，可改為偏好的姓名。
- `profile.biography` 與 `skills` 的說明、標籤可留空，空值不顯示。現有短句為可替換的版型文案，未填入虛構經歷或技能。
- 設定 `profile.email` 後，自動顯示寄信與複製 Email 功能。請只填願意公開的地址。
- `src/styles/global.css`：全站設計變數、排版、響應式版型與動態效果。
- `src/components/IdentityMark.astro`：可重用的幾何立體 S 識別。
- `src/pages/index.astro`：網站結構。
- `src/scripts/chapters.ts`：滾輪、鍵盤、章節導覽與手機版狀態。
- `src/scripts/identity.ts`：主視覺與作品預覽的滑鼠視角微動。

目前只展示本站這一個已知專案。加入更多作品或更長文案時，超出單幕的內容會自動啟用自然捲動，保持可讀。日後可再加入專案選擇器或詳情頁。

## 操作與降級

寬度至少 900px、高度至少 700px、具精確指標與 hover、未開啟減少動態效果，且內容能放入單幕時，使用 Swiper 整幕切換；支援滾輪、上下方向鍵、Page Up / Down、Home / End、導覽連結。章節 hash 可直接分享。

手機、觸控平板、較矮視窗、長內容、減少動態效果與 JavaScript 不可用時，各章節以自然捲動呈現。插圖以 SVG/CSS 製作。字體透過 Google Fonts 載入，離線或載入失敗時使用系統字體。減少動態效果會關閉持續動畫與視角微動。

## GitHub Pages

`main` 推送會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 已設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊個人介紹、真實經歷、技能與公開 Email。
2. 新增專案切換器、圖片與作品詳情頁。
3. 視需要加入文章、中英切換與分享預覽圖。
