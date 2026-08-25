Day9 的 demo中，我們講解了如何利用GSAP Timeline 控制 Canvas動畫。今天我們進到互動環節，改成由游標控制。第一個 Demo 讓眼睛跟著游標看，游標進入 Canvas 時，耳朵會快速轉兩下。第二個 Demo 則把卡比獸縮小構成一個粒子系統，讓它們在畫面裡漂浮，靠近游標時再往外散開。

### 游標互動

#### 取得游標座標，把頁面座標換成 Canvas 座標

Pointer Event 的 `clientX`、`clientY` 記錄游標在瀏覽器可視範圍裡的位置。不過，Canvas 裡的卡比獸使用自己的繪圖座標，不能直接拿這兩個數值來移動眼睛。

先用 `getBoundingClientRect()` 取得 Canvas 在頁面上的位置，再把游標換算成 Canvas 內部的座標：

```jsx
const bounds = canvas.getBoundingClientRect();

const canvasX = ((event.clientX - bounds.left) / bounds.width) * 400;
const canvasY = ((event.clientY - bounds.top) / bounds.height) * 300;
```

這張 Canvas 的尺寸是 `400px × 300px`。`event.clientX - bounds.left` 可以算出游標距離 Canvas 左邊多少，除以畫面上的實際寬度後會得到比例，最後再乘上 `400`。

Y 軸也是同一個做法，只是改用 Canvas 高度與邏輯高度 `300`。即使 Canvas 因為螢幕寬度縮放，換算後的座標仍會落在同一套繪圖空間裡。

這次監聽的是 `pointermove`，滑鼠與觸控筆可以共用同一套事件。眼睛使用全頁座標追蹤，粒子 Demo 則只在游標進入自己的 Canvas 後才記錄位置。

#### 讓卡比獸看向游標、動動耳朵^^

比較游標與 Canvas 中心的差距，換算眼睛的位移，並限制位移幅度：

```jsx
const centerX = bounds.left + bounds.width / 2;
const centerY = bounds.top + bounds.height / 2;

gsap.to(motion, {
  eyeX: gsap.utils.clamp(-9, 9, (event.clientX - centerX) / 28),
  eyeY: gsap.utils.clamp(-3.5, 3.5, (event.clientY - centerY) / 55),
  duration: 0.18,
  onUpdate: drawScene,
});
```

X 軸最多移動 `9px`，Y 軸只有 `3.5px`，不然原本的瞇瞇眼很容易跑出臉部範圍。GSAP 負責補出中間值，`drawScene()` 再依照新的 `eyeX`、`eyeY` 重畫下一幀。

至於耳朵的部分，只有在游標進入 Canvas `pointerenter` 發生時才播放 Timeline，左右耳使用相反角度，快速來回兩次後回到原位：

```jsx
function handleCanvasEnter() {
  gsap
    .timeline()
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.09 })
    .to(motion, { leftEarRotation: 9, rightEarRotation: -9, duration: 0.12 })
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.12 })
    .to(motion, { leftEarRotation: 0, rightEarRotation: 0, duration: 0.11 });
}
```

### 粒子系統

接下來我們來練習利用 Canvas 的粒子系統來一次渲染超多卡比獸 icon，並設計一個簡單的小互動。

當我們需要同時出現很多相似物件，而且每一幀都要更新位置。如果用 DOM 製作，每顆粒子都需要一個元素；數量增加後，瀏覽器還得管理這些節點與樣式。這時候只要使用。JavaScript 保存粒子資料，畫面只需要一張 Canvas。每一幀清除畫布，再把所有粒子畫回去即可，這種方式很適合大量重複的 2D 圖形。

#### 粒子系統如何渲染出多個相同物件

先建立一個陣列，每一筆資料保存一顆粒子的位置、速度、漂移方向與尺寸：

```jsx
function createParticle() {
  return {
    x: Math.random() * stageWidth,
    y: Math.random() * stageHeight,
    vx: Math.random() * 10 - 5,
    vy: Math.random() * 10 - 5,
    size: 42 + Math.random() * 22,
  };
}

const particles = Array.from({ length: particleCount }, createParticle);
```

`drawMiniSnorlax()` 只負責畫一隻卡比獸。繪製前先把座標原點移到粒子位置，再根據 `size` 縮放原本的卡比獸圖形：

`save()` 是先保存 Canvas 當前狀態，讓你畫完後可以用 `restore()` 恢復，避免 `translate`、`scale` 等狀態不斷累積。

```jsx
function drawMiniSnorlax(ctx, particle) {
  const scale = particle.size / 240;
  ctx.save();

  // 將 Canvas 原點移到粒子的位置
  ctx.translate(particle.x, particle.y);

  // 根據 particle.size 縮放
  ctx.scale(scale, scale);

  // 在新的座標系畫卡比獸
  drawSnorlaxHead(ctx);
  ctx.restore();
}

// 把陣列裡的每一個 particle 都拿出來畫一次。
particles.forEach((particle) => {
  drawMiniSnorlax(ctx, particle);
});
```

#### 漂浮動畫、邊界反彈與游標擾動粒子的實作邏輯

粒子的漂浮其實就是持續把速度加到位置上。碰到邊界時反轉速度；游標靠近粒子座標時，再朝反方向加一點推力。(程式碼保留主要判斷，省略尺寸與時間換算)：

```jsx
function updateParticle(particle) {
  // 計算粒子與游標的距離
  const dx = particle.x - pointer.x;
  const dy = particle.y - pointer.y;
  const distance = Math.hypot(dx, dy) || 1;

  // 游標啟用且粒子進入 100px 範圍時，施加排斥力
  if (pointer.active && distance < 100) {
    // 越靠近游標，force 越大，並把力轉成 X/Y 方向
    const force = (1 - distance / 100) * 3;
    particle.vx += (dx / distance) * force;
    particle.vy += (dy / distance) * force;
  }
  // 根據速度更新位置
  particle.x += particle.vx;
  particle.y += particle.vy;

  // 撞到畫布邊界時，把對應方向速度反轉
  if (particle.x < 0 || particle.x > stageWidth) particle.vx *= -1;
  if (particle.y < 0 || particle.y > stageHeight) particle.vy *= -1;
}
```

`distance < 100` 表示粒子進入游標周圍的影響範圍。距離越近，`force` 越大。`dx / distance` 與 `dy / distance` 則決定推開方向，讓粒子往游標的反方向移動。

最後把更新與繪製放進同一個動畫迴圈：

```jsx
function animate() {
  // 清除上一幀
  ctx.clearRect(0, 0, stageWidth, stageHeight);

  // 更新並重新繪製每顆粒子
  particles.forEach((particle) => {
    updateParticle(particle);
    drawMiniSnorlax(ctx, particle);
  });

  // 下一幀再次執行 animate
  requestAnimationFrame(animate);
}
```
