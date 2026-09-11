# PersonalWeb

Orbital Atlas 個人星圖網站：以深藍星空、淡紫星系與香檳金星軌，串起個人介紹、作品、探索方向、大事記與聯繫方式。

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

- `src/data/profile.ts`：姓名、介紹、照片設定、技能／探索方向、章節文案、GitHub 與 Email。現有短句是可替換的版型文案，不是未提供的經歷或成就。
- `src/data/projects.ts`：10 個可編輯的專案位置，可任意追加；`visible` 控制顯示，依資料順序列出全部作品，不設精選層級。目前前兩件依序為 ComfyBlend、PersonalWeb，另有 8 個明確標示的預留位置。
- `src/data/timeline.ts`：大事記的日期、事件與說明，先預留 4 筆，可任意追加；沒有代填真實經歷。
- `src/pages/index.astro`：首頁 → 完整專案主舞台與索引 → 探索方向 → 大事記 → 聯繫方式。
- `src/components/Portrait.astro`、`src/styles/portrait.css`、`src/scripts/portraits.ts`：首頁動態水晶球、原照片與輪廓遮罩、固定比例及載入失敗備援。
- `src/components/HeroName.astro`、`src/styles/hero-name.css`：首頁上中文、下英文的雙語藝術署名，保留可選取文字與字型載入失敗時的襯線字備援。
- `src/components/SiteHeader.astro`、`src/components/ChapterGlyph.astro`、`src/styles/header.css`：五款星圖導覽符號、選取與懸停狀態、手機雙排導覽和持續可用的 GitHub 圖標入口；沿用既有 `aria-current` 與錨點，不新增動畫套件。
- `src/components/Timeline.astro`、`src/styles/timeline.css`：有序大事記、星軌節點、手機單欄與長文閱讀。
- `src/components/ProjectGallery.astro`、`src/styles/projects.css`、`src/scripts/projects.ts`：完整作品庫的主舞台、水平選擇列、鍵盤／懸停互動。
- `src/styles/global.css`：全站宇宙色彩、字型、版型、手機裁切、固定章節索引／進度與少量星光動態。
- `src/scripts/chapters.ts`：桌面整頁切換、手勢鎖定、原生捲動降級、錨點焦點、場景退移與可選的 Email 複製。
- `src/scripts/motion.ts`、`src/styles/motion.css`：五章共用的錯開進場與可見章節裝飾動畫，不加入動畫框架。
- `public/assets/milky-way-v1.webp`：首頁星河夜空，不使用外部視角的旋渦星系。
- `public/assets/portrait-crystal-v1.webp`、`public/assets/portrait-mask-v1.webp`：使用者原照片的無損 WebP 與獨立輪廓遮罩，人物五官不使用生成版本。
- `public/assets/orbital-atlas-v1.svg`：保留於 PersonalWeb 作品卡的原創星系視覺；分享預覽另用 PNG，不再作為首頁背景。
- `src/components/StarField.astro`：建置時繪製靜態星空，不需要客戶端粒子迴圈。
- `src/components/ChapterScene.astro`、`src/styles/scenes.css`：專案星環、技能星雲、大事記星軌與聯繫夜海，讓每章有不同的完整場景；共用局部文字遮罩與輕量景深進場。
- [五章換景、美術素材與生成提示詞](docs/chapter-scenes-art-direction.md)：四張原創背景存於 `public/assets/scene-*-v1.webp`，首頁星河與人物照片維持原樣。
- [水晶球與星河素材／提示詞](docs/crystal-milky-way-art-direction.md)、[星圖美術方向](docs/orbital-atlas-art-direction.md)、[專案編輯指南](docs/projects.md)、[大事記編輯指南](docs/timeline.md)、[歷史夜海美術與生成提示詞](docs/star-sea-art-direction.md)。

`profile.biography` 與 `profile.email` 可留空。設定 Email 後會顯示寄信與複製功能，請只放願意公開的地址。具體技能可填在 `skills` 的標籤與說明。

首頁中文姓名使用 `profile.chineseName`，請填入本人確認的正確中文字；留空時只顯示英文，不會從拼音推測或放入假姓名。下排英文沿用 `profile.displayName.join(' ')`。中文使用 [Noto Serif TC](https://fonts.google.com/specimen/Noto+Serif+TC)，英文使用 [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond)，搭配靜態月光漸層與星芒分隔線；導覽列、其他章節與既有切頁功能不變。

導覽名稱集中在 `chapters`：個人介紹、專案經歷、擅長技能、特殊成就、與我聯繫。「特殊成就」目前沿用原時間線內容預留與 `#timeline` 錨點，沒有新增未提供的獎項或資歷；`#contact` 也保持相容。五款導覽符號為原創 SVG；GitHub 標記使用 [官方 Octicons](https://github.com/primer/octicons/blob/main/icons/mark-github-16.svg)，MIT 授權隨網站發布於 `public/licenses/octicons.txt`。

主要內文統一以 16px 為基準，標題、按鈕與標籤依層級放大；頂部導覽為桌機 15px、窄桌機 14px、手機 12px（最窄尺寸 11px），維持視窗置中。專案圖片下方的裝飾資訊列與各章額外的預留提示／標語已移除，作品瀏覽計數與真實內容的待填標示不受影響。小螢幕以間距與自然換行調整，不裁切內文。

## 放入照片與大事記

首頁右側使用圓形水晶球包圍人物，手機會排在介紹下方。現有照片已放入；之後若更換照片，將新檔放進 `public/assets/portrait.webp`，再修改 `src/data/profile.ts`：

```ts
portrait: {
  src: '/assets/portrait.webp',
  mask: '', // 更換照片時先清空；現有輪廓遮罩只對齊目前這張照片
  alt: '你的個人照片描述',
  position: 'center',
},
```

不需在 `src` 或 `mask` 手動加入 `/PersonalWeb/`。水晶球比例為 1:1，內部照片保持 2:3 比例；建議使用保留完整頭部的直式人像。`mask` 是黑底白色人物輪廓的亮度遮罩，不改動原照片，可留空改用柔邊呈現。`src: ''` 會維持預留插畫，不送出空圖片請求；圖片載入失敗時回到預留畫面，版面不跳動。請只放願意公開的照片，並移除不想公開的照片資訊；這是靜態內容設定，不是訪客上傳功能。

大事記位於技能與聯繫方式之間。編輯 `src/data/timeline.ts` 的 `timelineEvents`，依想呈現的順序填入日期、標題和說明；沒有筆數限制。日期未確認時可保留「日期待填」，不要填入推測的日期。詳見[大事記編輯指南](docs/timeline.md)。

## 互動與降級

桌面延續水墨版的整頁切換：寬度至少 900px、高度至少 700px、具精確指標與 hover，且未啟用減少動態效果時，每次垂直滾輪手勢切換一個章節。約 650ms 的平滑轉場帶有手勢鎖定，避免觸控板慣性連跳多頁；快速點選導覽則以最後一次目的地為準。頁面保留正常文件結構，不使用 Swiper、WebGL 或動畫框架。

一般桌面尺寸中，專案主舞台和全部作品的水平索引同時呈現在一個章節，不需要先展開。填入長文後，章節會隨內容增高，先讓讀者在章節內捲動；到達上下邊界後，下一次新手勢才切換章節。其餘章節仍維持整頁切換。手機、觸控裝置、較短視窗、減少動態效果或停用 JavaScript 時使用原生連續捲動，不截斷內容。

五個章節共用短距離位移與透明度的錯開進場。專案頁的文字從左、圖片從右滑入；專案選擇列與頁尾使用 `data-reveal="fade"` 純淡入，避免焦點或按下滑鼠時結束動畫造成控制項位移、捲動或漏接點擊。星河薄霧、水晶球內外的流光／折射／浮動、技能軌道和聯繫訊號只在可見章節中保留輕微裝飾動態；離屏或背景分頁暫停，快速切換不排隊。內容預設為可見，不會因 JavaScript 失效而整頁空白。系統「減少動態效果」可即時停用進場與裝飾動畫，保留所有文字、連結與閱讀操作。

桌面也支援上下方向鍵與 Page Up / Down 切頁，Home / End 跳至首末章；輸入欄位與專案頁籤的鍵盤操作不受攔截。右側索引與底部章節數／進度同步更新；下一章按鈕在末章改為回到開場，滾輪不循環。首頁星圖輕微退移，姓名與文案保持原生文字；3 個星光點在離屏或背景分頁時暫停。

專案頁採單件主舞台與全部作品索引，不再另外突顯三張精選卡或提供展開開關。左右邊緣懸停可平滑捲動專案列，離開、到達邊界、切換章節或視窗失焦時停止。觸控可直接左右滑動；鍵盤支援 ← / →、Home / End、空白鍵。水平滾輪與 Shift＋滾輪只操作專案列，不觸發章節切換。選取專案同步更新深連結，不捲動整頁、不增加瀏覽歷史；重新整理仍顯示該作品。

快速選取只保留最後一次操作，不堆疊動畫。減少動態效果會停用場景退移、星光、轉場與懸停自動捲動，保留點按和鍵盤操作。JavaScript 不可用時，章節和原生導覽照常可用，所有作品文章直接呈現，無須展開。長文不截斷。

字型使用 Google Fonts 的 DM Serif Display、DM Sans 與 Noto Sans TC；離線或載入失敗時退回系統字型。首頁星河與人物輪廓遮罩使用內建 imagegen 生成，照片來自使用者原檔；水晶球、星芒、軌道與框線使用 SVG／CSS。參考專案僅作色彩和氛圍研究，沒有複製程式或素材。舊水墨與夜海資產及美術文件保留作歷史參考，不作為現行首頁主視覺。

## GitHub Pages

`main` 推送才會觸發 `.github/workflows/deploy.yml`：安裝套件、型別檢查、建置、瀏覽器測試及部署。功能分支推送不會覆蓋正式網站。儲存庫 Settings → Pages → Source 使用 **GitHub Actions**。

`astro.config.mjs` 設定 `site: https://shi-tong-chang.github.io` 與 `base: /PersonalWeb`。更換儲存庫名稱或網域時須同步修改。

## 後續擴充

1. 補齊個人介紹、具體技能、大事記與聯繫資訊。
2. 以真實專案取代預留位置，加入封面、技術選擇、成果與程式碼連結。
3. 依需求加入專案詳情頁、創作實驗室、文章或中英切換。
