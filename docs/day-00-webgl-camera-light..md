# Day 00｜WebGL（2）：視角、投影與光源

昨天我們認識了 WebGL 的繪圖流程，知道頂點資料如何交給 GPU，最後畫出一個立方體。今天沿用這個場景，再加入一顆球體，試著調整觀察位置、投影方式與光照，看看同一組物件能呈現哪些變化。

兩個物件都使用相同的 Mist Teal（`#6F9294`）單色材質，位置固定，左右錯開並保留前後距離。地面網格用來判斷空間位置，這次先不加入投射陰影。

原生 WebGL 沒有「建立相機」或「新增方向光」的 API。我們要自己準備矩陣、光照方向與強度，透過 WebGL API 傳進 shader，再呼叫繪圖指令。今天會沿著這段流程，看設定究竟在哪裡生效。

以下是現有 Demo 渲染程式的拆解，不是可獨立執行的完整網頁。JavaScript 範例沿用已取得的 `gl`、已成功連結的 `program`，以及立方體與球體的頂點資料 `objects`；`objects.buffer` 是 GPU buffer，`objects.count` 是頂點數。文中的兩段 GLSL 必須先編譯、連結成這個 `program`，才能執行 JavaScript 中的 uniform 設定。

為了看清楚 API，範例先用一般的 `state` 物件代表滑桿設定；實際 Vue Demo 由父元件透過 props 傳入同樣的欄位。矩陣計算仍沿用當日模組，不在這篇推導公式。

## 1. 視角設定：從不同位置觀察場景

先想像桌上放著一個立方體和一顆球。站在桌子前方、走到側面，或從上方往下看，看到的輪廓與遮擋關係都會不同，但桌上的物件沒有移動。

今天拖曳 Demo 時，就是在做這件事：相機繞著固定的注視目標移動，立方體與球體保持原位。

相機位置由以下參數控制：

- 水平角：決定從物件的哪一側觀察。
- 俯仰角：決定從多高的角度往下看。
- 相機距離：決定相機離注視目標有多遠，使用場景中的世界單位，不是螢幕像素。

### 在 shader 留下接收相機資料的位置

相機設定最後會轉成視圖矩陣（View Matrix）。可以先把它理解成「把世界座標換成相機眼中的座標」所需的一組資料。

頂點著色器用 `uniform mat4 u_view` 接收這組資料。`uniform` 是由 JavaScript 設定、在一次繪圖中共用的值，`mat4` 表示 4 × 4 矩陣。下面也先放入下一節要用的投影矩陣，以及光照所需的法線：

```glsl
attribute vec3 a_position; // 每個頂點的位置，由 buffer 提供。
attribute vec3 a_normal;   // 每個頂點的法線，由 buffer 提供。

uniform mat4 u_view;       // JavaScript 傳入的視圖矩陣。
uniform mat4 u_projection; // JavaScript 傳入的投影矩陣。
varying vec3 v_normal;     // 將法線傳給片段著色器，供光照計算使用。

void main() {
  v_normal = a_normal;

  // 由右往左套用：頂點位置 → 視圖矩陣 → 投影矩陣。
  // 結果是裁切空間座標，後續再由 GPU 轉成畫面位置。
  gl_Position = u_projection * u_view * vec4(a_position, 1.0);
}
```

這個 Demo 的頂點已經放在世界座標中，物件也沒有旋轉或縮放，因此省略模型矩陣；法線同樣使用世界座標。

### 用 WebGL API 把矩陣傳進去

JavaScript 先取得 uniform 的位置，再把資料寫入。以下初始化在 `program` 成功連結後執行一次：

```js
// 這四個是 Demo 自訂的數學與狀態函式，不是 WebGL API。
import { viewMatrix, projectionMatrix, direction, switchProjection } from "./scene-model.js";

// 整篇共用的設定；欄位名稱由我們自己定義，WebGL 不會自動讀取。
let state = {
  azimuth: 25,   // 相機水平角：度，0° 在 +Z 側。
  elevation: 20, // 相機俯仰角：度，越大越接近由上往下看。
  distance: 10,  // 相機與注視目標之間的世界單位距離。
  projection: "perspective", // 初始使用透視投影。
  fov: 45,      // 透視的垂直視野角：度。
  span: 20 * Math.tan(Math.PI / 8), // 與初始透視尺度對應，約 8.28 單位。
  lightAzimuth: -45, lightElevation: 45, // 光照方位角與仰角：度。
  intensity: 0.8, // 方向光強度：0～1。
};

// WebGL API：查詢 program 中的 uniform，名稱必須對上 GLSL 宣告。
// 先保存位置，之後重繪時可直接使用，不必每次重新查詢。
const locations = {
  view: gl.getUniformLocation(program, "u_view"),
  projection: gl.getUniformLocation(program, "u_projection"),
  light: gl.getUniformLocation(program, "u_light"),
  color: gl.getUniformLocation(program, "u_color"),
  intensity: gl.getUniformLocation(program, "u_intensity"),
  unlit: gl.getUniformLocation(program, "u_unlit"),
};

// WebGL API：指定接下來要使用哪一組 shader program。
gl.useProgram(program);

// WebGL API：把視圖矩陣寫入 u_view。
gl.uniformMatrix4fv(
  locations.view,    // 要更新的 uniform 位置，不是相機座標。
  false,             // transpose：WebGL 規定必須為 false。
  viewMatrix(state), // 自訂函式產生的 Float32Array，內含 16 個數值。
);
```

`gl.getUniformLocation(program, name)` 回傳的是 uniform 的位置識別物件，不是它的數值。若回傳 `null`，要檢查名稱是否拼錯，或該 uniform 是否沒有被 shader 使用而遭到最佳化移除。重新連結 program 或重建 WebGL context 後，也要重新取得位置。[API 文件：getUniformLocation](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getUniformLocation)

`gl.useProgram(program)` 決定目前使用的 program，後續的 uniform 設定必須對應這個 program。[API 文件：useProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/useProgram)

`gl.uniformMatrix4fv(location, false, data)` 傳送 4 × 4 矩陣。資料使用欄優先排列（column-major），`false` 不是「關閉相機」，而是矩陣轉置參數；WebGL 不允許在這裡傳 `true`。[API 文件：uniformMatrix4fv](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniformMatrix)

`viewMatrix(state)` 才是把角度與距離換算成矩陣的地方。它固定看向 `[0, 1, 0]`，再根據水平角、俯仰角與距離計算觀察位置。WebGL API 只接收算好的矩陣，不知道 `azimuth` 是什麼。

只改 `state.azimuth` 不會讓 GPU 自動更新。必須重新計算矩陣、呼叫 `gl.uniformMatrix4fv()`，再繪製一次；第三節會把完整的重繪順序接起來。

可以先固定光源，慢慢調整水平角，留意立方體哪些面進入視線。由於光照方向固定在世界座標中，相機移動不會讓光源跟著轉；原本朝向光源的面，仍然朝向光源。

至於相機距離，在透視模式下，靠近物件通常會讓它看起來更大。不過正交模式的行為不同，這就要接著看投影設定。

## 2. 投影設定：透視與正交的差異

螢幕是平面的，場景卻有前後深度。投影負責把三維座標轉成平面畫面上的位置，也決定物件的顯示大小是否會隨深度改變。

這裡的「投影」是相機投影，和物件把影子投到地面上是兩件事。

### 透視投影

透視投影（Perspective）會產生熟悉的近大遠小：相同尺寸的物件，靠近相機時看起來較大，遠離時看起來較小。

今天的立方體與球體有前後距離，可以先把相機水平角調成 `0°`、俯仰角調成 `15°`，再切換透視與正交，觀察兩者的相對大小。它們的形狀不同，不需要期待輪廓完全一樣，重點是投影切換前後的變化。

透視模式還有一個常見設定：FOV（Field of View），也就是視野角。這次控制的是垂直方向的視野角。

在相機位置與畫布尺寸不變的情況下，FOV 越大，畫面能容納的垂直範圍越廣，物件看起來越小；FOV 越小，取景範圍越窄，物件看起來越大。

透視和正交都使用 `gl.uniformMatrix4fv()`。WebGL 沒有「切到正交」的專用 API，差別在於我們傳給 `u_projection` 的矩陣內容。

下面延續前面的 `state` 與 `locations`，把透視視野角改成 `60°`：

```js
state.projection = "perspective";
state.fov = 60; // 垂直視野角，Demo 可調範圍為 30°～75°。

// 使用實際繪圖緩衝區的寬高比，避免物件被橫向或縱向拉伸。
const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;

gl.useProgram(program);
gl.uniformMatrix4fv(
  locations.projection,          // 對應 shader 裡的 u_projection。
  false,                         // 同樣不轉置矩陣。
  projectionMatrix(state, aspect), // 依投影模式與長寬比產生矩陣。
);
```

調整 FOV 不會移動相機。雖然縮小 FOV 和靠近物件都能讓物件變大，但兩者不能完全互換：移動相機會改變前後物件與相機的距離關係；固定相機只改 FOV，則不會改變這個關係。

`projectionMatrix(state, aspect)` 是自訂函式：透視時讀取 `fov`，正交時讀取 `span`，並固定近裁切面為 `0.1`、遠裁切面為 `100`。這兩個值限制沿觀看方向可顯示的深度範圍，不是亮度或縮放設定。

### 正交投影

正交投影（Orthographic）不會因為深度不同，就把遠處物件縮小。因此，相同尺寸、相同朝向的物件即使一前一後，顯示尺度仍然相同。

正交模式依然有三維空間，也有前後遮擋。只是距離不再決定顯示大小，所以沿著觀看方向把相機拉遠，物件不會像透視模式那樣縮小。

想在正交模式中縮放畫面，要調整的是「垂直顯示範圍」。例如範圍設為 `8`，代表畫面垂直方向容納 8 個世界單位。範圍越大，物件越小；範圍越小，物件越大。

Demo 切換投影時，會保留相機位置，並以注視目標所在、垂直於觀看方向的平面為基準，換算接近的顯示尺度。這樣比較時，整體大小不會突然跳動太多，較容易看出前後物件的比例差異。

```js
// 自訂函式：保留相機位置，將 FOV 換算成正交的顯示範圍。
const result = switchProjection(state, "orthographic");
state = result.state;

// 真正把新投影送進 GPU 的仍然是這個 WebGL API。
gl.useProgram(program);
gl.uniformMatrix4fv(
  locations.projection,
  false,
  projectionMatrix(state, gl.drawingBufferWidth / gl.drawingBufferHeight),
);

// result.limited 為 true 時，換算值已限制到滑桿邊界，Demo 會顯示提示。
// 切回透視時，目標模式改用 "perspective"，然後重新傳入投影矩陣。
```

這個換算只對齊基準平面的尺度，不會讓所有深度的物件都一樣大。保留下來的差異，正是我們要觀察的透視效果。

切換完成後，可以試著改變正交模式的取景範圍：

```js
state.span = 10; // 正交模式垂直顯示 10 個世界單位，可調範圍為 4～14。

// 修改數值後，重新計算並上傳，才會影響下一次繪圖。
gl.useProgram(program);
gl.uniformMatrix4fv(
  locations.projection,
  false,
  projectionMatrix(state, gl.drawingBufferWidth / gl.drawingBufferHeight),
);
```

接著只調整相機距離，確認物件大小不變，再調整顯示範圍。這兩個操作放在一起比較，很容易分清楚相機位置與投影設定各自負責什麼。

## 3. 光源設定：用方向與強度塑造立體感

相機和投影決定物件出現在哪裡、看起來多大，光照則會改變表面的明暗。

今天使用方向光（Directional Light）。它假設光線從同一個方向平行照入場景，可以把它想成簡化的遠方日光，不需要指定一顆燈泡在場景中的位置，也不計算距離衰減。

畫面中的紅色箭頭表示光線行進方向。調整光照方位角與仰角時，箭頭會跟著改變方向，但箭頭所在的位置並不是燈泡位置。

光照方位角決定光從水平方向的哪一側照來；仰角決定光有多接近從上方照下來。強度則控制方向光對亮度的貢獻。

### 用 uniform API 設定方向、強度與顏色

矩陣用 `uniformMatrix4fv()`，光照方向這種三個分量的向量用 `uniform3fv()`，強度這種單一浮點數則用 `uniform1f()`。例如，把光改成較低角度的側光：

```js
state.lightAzimuth = -90;  // 從世界座標的 -X 側照來。
state.lightElevation = 20; // 仰角越大，越接近由上方照下來。
state.intensity = 0.8;     // 方向光強度，範圍為 0～1。

gl.useProgram(program);

// direction() 是自訂函式，將兩個角度換成 [x, y, z] 單位向量。
// 此處約為 [-0.94, 0.34, 0]，表示指向光源的方向，不是光源位置。
gl.uniform3fv(
  locations.light, // 對應 GLSL 的 uniform vec3 u_light。
  direction(state.lightAzimuth, state.lightElevation),
);

// 1f：傳入一個浮點數，對應 uniform float u_intensity。
gl.uniform1f(locations.intensity, state.intensity);

// 3fv：以陣列傳入三個浮點數，這裡代表 RGB。
// #6F9294 的 RGB 是 111、146、148，除以 255 轉成 0～1。
gl.uniform3fv(locations.color, [111 / 255, 146 / 255, 148 / 255]);

// bool uniform 用整數 API 設定：0 為 false，1 為 true。
// u_unlit = false 表示物件需要接受光照；網格與箭頭才使用 true。
gl.uniform1i(locations.unlit, 0);
```

API 的型別要對上 GLSL 宣告：`vec3` 接收三個分量，`float` 接收浮點數，`bool` 使用整數 setter。`u_light`、`u_intensity` 都是我們自訂的名稱，WebGL 不會因為名稱含有 light 就自動計算光照。[API 文件：uniform 系列](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform)

此時先不要移動相機，觀察立方體與球體的明暗。兩者使用相同材質，卻會呈現不同的變化：立方體每個平面的朝向固定，所以分面明顯；球體使用平滑法線，表面明暗會連續過渡。

「法線」可以先理解成表面朝外的方向。表面越正對光源，得到的漫反射越多；越接近側對光源，得到的光就越少。

### 在片段著色器中使用這些值

以下對應這次 Demo 的片段著色器。`v_normal` 是從頂點著色器傳來、經過插值的法線；`u_light` 則是剛才傳入的光源方向，與畫面中表示光線行進方向的箭頭相反：

```glsl
precision mediump float;

varying vec3 v_normal;
uniform vec3 u_light;      // gl.uniform3fv() 傳入。
uniform vec3 u_color;      // gl.uniform3fv() 傳入。
uniform float u_intensity; // gl.uniform1f() 傳入。
uniform bool u_unlit;      // gl.uniform1i() 傳入。

void main() {
  // normalize 讓插值後的法線恢復為單位向量。
  // dot 比較表面與光源方向，max 將背光產生的負值限制為 0。
  float diffuse = max(dot(normalize(v_normal), u_light), 0.0);

  // 不受光物件直接保留原色；其他物件使用環境補光＋漫反射。
  float brightness = u_unlit ? 1.0 : 0.2 + u_intensity * diffuse;

  // RGB 乘上亮度，最後的 1.0 表示完全不透明。
  gl_FragColor = vec4(u_color * brightness, 1.0);
}
```

`normalize()`、`dot()`、`max()` 是 GLSL 內建函式，執行在 GPU 上；`gl.uniform3fv()` 等方法則是 JavaScript 端的 WebGL API。兩邊透過 uniform 連接，負責的工作不同。

因此，把光照強度拉到 `0`，物件仍然看得見。這裡的環境補光只是一個簡單的固定底色亮度，沒有模擬光線在環境中反彈的過程。

這次也沒有計算鏡面高光或投射陰影。物件背光的一側變暗，屬於表面光照；地面上出現物件的影子，則需要另外處理遮光關係。加上方向光，不會自動讓 WebGL 產生影子。

### 最後呼叫繪圖 API，讓設定出現在畫面上

到目前為止，uniform API 只是更新 GPU 使用的數值。還需要提供頂點與法線的讀取方式，並呼叫 `gl.drawArrays()`。

Demo 的每筆頂點資料依序是 `[x, y, z, nx, ny, nz]`，共 6 個 32 位元浮點數，所以每筆佔 `24` bytes。位置從第 `0` byte 開始，法線從第 `12` byte 開始。`gl.vertexAttribPointer()` 的最後兩個參數分別是每筆間距與起始位移，單位都是 bytes。[API 文件：vertexAttribPointer](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer)

下面把前面各節的 API 接成一次重繪。這段只畫立方體與球體，省略網格與箭頭的額外繪圖呼叫：

```js
// program 連結成功後取得一次 attribute 位置。
const positionLocation = gl.getAttribLocation(program, "a_position");
const normalLocation = gl.getAttribLocation(program, "a_normal");

function drawFrame() {
  // gl.canvas 是原生 canvas 元素；依 CSS 尺寸與 DPR 設定繪圖解析度。
  const canvasElement = gl.canvas;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvasElement.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvasElement.clientHeight * dpr));
  if (canvasElement.width !== width || canvasElement.height !== height) {
    canvasElement.width = width;
    canvasElement.height = height;
  }

  // viewport 設定繪圖區域；投影矩陣也要使用對應的長寬比。
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.enable(gl.DEPTH_TEST); // 讓前方的表面遮住後方表面。
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // 清掉上一張畫面與深度。
  gl.useProgram(program);

  // 每次重繪都傳入目前的相機、投影與光照設定。
  gl.uniformMatrix4fv(locations.view, false, viewMatrix(state));
  gl.uniformMatrix4fv(
    locations.projection,
    false,
    projectionMatrix(state, gl.drawingBufferWidth / gl.drawingBufferHeight),
  );
  gl.uniform3fv(locations.light, direction(state.lightAzimuth, state.lightElevation));
  gl.uniform1f(locations.intensity, state.intensity);
  gl.uniform3fv(locations.color, [111 / 255, 146 / 255, 148 / 255]);
  gl.uniform1i(locations.unlit, 0);

  // 指定既有的立方體＋球體 buffer，再設定 attribute 如何讀取它。
  gl.bindBuffer(gl.ARRAY_BUFFER, objects.buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(normalLocation);

  // 參數依序是：attribute 位置、分量數、資料型別、正規化、間距、位移。
  // 這裡資料本來就是 FLOAT；false 並不是用來把法線變成單位向量。
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 24, 12);

  // 每三個頂點組成一個三角形，從第 0 個頂點畫出 objects.count 個頂點。
  gl.drawArrays(gl.TRIANGLES, 0, objects.count);
}

drawFrame(); // 第一次繪製。
```

`gl.viewport()` 設定繪圖區域，不會幫你重算相機投影。因此畫布 resize 時，要一起更新繪圖尺寸、viewport 與投影矩陣的長寬比。[API 文件：viewport](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/viewport)

`gl.drawArrays(mode, first, count)` 才會用目前的 program、uniform 與頂點設定提交繪圖。這裡 `count` 是頂點數，不是三角形數，也不是陣列中的浮點數總數。[API 文件：drawArrays](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays)

例如，在初始化完成後，把以下程式放進滑桿或按鈕的事件處理函式，就能更新視角：

```js
state.azimuth = 0;   // 從 +Z 側觀看。
state.elevation = 10; // 稍微由上往下看。
drawFrame();         // 重新計算矩陣、上傳 uniform，再呼叫 drawArrays。
```

這裡直接呼叫 `drawFrame()` 是為了看清楚執行順序。實際 Vue Demo 會監聽參數變化，用單一待執行的 `requestAnimationFrame` 合併重繪，並在卸載時清理資源；不需要改動現有元件來套用這段示意流程。

閱讀實作時，可以用這張表對照資料最後送到哪裡：

| 設定內容 | shader 接收欄位 | 使用的 WebGL API |
| --- | --- | --- |
| 相機視圖矩陣 | `uniform mat4 u_view` | `gl.uniformMatrix4fv()` |
| 相機投影矩陣 | `uniform mat4 u_projection` | `gl.uniformMatrix4fv()` |
| 光源方向、材質 RGB | `uniform vec3 u_light`、`u_color` | `gl.uniform3fv()` |
| 光照強度 | `uniform float u_intensity` | `gl.uniform1f()` |
| 是否忽略光照 | `uniform bool u_unlit` | `gl.uniform1i()` |

`state` 是 JavaScript 的設定，矩陣與方向向量是計算結果，uniform API 負責把結果傳入 GPU。最後的畫面，則由 shader 配合繪圖呼叫產生。
