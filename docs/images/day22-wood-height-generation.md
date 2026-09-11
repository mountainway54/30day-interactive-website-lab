# Day22 灰階高度貼圖

- 工具：內建 imagegen。
- 來源：`day22-wood-color.png`。
- 輸出：`day22-wood-height.png`。
- 用途：`displacementMap` 與 `bumpMap` 共用，以 `NoColorSpace` 載入。
- 生成結果為近似對應，不保證逐像素一致或真實深度。

## 完整提示詞

Edit target: input image 1, the existing brown wood color texture. Convert this exact image to a neutral grayscale height texture for displacementMap and bumpMap. Preserve every grain, knot, position, orientation, crop, and composition as closely as possible. Change only color to grayscale with moderate contrast centered around middle gray: dark pores and grooves lower, light grain ridges higher. Strictly achromatic equal RGB channels, no tint. No new grain, no new objects, no text, no borders, no perspective, no lighting or shadows added. One square full-frame grayscale texture.
