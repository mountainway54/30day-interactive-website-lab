# Day 19｜Three.js（2）建立場景、相機與渲染器

昨天認識了 Three.js 常見的工具，今天就把場景、相機、材質與光源放在一起，做出一個可以旋轉的漸層立方體。

原本手刻的頂點、矩陣和光照 Shader，這次改用 Three.js 來寫，看看節省了多少力氣 ~~

### 建立場景、相機與渲染器

專案已經安裝 Three.js，可以直接匯入。新專案則先執行 `npm install three`：

```js
import * as THREE from "three";
```

一樣先準備畫面要使用的 canvas。 由於我們使用 Vue 框架，可以透過 template ref 取得元素。canvas 必須先有顯示尺寸。本篇沿用 Demo 的 CSS，寬度跟著容器，高度設為 `360px`。
以下程式片段依序放在初始化流程中，聚焦場景的建立方式。

```js
//取得 canvas 在畫面上的 CSS 寬高。
const width = Math.max(1, canvasElement.clientWidth);
const height = Math.max(1, canvasElement.clientHeight);
//建立一個 3D 場景
const scene = new THREE.Scene();
//建立一台透視相機 (視野角度, 畫面長寬比, 最近可見距離, 最遠可見距離)
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
// 相機位置座標與視角方向座標
camera.position.set(0, 0, 5.8);
camera.lookAt(0, 0, 0);
//建立 WebGL 渲染器
const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement, //不要自己建立 canvas，使用我提供的這個 canvas。
  antialias: true, //反鋸齒
  alpha: true, //透明背景
});
//針對高解析度螢幕做效能優化；設定 renderer 的尺寸 (寬, 長, 不讓 Three.js 自動修改長寬)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height, false);
```

`Scene` 用來放置模型與燈光。之後建立物件，再透過 `scene.add()` 加入場景。

`PerspectiveCamera` 是透視相機，會呈現近大遠小的效果。四個參數分別是：

| 參數     | 這次的值         | 用途               |
| -------- | ---------------- | ------------------ |
| `fov`    | `45`             | 垂直視角，單位是度 |
| `aspect` | `width / height` | 畫面的寬高比       |
| `near`   | `0.1`            | 近裁切面的距離     |
| `far`    | `100`            | 遠裁切面的距離     |

`near` 和 `far` 決定相機前方的深度範圍，超出裁切面的部分不會顯示。這裡把相機放在 Z 軸正方向的 `5.8`，看向原點，立方體稍後就放在原點。

物件與光源準備好後，呼叫 `renderer.render(scene, camera)` 就會畫出當下的場景，也可以把它包成函式 `draw()`，後面更新參數時可以重複使用：

```js
function draw() {
  renderer.render(scene, camera);
}
```

### 用 BoxGeometry 建立立方體

立方體的幾何資料可以直接用 `BoxGeometry` 建立：

```js
const geometry = new THREE.BoxGeometry(2, 2, 2);
```

三個參數依序是寬、高、深。這裡都設成 `2`，就得到邊長為 `2`、中心位於原點的立方體，各軸範圍都是 `-1` 到 `1`。[BoxGeometry 官方文件](https://threejs.org/docs/pages/BoxGeometry.html)

`geometry` 裡已經包含頂點位置、法向量與三角形索引，不需要再逐面組合三角形。

不過，幾何資料只描述形狀。還要搭配材質，再組合成 `Mesh`，才是可以放進場景的網格物件：

```js
//使用 MeshLambertMaterial，讓物件表面受到光源影響，呈現明暗變化。
const material = new THREE.MeshLambertMaterial({
  color: "#e859ad", //先使用單一材質顏色
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

這裡先用單一粉紅色建立材質。接下來先加入燈光，文章的最後再補充漸層色的設定。

### 設定材質、環境光與平行光

剛才建立的 `MeshLambertMaterial` 是一種會受到光源影響、呈現基本漫反射明暗效果的材質(不包含高光反射)

現在我們為場景加入環境光與平行光：

```js
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
const light = new THREE.DirectionalLight(0xffffff, 0.45);

light.position.set(-1, 2, 3);
light.target.position.set(0, 0, 0); //預設就是 (0, 0, 0) 這裡其實可省略

scene.add(ambient, light);

draw();
```

兩種光源的建構參數都是顏色與強度。`0xffffff` 是白色，環境光強度設為 `0.55`，平行光則是 `0.45`。

`AmbientLight` 是環境光，沒有特定方向，會替表面提供基本光照。背對平行光的面因此仍然看得到顏色。

`DirectionalLight` 是平行光，會沿著固定方向照射。Three.js 使用光源的 `position` 與 `target` 位置決定方向，預設 `target` 位於原點，因此這裡的光線會從 `(-1, 2, 3)` 朝原點照過來。

這個位置用來決定方向，並不會讓平行光像點光源一樣隨距離衰減。想改變方向，要調整 `position` 或 `target`，設定 `light.rotation` 不會改變它的照射方向。如果之後要移動預設的 `target`，也要將 `light.target` 加入場景。[DirectionalLight 官方文件](https://threejs.org/docs/pages/DirectionalLight.html)

### rotation 旋轉

模型的旋轉可以直接設定在 `mesh.rotation` 上：

```js
mesh.rotation.set(
  THREE.MathUtils.degToRad(-23),
  THREE.MathUtils.degToRad(34),
  0,
  "YXZ",
);
draw(); //更新畫面
```

前三個參數分別是 X、Y、Z 軸的旋轉角度，單位是弧度 Radian，如果要使用角度 Degree，就要先用 `degToRad()` 轉換。

第四個參數 `'YXZ'` 指定 Euler 旋轉順序。3D 旋轉是基於旋轉後的座標軸繼續旋轉，所以先轉 X 再轉 Y，和先轉 Y 再轉 X，最後朝向通常不同。

由於光源直接放在 `scene` 中，沒有掛在模型底下，所以模型轉動時，燈光不會跟著轉；各面的受光程度就會改變。

### OrbitControls 控制器

接著加入旋轉、平移與縮放相機的操作。`OrbitControls` 是額外的 addon，需要在檔案上方另外匯入，再於初始化流程中建立控制器：

```js
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; //匯入相機控制器

const orbit = new OrbitControls(camera, canvasElement); //指定要控制的相機與接收操作的 canvas

orbit.target.set(0, 0, 0); //設定環繞觀看的中心，預設就是原點
orbit.enablePan = true; //啟用平移，預設為 true
orbit.enableZoom = true; //啟用縮放，預設為 true
orbit.minPolarAngle = 0.12; //限制垂直環繞的最小角度，單位是弧度
orbit.maxPolarAngle = Math.PI - 0.12; //限制最大角度，避免到達正下方

//保留預設滑鼠操作：左鍵旋轉、右鍵平移、滾輪／中鍵縮放
canvasElement.tabIndex = 0; //讓 canvas 可以取得鍵盤焦點；Vue template 也可寫 tabindex="0"
orbit.listenToKeyEvents(canvasElement); //canvas 取得焦點後，可用方向鍵平移

orbit.update(); //同步相機與控制器的狀態
orbit.saveState(); //記住目前的相機位置、target 與 zoom，供重設使用
orbit.addEventListener("change", draw); //旋轉、平移或縮放後重新繪製
draw(); //畫出初始畫面
```

第一個參數是要控制的相機，第二個是接收滑鼠與觸控事件的元素。`target` 是環繞觀看的中心，這次和立方體一樣位於原點。

這次 Demo 開啟平移與縮放，使用 OrbitControls 預設的滑鼠與觸控操作。

| 操作               | 效果                 |
| ------------------ | -------------------- |
| 滑鼠左鍵拖曳       | 環繞 target 旋轉相機 |
| 滑鼠右鍵拖曳       | 平移相機與 target    |
| 滾輪或中鍵拖曳     | 拉近、拉遠           |
| 手機單指拖曳       | 旋轉相機             |
| 手機雙指一起拖曳   | 平移                 |
| 手機雙指捏合或張開 | 拉近、拉遠           |

這裡使用透視相機，縮放操作會改變相機與 `target` 的距離；平移則會一起移動相機與 `target`，讓觀看中心離開原點。

鍵盤事件另外透過 `listenToKeyEvents()` 綁定在 canvas 上。點選畫布或用 Tab 移入焦點後，方向鍵就能平移。每次相機狀態改變，控制器會發出 `change` 事件，再由 `draw()` 畫出新的畫面。

`saveState()` 會記住相機的起始狀態，重設時呼叫 `orbit.reset()`，恢復 saveState() 記住的相機位置、觀看中心與 zoom

### 加上頂點漸層配色

最後替立方體加上漸層。先依頂點的 Y 座標配色：上方用粉紅色，下方用紫色。

```js
const positions = geometry.getAttribute("position"); //取得頂點位置
const colors = [];

for (let i = 0; i < positions.count; i++) {
  const color = new THREE.Color(positions.getY(i) > 0 ? "#e859ad" : "#382bca");
  colors.push(color.r, color.g, color.b);
}

geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); //每筆顏色包含 RGB 三個數值
material.color.set(0xffffff); //改成白色，避免材質原色影響頂點配色
material.vertexColors = true; //使用頂點顏色
material.needsUpdate = true; //更新已渲染過的材質設定
draw();
```

這個迴圈只替頂點指定兩種顏色。繪製時，GPU 會在三角形的頂點顏色之間插值，讓側面出現粉紅到紫色的漸層。

### 小結

實作後可以發現，前幾天用 WebGL 時需要手寫的頂點資料、矩陣與光照計算，Three.js 已經幫我們處理好了。透過幾何、材質、光源與相機的設定，就能完成這次的立方體，讓我們可以專注於場景配置與畫面互動上。

前面學過的圖形學與向量概念仍然用得上。模型為什麼會變亮、移動相機和旋轉模型有什麼不同，都能對應回原本的運算，也讓我們更容易理解 Three.js 的設定會如何影響畫面。
