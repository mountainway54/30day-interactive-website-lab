# Day 3｜用 Timeline 管理動畫時間軸

昨天我們認識了 GSAP 的 Tween 概念，以及 `x / y / z`、`rotation`、`duration`、`delay`、`ease` 等基礎動畫參數，已經可以做出最基本的動畫效果。

不過，一般來說，要做出更豐富又炫炮的動畫，往往需要將多個 Tween 組合在一起，並控制它們彼此的播放順序與時間。這時，就需要用到 GSAP 的 **Timeline（時間軸）**。

Timeline 可以把多個 Tween 放在同一條時間軸上，再決定每段動畫何時開始，定位方式可以粗分為 **Position** 與 **Label**

如果將 Position 理解為相對時間軸，參考點通常是前一個動畫；那麼 Label 則可以理解為「自訂時間參考點」：替 Timeline 中的特定時間點命名，之後便能以這個時間點進行定位。

老樣子，我們可以搭配 demo 來感受其中的差別~ 👉🏿 demo連結

### Position

先準備五段動畫設定：

```jsx
const MOVE = { x: distance, duration: 2 }
const ROTATE = { rotation: 360, duration: 2 }
const FLIP = { rotationY: 180, duration: 2 }
const COLOR = { colors: #c63d2f, duration: 2 }
const SCALE = { scale: 1.5, duration: 2 }
```

依序加入 Timeline：

```jsx
const tl = gsap
.timeline()
.to(".box", MOVE)
.to(".box", ROTATE, < )
.to(".box", FLIP, <1 )
.to(".box", COLOR, > )
.to(".box", SCALE, >-0.5 )
```

這裡的 `<` 和 `>` 都是相對於「前一個 Tween」，`<` 是對齊前一段動畫的開始時間；`>` 則是對齊前一段動畫的結束時間，再依據這個時間點增減秒數進行微調。例如 `">-0.5"`，就是從前一個 Tween 的「結束時間往前 0.5 秒」開始。

### Label

當 Timeline 中有越來越多Tween 組合，如果只靠 Position 定位，實際上的秒數可能就要變成數學考題了，這時候，我們就可以使用 Label 可以替時間點命名：

```jsx
tl.addLabel("start", 0);
tl.addLabel("turn", "start+=0.6");
```

這段程式建立了兩個 Label：start 位於 Timeline 的第 0 秒，turn 則位於 start 之後 0.6 秒

```jsx
const tl = gsap.timeline();
tl.addLabel("start", 0)
  .to(".a", MOVE, "start")
  .addLabel("turn", "start+=0.6")
  .to(".b", ROTATE, "turn")
  .to(".c", COLOR, "turn+=0.4");
```

`.a` 從 `start` 開始，`.b` 從 `turn` 開始，而 `.c` 則在 `turn` 後 0.4 秒開始。如此一來，我們不需要一直計算每個動畫實際位於第幾秒，只需要透過 Label 來安排各個動畫的時間位置即可。

### stagger

最後我們額外講一個很常用的 stagger ，其實有一點類似陣列，只不過距離換成時間而已。

如果畫面上有五個方塊，當然可以分別替它們建立 Tween：

```jsx
const tl = gsap
  .to(".box-1", { y: -54 })
  .to(".box-2", { y: -54 })
  .to(".box-3", { y: -54 })
  .to(".box-4", { y: -54 })
  .to(".box-5", { y: -54 });
```

但這類重複動畫更適合交給 stagger

```jsx
const tl = gsap.timeline().to(".box", {
  y: -54,
  rotation: 90,
  duration: 1.2,
  ease: "power2.inOut",
  stagger: 0.18,
});
```

這代表相鄰兩個元素的「開始時間」相差 0.18 秒。
五個方塊的開始時間大致會是：0.00s / 0.18s / 0.36s / 0.54s / 0.72s

但他不會受到每個方塊的動畫長度影響；每個 Tween 的 duration 仍然是 1.2 秒

最後補充一個很好用的，如果要將上面示範的Timeline反向播放
只需要使用: **`tl.reverse()`** ，是不是超方便~~

### 小結

今天我們簡單示範了一些 Timeline 常用的功能，包括 Tween 的排列、Position、Label， stagger以及最後的reverse

明天預計會直接進入 ScrollTrigger，利用大家超常見的「滾動視差」開始製作滾動式網頁！
