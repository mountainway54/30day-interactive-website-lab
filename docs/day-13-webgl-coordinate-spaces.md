# Day 13｜WebGL（3）

昨天我們用 36 筆頂點組成 12 個三角形，畫出一個 3D 立方體。

看到這裡，你可能會覺得哪利怪怪的?
3D 空間中的座標，究竟是如何映射到 2D 的 Canvas 畫布上？在考慮觀察角度與透視效果後，一個頂點又會經過哪些座標空間與轉換？

這個過程可不只是單純地從 3D 轉換成 2D，實際上會經過六個座標空間的轉換：

```
Model Space 模型空間
→ World Space 世界空間
→ View Space 觀察空間／相機空間
→ Clip Space 裁切空間
→ NDC 正規化裝置座標
→ Screen Space 螢幕空間
```

今天我們就延續 Day 12 的立方體，追蹤立方體其中一個頂點 `(1, 1, 1)`，看看它在每個階段如何改變。

老樣子，可以搭配 Demo 一起觀察。與 Day 12 不同的是，這次除了左鍵拖曳可以旋轉模型，右鍵拖曳還可以改變的是觀察視角。隨著模型與視角旋轉，畫面旁也會即時顯示頂點在各個座標空間中的數值變化。👉🏿 Demo 連結

### 選擇觀察一個頂點座標

我們選擇立方體右上前方的角：

```jsx
const trackedVertex = [1, 1, 1];
```

無論模型或相機旋轉到哪個角度，頂點 Buffer 裡的這筆資料都不會改變，追蹤頂點在 Model Space 中會永遠保持 `(1, 1, 1)`。左鍵旋轉模型後，頂點會從 World Space 開始改變；右鍵旋轉視角時，模型在世界中的位置不變，座標則從 View Space 開始改變。

### Model Space 模型空間

Buffer 裡的 `a_position` 一開始位於 Model Space，也可以稱為 Local Space。

Model Space 以模型自己的原點為基準。立方體中心是 `(0, 0, 0)`，寬、高、深都是 2，八個頂點分別的座標是：

```jsx
[
  [-1, -1, -1],
  [-1, -1, 1],
  [-1, 1, -1],
  [-1, 1, 1],
  [1, -1, -1],
  [1, -1, 1],
  [1, 1, -1],
  [1, 1, 1],
];
```

### World Space：把模型放進場景

建立模型後，下一步是決定它在整個場景中的大小、方向與位置。由 Model Matrix 進行轉換：

```glsl
vec4 modelPosition = vec4(a_position, 1.0);
vec4 worldPosition = u_model * modelPosition;
```

乘上 Model Matrix 後，頂點資料就從 Model Space 進入 World Space。

這次 demo 會先將模型原點固定在 World Space 原點，可以透過左鍵拖曳以 Model Space 原點旋轉。每次拖曳都會更新 Model Matrix，因此 Model Space 的 `(1, 1, 1)` 經過旋轉後，在 World Space 中會得到不同座標。

如果改成旋轉視角，模型在 World Space 的位置不變，因此Model Matrix 不會更新，所以追蹤頂點會保持當下的 World Space 座標。

### View Space 相機空間

!image.png

World Space 告訴我們模型位於場景的哪裡，但螢幕上的結果還取決於相機 ( 或稱觀察者視角 ) 站在哪裡、朝向哪裡。View Matrix 會把 World Space 轉換成 View Space，也稱為 Camera Space：

```glsl
vec4 viewPosition = u_view * worldPosition;
```

進入 View Space 後，我們不再以世界原點為基準，而是改用相機的位置與方向描述所有物體。

按住右鍵拖曳時，相機會和世界原點保持固定距離，並以原點為中心繞行。水平拖曳改變相機的 yaw，垂直拖曳改變 pitch；無論移動到哪個位置，相機都會持續朝向原點的立方體。

Model Matrix 決定某一個模型在世界中的位置與角度；View Matrix 則改變整個世界相對於相機的位置與角度。即使最後產出相同的畫面，但兩個在意義上還是有很大的不同。

### Clip Space：套用透視投影

無論前面改變的是 Model Matrix 還是 View Matrix，我們最後都會得到追蹤頂點相對於相機的新位置。不過 View Space 仍然是三維空間，下一步要透過 Projection Matrix，把相機看到的範圍投影到 WebGL 可處理的裁切空間：

```glsl
vec4 clipPosition = u_projection * viewPosition;
gl_Position = clipPosition;
```

Vertex Shader 最後一定要替 `gl_Position` 寫入一個 `vec4`。這個位置就是 Clip Space 座標：

```
(clipX, clipY, clipZ, clipW)
```

前三個分量仍然描述左右、上下與深度，而第四個分量 `w` 會在下一步的 Perspective Divide (透視除法) 中發揮作用：WebGL 會將 `x`、`y`、`z` 分別除以 `w`，進而產生我們熟悉的「近大遠小」透視效果。

在 Clip Space 中，座標還不需要落在 `-1` 到 `1` 之間。此時 WebGL 會根據 `w` 判斷頂點是否位於可見的裁切範圍內。概念上，一個頂點必須滿足 `-w ≤ x ≤ w && -w ≤ y ≤ w && -w ≤ z ≤ w` 才位於完整的可見範圍之中。

因此，Clip Space 名稱中的 Clip，指的就是在這個階段依照上述範圍進行裁切。落在視野之外的三角形會被丟棄或裁掉超出的部分，不必全部進入後續流程。

完成裁切之後，WebGL 才會把座標除以 `w`，轉換到 `-1` 到 `1` 的 NDC（Normalized Device Coordinates）

### Normalized Device Coordinates 正規化裝置座標

Perspective Divide 的結果稱為 Normalized Device Coordinates，也就是 NDC。

簡單來說，NDC是將不同大小、不同視角的3D場景頂點，統一壓縮並轉換到一個範圍在 XYZ 在 -1~1 之間的標準立方體空間

X 與 Y 決定頂點位於畫面的左右和上下，Z 則會參與深度範圍與 Depth Test，幫助 WebGL 判斷哪些表面應該擋住後方的表面。

### Screen Space：轉成 Canvas 像素

NDC 仍然不是像素。最後，WebGL 會按照 `gl.viewport()` 設定的範圍，把 NDC 映射到 Frame Buffer：

```jsx
gl.viewport(0, 0, canvas.width, canvas.height);
```

如果 viewport 從 Canvas 左下角 `(0, 0)` 開始，並使用完整的 Canvas 寬高，X 的概念公式是：

```
screenX = (ndcX + 1) / 2 × canvas.width
```

因此 NDC 的 `-1` 會落在最左側，`0` 落在中央，`1` 落在最右側。
WebGL 的 Y 軸向上，而 DOM / Canvas 畫面座標通常是從左上角開始、Y 軸向下，因此 Y 要反轉。

假設 NDC 是 `(0.45, 0.30)`，Canvas 是 `400 × 400`：

```
screenX = (0.45 + 1) / 2 × 400 = 290
screenY = (1 - 0.30) / 2 × 400 = 140
```

以 DOM 常用的左上角座標來看，這個頂點會落在 Canvas 的 `(290, 140)` 附近。

### 小結

今天我們追蹤立方體上的一個頂點，觀察它如何經過不同的座標空間，最後映射到 Canvas 上的像素位置。明天我們將繼續深入 WebGL，開始認識 Shader 與撰寫 Shader 所使用的 GLSL 語言。
