# 專案展示與編輯指南

編輯 `src/data/projects.ts` 即可更新所有專案；這是靜態網站的資料接口，不是後端 API。先預留 10 個位置，不限制只能顯示 7 個或 10 個。

## 填入下一件作品

將陣列中的 `reserve('02')` 替換成下例，再修改內容。名稱、經歷與成績請填入真實資訊。

```ts
{
  id: 'project-02', // 每件作品唯一且穩定的英數 / 連字號 ID
  name: '你的專案名稱',
  subtitle: '一句話介紹這件作品',
  category: '專案類型',
  year: '2026',
  description: '背景、解決的問題、實作過程或成果。',
  role: '你在專案中的角色',
  tags: ['技術或工具'],
  status: 'published',
  visible: true,
  cover: {
    src: '/assets/your-project.webp',
    alt: '封面圖片的具體說明',
    fit: 'cover',
    position: 'center',
  },
  links: [
    { label: '體驗作品', href: 'https://example.com/' },
    { label: '查看原始碼', href: 'https://github.com/your-name/your-project' },
  ],
},
```

將圖片放在 `public/assets/`。資料中的 `/assets/...` 會自動補上 `/PersonalWeb/`，不用自行填入儲存庫名稱。圖片建議壓成 WebP，橫向比例約 1.85:1；透明背景物件或不宜裁切的截圖可使用 `fit: 'contain'`。沒有 `cover` 時保留原生 SVG / CSS 留白畫面，不顯示破圖。

可保留空字串或空陣列的欄位：`year`、`role`、`tags`、`links`。`description` 可以寫長文，超出一幕時會自動啟用自然捲動。`status: 'reserved'` 會明確顯示預留狀態，並隱藏外部連結。

## 新增、排序與隱藏

- 新增：在 `projects` 陣列後方加入同結構物件。選擇列、總數與鍵盤索引均從資料推導，無需修改元件或腳本。
- 排序：移動陣列項目的順序；畫面序號會自動重新編排。
- 暫時隱藏：將該物件的 `visible` 設成 `false`，或先移除未使用的 `reserve(...)`。
- 只剩一件或沒有溢出：自動隱藏左右捲動控制。
- 全部隱藏：展示留白提示，不初始化不存在的選擇器。

## 互動與效能

- 大圖主舞台只聚焦一件作品。縮圖 hover 不會突然替換正在閱讀的內容。
- 連續快速點擊採最後一次選取，不堆積動畫。切換以短距離平移與透明度完成，沒有持續背景動畫。
- 桌面兩側 hover 使用時間基準 `requestAnimationFrame`，有加速過渡；到邊界、游標離開、切換章節、分頁隱藏或失焦即停止，不使用常駐計時器。
- 觸控保留瀏覽器原生水平捲動；左右按鈕也可點按，不依賴 hover。
- 方向鍵、Home / End、空白鍵可選擇作品；焦點只調整選擇列的水平位置，不將整頁捲走。
- 無 JavaScript 時顯示所有作品文章。開啟減少動態效果時取消自動 hover 和轉場，按鈕仍可用。

展示關係參考[《燕雲十六聲》武器頁](https://www.wherewindsmeetgame.com/hmt/index.html)的單件聚焦與縮圖索引，未複製其武器、美術素材或原站程式。`http://localhost:5173/personal_page/` 在本次開發環境無法連線，兩側懸停捲動依需求描述獨立實作，未聲稱逐項比對該站細節。
