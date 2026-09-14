# Day 25｜用 GSAP 編排 Three.js 產品運鏡

轉眼間鐵人賽剩下六天了，接下來的時間，我們就融合前面有學到的技術，來動手做一個產品展示的網站~~

既然是產品網站，那當然要先有產品阿，那我們就用 PS5 的手把當作範例，我在 [cgtrader.com](https://www.cgtrader.com/items/6505896/download-page) 下載了免費的模型使用。

一般來說，這類免費／開源 3D 模型只要遵守原作者的授權條款與署名要求，用於非商業的教學、研究或展示通常沒有問題；若要用於商業用途，則需要詳細確認授權規範，且像 DualSense 這類產品模型，也可能涉及 Sony／PlayStation 的商標、產品外觀或其他智慧財產權。

今天我們先來處理動畫的部分，畫面載入完成後會自動播放 18 秒的運鏡。鏡頭先從正面看完整外型，接著靠近按鍵與搖桿，再移到側面看 `R1` `R2`鍵，最後回到正面。

👉🏿 [Demo 連結](https://mountainway54.github.io/30day-interactive-website-lab/#/day-25)

## 用位置與注視點描述攝影機鏡位

在 Three.js 裡，相機本身也是一個 3D 物件，因此可以用 `position` 設定它在場景中的位置：

```js
camera.position.set(x, y, z);
```

不過，只有位置還不夠。相機移動到新的座標後，不會自動知道該看哪裡，所以還要搭配 `lookAt()` 指定注視點：

```js
camera.lookAt(targetX, targetY, targetZ);
```

我把這兩組座標放進同一個 `pose` 物件：

```js
const pose = {
  x: 0,
  y: 3.1,
  z: 5.9,
  tx: 0,
  ty: 0,
  tz: 0,
};
```

`x`、`y`、`z` 是相機位置，`tx`、`ty`、`tz` 則是相機正在看的位置。渲染時，再把這些數值交給相機：

```js
function render() {
  camera.position.set(pose.x, pose.y, pose.z);
  camera.lookAt(pose.tx, pose.ty, pose.tz);
  renderer.render(scene, camera);
}
```

這樣做的好處是，我們不必直接對 `camera.position` 製作動畫。GSAP 只要修改普通物件裡的數字，每次更新時再將結果同步給相機即可。

這裡可以把相機位置和注視點想成兩個不同的控制：位置決定「從哪裡拍」，注視點決定「鏡頭朝哪裡」。例如只改變相機的 `x`，畫面會從正面慢慢移向側面；如果同時調整 `tx`，鏡頭就能在移動過程中繼續對準握把或按鍵，不會只是從產品旁邊滑過去。

這次使用的是透視相機：

```js
camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
```

第一個參數 `34` 是視野角度。數值較小時比較像長焦鏡頭，透視變形會比較收斂，也比較適合產品展示。若把數值開得太大，靠近畫面邊緣的握把容易被拉長，控制器看起來就會變形。

## 規劃五段產品特寫鏡頭

開始寫 Timeline 之前，我先把整段動畫拆成五個鏡位。每個鏡位都記錄相機位置、注視點，以及畫面下方要顯示的文字：

```js
const shots = [
  {
    en: "THE FORM",
    text: "熟悉的輪廓，進入遊戲之前。",
    x: 0,
    y: 3.1,
    z: 5.9,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE INPUT",
    text: "靠近搖桿與每一次精準輸入。",
    x: 0,
    y: 4,
    z: 1,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE PROFILE",
    text: "沿著握把，讀出力量的曲線。",
    x: 4,
    y: 1,
    z: 1,
    tx: 0.55,
    ty: -0.1,
    tz: 0,
  },
  {
    en: "THE TRIGGER",
    text: "越過肩鍵，轉向背面的控制。",
    x: 5,
    y: 5,
    z: -2,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE FORM",
    text: "準備就緒，回到遊戲中心。",
    x: 0,
    y: 3.1,
    z: 5.9,
    tx: 0,
    ty: 0,
    tz: 0,
  },
];
```

第一鏡先交代完整外型。這個畫面刻意保持正面與左右對稱，直接展示產品的正面外觀，再開始移動。

第二鏡靠近正面的輸入區域，控制器在畫面中所占的比例也更大。第三鏡移到側邊，畫面重點從按鍵轉到握把的曲線。第四鏡繞到後側與上方，帶出`R1` `R2`。最後一鏡回到和開場相同的位置，讓整段運鏡有明確的結束畫面。

鏡位參數可能要有一點空間想像的能力，我通常會先調出第一個構圖，再一次只修改一個軸。`z` 變小通常會讓鏡頭更靠近；想移到產品右側，可以增加 `x`；想從上方往下看，則提高 `y`。如果鏡頭已經移到側面，卻沒有拍到想看的部位，再調整 `tx`、`ty`、`tz`。

模型本身也要先轉到正確的展示方向。這個 Blender 模型的正面位於 Z-up 平面，所以載入後先用 Euler angle 轉向鏡頭：

```js
const modelRotation = new THREE.Euler(Math.PI / 2 - 0.45, 0, 0);
model.rotation.copy(modelRotation);
```

鏡頭負責整段觀看路徑，模型旋轉則用來校正產品的基準角度。先把模型擺正，後面的每一組鏡位才有一致的參考點。

## 用 GSAP Timeline 串起攝影機運動

五個鏡位準備好之後，就能交給 GSAP Timeline。這次先建立一條暫停狀態的時間軸，等模型和材質全部載入完成後再播放：

```js
timeline = gsap.timeline({
  paused: true,
  defaults: { ease: "power2.inOut" },
  onUpdate() {
    elapsed.value = timeline.time();
    render();
  },
  onComplete() {
    playing.value = false;
  },
});
```

Timeline 不會直接修改 Three.js 相機，而是持續改變前面建立的 `pose`。`onUpdate` 會在動畫更新時取得目前秒數，接著呼叫 `render()`，把新的位置與注視點套用到相機。

如果少了這次 `render()`，`pose` 裡的數值雖然一直在變，Canvas 仍然會停在上一張畫面。這也是 Three.js 動畫和一般 DOM 動畫比較不一樣的地方：GSAP 負責計算數值，Three.js 負責重新繪製場景。

接著，把第二到第五個鏡位依序加入 Timeline：

```js
shots.slice(1).forEach((next, index) => {
  const start = 1 + index * 4;

  timeline.addLabel(next.en + index, start);

  timeline.to(
    pose,
    {
      x: next.x,
      y: next.y,
      z: next.z,
      tx: next.tx,
      ty: next.ty,
      tz: next.tz,
      duration: 3,
    },
    start,
  );

  timeline.to(pose, { duration: 1, x: next.x }, start + 3);
});
```

每一段占四秒：前三秒移動到下一個鏡位，最後一秒停留。第二個 `.to()` 沒有真的改變 `x`，用途是替時間軸保留一秒，讓觀眾有時間看清楚目前的構圖。

所有段落都使用 `power2.inOut`。相機會先加速、接近下一個鏡位時再減速，比等速移動自然一些。產品運鏡也不適合每一段都突然停住，所以各段直接接在一起，讓速度變化保持連續。

播放控制直接操作同一條 Timeline：

```js
function pause() {
  timeline?.pause();
  playing.value = false;
}

function play() {
  if (!ready.value || error.value) return;

  if (elapsed.value >= 18) timeline.restart();
  else timeline.play();

  playing.value = true;
}

function replay() {
  if (ready.value && !error.value) {
    timeline.restart();
    playing.value = true;
  }
}
```

模型還沒載入時，三個按鈕都會停用。載入完成後自動呼叫 `play()`；暫停後再次播放，會從原本的時間繼續；按下重播則使用 `restart()` 回到第 0 秒。整段播放完畢後再按播放，也會重新開始。

## 小結

今天沒有讓使用者自由旋轉模型，而是先安排五個固定鏡位，再用 GSAP 控制觀看順序。

整段運鏡可以整理成：

**定義相機位置與注視點 → 規劃鏡位 → GSAP 更新 pose → `camera.lookAt()` 對準產品 → Three.js 重新渲染。**

調整構圖時，先決定鏡頭要從哪裡拍，再決定它要看哪裡。鏡位確認後才開始安排時間，會比一邊改座標、一邊調動畫速度容易許多。

下一篇會加入 Lenis，改由頁面的滾動距離控制同一段產品運鏡，讓他變成是滾動式互動的網頁。
