# Day 12｜WebGL（2）：從 2D 三角形到 3D 正方體

昨天我們畫出一個 2D 漸層三角形，走過一次 WebGL 的基本渲染流程：準備頂點資料、把資料放進 Buffer，再交給 Shader 和 GPU 繪製。

今天先不急著加入新的 WebGL API，而是把昨天的三角形繼續往 3D 延伸。我們會多加一個 Z 軸，並把三角形增加到 12 個，組成一個可以從不同角度觀看的漸層正方體。

老樣子，可以搭配 Demo 一起看。拖曳正方體時，畫面會顯示組成各個面的三角形框線。👉🏿 Demo 連結

### 正方體是由 12 個三角形組成

WebGL 最常用的基本圖形是三角形。昨天呼叫 `gl.drawArrays(gl.TRIANGLES, 0, 3)`，剛好用三個頂點畫出一個三角形。今天要畫的正方體看起來是由六個正方形組成，但交給 WebGL 前，每個面仍要拆成三角形。

一個正方形可以沿著對角線切成兩個三角形：

```text
0 ───── 3
│     ╱ │
│   ╱   │
│ ╱     │
1 ───── 2

第一個三角形：0、1、2
第二個三角形：0、2、3
```

正方體有六個面，每個面需要兩個三角形，所以總數是：

```text
6 個面 × 2 個三角形 = 12 個三角形
12 個三角形 × 3 個頂點 = 36 筆頂點資料
```

這也是為什麼 Demo 拖曳時會看見每個正方形中間多出一條斜線。那不是額外裝飾，而是兩個三角形相接的地方。

### 從 2D 到 3D：多出來的 Z 軸

Day 11 的三角形只使用 X、Y 兩個數值描述位置：

```js
// x, y
[0, 0.78]
```

X 決定左右，Y 決定上下。到了 3D，每個頂點再多一個 Z：

```js
// x, y, z
[-1, -1, 1]
```

Z 表示前後，也就是頂點離觀察位置有多遠。這次先把正方體中心放在 `(0, 0, 0)`，每個軸的範圍都是 `-1` 到 `1`。例如正面的四個角可以寫成：

```js
[
  [-1, -1, 1],
  [ 1, -1, 1],
  [ 1,  1, 1],
  [-1,  1, 1],
]
```

這四個頂點的 Z 都是 `1`，代表它們在同一個平面上。背面的 Z 則改成 `-1`，左右、上下四個面再分別固定 X 或 Y，就能圍出完整的正方體。

昨天 Vertex Shader 接收的位置型別是 `vec2`：

```glsl
attribute vec2 a_position;
```

今天每個位置有三個值，因此改成 `vec3`：

```glsl
attribute vec3 a_position;
```

這裡的 `[-1, 1]` 是我們替正方體設定的物件座標，不等於 Canvas 上的像素。頂點進入 Vertex Shader 後，還要轉換成 WebGL 最後使用的裁切空間座標，才能正確顯示在畫面上。這段轉換牽涉到旋轉與投影，我們先知道它發生在 Vertex Shader 裡即可，矩陣留到後面的單元再拆。

### 準備正方體的頂點資料

接下來依序建立正面、背面、右面、左面、上面和下面。每個面先保存四個角，程式會再把它拆成兩個三角形：

```js
const faces = [
  // 正面：z = 1
  { p: [[-1,-1, 1], [ 1,-1, 1], [ 1, 1, 1], [-1, 1, 1]] },

  // 背面：z = -1
  { p: [[ 1,-1,-1], [-1,-1,-1], [-1, 1,-1], [ 1, 1,-1]] },

  // 右面：x = 1
  { p: [[ 1,-1, 1], [ 1,-1,-1], [ 1, 1,-1], [ 1, 1, 1]] },

  // 左面：x = -1
  { p: [[-1,-1,-1], [-1,-1, 1], [-1, 1, 1], [-1, 1,-1]] },

  // 上面：y = 1
  { p: [[-1, 1, 1], [ 1, 1, 1], [ 1, 1,-1], [-1, 1,-1]] },

  // 下面：y = -1
  { p: [[-1,-1,-1], [ 1,-1,-1], [ 1,-1, 1], [-1,-1, 1]] },
]
```

四個頂點還不能直接交給 `gl.TRIANGLES`，因為這個模式固定每三筆資料組成一個三角形。我們使用 `[0, 1, 2, 0, 2, 3]` 依序取出六筆資料：

```js
const vertices = []

for (const face of faces) {
  for (const index of [0, 1, 2, 0, 2, 3]) {
    const position = face.p[index]
    const color = position[1] > 0
      ? [0.91, 0.35, 0.68]
      : [0.22, 0.17, 0.79]

    vertices.push(...position, ...color)
  }
}
```

`0` 和 `2` 在同一個面出現兩次，正好形成兩個三角形共用的對角線。正方體相鄰的面也會共用角落，但在這個 `drawArrays()` 寫法中，同一個位置仍會重複放進陣列。WebGL 不會替我們判斷哪些頂點相同，它只會照陣列順序，每三筆取出來畫一次。

上面的簡化版本讓每筆頂點保存六個數值，排列方式是：

```text
x, y, z, r, g, b
```

Demo 的實際資料還多放了一組法線，因此每筆是九個數值。法線用來計算各個面的明暗，不影響「36 筆頂點組成 12 個三角形」的結構，這篇先不展開。

Shader 的工作也可以先抓住兩件事：Vertex Shader 讀取三維位置與顏色，Fragment Shader 接收插值後的顏色並輸出。正方體從粉紅過渡到藍紫，就是各個頂點之間的顏色被自動補出來的結果。

### 使用 `drawArrays()` 畫出 12 個三角形

頂點資料準備好後，和昨天一樣轉成 `Float32Array`，再上傳到 Buffer：

```js
const buffer = gl.createBuffer()

gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array(vertices),
  gl.STATIC_DRAW,
)
```

接著告訴 WebGL 每筆資料要怎麼讀。Demo 每個頂點依序存放三個位置、三個顏色和三個法線，總共是九個 `float`。一個 `float` 佔 4 bytes，所以相鄰頂點相隔 `9 × 4 = 36 bytes`：

```js
const stride = 9 * Float32Array.BYTES_PER_ELEMENT

const positionLocation = gl.getAttribLocation(program, 'a_position')
gl.enableVertexAttribArray(positionLocation)
gl.vertexAttribPointer(
  positionLocation,
  3,        // x、y、z
  gl.FLOAT,
  false,
  stride,   // 每筆頂點相隔 36 bytes
  0,        // 位置從第 0 byte 開始
)

const colorLocation = gl.getAttribLocation(program, 'a_color')
gl.enableVertexAttribArray(colorLocation)
gl.vertexAttribPointer(
  colorLocation,
  3,        // r、g、b
  gl.FLOAT,
  false,
  stride,
  3 * Float32Array.BYTES_PER_ELEMENT, // 顏色從第 12 byte 開始
)
```

最後正式繪製：

```js
gl.drawArrays(gl.TRIANGLES, 0, 36)
```

這三個參數分別表示：

- `gl.TRIANGLES`：每三筆頂點組成一個三角形。
- `0`：從第 0 筆頂點開始讀取。
- `36`：總共讀取 36 筆頂點。

WebGL 會依序把 36 筆頂點切成 12 組，每組三筆。這 12 個三角形兩兩拼成六個面，正方體就完成了。

### 今日小結

今天的程式比昨天長了不少，不過幾何資料的變化很直接：位置從 `vec2` 變成 `vec3`，加入 Z 軸；一個三角形擴充成 12 個三角形；`drawArrays()` 也從讀取 3 筆頂點增加到 36 筆。

我們已經把正方體的骨架交給 GPU 了。至於它如何旋轉、產生近大遠小的透視感，以及擋住後方的面，後面再各自拆開來看。
