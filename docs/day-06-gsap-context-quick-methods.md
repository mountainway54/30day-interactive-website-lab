# Day 6｜GSAP 動畫建立完，然後呢？談 context 與高頻更新

前幾天從 Tween、Timeline 一路講到 ScrollTrigger，動畫已經可以跟著按鈕或捲動播放。不過實際把動畫放進 Vue 元件後，還有兩件事很難一直裝作沒看到：元件離開時，先前建立的動畫要怎麼收掉？滑鼠每移動一下就要更新位置時，難道要一直建立新的 Tween 嗎？

今天先不做新的轉場效果，改來整理 GSAP 動畫的管理方式。這次會用到 `gsap.context()`、`context.kill()`、`context.revert()`，後半段再比較 `quickTo()` 和 `quickSetter()`。

老樣子，建議搭配 Day 6 Demo 操作。第一個實驗可以直接看到 kill 與 revert 留下的畫面差異；第二個實驗則能切換兩種 Pointer 跟隨方式。

## 用 gsap.context() 把動畫收在同一個範圍

假設一個 Vue 元件裡有三個 Tween、一條 Timeline，另外還有 ScrollTrigger。如果每個實例都各自存進變數，卸載時就得逐一清理。漏掉一個，動畫可能繼續控制已經離開畫面的元素。

`gsap.context()` 可以把 callback 內建立的 GSAP 動畫收在一起：

```jsx
context = gsap.context(() => {
  const samples = gsap.utils.toArray(".day-06-sample");

  timeline = gsap.timeline({
    paused: true,
    repeat: -1,
    yoyo: true,
    defaults: { duration: 1.15, ease: "power2.inOut" },
  });

  timeline
    .to(samples[0], { x: 76, rotation: 180, backgroundColor: "#c97958" }, 0)
    .to(samples[1], { y: -38, scale: 1.35, backgroundColor: "#b38a4a" }, 0.12)
    .to(samples[2], { x: -70, rotation: -135, scale: 0.76 }, 0.24);
}, stageRef);
```

最外層先把 `gsap.context()` 回傳的物件存進 `context`。後面呼叫 `context.kill()` 或 `context.revert()` 時，操作的就是這個範圍內收集到的動畫。

callback 一執行，`gsap.utils.toArray(".day-06-sample")` 會取得舞台裡的三個圖形，並依照 DOM 順序放進 `samples`。所以 `samples[0]`、`samples[1]`、`samples[2]`，分別對應左到右的三個幾何樣本。

接著建立 Timeline。`paused: true` 讓動畫先停著，等使用者按下「同步開始」才播放；`repeat: -1` 代表無限重複，`yoyo: true` 則讓每一輪來回播放。三段 Tween 共用相同的時間與 easing，因此放進 `defaults`，不用每一段都重寫一次。

最後三個 `.to()` 各自控制一個圖形。第三個參數 `0`、`0.12`、`0.24` 是它們在 Timeline 上的開始時間，所以三個圖形不會完全同時出發，而是每隔 `0.12` 秒錯開。第一個圖形向右移動並旋轉，第二個向上移動和放大，第三個則往左移動、旋轉再縮小。

最容易忽略的是最後的 `stageRef`。它是這個 context 的 selector scope，`.day-06-sample` 只會在指定舞台裡查找。Demo 左右兩側雖然用了相同的 class，各自建立 context 後，動畫不會抓到另一側的圖形。

Timeline 與裡面的 Tween 都是在 callback 中建立，因此會被這個 context 一起管理。後面不必逐一找出三個 Tween，只要操作 `context` 就能處理整組動畫。

## context.kill() 和 context.revert() 差在哪裡？

兩者都會清除 context 收集的動畫，差別在畫面最後停在哪裡。

`context.kill()` 會終止動畫，但保留 GSAP 已經寫進元素的 inline styles：

```jsx
function killAnimation() {
  context.kill();
}
```

假設方塊移動到一半時呼叫 `kill()`，它就停在當下。位移、旋轉和顏色都還留著，只是動畫不會再繼續。

`context.revert()` 同樣會終止動畫，接著移除動畫產生的 inline styles，讓元素回到執行動畫前的狀態：

```jsx
function revertAnimation() {
  context.revert();
}
```

Day 6 Demo 準備了兩個設定完全相同的舞台。按下同步開始後，左側執行 `context.kill()`，右側執行 `context.revert()`。左側的三個圖形會停在操作當下；右側則直接回到 CSS 原本設定的位置與顏色。

| 方法 | 動畫是否停止 | GSAP 寫入的樣式 | 適合情境 |
| --- | --- | --- | --- |
| `context.kill()` | 是 | 保留 | 要取消後續動畫，但畫面維持目前狀態 |
| `context.revert()` | 是 | 還原 | 元件卸載、重建動畫或回到乾淨初始狀態 |

context 的用途是集中清理與限制 selector 範圍，不是拿來控制播放。播放、暫停或倒轉，還是交給 Tween 和 Timeline。

在 Vue 元件卸載時，我通常會選 `revert()`：

```jsx
onUnmounted(() => {
  context?.revert();
});
```

Demo 左側刻意使用 `kill()`，所以重設時還得清除殘留的 inline styles，才能重新建立一組乾淨的動畫。這也剛好說明兩者不能隨意互換。

## Pointer 一移動，就建立一個 Tween？

接著看另一種常見情況：讓圓形跟著滑鼠移動。最直覺的寫法，是在 `pointermove` 裡呼叫 `gsap.to()`：

```jsx
stage.addEventListener("pointermove", (event) => {
  gsap.to(follower, {
    x: event.clientX,
    y: event.clientY,
    duration: 0.45,
  });
});
```

這段確實會動，但 `pointermove` 一秒可能觸發很多次，每次都建立新的 Tween 並沒有必要。目標元素和動畫屬性都沒變，真正變動的只有新的座標。

GSAP 為這類高頻更新準備了 `quickTo()` 和 `quickSetter()`。兩個方法都先建立可重複使用的函式，事件發生時只要把新值傳進去。

## quickTo()：保留補間與 easing

`quickTo()` 適合需要追趕感的互動。先替 x 和 y 各建立一個控制函式：

```jsx
const xTo = gsap.quickTo(follower, "x", {
  duration: 0.45,
  ease: "power3.out",
});

const yTo = gsap.quickTo(follower, "y", {
  duration: 0.45,
  ease: "power3.out",
});
```

Pointer 移動時，把算好的座標交給它們：

```jsx
function handlePointerMove(event) {
  const { x, y } = getPosition(event);
  xTo(x);
  yTo(y);
}
```

它會重用同一個 Tween，把終點更新成最新座標。圓形不會瞬間貼到 Pointer 上，而是依照設定的 duration 和 ease 追過去。

## quickSetter()：不補間，直接寫入

如果不需要 easing，只想立即更新 transform，可以改用 `quickSetter()`：

```jsx
const setX = gsap.quickSetter(follower, "x", "px");
const setY = gsap.quickSetter(follower, "y", "px");

function handlePointerMove(event) {
  const { x, y } = getPosition(event);
  setX(x);
  setY(y);
}
```

第三個參數是單位。這裡傳入 `"px"`，後續只需要提供數字。

`quickSetter()` 不會建立補間過程，收到新值就立刻寫入。Day 6 Demo 使用同一個 Follower 切換模式：`quickTo()` 看起來比較柔順，`quickSetter()` 則緊貼輸入位置。哪一個比較適合，不是單看速度，而是看想要的手感。

| 方法 | 有沒有 Tween | 支援 duration、ease | 常見用途 |
| --- | --- | --- | --- |
| `quickTo()` | 有，並重複使用 | 有 | Cursor follower、帶慣性的追蹤效果 |
| `quickSetter()` | 沒有 | 沒有 | 立即同步座標、快速寫入單一屬性 |

這類互動最好更新 `x`、`y` 等 transform 屬性，不要反覆修改 `left` 和 `top`。Demo 也會依舞台的實際尺寸限制座標，避免 Follower 跑出容器。

切換模式或離開頁面時，事件監聽與仍在執行的 Tween 都要一起清掉：

```jsx
onUnmounted(() => {
  stage.value?.removeEventListener("pointermove", handlePointerMove);
  xTo?.tween?.kill();
  yTo?.tween?.kill();
  context?.revert();
});
```

## 小結

寫出會動的畫面只是第一步。動畫放進元件後，還得知道它控制了哪些元素、什麼時候該停止，以及需不需要還原樣式。

`gsap.context()` 幫忙收集動畫並限制 selector 範圍；要保留停止當下的畫面時用 `context.kill()`，元件卸載或需要恢復初始狀態時用 `context.revert()`。Pointer 這類高頻輸入則不用一直建立 `gsap.to()`：需要補間就選 `quickTo()`，只想立即寫入就用 `quickSetter()`。

前幾天學的是怎麼安排動畫，今天補上的是怎麼把它收乾淨。這兩件事放在一起，GSAP 才比較容易安心地用進真正的頁面裡。

demo 網頁連結：30day-interactive-website-lab
