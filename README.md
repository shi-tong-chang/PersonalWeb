# PersonalWeb

中式水墨風格的個人網站：個人介紹 → 專案經歷 → 擅長技能 → 聯繫方式。

以「知行之間」為題，四幕共用宣紙白、青墨與朱砂配色、原創水墨山水、書法題字與印章。琴、棋、書、畫串起涵養、布局、學識與創造力，透過卷軸作品、四藝插圖與月窗山景呈現多面向的個人形象。

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
- `src/components/FourArts.astro`：琴、圍棋、筆硯與畫軸的可重用 SVG 插圖。
- `public/assets/ink-landscape-v1.webp`：原創水墨主視覺，約 205 KB，全站共用。
- `docs/art-direction.md`：美術方向與圖片生成提示詞。
- `src/pages/index.astro`：網站結構。
- `src/scripts/chapters.ts`：滾輪、鍵盤、章節導覽與手機版狀態。

目前只展示本站這一個已知專案。加入更多作品或更長文案時，超出單幕的內容會自動啟用自然捲動，保持可讀。日後可再加入專案選擇器或詳情頁。

## 操作與降級

寬度至少 900px、高度至少 700px、具精確指標與 hover、未開啟減少動態效果，且內容能放入單幕時，使用 Swiper 整幕切換；支援滾輪、上下方向鍵、Page Up / Down、Home / End、導覽連結。章節 hash 可直接分享。

手機、觸控平板、較矮視窗、長內容、減少動態效果與 JavaScript 不可用時，各章節以自然捲動呈現。水墨山水為 AI 生成的 WebP 圖片，其餘插圖、紙紋與卷軸以 SVG/CSS 製作。字體透過 Google Fonts 載入，離線或載入失敗時使用系統字體。減少動態效果會關閉轉場、模糊淡入與懸停動畫。

## GitHub Pages

`main` 推送會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 已設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊個人介紹、真實經歷、技能與公開 Email。
2. 新增專案切換器、圖片與作品詳情頁。
3. 視需要加入文章、中英切換與分享預覽圖。
