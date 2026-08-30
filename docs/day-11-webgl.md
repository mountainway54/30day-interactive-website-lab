# Day 11｜WebGL(1)

經過了鐵人賽的 1/3 ，我們終於來到了 WebGL，可喜可賀！如我們在 day7 有稍微提過的，WebGL 也是 `<canvas>` 中的另一種繪圖環境，是瀏覽器中的 GPU 圖形 API，可以把大量頂點與像素運算交給顯示卡處理，因此很適合 3D 場景、複雜特效和大量圖形資料。

實際開發時，多數前端工程師不會直接裸寫 WebGL，而是使用上層函式庫，例如 Three.js，因此 WebGL 會著重原理與渲染邏輯，而非實作語法。

**Canvas 2D API 是高階繪圖 API**，例如 `fillRect()`、`strokeText()`、`drawImage()`、`arc()`，你可以直接告訴瀏覽器「畫一個矩形、文字或圖片」；**WebGL API 則是低階 GPU API**，需要先準備圖形的座標與相關資料，再設定這些資料如何被處理、如何決定位置與顏色，最後將繪製指令交給 GPU 執行。簡而言之，WebGL 控制更細、效能上限更高，但程式碼也更複雜。

整個圖像產生的流程可以想像成：

JavaScript 中準備好圖形的頂點座標  
⇒ 再透過 Buffer 將這些資料傳給 GPU  
⇒ Vertex Shader 會逐一處理每個頂點，決定它們最終出現在畫面上的位置  
⇒ 經過 Rasterization 轉換成螢幕上需要處理的像素片段  
⇒ Fragment Shader 決定每個片段的顏色
最後才形成我們實際看到的畫面。

!image.png

接下來，讓我們實作「畫出一個 2D 漸層色三角形」，試圖釐清每個階段再幹嘛~~

老樣子，我們可以搭配 demo 來實際操作~ 👉🏿 demo連結

首先 Canvas 2D 相同，我們要先建一塊畫布

```html
<body>
  <canvas id="glCanvas" width="400" height="400"></canvas>
</body>
```

但不同的是我們會使用 `webgl` 而非 `2d`，取得的繪圖環境也習慣命名成 `gl`：

```jsx
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
```

### Vertex data 頂點資料

先建立頂點資料，Demo 中的三角形由三個頂點組成，位置分別是 `(0, 0.78)`、`(-0.78, -0.72)`、`(0.78, -0.72)`

（這裡使用的是 NDC 座標系統，畫面中心是 `(0, 0)`，X 軸向右為正、向左為負；Y 軸向上為正、向下為負）

這些數值代表相對位置，而不是像素，所以 Canvas 尺寸改變時，頂點仍會維持相同的相對位置。接著替每個頂點加入 RGB 顏色。位置與顏色放在同一個陣列中，每五個數字代表一個頂點，順序是 `x、y、r、g、b`上方頂點的 `(0.91, 0.35, 0.68)` 是粉紅色，底部兩個頂點的 `(0.22, 0.17, 0.79)` 是藍紫色：

```
const vertices = new Float32Array([
  // x      y      r     g     b
   0,     0.78,   0.91, 0.35, 0.68,
  -0.78, -0.72,   0.22, 0.17, 0.79,
   0.78, -0.72,   0.22, 0.17, 0.79,
]);
```

`Float32Array` 是在把 JavaScript 裡的數字以 32 位元浮點數儲存資料，整理成 GPU 容易快速讀取的格式，之後再透過 Buffer 上傳給 GPU。

### 為什麼需要 Buffer？

Buffer 是 WebGL 裡「把資料從 CPU（JavaScript）送到 GPU」的核心機制
GPU 有自己獨立的記憶體，沒辦法直接讀取 JavaScript 陣列。Buffer 就是在 GPU 記憶體裡開一塊空間，把 JS 的資料「上傳」進去，之後 GPU 畫圖時才讀得到。

### Shader

Shader 是在 GPU 上執行的程式，用來處理圖形渲染流程中的資料，使用 GLSL 語言撰寫。這裡先認識兩種最基本的 Shader：`Vertex` 和 `Fragment`。

- Vertex Shader：負責處理頂點，最主要的工作是算出頂點最後的位置，也可以把顏色等資料往後傳。以 2D 三角形 Demo 來說，頂點位置幾乎就是直接使用我們給的座標；3D 的圖形才會加入旋轉和投影等計算。三個頂點的位置確定後，三角形的形狀和範圍也就確定了。接著 Rasterization（光柵化）會找出三角形蓋到哪些位置，產生對應的片段。三個頂點如果有不同顏色，中間的顏色也會自動混合，形成平滑的漸層。
- Fragment Shader：處理中間的過渡片段，決定它最後要輸出什麼顏色。這次的三角形沒有做其他效果，只是把前面算好的漸層顏色直接輸出，所以最後就會看到三個頂點的顏色自然混合在一起。

# 以下 shader 程式碼部分較複雜，之後 GLSL 單元會再仔細講解~~

先看這次使用的 Vertex Shader。`a_position` 和 `a_color` 會從 Buffer 拿到頂點的位置與顏色；`gl_Position` 用來告訴 GPU 頂點要放在哪裡，`v_color` 則把顏色繼續往後傳。

```glsl
attribute vec2 a_position;
attribute vec3 a_color;
varying vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
```

接著，光柵化會自動算出三個頂點中間的顏色。Fragment Shader 收到這些顏色後，再透過 `gl_FragColor` 輸出。最後的 `1.0` 是 Alpha，代表完全不透明。

```glsl
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
```

Shader 寫完後還不能直接使用，要先分別編譯，再把 Vertex Shader 和 Fragment Shader 組成一個 Shader Program。這裡的 `program` 是我們自己取的變數名稱，內容來自 `gl.createProgram()`：

```js
const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);
```

這裡的 `compile()` 是我們自己整理的 Shader 編譯函式；`vertexSource` 和 `fragmentSource` 就是上面兩段 GLSL 原始碼。看到 `gl.` 開頭的名稱，例如 `gl.VERTEX_SHADER`、`gl.FRAGMENT_SHADER`，代表它們是 WebGL 提供的常數或 API；`program`、`vertexSource` 則是我們自己宣告的變數。

最後透過 `gl.useProgram(program)` 告訴 WebGL：「接下來畫圖，就使用這組 Shader。」

這裡用到很多 GLSL，現在看不懂沒關係，往後的文章會仔細解說～～

### Frame Buffer 與繪製畫面

前面建立的頂點 Buffer，存放的是「準備拿來繪製的資料」；當 GPU 完成運算後，繪製結果則會寫入 Frame Buffer（影格緩衝區）。

可以把 Frame Buffer 想成 GPU 最後把畫面畫上去的地方。其中的 Color Buffer（色彩緩衝區），會記錄每個像素最後呈現的顏色。

WebGL 本身已經為 Canvas 準備好一個預設的 Frame Buffer，因此這個 demo 不需要另外建立。只要前面的頂點資料與 Shader 都設定完成，就可以直接把結果畫到 Canvas 上。

接下來，就透過幾個繪製相關的 API 來完成最後一步：

```jsx
// 指定這次繪製使用的 Shader Program
gl.useProgram(program);

// 將 NDC 座標映射到整張畫布
gl.viewport(0, 0, canvas.width, canvas.height);

// 設定清除時使用的 RGBA 顏色：透明黑色
gl.clearColor(0, 0, 0, 0);

// 用上面設定的顏色清除色彩緩衝區
gl.clear(gl.COLOR_BUFFER_BIT);

// 從第 0 筆頂點開始，讀取 3 筆頂點，畫出一個三角形
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

`clearColor()` 只是先設定「清除畫面時要用什麼顏色」，真正把畫面清掉的是 `clear()`。

`gl.TRIANGLES` 也不是自己宣告的變數，而是 WebGL 定義在 `gl` 上的繪圖模式常數，表示每三個頂點組成一個獨立三角形。

接著呼叫 `drawArrays()`，正式告訴 GPU 開始繪製。GPU 會執行 `useProgram()` 指定的 Shader，經過光柵化等流程，算出每個像素的顏色，最後把繪製結果寫進 Frame Buffer。

完成後，瀏覽器會把 Canvas 和其他網頁內容一起顯示出來，我們就能在畫面上看到三角形了，可喜可賀！

雖然 WebGL 看起來比 Canvas 2D 複雜不少，但也正因為它更接近 GPU 的繪製流程，所以能做到更多高效又複雜的視覺效果。明天我們就直接進入 3D 的世界~~
