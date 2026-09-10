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

- `src/data/profile.ts`：姓名、介紹、章節文案、技能、GitHub、Email。顯示姓名目前取自 GitHub 帳號，可改為偏好的姓名。
- `src/data/projects.ts`：10 個專案資料位置與 `Project` 型別；可繼續追加，沒有數量上限。
- `profile.biography` 與 `skills` 的說明、標籤可留空，空值不顯示。現有短句為可替換的版型文案，未填入虛構經歷或技能。
- 設定 `profile.email` 後，自動顯示寄信與複製 Email 功能。請只填願意公開的地址。
- `src/styles/global.css`：全站設計變數、排版、響應式版型與動態效果。
- `src/components/FourArts.astro`：琴、圍棋、筆硯與畫軸的可重用 SVG 插圖。
- `src/components/ProjectGallery.astro`：專案主舞台、縮圖列及無 JavaScript 降級版。
- `src/styles/projects.css`、`src/scripts/projects.ts`：專案展示的響應式版型、切換動畫、懸停捲動及鍵盤操作。
- `public/assets/ink-landscape-v1.webp`：原創水墨主視覺，約 205 KB，全站共用。
- `docs/art-direction.md`：美術方向與圖片生成提示詞。
- `src/pages/index.astro`：網站結構。
- `src/scripts/chapters.ts`：滾輪、鍵盤、章節導覽與手機版狀態。

目前有 1 件真實作品（PersonalWeb）和 9 個明確標示的預留席位。預留項目不會產生虛構的經歷或可點擊的假連結。新增方式與各欄位請見 [專案編輯指南](docs/projects.md)。

專案採「左側介紹、右側主視覺、底部縮圖列」；手機將縮圖列提前，切換後可直接向下閱讀。點選才切換主舞台，懸停只高亮選項；滑鼠移入兩側箭頭則平滑捲動整列，離開、切換章節或視窗失焦立即停止。觸控可原生左右滑動，也能點按兩側箭頭。支援 ← / →、Home / End 和空白鍵選取，橫向或 Shift 滾輪只操作專案列，普通垂直滾輪仍切換網站章節。

各面板保留一致舞台高度，快速選擇只保留最後一次操作，不排隊播放動畫；使用 transform / opacity，沒有額外動畫框架。長文案仍會自動啟用整頁自然捲動，不截斷內容。減少動態效果時停用懸停自動捲動與切換動畫，但保留明確點按。JavaScript 不可用時，全部作品自然排列，選擇列保留錨點連結。

## 操作與降級

寬度至少 900px、高度至少 700px、具精確指標與 hover、未開啟減少動態效果，且內容能放入單幕時，使用 Swiper 整幕切換；支援滾輪、上下方向鍵、Page Up / Down、Home / End、導覽連結。章節 hash 可直接分享。

手機、觸控平板、較矮視窗、長內容、減少動態效果與 JavaScript 不可用時，各章節以自然捲動呈現。水墨山水為 AI 生成的 WebP 圖片，其餘插圖、紙紋與卷軸以 SVG/CSS 製作。字體透過 Google Fonts 載入，離線或載入失敗時使用系統字體。減少動態效果會關閉轉場、模糊淡入與懸停動畫。

## GitHub Pages

`main` 推送會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 已設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊個人介紹、真實經歷、技能與公開 Email。
2. 替換預留專案、加入真實封面與作品詳情連結。
3. 視需要加入文章、中英切換與分享預覽圖。
