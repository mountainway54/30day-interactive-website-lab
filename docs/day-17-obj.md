這幾天已經被 GLSL 與各種向量計算搞得頭昏眼花，今天就先來輕鬆一下～

前面畫三角形、立方體時，我們直接在程式裡寫下頂點座標；到了球體，則用迴圈搭配三角函數產生頂點。但如果今天圖形非常複雜，總不能用座標一個一個算出來吧？

這時候就可以交給建模工具。模型在 Blender 裡做好後，匯出頂點、面索引等資料，再由網頁讀取，就能把形狀還原出來。今天要認識的，就是結構簡單、又廣泛支援的 3D 模型格式——OBJ。

OBJ 簡單通用而且相容性高，用相對直觀的方式記錄模型的頂點、面、法線與 UV 等基本幾何資訊，幾乎所有主流 3D 軟體都能匯入與匯出。由於格式結構單純、容易理解，OBJ 不只適合在不同軟體之間交換模型，也很適合用來學習 3D 模型在檔案中究竟是如何被描述與儲存的。

### OBJ 裡面放了什麼？

Wavefront OBJ 的副檔名是 `.obj`，內容是純文字。以今天要用的多邊形模型來說，每行開頭會標示這一行記錄哪種資料：

| 開頭               | 用途                     | 範例                 |
| ------------------ | ------------------------ | -------------------- |
| `v`                | 頂點位置，通常是 x、y、z | `v 0 1 0`            |
| `vt`               | 貼圖座標，常見的是 u、v  | `vt 0.5 1`           |
| `vn`               | 法線方向                 | `vn 0 0 1`           |
| `f`                | 組成一個面的索引         | `f 1 2 3`            |
| `o`、`g`           | 物件或群組名稱           | `o Snorlax`          |
| `mtllib`、`usemtl` | 引用材質檔、指定材質名稱 | `mtllib snorlax.mtl` |
| `#`                | 註解                     | `# A triangle`       |

先看最簡單的例子，下面這幾行就是一個三角形：

```
v -1 0 0
v 1 0 0
v 0 1 0
f 1 2 3
```

前三行定義頂點，最後的 `f 1 2 3` 告訴我們，要把第 1、2、3 個頂點連成一個面。OBJ 的正索引從 `1` 開始，和 JavaScript 陣列從 `0` 開始不同；如果自己寫解析器，就要記得轉換。

這份文字也可以直接貼到今天的 Demo，先確認三角形能出現，再換成整隻卡比獸。

### 頂點座標和 UV 有什麼不同？

頂點座標決定模型表面的位置，UV 則決定表面要對應到貼圖的哪個位置。常見的 UV 會用 `0` 到 `1` 表示圖片上的位置，但格式本身並不把數值限制在這個範圍。

在 Blender 裡，頂點會隨著建模操作產生；UV 則需要模型原本就有，或透過 UV 展開等方式建立。匯出 OBJ 時，可以將既有的 UV 一起寫入 `vt`，並不是只要匯出就會自動得到合適的 UV。

如果一個面同時引用位置、UV 和法線，會長得像這樣：

```
f 1/2/1 3/4/1 5/6/1
```

每組數字的順序是 `頂點索引/UV 索引/法線索引`。例如 `1/2/1` 表示使用第 1 個頂點、第 2 筆 UV，以及第 1 筆法線。這三種資料各有自己的索引，數字不一定相同。

有些檔案只提供位置和法線，就會看到中間留空的寫法：

```
f 1//1 2//1 3//1
```

今天先把重點放在形狀。Demo 會保留頂點和面的連接關係，忽略 UV、原始材質與貼圖，也不使用檔案裡的 `vn`，而是由幾何資料重新產生法線，讓單色模型能呈現明暗。

### 實際玩玩看：先準備 OBJ

可以從模型網站尋找提供 OBJ 格式的模型。這次我使用的是 Free3D，下載前先確認檔案格式，也要看清楚模型的使用條件。

![https://ithelp.ithome.com.tw/upload/images/20260905/201831499wA8reW2e7.png](https://ithelp.ithome.com.tw/upload/images/20260905/201831499wA8reW2e7.png)
我選了一隻可愛的卡比獸。預覽圖裡可以看到一般配色與另一種配色，不過今天只取用模型形狀，所以不需要準備這些貼圖。

![https://ithelp.ithome.com.tw/upload/images/20260905/201831498UzehMPZgn.png](https://ithelp.ithome.com.tw/upload/images/20260905/201831498UzehMPZgn.png)

下載並解壓縮後，找到 `snorlax.obj`

### 用 Blender 自己建模 !

如果想自己做模型，也可以在 Blender 裡建模，再匯出 OBJ；或先用 File → Import → Wavefront (.obj) 匯入現成模型，調整後再輸出。![https://ithelp.ithome.com.tw/upload/images/20260905/20183149xz8D6roZZB.png](https://ithelp.ithome.com.tw/upload/images/20260905/20183149xz8D6roZZB.png)

下圖是卡比獸在 Blender 裡的樣子。即使先不顯示貼圖，仍然能看出它的肚子、耳朵和四肢都是由網格組成。

![https://ithelp.ithome.com.tw/upload/images/20260905/20183149fcCD4S58nW.png](https://ithelp.ithome.com.tw/upload/images/20260905/20183149fcCD4S58nW.png)
模型準備好後，選擇 **File → Export → Wavefront (.obj)**：

匯出時建議勾選 `Triangulated Mesh`，先將多邊形拆成三角形；如果只想輸出選取的物件，可以使用 `Selection Only`。今天不讀取原始材質，因此可以取消材質匯出選項。選項名稱與功能可對照 Blender 4.1 的 OBJ 匯出說明。

Demo 也能處理四邊形等多邊形，但複雜的凹多邊形建議先在 Blender 裡三角化，避免簡單拆面方式產生錯誤的形狀。

### 用文字編輯器打開，貼上就能渲染

先打開 day17 [demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-17)

用 VS Code 或其他文字編輯器開啟 `.obj`，就會看到一長串 `v`、`vt`、`vn` 和 `f`。全選複製後，貼進 Day 17 右側的來源欄位，再按「渲染模型」，模型就會出現在左側。

![https://ithelp.ithome.com.tw/upload/images/20260905/20183149KRZYT6th99.png](https://ithelp.ithome.com.tw/upload/images/20260905/20183149KRZYT6th99.png)

這次範例可以拖曳模型旋轉、用滾輪縮放，也可以開啟「線框模式」，看看身體的曲面是怎麼由三角形拼出來的。想回到原本角度就按「重設視角」；按「載入範例」則會恢復卡比獸的 OBJ 內容並重新渲染。

### OBJ 如何轉成 WebGL 能用的頂點資料？

WebGL 不會直接讀懂 `v` 或 `f`。它需要的是存進 buffer 的數值，以及「每個頂點要讀幾個數字」的設定。因此讀取 OBJ 後，還要把文字整理成前幾天用過的頂點陣列。

```
OBJ 文字
  → 讀取 v，建立座標表
  → 讀取 f，依索引取出座標並拆成三角形
  → Float32Array
  → WebGL buffer
  → Vertex Shader 的位置 attribute
  → 畫出三角形
```

#### 先依照面索引排列頂點

用一個正方形來看會比較清楚。它有四個位置，拆成兩個三角形：

```
v -1 -1 0
v  1 -1 0
v  1  1 0
v -1  1 0
f 1 2 3
f 1 3 4
```

`v` 可以先存成一張座標表：

```jsx
const vertices = [
  [-1, -1, 0], // OBJ 第 1 個頂點
  [1, -1, 0], // OBJ 第 2 個頂點
  [1, 1, 0], // OBJ 第 3 個頂點
  [-1, 1, 0], // OBJ 第 4 個頂點
];
```

接著依序讀取 `f`。第一個三角形取出第 1、2、3 個位置；第二個三角形取出第 1、3、4 個位置。將座標展開後，就得到可以搭配 `drawArrays()` 使用的資料：

```jsx
const positions = new Float32Array([
  // 第一個三角形：1、2、3
  -1, -1, 0, 1, -1, 0, 1, 1, 0,

  // 第二個三角形：1、3、4
  -1, -1, 0, 1, 1, 0, -1, 1, 0,
]);
```

原本只有四個位置，現在變成六筆頂點資料，因為共用的位置被重複寫入了。每筆有 x、y、z 三個數值，所以這個陣列有 18 個數字，但繪製的頂點數是 `18 / 3 = 6`。

#### 寫一個簡化的轉換函式

下面是教學用的解析器，只處理位置與面，忽略 UV、法線和材質。支援三角形與凸多邊形；複雜凹多邊形仍應先在 Blender 裡三角化。這段用來說明轉換原理，demo 實際使用的是 Three.js 的函式

```jsx
function objToPositions(text) {
  const vertices = [];
  const positions = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [type, ...values] = line.split(/\s+/);

    if (type === "v") {
      const point = values.slice(0, 3).map(Number);
      if (point.length !== 3 || !point.every(Number.isFinite)) {
        throw new Error("頂點座標無效");
      }
      vertices.push(point);
    }

    if (type === "f") {
      // 例如 3/2/1，只取斜線前的位置索引 3。
      const face = values.map((value) => {
        const objIndex = Number(value.split("/")[0]);
        // 正索引從 1 開始；-1 表示目前最後一個頂點。
        const index = objIndex > 0 ? objIndex - 1 : vertices.length + objIndex;

        if (!Number.isInteger(objIndex) || objIndex === 0 || !vertices[index]) {
          throw new Error("面索引超出頂點範圍");
        }
        return index;
      });

      if (face.length < 3) throw new Error("一個面至少需要三個頂點");

      // 扇形拆面：1 2 3 4 → (1 2 3)、(1 3 4)。
      for (let i = 1; i < face.length - 1; i++) {
        positions.push(
          ...vertices[face[0]],
          ...vertices[face[i]],
          ...vertices[face[i + 1]],
        );
      }
    }
  }

  if (!positions.length) throw new Error("找不到可繪製的面");
  return new Float32Array(positions);
}
```

#### 把陣列交給 WebGL

得到 `Float32Array` 後，流程就和前面手動準備頂點時一樣了。以下假設 `gl` 已建立、`program` 已完成 shader 編譯與連結，而且 Vertex Shader 使用 `a_position` 接收位置：

```jsx
const positions = objToPositions(objText);
const positionBuffer = gl.createBuffer();

gl.useProgram(program);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
  positionLocation,
  3, // 一個位置有 x、y、z 三個分量
  gl.FLOAT, // 對應 Float32Array
  false,
  0, // 頂點緊密排列
  0, // 從 buffer 的開頭讀取
);

// 設定 viewport、清除畫面並更新矩陣 uniform 後繪製。
gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
```

`bufferData()` 將數值上傳到 GPU 使用的 buffer；`vertexAttribPointer()` 則描述這批資料的讀法。`drawArrays()` 指定每三筆頂點組成一個三角形，位置接著由 Vertex Shader 做座標轉換。

轉成 `Float32Array` 並不代表座標已經位於畫面範圍內。從 Blender 匯出的模型仍有自己的大小、位置與方向，需要像前面幾天一樣，透過 Model、View、Projection 矩陣轉換；今天的 Demo 另外幫模型置中並縮放，才能讓不同尺寸的模型都看得見。若要做光照，還需要準備法線 attribute，只有位置並不足以計算表面的明暗。

也可以保留四筆位置，另外建立 `[0, 1, 2, 0, 2, 3]` 的索引 buffer，搭配 `drawElements()` 繪製。不過 WebGL 的一個索引會同時選取位置、UV、法線等 attribute；OBJ 卻允許它們各自使用不同索引。因此需要貼圖或原始法線時，必須按完整的 `v/vt/vn` 組合整理頂點，不能只把 `f` 的位置索引減一就直接套用。

### 小結

今天的 demo 利用了 Three.js 解析 OBJ，將文字中的頂點與面整理成可以渲染的模型，也處理了光照、相機和旋轉縮放，讓我們可以先專心觀察模型的形狀。

這次統一使用單色材質，不載入原本的貼圖，所以卡比獸只保留幾何外形。Three.js 的用法，以及材質與貼圖如何搭配，之後再慢慢介紹。
