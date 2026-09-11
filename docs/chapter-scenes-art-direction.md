# 星際章節換景

## 設計方向

參考 [《燕雲十六聲》的章節換景方式](https://www.wherewindsmeetgame.com/hmt/index.html)：不同章節使用不同主輪廓、構圖與明暗節奏，但保持同一世界觀。沒有複製參考站的程式、角色、圖像或影片。

本站維持深藍、銀白、少量紫色的星空主題，五章是同一趟旅程：

| 章節 | 主場景 | 構圖辨識 |
| --- | --- | --- |
| 個人介紹 | 既有星河與真實人像水晶球 | 斜向星河長帶 |
| 專案經歷 | 行星與銀白星環 | 右側巨大弧面、斜向環帶 |
| 擅長技能 | 星雲與新生星光 | 左側分枝雲氣、右側安靜文字區 |
| 大事記 | 長曝光星軌 | 左上方延伸的弧形時間軌跡 |
| 聯繫方式 | 月光夜海 | 低地平線、右側月光倒影 |

## 實作與效能

- 四個新背景由 `ChapterScene.astro` 共用裝飾層載入；使用 `/PersonalWeb/` base，背景不進入內容排版、不攔截滑鼠。
- 各章獨立定位與漸層遮罩，在留下場景輪廓的同時保障文字清晰；手機使用不同裁切位置。
- 背景進場只使用約一秒的 transform／opacity；薄霧緩慢漂移。沿用現有 `data-motion-active`，離開章節、背景分頁或減少動態時停止，不加入 WebGL、影片或新的動畫套件。
- 沿用既有 650ms 滾輪整頁切換、左右專案進場、10 個專案位置、鍵盤操作、長文自然增高與手機原生捲動。無 JavaScript 仍可看到靜態背景與完整內容。
- 四張新背景皆壓縮為 1600 × 900 WebP，合計 448,186 bytes（約 438 KiB）；使用 eager 載入與低下載優先度，減少快速跳章時等待背景的情況，首頁主圖仍保有高優先度。原始生成 PNG、原首頁素材與人物照片不覆寫。

## 素材與生成方式

使用 imagegen 技能的**內建工具模式**，逐張生成四個原創場景，沒有使用 CLI/API 備援。

- `public/assets/scene-projects-v1.webp`
- `public/assets/scene-skills-v1.webp`
- `public/assets/scene-timeline-v1.webp`
- `public/assets/scene-contact-v1.webp`

首頁沿用 `public/assets/milky-way-v1.webp`，人像與遮罩亦保持原樣。

## 最終提示詞

### projects

```text
Use case: stylized-concept.
Asset type: original full-bleed 16:9 cinematic background for one chapter of a personal portfolio, a finished raster artwork, NOT a website mockup.
Style/medium: refined photographic celestial concept art; subtle grain and delicate cosmic dust, believable scale and depth. All chapters belong to the same quiet night-sky universe.
Color palette: deep midnight navy #070d1c, slate indigo, restrained dusty lavender, silver-white starlight, a very small hint of champagne; luminous details stay visible but no oversaturated neon.
Constraints: no people, no characters, no spaceships, no buildings, no weapons, no typography, no chart labels, no logo, no watermark, no borders, no split panels. A sophisticated background behind live white typography; broad negative space and dark midtones, not an all-black texture. Landscape 16:9 composition.
Primary request: a quiet orbital vista with one monumental dark blue planet and an elegant broad silver-lavender ring seen obliquely. The planet sits in the upper RIGHT quadrant, partly cropped by the right edge, and its ring sweeps in a long diagonal arc from the lower-middle towards upper-right and beyond the edge. A fine rim light on the dark sphere, realistic fine dust in the ring, a sparse deep starfield. LEFT 45% remains clean dark negative space for project copy; the upper band and perimeter visibly carry the huge orbital arc, including behind a future project illustration at center-right. Not a black hole or a spiral galaxy. Make the ring geometry legible and visually memorable, softly luminous not glaring.
```

### skills

```text
Use case: stylized-concept.
Asset type: original full-bleed 16:9 cinematic background for one chapter of a personal portfolio, a finished raster artwork, NOT a website mockup.
Style/medium: refined photographic celestial concept art; subtle grain and delicate cosmic dust, believable scale and depth. All chapters belong to the same quiet night-sky universe.
Color palette: deep midnight navy #070d1c, slate indigo, restrained dusty lavender, silver-white starlight, a very small hint of champagne; luminous details stay visible but no oversaturated neon.
Constraints: no people, no characters, no spaceships, no buildings, no weapons, no typography, no chart labels, no logo, no watermark, no borders, no split panels. A sophisticated background behind live white typography; broad negative space and dark midtones, not an all-black texture. Landscape 16:9 composition.
Primary request: a luminous stellar nursery, organic interstellar clouds and branching wisps of silver-blue and smoky lavender forming an expansive nebula. A few pinpoint newborn stars nested in the cloud. A majestic irregular cloud plume rises from lower LEFT across the upper center with finely detailed dust layers. RIGHT half and central horizontal band must remain darker and calm for a list of skills. Distinct asymmetric flowing cloud silhouette, diffuse dimensional nebula not a spiral galaxy, not a circular portal. Medium-bright translucent edges with ink-blue depths; do not wash the whole frame in fog.
```

### timeline

```text
Use case: stylized-concept.
Asset type: original full-bleed 16:9 cinematic background for one chapter of a personal portfolio, a finished raster artwork, NOT a website mockup.
Style/medium: refined photographic celestial concept art; subtle grain and delicate cosmic dust, believable scale and depth. All chapters belong to the same quiet night-sky universe.
Color palette: deep midnight navy #070d1c, slate indigo, restrained dusty lavender, silver-white starlight, a very small hint of champagne; luminous details stay visible but no oversaturated neon.
Constraints: no people, no characters, no spaceships, no buildings, no weapons, no typography, no chart labels, no logo, no watermark, no borders, no split panels. A sophisticated background behind live white typography; broad negative space and dark midtones, not an all-black texture. Landscape 16:9 composition.
Primary request: the passage of time written as long-exposure star trails across a midnight celestial sky. Many exquisite thin curved silver-blue starlight traces form broad partial concentric arcs around a pole well OUTSIDE the upper LEFT image corner. The arcs sweep down along the left edge and across the upper border toward the right, with occasional subtle champagne highlights. The lower central and RIGHT 55% stay dark, clear and calm for a chronological timeline. Photographic celestial long exposure, no ground, no planet, no solid rings, no spiral galaxy, no tunnel or motion-speed warp. The curved trail pattern should be legible at a glance, not just isolated stars.
```

### contact

```text
Use case: stylized-concept.
Asset type: original full-bleed 16:9 cinematic background for one chapter of a personal portfolio, a finished raster artwork, NOT a website mockup.
Style/medium: refined photographic celestial concept art; subtle grain and delicate cosmic dust, believable scale and depth. All chapters belong to the same quiet night-sky universe.
Color palette: deep midnight navy #070d1c, slate indigo, restrained dusty lavender, silver-white starlight, a very small hint of champagne; luminous details stay visible but no oversaturated neon.
Constraints: no people, no characters, no spaceships, no buildings, no weapons, no typography, no chart labels, no logo, no watermark, no borders, no split panels. A sophisticated background behind live white typography; broad negative space and dark midtones, not an all-black texture. Landscape 16:9 composition.
Primary request: a silent night sea beneath an expansive star-filled sky, a fine crescent moon on the RIGHT upper third. A straight distant horizon at the lower 32 percent; its silvery moonlight draws a narrow soft shimmering reflection on still deep navy water, with a pale lavender atmospheric line at the horizon. Fine sparse stars and faint distant celestial haze, mostly clean dark sky in LEFT 55% for contact typography. Calm and open, cinematic finale to an exploration of the stars, not a sunset, no land, no mountains, no human objects. The HORIZONTAL horizon and reflection should distinguish this scene from planetary rings, nebulae and star trails.
```
