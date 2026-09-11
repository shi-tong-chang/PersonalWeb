# A Personal Universe：星海敘事系

> 歷史版本記錄。最新方向見 [Orbital Atlas：個人星圖](orbital-atlas-art-direction.md)。本文件保留夜海資產與生成提示詞。

設計方向：夢幻、安靜、電影感、日系、情緒記憶。深藍夜海、銀白月光與少量淡紫，虎鯨是場景的主要辨識物；少女為遠景引導角色，不代表作者的肖像或身分。

開場以真實 HTML 姓名與介紹為主角。桌面延續水墨版的章節式整頁切換，從夜海轉入銀灰色的清楚作品區，再以夜海頁尾收束；手機、較短視窗與減少動態效果時保留原生捲動。作品庫的長內容先在章節內完整閱讀，到達邊界後再切頁。首屏可直接探索作品；技術與專案介紹不用先展開作品庫就能閱讀。

## 參考與界線

- [Lusion](https://lusion.co/)：參考以沉浸式開場引入作品的敘事層次。
- [Hollow Knight: Silksong](https://hollowknightsilksong.com/)：參考場景與章節推進的節奏。
- 不複製上述網站的美術、文案、排版或程式；不加入重型 WebGL。新背景從文字全新生成，沒有使用它們的圖片作輸入。
- 工程內容優先可讀，動態只輔助氛圍。使用者尚未提供的經歷、獎項、技能與專案成果不虛構。

## 資產與生成記錄

- 工具：內建 imagegen，非 CLI。
- 類型：原創日系電影感夜海插畫，文字全新生成。
- 最終檔案：`public/assets/star-sea-v1.webp`，1672 × 941，99,118 bytes。
- 原始 PNG 保留於本機 imagegen 輸出目錄，不隨儲存庫發佈。
- 生成後僅以 Sharp 轉為 WebP（quality 86），不改繪圖片內容；首頁與頁尾使用 CSS 裁切／漸層遮罩。
- 手機採上方文字、下方場景；女主角不被當成作者頭像。

## 完整提示詞

```text
Use case: stylized-concept
Asset type: original wide cinematic illustrated hero background for a personal creative-technologist portfolio website.
Primary request: a quiet, dreamlike midnight sea under silver moonlight, with a distant recognizable black-and-white orca as the main environmental signature and a small anime young adult woman acting as a guide at the far right.
Composition/framing: expansive landscape, 16:9 composition. The leftmost 43 percent is intentionally very dark navy negative space, only subtle sky and sea gradients with minimal detail, reserved for large live HTML name and introduction text. On the right half, a beautiful vast starry sky opens over a calm reflective night ocean. In the mid-distance at roughly 68 percent from the left, a large graceful anatomically recognizable orca is gently emerging or gliding above the water, side-on in a soft arc, with a clear black back, white underside and white eye patch, dorsal fin, flippers and tail. The orca must read clearly as an orca, not a dolphin, not a humpback whale, not a shark. Its scale is majestic but distant, not a creature close-up.
Subject: one young adult woman in the rightmost 15 percent, full-body from behind or in quiet three-quarter back view, standing on a subtle dark shoreline and looking out toward the orca. Long dark blue-black hair, a simple flowing ivory dress with modest neckline and covered torso, a fine pale ribbon. She occupies no more than 25 percent of the image height, to remain a guide rather than the identity of the website owner. No eye-contact portrait.
Style/medium: exquisite Japanese animated feature-film background painting, hand-painted atmospheric digital illustration with fine restrained details, elegant cinematic depth, realistic ocean light but clearly illustrated rather than photorealistic. Delicate ripples, low silver reflection, a few scattered stars and very subtle lilac cloud haze. A luminous crescent moon in the upper right quadrant, restrained bloom. Calm, wistful, timeless, emotionally memorable.
Color palette: deepest navy #07111f and midnight blue #11243e, silver-white moonlight, blue-gray water, tiny lavender accents. No saturated cyan or hot pink.
Constraints: no typography, no letters, no logos, no watermark, no website UI, no borders, no extra people, no boats, no buildings, no weapons, no dramatic splashes, no busy glitter field, no enormous foreground girl, no sexualization. Preserve the dark empty left for highly readable website text.
```
