# Day 12｜WebGL（2）3D立方體

昨天我們畫出一個 2D 漸層三角形，走過一次 WebGL 的基本渲染流程：準備頂點資料、把資料放進 Buffer，再交給 Shader 和 GPU 繪製。

今天先不急著加入新的 WebGL API，而是把昨天的三角形繼續往 3D 延伸。我們會多加一個 Z 軸，並把三角形增加到 12 個，組成一個可以從不同角度觀看的漸層正方體。

老樣子，可以搭配 Demo 一起看。拖曳正方體時，畫面會顯示組成各個面的三角形框線。👉🏿 Demo 連結

### 正方體是由 12 個三角形組成

WebGL 最常使用的基本圖形是三角形。幾乎所有 3D 模型都能拆解成由大量三角形組成的網格，詳細原理可參考 三角網格。

昨天呼叫 `gl.drawArrays(gl.TRIANGLES, 0, 3)`，剛好用三個頂點畫出一個三角形。今天要畫的正方體看起來是由六個正方形組成，但交給 WebGL 前，每個面仍要拆成三角形去製作三角網格。

正方體有六個面，每面可以沿著對角線切成兩個三角形，所以總數是：

6 個面 × 2 個三角形 = 12 個三角形
12 個三角形 × 3 個頂點 = 36 筆頂點資料

### Z 軸

Day 11 的三角形只使用 X、Y 兩個數值描述位置，X 軸決定左右，Y 軸決定上下。到了 3D，每個頂點再多一個 Z 軸，決定深度：

```jsx
// 2D x, y
[0, 0.78][
  // 3D x, y, z
  (-1, -1, 1)
];
```

這次我們把正方體中心放在 `(0, 0, 0)`，每個軸的範圍都是 `-1` 到 `1`。例如正面 ( Z=1 ) 的四個角可以寫成：

```jsx
[
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
```

將六個面的頂點資料列出，就能圍出一個完整的立方體。

### Shader

昨天的每個頂點只有 X、Y 兩個位置數值，今天加入 Z 軸後，Vertex Shader 接收的每筆位置資料也從二維改成三維。

頂點進入 Vertex Shader 後，GPU 會依照目前的觀看角度旋轉正方體，計算各個面的明暗，再套用投影，將三維位置轉換成 WebGL 最後使用的裁切空間座標。這段轉換會用到矩陣，我們先知道它負責處理旋轉與投影即可，詳細原理留到後面的單元再拆解。

接著，GPU 會把三角形轉換成畫面上的像素範圍，並自動補出頂點之間的顏色。Fragment Shader 再決定這些位置最後顯示的顏色，形成正方體由粉紅過渡到藍紫的效果。

到這裡，前面準備好的頂點資料就會交給 GPU，依序經過 Vertex Shader、光柵化與 Fragment Shader，最後繪製到畫布上。

### 準備正方體的頂點資料

接下來依序建立立方體的六個面。

```jsx
const faces = [
  {
    p: [
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  },
  {
    p: [
      [1, -1, -1],
      [-1, -1, -1],
      [-1, 1, -1],
      [1, 1, -1],
    ],
  },
  {
    p: [
      [1, -1, 1],
      [1, -1, -1],
      [1, 1, -1],
      [1, 1, 1],
    ],
  },
  {
    p: [
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, 1],
      [-1, 1, -1],
    ],
  },
  {
    p: [
      [-1, 1, 1],
      [1, 1, 1],
      [1, 1, -1],
      [-1, 1, -1],
    ],
  },
  {
    p: [
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ],
  },
];
```

!image.png

每個面的四個頂點還不能直接交給 `gl.TRIANGLES`，要先拆成兩個三角形，因此我們使用 `[0, 1, 2, 0, 2, 3]` 依序取出六筆資料：

```jsx
const vertices = [];

for (const face of faces) {
  for (const index of [0, 1, 2, 0, 2, 3]) {
    const position = face.p[index];
    const color = position[1] > 0 ? [0.91, 0.35, 0.68] : [0.22, 0.17, 0.79];

    vertices.push(...position, ...color);
  }
}
```

上面的簡化版本讓每筆頂點保存六個數值，排列方式是 `x, y, z, r, g, b`

實際 demo 中的頂點資料還多放了一組法線，因此每筆是九個數值 `x, y, z, r, g, b, nx, ny, nz`。法線用來計算各個面的明暗，不影響「36 筆頂點組成 12 個三角形」的結構，之後有關光影的部分再詳述。

Shader 的部分我們只需先了解，Vertex Shader 讀取三維位置與顏色，Fragment Shader 接收插值後的顏色並輸出。正方體從粉紅過渡到藍紫，就是各個頂點之間的顏色被自動補出來的結果。

### 使用 `drawArrays()` 畫出 12 個三角形

頂點資料準備好後，和昨天一樣轉成 `Float32Array`，再上傳到 Buffer：

```jsx
const buffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
```

接著告訴 WebGL 每筆資料要怎麼讀。Demo 每個頂點依序存放三個位置、三個顏色和三個法線，總共是九個 `float`。一個 `float` 佔 4 bytes，所以相鄰頂點相隔 `9 × 4 = 36 bytes`：

```jsx
const stride = 9 * Float32Array.BYTES_PER_ELEMENT;

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
  positionLocation,
  3, // x、y、z
  gl.FLOAT,
  false,
  stride, // 每筆頂點相隔 36 bytes
  0, // 位置從第 0 byte 開始
);

const colorLocation = gl.getAttribLocation(program, "a_color");
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(
  colorLocation,
  3, // r、g、b
  gl.FLOAT,
  false,
  stride,
  3 * Float32Array.BYTES_PER_ELEMENT, // 顏色從第 12 byte 開始
);
```

最後正式繪製出圖形：

```jsx
gl.drawArrays(gl.TRIANGLES, 0, 36);
```

36 就是代表：六個面，每面兩個三角形，每個三角形三個頂點 ⇒ 6 × 2 × 3 =36

!螢幕擷取畫面 2026-08-27 155826.png
