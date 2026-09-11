# Day22 木紋顏色貼圖

- 工具：內建 image_gen（非 CLI）。
- 參考圖：`day22-wood-uv.png`，使用者提供的木紋法線貼圖。
- 輸出：`day22-wood-color.png`。
- 用途：Three.js `map`，以 sRGB 解碼；原圖用於 `normalMap`，保持 NoColorSpace。
- 生成的色紋與法線為近似對應，非逐像素還原；不保證完全無縫。

## 完整生成提示詞

## 參考色修正版（目前版本）

工具：內建 imagegen。以既有顏色圖為編輯目標，使用使用者提供的紅棕色木紋圖片作為色彩參考。輸出覆寫 `day22-wood-color.png`。

Edit image 1 (square pale wood albedo texture). Image 2 is a COLOR PALETTE REFERENCE ONLY. Recolor image 1 to closely match the rich warm reddish brown, burnt sienna, copper amber orange and deep chocolate brown wood pigmentation of image 2. Increase richness and tonal separation of grain colors to match image 2, replacing the pale beige washed-out palette. Preserve image 1's exact grain layout, fine lines, knots, orientation and square crop as closely as possible; do NOT substitute the grain structure or wide aspect ratio of image 2. Critical: output is a FLAT PBR BASE COLOR/ALBEDO map, not a lit wood photo. All dark and light variation must follow intrinsic grain pigmentation only. Do not copy image 2's lighting: no vignette, no directional shading, no ambient occlusion, no groove shadows, no bright ridge edges, no specular highlights or gloss, no embossed relief. Even unlit appearance across the entire image. Full-frame square natural smooth wood pigment texture, no text, no border.

## 色澤修正版

以既有木紋顏色圖為參考，使用內建 imagegen 重新生成並取代 `day22-wood-color.png`，降低浮雕明暗，呈現平面木材色差。原有高度圖與法線圖保留。

Use the reference ONLY as a map of the large-scale horizontal wood grain paths and knot positions. Repaint the entire surface as a FLAT TWO-DIMENSIONAL WOOD ALBEDO TEXTURE. Critical correction: reference has embossed ridges with light edges and dark shadows; erase that completely. Imagine a perfectly smooth wood veneer scanned with cross-polarized diffuse light, or its pigment pattern printed on flat paper. Broad quiet light tan-brown base with fine irregular medium-brown ink-like wood fiber lines and muted natural darker growth bands. No bright outlines on grain, no paired light/dark edges, NO grooves, NO pits, NO carved look, NO ambient occlusion, NO directional shading, NO gloss. All variation is flat pigmentation. Reduce microtexture contrast substantially and simplify the noisy relief detail into organic thin pigment streaks while preserving major wavy grain flow and knots. Natural subtle pale walnut wood color, not orange. Full frame square texture, no text, no border, no lighting gradient.

## 初版提示詞

Use case: style-transfer. Asset type: wood base-color/albedo texture for Three.js UV mapping. Input image 1 is a tangent-space wood normal map, used as exact spatial grain reference. Generate one flat full-frame brown natural wood COLOR texture corresponding to this normal map. Preserve the horizontal wavy grain paths, knots and their positions as closely as possible, same orientation and full-frame crop. Warm medium brown oak, restrained variation with fine dark pores. Orthographic surface scan, uniform neutral illumination, no baked shadows, no specular highlights, no perspective, no objects, no planks or seams, no text or borders. Make opposite edges as continuous as possible for tiling. Output a single square texture image.
