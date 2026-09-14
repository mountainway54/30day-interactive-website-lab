# Day 26｜用 Lenis 打造平滑捲動的產品展示

大家在瀏覽一些 3C 產品的介紹網站時，有沒有看過隨著頁面捲動，產品跟著旋轉、放大，旁邊的介紹文字也依序出現的效果？

今天我們就用 Lenis 來做這類互動。它可以讓頁面捲動更平滑，再搭配 GSAP 與 Three.js，把捲動進度連接到動畫，讓使用者透過滾輪控制觀看產品的節奏。

延續昨天設定好的五個攝影機鏡位，隨著頁面往下捲動，依序展示觸碰板、類比操作桿與扳機。文章會著重在 Lenis 的設定，以及如何取得捲動進度來控制畫面。

話不多說，直接看 [demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-26)

這次的互動流程可以拆成三個部分：

1. Lenis 處理平滑捲動。
2. 讀取捲動進度，更新章節與進度條。
3. 將同一份進度傳給 GSAP 時間軸，改變 3D 鏡頭的位置。

Lenis 負責的是捲動本身。產品要轉到哪個角度、文字何時出現，則由我們根據進度決定。

在 Day 26 裡，這些變化共用同一個 `progress`，讓鏡頭、文字與側邊進度條保持同步。Three.js 的模型、材質與燈光就先省略。

### 安裝 Lenis，匯入套件與樣式

先安裝套件：

```bash
npm install lenis
```

接著匯入 Lenis 與官方提供的樣式：

```js
import Lenis from "lenis";
import "lenis/dist/lenis.css";
```

樣式也要一起載入，讓 Lenis 的捲動與停止狀態有對應的 CSS。安裝與基本設定可以參考 [Lenis 官方文件](https://github.com/darkroomengineering/lenis#setup)。

在 Vue 裡，我們等元件掛載後再建立實例：

```js
import { onMounted } from "vue";
import Lenis from "lenis";
```

上面先列出一般模式的設定。`autoRaf` 負責自動更新，另外三個參數用來調整捲動手感。

### 三、初始化 Lenis：調整捲動手感

這次的設定如下：

```js
let lenis;

onMounted(() => {
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.075,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });
});
```

- `lerp`：使用者滾動滾輪後，會產生一個目標捲動位置。`lerp` 影響目前位置往目標位置靠近的速度。數值較小時，跟隨感比較柔和，拖尾也比較明顯；數值較大時，反應會更直接。
- `smoothWheel`：這個設定讓滑鼠滾輪輸入套用平滑捲動。它控制的是滾輪行為，觸控相關設定則另外處理。
- `wheelMultiplier`：調整滾輪輸入量，`0.9` 代表將滾輪輸入量乘上 `0.9`。這次希望使用者有時間觀看控制器細節，因此稍微降低捲動量。

### 四、使用 autoRaf 自動更新 Lenis

平滑捲動需要持續更新位置。建立 Lenis 時加入 `autoRaf: true`，就能讓套件自行管理 `requestAnimationFrame` 迴圈：

每次瀏覽器準備更新畫面時，Lenis 就會推進平滑捲動，不需要再自行呼叫 `lenis.raf(time)`，也不用保存 `frameId`。

這次 Demo 透過 `scroll` 事件取得進度，再控制鏡頭與章節，因此直接使用自動更新就足夠了。

如果之後需要把 Lenis 整合進既有的動畫迴圈，才改用手動呼叫 `lenis.raf(time)` 的方式。[官方文件提供了兩種寫法](https://github.com/darkroomengineering/lenis#setup)。

### 監聽 scroll 事件，取得捲動進度

接著監聽 Lenis 的 `scroll` 事件：

```js
lenis.on("scroll", updateFromScroll);
```

在事件處理函式裡，讀取 `progress`：

```js
import { ref } from "vue";

const scrollProgress = ref(0);

function updateFromScroll(event) {
  const progress = Math.min(1, Math.max(0, event.progress || 0));

  scrollProgress.value = progress;
}
```

這裡將進度限制在 `0` 到 `1`：

- `0`：頁面頂端。
- `0.5`：可捲動距離的一半。
- `1`：頁面底端。

這次使用 Lenis 預設的整頁捲動，因此取得的是整個頁面的進度。

有了這個數字，就能直接更新側邊進度條~~

再把縮放原點設在頂端：

```css
.day-26-rail-track span {
  transform-origin: top;
}
```

如此一來，往下捲動時，進度條就會由上往下增長。

### 將捲動進度連接到 GSAP 時間軸與章節切換

接著我們沿用 Day 25 的 GSAP 鏡頭時間軸。昨天透過設定每段動畫的秒數，讓鏡頭依序播放；今天則將時間軸設為 paused: true，改由 Lenis 的捲動進度控制鏡頭移動。Lenis 每次更新進度時，只需要把數字傳進去：

```js
cameraTimeline?.progress(progress);
```

當捲動進度是 `0.5`，時間軸就移到中間的位置；往回捲動時，時間軸也跟著往回移動。

同時，我們也用這份進度決定目前章節：

```js
activeIndex.value = Math.min(
  chapters.length - 1,
  Math.round(progress * (chapters.length - 1)),
);
```

這次共有五個章節，索引是 `0` 到 `4`，所以先把進度乘上 `4`，再取最接近的整數。

這種算法會依照進度切換到最近的章節，適合這次配合鏡頭姿態安排的內容。

整合後的事件處理函式如下：

```js
function updateFromScroll(event) {
  const progress = Math.min(1, Math.max(0, event.progress || 0));

  scrollProgress.value = progress;

  activeIndex.value = Math.min(
    chapters.length - 1,
    Math.round(progress * (chapters.length - 1)),
  );

  cameraTimeline?.progress(progress);
}
```

這個函式同時更新進度條、章節文字與鏡頭位置，也是這次展示頁串接互動的核心。

## 七、使用 stop()、start() 控制載入期間的捲動

3D 模型需要下載、解析與準備材質。如果畫面還沒準備好，使用者就先捲到後面，載入完成後可能會直接出現在展示的中段。

因此，建立 Lenis 後先暫停捲動：

```js
lenis.stop();
```

等模型與鏡頭時間軸都準備好，再恢復：

```js
lenis.start();
```

Day 26 的流程可以簡化成：

```js
lenis = new Lenis({
  autoRaf: true,
  lerp: 0.075,
  smoothWheel: true,
  wheelMultiplier: 0.9,
});

lenis.stop();

// 下載模型、準備場景與鏡頭時間軸……

lenis.start();
```

`stop()` 會停止 Lenis 的捲動，實例仍然保留，之後可以透過 `start()` 恢復。

## 八、使用 scrollTo() 重設位置，透過 resize() 更新尺寸

除了回應使用者的滾輪輸入，也可以使用 `scrollTo()` 主動移動到指定位置。

這次在展示開始前，先回到頁面頂端：

```js
lenis.scrollTo(0, {
  immediate: true,
  force: true,
});
```

這裡的 `0` 是目標捲動位置，另外兩個設定分別代表：

- `immediate: true`：立即抵達，省略平滑過渡。
- `force: true`：即使 Lenis 處於停止狀態，也執行這次移動。

因為載入期間呼叫過 `stop()`，所以這裡使用 `force`，確保能重設位置。

內容準備完成後，再更新 Lenis 使用的尺寸資料：

```js
lenis.resize();
```

Lenis 預設具有自動尺寸偵測；這次在載入完成的時間點手動呼叫，讓後續讀取進度時使用更新後的尺寸。[相關 API 說明](https://github.com/darkroomengineering/lenis#methods)

最後，Day 26 在載入完成時依序執行：

```js
lenis.scrollTo(0, {
  immediate: true,
  force: true,
});

lenis.start();
lenis.resize();

updateFromScroll({
  progress: lenis.progress,
});
```

最後一次 `updateFromScroll()` 是主動同步初始畫面。即使使用者還沒有捲動，章節、進度條與鏡頭也會先對齊目前的位置。
