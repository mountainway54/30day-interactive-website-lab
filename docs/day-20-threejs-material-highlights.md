# Day 20｜Three.js(3)材質設定:粗糙度與金屬度

昨天用 Three.js 建立了場景、相機和立方體，也透過光源讓各個面呈現明暗。今天把模型換成球體，試著讓同一顆球看起來像金屬、光滑塑膠或霧面塑膠。

球體的形狀和顏色都保持相同，只調整材質參數，觀察表面的高光與反射會怎麼改變。

### Three.js 如何設定材質？

建立模型時，幾何資料 `geometry` 決定形狀，材質 `material` 則決定表面如何呈現。把兩者交給 `Mesh`，再加入場景：

```js
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

昨天使用的 `MeshLambertMaterial` 可以呈現漫反射明暗，但沒有鏡面高光。今天改用 `MeshStandardMaterial`，透過金屬度與粗糙度設定表面的光照反應。

這兩個差別在哪呢? MeshLambertMaterial 使用較簡單的漫反射光照，效能較好但缺乏高光與金屬質感，適合低模、卡通或大量物件；MeshStandardMaterial 則採用 PBR（物理式渲染），可透過 roughness、metalness 等參數呈現更真實的材質與光影，但 GPU 運算成本也較高。

`MeshStandardMaterial`建立材質時，可以把設定放進參數物件：

```js
const material = new THREE.MeshStandardMaterial({
  color: "#6f9294", // 基礎色
  metalness: 0, // 金屬度
  roughness: 0.15, // 粗糙度
});
```

材質建立後，也能直接修改屬性。數值直接指定，顏色則使用 `Color` 物件的 `.set()`：

```js
material.color.set("#6f9294");
material.roughness = 0.8;
renderer.render(scene, camera);
```

> Demo 只在操作時重新繪製，所以修改完參數後要再呼叫一次 `render()`。這裡更新顏色、粗糙度與金屬度，不需要設定 `material.needsUpdate = true`。

### 使用 MeshStandardMaterial 建立球體材質

接下來我們來實際看看今天的 demo ~

沿用昨天建立好的 `scene`、`camera` 與 `renderer`，但把立方體換成球體，並且有設定三個材質去感受材質參數所帶來的差異：

```js
import * as THREE from "three";

// 生成球體幾何模型，參數依序為半徑、水平分段數、垂直分段數
const geometry = new THREE.SphereGeometry(1, 48, 40);

const material = new THREE.MeshStandardMaterial({
  color: "#6f9294",
  metalness: 0,
  roughness: 0.15,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

camera.position.set(0, 1.42, 4.6);
camera.lookAt(0, 0, 0);
```

球體放在原點，半徑為 `1`。分段數決定組成球面的三角形數量，這裡使用 `48` 與 `40`，讓輪廓有足夠的平滑度。

接著加入與 Demo 相同的環境光和平行光：

```js
const ambient = new THREE.AmbientLight(0xffffff, 0.26);
const light = new THREE.DirectionalLight(0xffffff, 0.74);
light.position.set(-1, 1.6, 2.4);
scene.add(ambient, light);
```

一個純白的攝影棚可能會看不出鏡面材質，要讓金屬表面有周圍景物可反射，還需要加入環境貼圖。幸好 Three.js 有內建的貼圖 `RoomEnvironment`，產生包含房間、方塊與明亮燈板表面的虛擬場景，這樣就可以先不用額外匯入貼圖。

鏡面貼圖:

```js
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const room = new RoomEnvironment();
const generator = new THREE.PMREMGenerator(renderer); //預處理環境貼圖
const environmentTarget = generator.fromScene(room, 0.04); //額外模糊輛

scene.environment = environmentTarget.texture;

// 貼圖產生後，釋放用來製作它的暫時資源。
room.dispose();
generator.dispose();

renderer.render(scene, camera);
```

`PMREMGenerator` 會把環境場景處理成適合不同粗糙度取樣的貼圖；`fromScene()` 的第二個參數 `0.04` 是額外模糊量，單位為弧度，加入極少的模糊可以增添真實感。完成後，把貼圖指定給 `scene.environment`，材質就能使用這個環境的光照與反射。

球面上的白色亮塊與深淺輪廓，部分來自這個虛擬房間；平行光也會產生高光。要注意的是，我們只設定 `scene.environment`，沒有設定 `scene.background`，因此房間不會出現在畫面背景。

### 粗糙度 roughness：觀察高光的變化

粗糙度可以理解成表面的「光滑程度」。想像同樣顏色的亮面塑膠與霧面塑膠：亮面上容易看出燈光的形狀，霧面上的亮光則比較模糊、分散。`roughness` 就是用來調整這種差異，粗糙度越高，表面看起來越霧。

先維持 `metalness = 0`，只改變 `roughness`。

```js
material.roughness = 0.15; // 光滑塑膠
renderer.render(scene, camera);

// 比較時再改成下面的數值。
// material.roughness = 0.8;
// renderer.render(scene, camera);
```

`roughness` 的範圍是 `0` 到 `1`。越接近 `0`，表面越光滑，環境反射越清楚，高光通常較集中；越接近 `1`，反射越模糊，高光也會變得較寬、較柔和。

可以把它想成表面有許多細小、朝向不同的微小平面。表面越粗糙，反射光分散的方向就越多，原本清楚的燈板輪廓也就逐漸模糊。

這裡模擬的是細微表面結構對光照的影響，球體的頂點與外形都沒有改變。把粗糙度拉到 `1`，球面也不會長出顆粒或凹洞。

Day 16 我們需要自己撰寫 Shader，利用光線、法向量與視線方向計算鏡面反射，再透過指數控制高光的集中程度。使用 Three.js 時，只要選用支援高光的材質，搭配光源或環境照明，Three.js 就會處理這些計算，產生對應的高光效果。
座標。

### 金屬度 metalness：區分金屬與塑膠

乍看之下可能會覺得金屬度與粗糙度很像，但其實兩者控制的是不同的材質特性。`metalness` 可以簡單理解成「這個材質是不是金屬」，它決定表面要用金屬還是塑膠、木頭這類非金屬的方式來反射光線。比如金色金屬的反射會帶有金黃色，而黃色塑膠雖然本身是黃色的，但照到白光時，高光通常還是接近白色。

`roughness` 則是在控制「表面有多粗糙」。數值越低，表面越光滑，反射和高光會越清楚；數值越高，表面越粗糙，反射就會越模糊、分散。

所以不要把「很亮、反光很強」直接當成金屬。光滑的塑膠一樣可以有很明顯的高光。簡單來說，`metalness` 決定「怎麼反光」，`roughness` 決定「反光有多清楚」。

```js
material.metalness = 1; // 金屬
material.roughness = 0.2;
renderer.render(scene, camera);
```

對均勻的材質，通常先使用兩個端點：塑膠這類非金屬設為 `0`，裸露金屬設為 `1`。中間值可以表達混合效果，不必把它當成一般的亮度滑桿。

非金屬的基礎色主要影響漫反射顏色；在白光下，塑膠的高光通常接近白色。金屬的反射則會受到基礎色影響，例如本次使用青綠色，得到的會是帶有青綠色調的金屬外觀。

金屬度與粗糙度可以分開調整。選擇金屬後把粗糙度拉高，仍然是金屬，只是反射變得模糊；把塑膠的粗糙度降低，則會得到光滑塑膠。

金屬的外觀很依賴周圍可反射的內容。只有少量直接光、缺少環境反射時，金屬可能大部分看起來很暗，只有局部亮斑。因此額外加入 `RoomEnvironment` 就對金屬感的呈現非常重要。

### 小結

從今天的 demo 就能直接感受到 shader 的強大。

如果沒有使用 Three.js，想要呈現較真實的材質與光照效果，通常需要自行撰寫 GLSL Shader 來實作 PBR。自行撰寫 PBR Shader 並不代表一定能獲得更好的效能或畫面品質；Three.js 的 MeshStandardMaterial 已經整合成熟的 PBR 光照模型與多項最佳化。除非對渲染管線非常熟悉，並且能針對特定場景進行設計與調校，否則自製 Shader 在效能、穩定性與視覺效果上未必能優於 Three.js。
