# 水晶球人像與星河首頁

## 視覺與互動

首頁用從夜空內部望見的星河長帶，取代從外部觀看的旋渦星系。左側留給作者姓名與介紹，右側用具有厚度感的水晶球呈現使用者照片。水晶球後景為深藍、淡紫霧光；曲面反光、折射邊緣及少量漂浮由 CSS 動畫構成，不把動態效果烘焙進圖片，也不加入 WebGL 或動畫套件。人物臉部不隨霧氣動畫改變透明度。

動畫只使用 transform／opacity；離開章節、切換到背景分頁或啟用減少動態效果時暫停。無 JavaScript 仍可看到照片與靜態玻璃球，圖片載入失敗回到照片預留狀態。

## 最終素材與來源

| 檔案 | 尺寸 | 用途／來源 |
| --- | --- | --- |
| `public/assets/milky-way-v1.webp` | 1672 × 941 | 內建 imagegen 新生成星河背景，WebP 壓縮 |
| `public/assets/portrait-crystal-v1.webp` | 1024 × 1536 | 使用者所附 `3465c370-e43e-46b4-8459-47eb90f14702.png` 的無損 WebP，不使用生成的人像 |
| `public/assets/portrait-mask-v1.webp` | 1024 × 1536 | 內建 imagegen 依原照片生成的黑白輪廓，CSS luminance mask；無損 WebP |

使用 imagegen 技能的內建工具模式，沒有 CLI/API 備援。最初嘗試的透明去背產物沒有有效 alpha，且並非原照片像素，因此捨棄、不放入網站。最終照片使用原檔，僅以獨立輪廓遮罩控制周圍背景；WebP 保留原照片所有可見 RGBA 像素（完全透明像素的無效 RGB 可能由編碼器正規化）。原始桌面照片與生成原檔均未覆寫。

遮罩只對齊目前這張照片。更換照片時清空 `profile.portrait.mask`，或同時換成與新照片尺寸及人物位置一致的遮罩。網站使用 `/PersonalWeb/` base 前綴，設定內容不用自行加上此前綴。

## 最終生成提示詞

### 星河背景

```text
Use case: photorealistic-natural.
Asset type: full-bleed background image for the opening chapter of a sophisticated personal portfolio.
Primary request: a real-looking Milky Way STAR RIVER seen from INSIDE the galaxy, stretching across a deep night sky, emphatically NOT an outside view of a spiral galaxy.
Composition/framing: wide landscape 16:9. A broad, diffuse irregular river of countless tiny stars and delicate interstellar dust stretches diagonally from the lower-middle to the upper-right and continues beyond the image edges. Keep the leftmost 45 percent quite dark and visually quiet for large live website typography. Right side has more fine celestial detail, leaving enough dark depth for a portrait overlay.
Lighting/mood: cinematic, quiet, spacious and mysterious, subtle natural luminance. Deep midnight navy-black, desaturated indigo and restrained smoky lavender, silver-white pinprick stars. Detailed uneven dust lanes and soft volumetric wisps, tasteful astrophotography with extremely fine grain.
Constraints: stars and interstellar clouds only; no ground, no horizon, no people, no planets, no rings, no radial arms, no glowing galactic central disk, no spiral, no vortex, no tunnel, no chart lines, no UI, no letters, no logos, no watermark. Not overly bright or saturated. Render a finished high-quality photographic sky asset, not a website mockup.
```

### 原照片輪廓遮罩

```text
Use case: background-extraction.
Asset type: an EXACT black-and-white silhouette MASK for use as a CSS luminance mask over the attached original photograph. This is a technical image mask, NOT an edited portrait.
Input image 1 is the original user's photograph, 1024 pixels wide by 1536 tall, fixed crop.
Output: same 1024x1536 canvas. Fill EVERY pixel belonging to the photographed person (hair, head, ears, glasses outline, neck, white shirt, black tie, navy suit, shoulders to every crop boundary) SOLID PURE WHITE. Fill ALL the photographic background pixels SOLID PURE BLACK. The white subject should form ONE continuous filled silhouette with no internal details or holes. In particular do NOT draw eyes, lips, face outlines, glasses lines, shirt borders, suit borders or texture: the entire person interior is just white.
Match the original subject's silhouette and position precisely, including the actual outer hairline and ears and shoulders. Do not recenter, rescale, alter proportions, crop, add margin, soften the entire outline or add glow. Use natural fine antialiasing only at the exact hair/subject edge. Background must be black not transparent and never a checkerboard.
Constraints: one continuous solid white cutout shape on a pure black field, original subject location and canvas aspect retained exactly, no face depiction, no photographic colors, no typography, no watermark. The mask will be applied to the untouched original photo so alignment is critically important.
```
