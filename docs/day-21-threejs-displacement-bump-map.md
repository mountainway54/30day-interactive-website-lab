# Day 21｜Three.js(4) 位移 displacementMap 與凹凸 bumpMap 貼圖

昨天透過 `roughness` 與 `metalness`，讓同一顆球呈現塑膠與金屬兩種不同的材質，但如果想呈現更粗糙的表面，或是不規則形狀，我們還可以怎麼做~

今天我們將練習使用 displacementMap 改變球體的表面形狀，再透過 bumpMap 加上凹凸紋理，讓昨天光滑的球體呈現類似石頭的不規則起伏與質感。

### 甚麼是貼圖？

在 3D 世界裡，貼圖（Texture）就像是幫模型穿上一層外衣。模型本身只決定物體的形狀，而貼圖則負責告訴電腦它看起來應該是什麼樣子，例如是紅色還是藍色、光滑還是粗糙、有沒有凹凸紋路，甚至表面是否真的凸起。透過不同種類的貼圖，一個原本單調光滑的模型，就能呈現出木頭、金屬、石頭、皮膚等各種真實材質。

今天的我們先學習 `位移貼圖` 與 `凹凸貼圖`。

#### 位移貼圖（displacementMap）

位移貼圖會根據圖片中的高度資料，移動模型的頂點，讓表面真的產生凸起與凹陷，因此連模型邊緣的輪廓也會改變。模型需要足夠的頂點，才能呈現細緻的起伏。

#### 凹凸貼圖（bumpMap）

凹凸貼圖會根據高度差改變表面的光照，讓模型看起來有凹凸紋理，但不會移動頂點，所以外形與輪廓保持不變。今天會用它補上表面細節，搭配位移貼圖呈現類似石頭的質感。

### 生成一張灰階貼圖素材

Demo 使用的 drawBumpTexture() 是我事先請 AI 協助撰寫的函式，用來透過 Canvas 產生灰階高度貼圖。它會沿著球面取樣 3D 雜訊，疊加不同尺度的變化，形成大塊起伏與細部紋理，同時讓貼圖的左右接縫與兩極保持連續。最後將高度轉成黑白深淺，畫到 Canvas 上，供 displacementMap 和 bumpMap 共用，分別控制模型的實際形狀與表面凹凸光照。調大 scale，紋理就會變得更大塊。
接下來，把畫好的 Canvas 轉成 Three.js 貼圖：

```js
import * as THREE from "three";
import { drawBumpTexture } from "./bumpTexture.js";

// 在 Vue onMounted 中執行；heightCanvas 是已掛載的 Canvas 元素。
drawBumpTexture(heightCanvas, 1.6);

const texture = new THREE.CanvasTexture(heightCanvas);
texture.colorSpace = THREE.NoColorSpace;
```

`drawBumpTexture()` 是本次 Demo 的輔助函式，負責產生灰階圖，不是 Three.js 內建 API。實作放在 [bumpTexture.js](../src/days/day-21/bumpTexture.js)。

高度貼圖使用 `NoColorSpace`，將像素當作資料讀取。同一個 `texture` 可以同時指定給材質的 `displacementMap` 與 `bumpMap`。[Three.js 材質文件](https://threejs.org/docs/pages/MeshStandardMaterial.html)

我們沒有把灰階圖指定給顏色貼圖 `map`，所以模型仍然是青綠色。右側圖片的黑白值用來計算高度，不會直接變成球體的顏色。

### 用 displacementMap 改變模型輪廓

先建立球體與材質。以下接續既有的 `scene`、`camera`、`renderer`，以及剛才建立的 `texture`：

```js
const geometry = new THREE.SphereGeometry(1, 192, 128);

const material = new THREE.MeshStandardMaterial({
  color: "#6f9294",
  roughness: 0.72,
  metalness: 0,
  displacementMap: texture, //使用 texture 貼圖
  displacementScale: 0.7, //最高與最低幅度差距
  displacementBias: -0.35, //整體偏移量
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
renderer.render(scene, camera);
```

`displacementMap` 會沿著頂點的法向量移動頂點。對這顆球來說，原本的法向量朝向球體外側，因此正位移會向外凸，負位移會向內縮。

位移量的計算是：

```text
位移量 = 貼圖取樣值 × displacementScale + displacementBias
```

`displacementScale` 控制高度差的幅度，`displacementBias` 則替所有取樣結果加上一個偏移量。以全白來說就是 `1 × 0.7 - 0.35`，所以是`0.35 向外`，全黑是 `0 × 0.7 - 0.35`，`-0.35 向內`

![alt text](images\day-21-displacement-diagram-v2.png)

要特別注意的是，位移貼圖是在 GPU 的頂點著色器（vertex shader）中處理，繪製時會計算頂點位移後的位置，但不會將結果寫回 JavaScript，因此 geometry 中保存的頂點座標仍然是原本的值。

### 用 bumpMap 補上表面凹凸

接著把同一張灰階高度貼圖指定給 bumpMap，讓表面的凹凸光照與位移紋理互相對應：

```js
const material = new THREE.MeshStandardMaterial({
  color: "#6f9294",
  roughness: 0.72,
  metalness: 0,
  displacementMap: texture,
  displacementScale: 0.7,
  displacementBias: -0.35,
  bumpMap: texture,
  bumpScale: 35,
});
```

`bumpMap` 會利用相鄰取樣位置的高度差，調整光照計算使用的法向量。表面因此出現不同的明暗，看起來像有起伏。它不會移動頂點，所以只開啟 bumpMap 時，球體的外緣依然是圓的。

這也表示，整張純白圖不會產生滿滿的凸起。當相鄰位置的高度都相同，就沒有高度差可以形成凹凸紋理。

bumpScale 用來調整表面的凹凸感，設為 0 就沒有凹凸效果，數值越大，效果通常越明顯。這次 Demo 預設為 35，可以拖曳滑桿觀察不同強度的變化。

最後，將兩種貼圖一起使用，就能讓模型同時呈現不規則的輪廓與表面的凹凸光影。可以試著關閉其中一種，觀察外形與明暗的差異，就能更清楚看出它們各自的作用。
明天我們再來認識另外兩種貼圖。
