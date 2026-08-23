# **Day 9｜Canvas 動畫**

Day 8 我們用橢圓、三角形和直線畫出卡比獸頭像。這次我們嘗試讓它動起來，最後完成的效果不複雜：卡比獸的瞇瞇眼會小幅左右移動，兩邊耳朵會朝相反方向輕輕擺動。我們直接先來了解 Canvas動畫的原理

### **Canvas 沒有保存「圖形」**

在 day7 中的文章提過 Canvas 屬於「立即模式」

Canvas 動畫的運作方式與傳統的 HTML/CSS 很不同。呼叫 `fillRect()`、 `ellipse()` 或 `stroke()` 之後，畫布只留下繪製結果，也就是一堆像素。它不會記得這塊畫布上有那些元素，所以我們沒辦法告訴瀏覽器說哪個物件要怎麼動。

想讓圖形移動，就是要不斷把舊畫面清掉，用新座標再畫一次。只要重畫速度夠快，人眼就會把連續的靜止畫面看成動畫。簡單來說，Canvas 動畫其實就是一幀一幀重新畫出來的。

### **一幀 Canvas 動畫做了哪些事？**

最基本的 Canvas 動畫迴圈，可以用 `requestAnimationFrame()` 寫成這樣：

```jsx
const motion = {
  eyeX: 0,
};

function animate() {
  motion.eyeX += 0.1; //更新下一幀需要的數值
  ctx.clearRect(0, 0, canvas.width, canvas.height); //清除上一幀
  drawScene(); //依照最新狀態重畫
  requestAnimationFrame(animate); // 向瀏覽器預約下一幀
}
requestAnimationFrame(animate);
```

每一幀都會走過同一套流程：`更新狀態 → 清除畫布 → 完整重畫 → 等待下一幀`

`requestAnimationFrame()` 會在瀏覽器準備更新畫面時執行回呼。常見的 60Hz 螢幕每秒最多更新約 60 次，但實際頻率會受到螢幕、瀏覽器分頁狀態和裝置效能影響。

這也是為什麼不能把「每一幀移動 1px」直接當成固定速度。高更新率螢幕會跑得比較快，掉幀時又會突然變慢。原生做法通常會計算兩幀之間經過的時間，再依時間更新位置。

這次我們會把這段補間計算交給 GSAP，不過 Canvas 的清除與重畫仍然要自己處理。

### **先把會變動的數值整理成狀態**

Canvas 沒有保存圖形，我們就得自己保存。卡比獸這次只有三個會變動的數值：

```jsx
const motion = {
  eyeX: -6,
  leftEarRotation: -3,
  rightEarRotation: 3,
};
```

`motion` 可以想成這一幀的動畫快照：

- `eyeX` 是兩條眼睛的水平位移。
- `leftEarRotation` 是左耳旋轉角度。
- `rightEarRotation` 是右耳旋轉角度。

頭部、臉和嘴巴沒有移動，不需要放進動畫狀態。等到 `motion` 的數值改變，再呼叫同一個 `drawScene()`，畫面就會跟著更新。

```jsx
function drawScene() {
  ctx.clearRect(0, 0, 400, 300);
  drawHead(ctx);
  drawLeftEar(ctx, motion.leftEarRotation);
  drawRightEar(ctx, motion.rightEarRotation);
  drawFace(ctx);
  drawEyes(ctx, motion.eyeX);
  drawMouth(ctx);
}
```

把角色拆成幾個繪圖函式，不是 Canvas 的硬性規定，只是這樣比較容易看出哪個部位用了哪一筆狀態。

### **用座標改變眼睛位置**

眼睛本來是兩條水平線。要讓它們左右移動，只要將四個端點的 x 座標加上相同的 `eyeX`：

```jsx
function drawEyes(ctx) {
  ctx.beginPath();
  ctx.moveTo(142 + motion.eyeX, 162);
  ctx.lineTo(172 + motion.eyeX, 162);
  ctx.moveTo(228 + motion.eyeX, 162);
  ctx.lineTo(258 + motion.eyeX, 162);
  ctx.stroke();
}
```

y 座標固定在 `162`，每條線的起點和終點又加上相同位移，因此眼睛只會水平滑動，不會變長或傾斜。這是最直接的座標動畫：算出新座標，再重畫。

### **設定 rotate 旋轉中心**

耳朵稍微麻煩一點。Canvas 的 `rotate()` 會旋轉整個座標系，而且預設以畫布原點 `(0, 0)` 為中心。

如果直接 `rotate()`，耳朵會繞著畫布左上角旋轉，移動距離非常大。我們真正想要的是以耳根為中心擺動，所以得先暫時搬動座標原點。

```jsx
function drawEar(ctx, points, pivot, rotation) {
  ctx.save();

  // 把原點移到耳根
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate((rotation * Math.PI) / 180);

  // 原點改變後，頂點座標也要改成相對於耳根的位置
  ctx.beginPath();
  ctx.moveTo(points[0].x - pivot.x, points[0].y - pivot.y);
  ctx.lineTo(points[1].x - pivot.x, points[1].y - pivot.y);
  ctx.lineTo(points[2].x - pivot.x, points[2].y - pivot.y);
  ctx.closePath();
  ctx.fill();

  //還原原本的座標系，避免後面的臉和五官一起被旋轉
  ctx.restore();
}
```

如果漏掉 `restore()`，後面的圖形可能會繼續沿用前一次的位移、旋轉或縮放，導致位置與比例和預期不同。這也是我剛接觸 Canvas 座標轉換時很常發生的錯誤。

當然，我們可以使用 `requestAnimationFrame()` 來處理 Canvas 中所有的 motion，自己控制每一幀的更新與繪製。不過，我們也可以搭配前面學到的 **GSAP** 函式來建立動畫，將數值變化與時間控制交給 GSAP，再把更新後的狀態繪製到 Canvas 上。這樣不僅能更直覺地設定動畫的 duration、easing 與 timeline，也能讓複雜的 motion 邏輯更容易管理。

### **讓 GSAP 計算中間值**

GSAP 不只能修改 DOM 樣式，也可以對一般 JavaScript 物件中的數字做補間。我們直接把 `motion`當成 target：

```jsx
gsap.to(motion, {
  eyeX: 6,
  leftEarRotation: 3,
  rightEarRotation: -3,
  duration: 1.8,
  ease: "sine.inOut",
  onUpdate: drawScene,
});
```

播放這段 tween 時，GSAP 會在 1.8 秒內持續更新三個數值。 `onUpdate` 每次觸發都呼叫 `drawScene()`，Canvas 便按照當下的數值重畫。GSAP 負責時間與補間，Canvas 繪出像素。

### **用 Timeline 管理循環和播放狀態**

Demo 最後使用 Timeline，把循環、反向播放和控制方法集中在同一個實例：

```jsx
const timeline = gsap.timeline({
  repeat: -1,
  yoyo: true,
  onUpdate: drawScene,
});

timeline.to(
  motion,
  {
    eyeX: 6,
    leftEarRotation: 3,
    rightEarRotation: -3,
    duration: 1.8,
    ease: "sine.inOut",
  },
  0,
);
```

`repeat: -1` 讓 Timeline 持續循環， `yoyo: true` 會在抵達終點後反向播放。最後的 `0` 是 position parameter，表示這組 tween 從 Timeline 第 0 秒開始。 眼睛與雙耳放在同一個 tween 中，會一起抵達終點。左耳從 `-3` 度轉到 `3` 度，右耳則從 `3` 度轉到 `-3` 度，於是產生反方向擺動。

播放控制也可以直接交給 Timeline：

```jsx
timeline.pause();
timeline.play();
timeline.restart();
timeline.kill();

//無限循環的 Timeline 不會自己知道 Vue 元件已經卸載
//切換路由時要呼叫 `kill()`，不然它可能繼續在背景更新已經不需要的狀態
onBeforeUnmount(() => {
  timeline?.kill();
});
```

### **小結**

Canvas 動畫是透過程式持續更新狀態、清除上一幀，再用新座標重畫。
明天我們講解滑鼠座標事件搭配 canvas 動畫，最後再補充一個粒子效果。
