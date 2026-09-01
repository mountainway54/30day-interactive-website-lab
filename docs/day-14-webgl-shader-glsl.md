# Day 14｜WebGL（4）

在 day11 的文章中我們已經有稍微提過 shader 的概念，今天就延續前兩天的立方體，進一步認識 Shader 的運作方式，並用 GLSL 寫出負責頂點位置與顏色的 Vertex Shader 和 Fragment Shader。

老樣子，可以搭配 Demo 一起看。👉🏿 Demo 連結

### Shader 是什麼

Shader（著色器）是跑在 GPU 上的程式，用 **GLSL**（OpenGL Shading Language）撰寫，負責決定「每個頂點要畫在哪裡」以及「每個像素要顯示什麼顏色」。GPU 有大量平行運算核心，同一份 shader 程式碼會同時對成千上萬個頂點/像素平行執行，所以速度非常快。

在 WebGL 最基本的繪製流程中，包含頂點著色器 Vertex Shader 與 片段著色器 Fragment Shader。

Vertex Shader：JS 傳入頂點的位置、顏色與轉換矩陣後，Vertex Shader 會算出每個頂點最後在 Clip Space 中的位置，並寫入 `gl_Position`。

Fragment Shader ：三角形經過光柵化後會產生許多片段，Shader 會替每個片段算出要寫入畫面的顏色。

以 Day 12 的立方體來說，`drawArrays()` 會送出 36 筆頂點資料，Vertex Shader 會分別處理這些頂點；接著，光柵化會找出每個三角形覆蓋的區域，並在頂點之間自動插值顏色，再交給 Fragment Shader 處理。

### GLSL

WebGL 的 Shader 使用 GLSL（OpenGL Shading Language）撰寫。GLSL 是一種語法風格接近 C 的語言，並針對 GPU 圖形運算加入向量、矩陣與 Shader 資料傳遞等功能。

> OpenGL 是一套跨平台的圖形 API，定義了應用程式如何與 GPU 溝通並進行 2D、3D 圖形渲染。OpenGL ES（OpenGL for Embedded Systems）則是針對行動裝置與嵌入式系統所設計的精簡版本，而 WebGL 進一步以 OpenGL ES 為基礎，將類似的 GPU 繪圖能力帶進瀏覽器，讓開發者能透過 JavaScript 在網頁中實現高效能的即時圖形渲染。

首先相對於 JS，GLSL 是強型別語言。宣告變數時必須寫出型別，而且不同型別不能隨意混用：

```glsl
// 宣告一個浮點數
float opacity = 1.0;

// 分別建立包含 2、3、4 個浮點數的向量
vec2 position = vec2(0.5, -0.5);
vec3 color = vec3(1.0, 0.3, 0.2);
vec4 positionWithW = vec4(position, 0.0, 1.0);
```

GLSL 中通常會把浮點數寫成 `1.0`，而不是 `1`，明確表示這個值的型別。

`vec2` 是由 2 個 `float` 組成的向量，`vec3` 是由 3 個 `float` 組成的向量，而 `vec4` 則是由 4 個 `float` 組成的向量。它們經常用來保存位置、顏色等圖形資料，例如 3D 位置可以用 `vec3` 保存，RGBA 顏色則可以用 `vec4` 保存。

向量中的分量可以用 `.x`、`.y`、`.z`、`.w` 取得；處理顏色時，也能使用意思相同的 `.r`、`.g`、`.b`、`.a`：

```glsl
// 建立包含 RGBA 四個分量的顏色
vec4 color = vec4(0.8, 0.2, 0.1, 1.0);

// 可以一次取出向量中的一個或多個分量
float red = color.r;
vec3 rgb = color.rgb;
vec2 redAndGreen = color.rg;
```

`mat4` 則是 4 × 4 矩陣。前一天使用的 Model、View、Projection Matrix，都會用 `mat4` 傳入 Vertex Shader。

每個 Shader 都要有一個 `main()` 函式，GPU 會從這裡開始執行：

```glsl
void main() {
  // GPU 會從 main() 開始執行 Shader 的主要運算
}
```

`void` 代表這個函式沒有回傳值，程式敘述的結尾則要加上分號。

### attribute 屬性：每個頂點自己的資料

`attribute` 用來接收頂點 Buffer 中的資料，例如位置、顏色、法線或紋理座標。每次 Vertex Shader 處理新的頂點時，都會讀到該頂點對應的值。

立方體的每筆頂點資料包含三個位置值與三個顏色值，因此可以宣告成：

```glsl
attribute vec3 a_position; // 接收每個頂點各自的位置
attribute vec3 a_color; // 接收每個頂點各自的顏色

// 變數名稱中的 a_ 用來提醒自己這是 attribute
```

`attribute` 只能在 Vertex Shader 中宣告。Fragment Shader 不會直接讀取頂點 Buffer，如果想把頂點顏色交給 Fragment Shader，還需要使用 `varying`。

### varying 變化：從 Vertex Shader 傳到 Fragment Shader

Vertex Shader 算完頂點後，有些資料還要繼續傳給 Fragment Shader。這時會用到 `varying`：

```glsl
// 將頂點顏色傳給 Fragment Shader
varying vec3 v_color;
```

同一個 varying 必須在 Vertex Shader 與 Fragment Shader 中使用相同的名稱與型別。Vertex Shader 先替它寫入值：

```glsl
// 把目前頂點的顏色寫入 varying
v_color = a_color;
```

光柵化時，GPU 會在三角形的頂點之間自動插值 `v_color`。假設三個頂點分別是紅、綠、藍色，三角形中央收到的就不是其中某一個頂點的原色，而是三者混合後的顏色。

### uniform：一次繪製共用的資料

`uniform` 用來接收「這次繪製期間不會改變的值」。JavaScript 只要在呼叫 `drawArrays()` 前設定一次，接下來執行 Vertex Shader 的每個頂點都會讀到相同的值。

以立方體為例，36 個頂點各自有不同的位置和顏色，所以位置與顏色要使用 `attribute`。但是，這 36 個頂點屬於同一個立方體，會一起套用相同的 Model、View 和 Projection Matrix，因此這三個矩陣可以使用 `uniform` 傳入：

```glsl
// 這三個矩陣會由這次繪製的所有頂點共用
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

// 變數名稱中的 u_ 用來提醒自己這是 uniform
```

例如模型旋轉後，JavaScript 會先更新 `u_model`，再呼叫下一次 `drawArrays()`。這次送進 Vertex Shader 的 36 個頂點，就會一起使用新的 Model Matrix 計算位置。

### Vertex Shader

把上面的變數放在一起，就能寫出這次立方體使用的 Vertex Shader：

```glsl
// 接收每個頂點各自的位置與顏色
attribute vec3 a_position;
attribute vec3 a_color;

// 接收同一次繪製共用的 Model、View 與 Projection Matrix
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

// 將顏色從 Vertex Shader 傳給 Fragment Shader
varying vec3 v_color;

void main() {
  // 補上 w = 1.0，將三維位置轉成可進行矩陣運算的 vec4
  vec4 modelPosition = vec4(a_position, 1.0);

  // 依序完成 Model、View 與 Projection 座標轉換
  gl_Position =
    u_projection *
    u_view *
    u_model *
    modelPosition;

  // 把目前頂點的顏色傳往後續階段
  v_color = a_color;
}
```

a_position 原本是 vec3，先補上 w = 1.0 轉成 vec4，讓它可以參與矩陣運算。接著依序套用 Model、View、Projection Matrix，將頂點從模型自己的座標空間一路轉換到 Clip Space，最後把結果交給 gl_Position，讓 WebGL 繼續進行裁切、透視除法與光柵化。同時，`v_color = a_color` 會把頂點顏色傳給下一個階段，而頂點之間的顏色過渡則由 GPU 自動插值完成。

### Fragment Shader

至於 Fragment Shader 的部分，這個demo 就比較單純，它只需要接收插值後的顏色，再把結果輸出：

```glsl
// 設定 Fragment Shader 中 float 的預設精度
precision mediump float;

// 接收 Vertex Shader 傳來並經過插值的顏色
varying vec3 v_color;

void main() {
  // 補上 Alpha = 1.0，輸出完全不透明的 RGBA 顏色
  gl_FragColor = vec4(v_color, 1.0);
}
```

Fragment Shader 一開始用 precision mediump float 設定浮點數為中等精度，對這次的顏色處理已經足夠。接著透過 varying vec3 v_color 接收 Vertex Shader 傳來、並經過光柵化插值後的 RGB 顏色。最後使用 vec4(v_color, 1.0) 補上 Alpha，將 RGB 轉成 RGBA 並寫入 gl_FragColor，其中 Alpha 設為 1.0，代表完全不透明。

### JavaScript 如何把資料交給 Shader

GLSL 程式碼通常會先以字串`vertexShader` `fragmentShader`的形式放在 JS 中

WebGL 不會直接執行這兩段字串。JavaScript 端要先建立並編譯兩個 Shader，再把它們連結成一組 Shader Program：

```jsx
// 分別建立並編譯 Vertex Shader 與 Fragment Shader
const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

// 建立 Program，附加兩個 Shader 後將它們連結
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

// 將連結完成的 Program 設為目前繪製使用的程式
gl.useProgram(program);
```

這裡的 `compileShader()` 是我們自己整理的輔助函式，負責呼叫 `gl.createShader()`、`gl.shaderSource()` 與 `gl.compileShader()`。Vertex Shader 和 Fragment Shader 必須成功連結成 Program，WebGL 才知道這次繪製要使用哪一組運算方式。

Program 建立後，JavaScript 可以按照 GLSL 中的變數名稱找到對應位置：

```jsx
// 找出兩個 attribute 在 Program 中的位置
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");

// 找出三個 uniform 在 Program 中的位置
const modelLocation = gl.getUniformLocation(program, "u_model");
const viewLocation = gl.getUniformLocation(program, "u_view");
const projectionLocation = gl.getUniformLocation(program, "u_projection");
```

`attribute` 的資料來自 Buffer。按照今天簡化後的資料格式，每筆頂點依序保存三個位置值與三個顏色值。JavaScript 要告訴 WebGL 每筆資料有多長，以及各欄位從哪裡開始：

```jsx
// 每筆頂點包含 6 個 float：位置 3 個、顏色 3 個
const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

// 啟用位置 attribute，並從每筆資料的第 1 個值開始讀取 3 個 float
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);

// 啟用顏色 attribute，並跳過前 3 個位置值後讀取 3 個 float
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(
  colorLocation,
  3,
  gl.FLOAT,
  false,
  stride,
  3 * Float32Array.BYTES_PER_ELEMENT,
);
```

三個 `uniform` 矩陣則透過 `uniformMatrix4fv()` 傳入：

```jsx
// 將 Model、View 與 Projection Matrix 傳入對應的 uniform
gl.uniformMatrix4fv(modelLocation, false, modelMatrix);
gl.uniformMatrix4fv(viewLocation, false, viewMatrix);
gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
```

最後呼叫：

```jsx
// 以三角形模式繪製 36 個頂點
gl.drawArrays(gl.TRIANGLES, 0, 36);
```

WebGL 就會讀取 36 筆頂點資料，使用目前的 Program 執行 Vertex Shader，完成光柵化後再執行 Fragment Shader。

把這次出現的變數依照來源整理在一起：

| 變數           | 型別             | 從哪裡來             | 在哪裡使用              | 用途                          |
| -------------- | ---------------- | -------------------- | ----------------------- | ----------------------------- |
| `a_position`   | `attribute vec3` | 頂點 Buffer          | Vertex Shader           | 每個頂點的位置                |
| `a_color`      | `attribute vec3` | 頂點 Buffer          | Vertex Shader           | 每個頂點的顏色                |
| `u_model`      | `uniform mat4`   | JavaScript           | Vertex Shader           | Model Space 轉到 World Space  |
| `u_view`       | `uniform mat4`   | JavaScript           | Vertex Shader           | World Space 轉到 View Space   |
| `u_projection` | `uniform mat4`   | JavaScript           | Vertex Shader           | View Space 轉到 Clip Space    |
| `v_color`      | `varying vec3`   | Vertex Shader        | Vertex、Fragment Shader | 將顏色傳往後續階段並進行插值  |
| `gl_Position`  | 內建 `vec4`      | Vertex Shader 寫入   | WebGL 後續流程          | 頂點在 Clip Space 中的位置    |
| `gl_FragColor` | 內建 `vec4`      | Fragment Shader 寫入 | Frame Buffer            | Fragment 最後輸出的 RGBA 顏色 |

現在回頭看完整流程，JavaScript 會將每個頂點不同的位置與顏色放進 `attribute`，再把這次繪製共用的矩陣放進 `uniform`。Vertex Shader 算出 `gl_Position`，並透過 `varying` 把顏色往後傳；光柵化替顏色做插值，Fragment Shader 最後將結果寫入 `gl_FragColor`。

前幾天看到的漸層立方體，就是由這兩段 Shader 一起完成的。
明天我們繼續來寫不同 Shader
