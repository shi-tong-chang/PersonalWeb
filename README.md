# PersonalWeb

星海敘事系個人網站：安靜的深藍夜海開場，往下接清楚可讀的專案、探索方向與聯繫方式。

目前工作分支是 `feat/project-showcase`。星海版尚未合併至 `main`；[正式網站](https://shi-tong-chang.github.io/PersonalWeb/) 在 main 部署前仍可能是先前的水墨版。

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
- `src/data/projects.ts`：10 個可編輯的專案位置，可任意追加；`visible` 控制顯示，`featured` 控制首頁精選（取前 3 件）。目前 1 件真實作品、9 個明確標示的預留位置。
- `src/pages/index.astro`：首頁 → 3 件精選 → 可展開作品庫 → 探索方向 → 聯繫方式。
- `src/components/ProjectGallery.astro`、`src/styles/projects.css`、`src/scripts/projects.ts`：完整作品庫的主舞台、水平選擇列、鍵盤／懸停互動。
- `src/styles/global.css`：全站色彩、字型、版型、手機裁切與少量星光動態。
- `src/scripts/chapters.ts`：原生錨點焦點、導覽狀態、事件驅動的場景退移與可選的 Email 複製。
- `public/assets/star-sea-v1.webp`：原創夜海主視覺，1672 × 941，約 97 KB；首頁、作品卡與頁尾共用。
- [美術與完整生成提示詞](docs/star-sea-art-direction.md)、[專案編輯指南](docs/projects.md)。

`profile.biography` 與 `profile.email` 可留空。設定 Email 後會顯示寄信與複製功能，請只放願意公開的地址。具體技能可填在 `skills` 的標籤與說明。

## 互動與降級

所有裝置皆為原生連續捲動，不攔截垂直滾輪、不強制整幕切頁。首頁插畫隨捲動略微退移淡出，姓名與文案保持原生文字；只有 3 個微小星光點持續淡明，離屏或背景分頁時暫停。不使用 WebGL 或動畫框架。

首頁精選卡開啟完整作品庫並選中對應作品；完整作品庫以原生 `details` 控制展開。左右邊緣懸停可平滑捲動專案列，離開、到達邊界、關閉作品庫或視窗失焦時停止。觸控可直接左右滑動；鍵盤支援 ← / →、Home / End、空白鍵。水平滾輪與 Shift＋滾輪只操作專案列，普通垂直滾輪保持頁面捲動。

快速選取只保留最後一次操作，不堆疊動畫。減少動態效果會停用場景退移、星光、轉場與懸停自動捲動，保留點按和鍵盤操作。JavaScript 不可用時，章節和原生導覽照常可用，手動展開作品庫後能閱讀全部作品。長文不截斷。

字型使用 Google Fonts 的 DM Sans 與 Noto Sans TC；離線或載入失敗時退回系統字型。主視覺為內建 imagegen 生成，其餘星芒、軌道圖形與框線為 SVG／CSS。舊水墨資產與美術文件保留作歷史參考，星海版沒有引用。

## GitHub Pages

`main` 推送才會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。功能分支推送不會覆蓋正式網站。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊自己的個人介紹、具體技能、經歷與聯繫資訊。
2. 以真實專案取代預留位置，加入封面、技術選擇、成果與程式碼連結。
3. 依需求加入專案詳情頁、創作實驗室、文章或中英切換。
