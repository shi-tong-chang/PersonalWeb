# PersonalWeb

Orbital Atlas 個人星圖網站：以深藍星空、淡紫星系與香檳金星軌，串起個人介紹、作品、探索方向與聯繫方式。

星圖版由 `feat/next-iteration` 開發，透過 `main` 發布至[正式網站](https://shi-tong-chang.github.io/PersonalWeb/)。只有 `main` 的推送會觸發正式站部署；功能分支可繼續獨立開發。受目前環境的 `.git` 唯讀限制，分支操作使用可寫入的 Git 副本；工作資料夾中的原 `.git` 資訊不代表發布分支的最新狀態。

最後的水墨版已獨立保存在 [`archive/ink-style`](https://github.com/shi-tong-chang/PersonalWeb/tree/archive/ink-style)，指向 `3c18f34`，包含專案展示與左右懸停滾動。這個保存分支不會覆蓋正式站。

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

## 內容與結構

- `src/data/profile.ts`：姓名、介紹、技能／探索方向、章節文案、GitHub 與 Email。現有短句是可替換的版型文案，不是未提供的經歷或成就。
- `src/data/projects.ts`：10 個可編輯的專案位置，可任意追加；`visible` 控制顯示，依資料順序列出全部作品，不設精選層級。目前 1 件真實作品、9 個明確標示的預留位置。
- `src/pages/index.astro`：首頁 → 完整專案主舞台與索引 → 探索方向 → 聯繫方式。
- `src/components/ProjectGallery.astro`、`src/styles/projects.css`、`src/scripts/projects.ts`：完整作品庫的主舞台、水平選擇列、鍵盤／懸停互動。
- `src/styles/global.css`：全站宇宙色彩、字型、版型、手機裁切、固定章節索引／進度與少量星光動態。
- `src/scripts/chapters.ts`：桌面整頁切換、手勢鎖定、原生捲動降級、錨點焦點、場景退移與可選的 Email 複製。
- `public/assets/orbital-atlas-v1.svg`：原創星系主視覺，1600 × 1000，約 111 KB；首頁與作品卡共用。分享預覽另用 PNG。
- `src/components/StarField.astro`：建置時繪製靜態星空，不需要客戶端粒子迴圈。
- [星圖美術方向](docs/orbital-atlas-art-direction.md)、[專案編輯指南](docs/projects.md)、[歷史夜海美術與生成提示詞](docs/star-sea-art-direction.md)。

`profile.biography` 與 `profile.email` 可留空。設定 Email 後會顯示寄信與複製功能，請只放願意公開的地址。具體技能可填在 `skills` 的標籤與說明。

## 互動與降級

桌面延續水墨版的整頁切換：寬度至少 900px、高度至少 700px、具精確指標與 hover，且未啟用減少動態效果時，每次垂直滾輪手勢切換一個章節。約 650ms 的平滑轉場帶有手勢鎖定，避免觸控板慣性連跳多頁；快速點選導覽則以最後一次目的地為準。頁面保留正常文件結構，不使用 Swiper、WebGL 或動畫框架。

一般桌面尺寸中，專案主舞台和全部作品的水平索引同時呈現在一個章節，不需要先展開。填入長文後，章節會隨內容增高，先讓讀者在章節內捲動；到達上下邊界後，下一次新手勢才切換章節。其餘章節仍維持整頁切換。手機、觸控裝置、較短視窗、減少動態效果或停用 JavaScript 時使用原生連續捲動，不截斷內容。

桌面也支援上下方向鍵與 Page Up / Down 切頁，Home / End 跳至首末章；輸入欄位與專案頁籤的鍵盤操作不受攔截。右側索引與底部章節數／進度同步更新；下一章按鈕在末章改為回到開場，滾輪不循環。首頁星圖輕微退移，姓名與文案保持原生文字；3 個星光點在離屏或背景分頁時暫停。

專案頁採單件主舞台與全部作品索引，不再另外突顯三張精選卡或提供展開開關。左右邊緣懸停可平滑捲動專案列，離開、到達邊界、切換章節或視窗失焦時停止。觸控可直接左右滑動；鍵盤支援 ← / →、Home / End、空白鍵。水平滾輪與 Shift＋滾輪只操作專案列，不觸發章節切換。選取專案同步更新深連結，不捲動整頁、不增加瀏覽歷史；重新整理仍顯示該作品。

快速選取只保留最後一次操作，不堆疊動畫。減少動態效果會停用場景退移、星光、轉場與懸停自動捲動，保留點按和鍵盤操作。JavaScript 不可用時，章節和原生導覽照常可用，所有作品文章直接呈現，無須展開。長文不截斷。

字型使用 Google Fonts 的 DM Serif Display、DM Sans 與 Noto Sans TC；離線或載入失敗時退回系統字型。主視覺、星芒、軌道圖形與框線為原創 SVG／CSS。參考專案僅作色彩和氛圍研究，沒有複製程式或素材。舊水墨與夜海資產及美術文件保留作歷史參考，星圖版沒有引用。

## GitHub Pages

`main` 推送才會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。功能分支推送不會覆蓋正式網站。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊自己的個人介紹、具體技能、經歷與聯繫資訊。
2. 以真實專案取代預留位置，加入封面、技術選擇、成果與程式碼連結。
3. 依需求加入專案詳情頁、創作實驗室、文章或中英切換。
