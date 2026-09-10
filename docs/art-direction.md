# 知行之間：水墨個人網站

以宣紙、青墨、朱砂與山水留白建立一致的個人視覺。「全能」透過多面向的意象表達，不將尚未提供的琴藝、棋力、書畫能力、職歷或獎項當作事實。

| 章節 | 四藝意象 | 視覺呈現 |
| --- | --- | --- |
| 個人介紹 | 琴：涵養、感知與表達 | 松下琴亭、書法開卷、直排題字 |
| 專案經歷 | 棋：思辨、布局與實踐 | 圍棋圖案、掛軸式作品 |
| 擅長技能 | 書：學習、積累與融會 | 琴棋書畫四張能力主題卡 |
| 聯繫方式 | 畫：創造、留白與可能 | 月窗山水與相逢朱印 |

## 實作原則

- 圖片不包含網站標題；題字使用真正的 HTML 文字，保持可選取與可讀取。
- 題字使用 [LXGW WenKai TC](https://fonts.google.com/specimen/LXGW+WenKai+TC) 繁體文楷，避免繁體字混入不同書體；內文使用 Noto Serif TC。
- 主視覺共用一張約 205 KB 的 WebP，透過不同裁切與濃淡維持一致性。
- 四藝 SVG 使用 `currentColor`，不需額外圖片請求。
- 桌面一幕一章，淡入和輕微模糊形成展卷感；手機保留自然捲動。
- 真實姓名、經歷、技能與聯繫資訊統一在 `src/data/profile.ts` 補寫。

## 圖片資產與生成記錄

- 工具：內建 imagegen（非 CLI）。
- 類型：全新生成的原創水墨背景，未使用其他網站圖片作參考輸入。
- 專案檔案：`public/assets/ink-landscape-v1.webp`。
- 原始輸出：1536 × 1024 PNG；網站使用同尺寸 WebP 編碼。
- 生成後僅進行 WebP 轉碼；頁面以 CSS 適配裁切、透明度與遮罩。

### 完整提示詞

```text
Use case: stylized-concept
Asset type: original panoramic ink-wash artwork for the hero of a Chinese literati personal portfolio website.
Primary request: a refined traditional Chinese shan shui ink-wash painting on warm ivory xuan rice paper, evoking qin, qi, shu, hua and the cultivated breadth of a scholar.
Composition: very wide landscape, approximately 3:2. The leftmost 40 percent is almost entirely pale blank paper and mist, deliberately reserved for live website typography. On the right, layered misty mountains with beautifully varied dry-brush texture, a graceful weathered pine rising on a rocky ledge, below it a tiny open scholar's pavilion and a low table with an understated long seven-string guqin. A narrow river and soft mist dissolve toward the empty left. The dark foreground is concentrated in the lower-right, mountains dissolve into pale gray washes above. Sparse, quiet and exceptionally elegant.
Style: authentic expressive Chinese brush-and-ink painting, refined literati album aesthetic, expressive organic bleeding ink edges and granular wash, delicate rice-paper fibers, warm off-white almost #f3f0e7 with cool charcoal-black and very pale gray-green mountain washes. Subtle natural asymmetry, depth through negative space.
Constraints: only the painting, no website UI, no borders, no typography, no Chinese characters, no red stamps (these will be added accessibly in HTML), no human portraits, no giant people, no neon, no vector-style geometry, no photorealistic scenery, no heavy tan aged stains, no watermark. High quality, restrained and timeless.
```
