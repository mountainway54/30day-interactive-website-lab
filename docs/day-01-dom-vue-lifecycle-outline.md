# Day 1｜動畫不會 DOM？從掛載看懂 Vue 生命週期

嗨嗨大家好，我是一名剛轉職前端的小菜雞工程師。

在參加前端轉職班的期間，我不知不覺在社群上收藏了不少技術分享。可能是因為過去的設計背景，我存下來的內容大多和畫面、動畫、互動有關。每次看到那些很酷的效果，都會忍不住想：「這到底是怎麼做出來的？」

培訓結束後，總算可以認真挖出這些收藏，一個個研究、實際動手試試看。這個系列會記錄我摸索各種技術與套件的過程，也會比較同一個效果換不同工具來做，寫法和結果有什麼差別。

最後，希望能把這段時間學到的新技術用在個人作品集網站上，做出許多炫砲又有趣的視覺互動！

### 動畫開始之前...

在開始製作網頁動畫之前，一定要先了解動畫是怎麼在瀏覽器中運作，而這就離不開 DOM 與生命週期的概念。

不論是使用原生 JavaScript，還是 React、Vue 等前端框架，都有各自的生命週期概念。原生 JavaScript 主要是配合頁面與 DOM 的載入流程，而 React、Vue 則將生命週期延伸到元件（Component）層級，讓我們可以在元件建立、更新或銷毀的不同階段執行程式。

理解生命週期最大的好處，就是知道動畫該在什麼時機執行，也能避開因為生命週期鉤子使用錯誤而踩到的各種坑，讓動畫效果更符合預期。

本系列將以 Vue 作為主要開發框架，生命週期鉤子的相關概念可參考 [Vue 的官方文件](https://vuejs.org/guide/essentials/lifecycle.html)。

接下來我會以三個 demo 來實際演示動畫掛在不同鉤子上的差異
(建議搭配 [demo網頁](https://mountainway54.github.io/30day-interactive-website-lab) 操作，會比較好理解喔~~)

### Demo 1：是 Callback 來得太早

寫好動畫後，並不是直接呼叫就能執行，而是必須等到 Vue 將元件渲染到 DOM 後，才有辦法進行操作。

首先，我們先建一個簡單的方塊：

```jsx
<template>
  <div ref="box" class="demoBox"></div>
</template>
```

再來我們寫一個簡單的「向右移動」動畫，`moveBox()`會先算出方塊能移動的範圍，每次往右移動 2px，碰到右側後，就回到左邊重新開始：

```jsx
function moveBox() {
  // 取得要移動的元素
  const el = box.value;

  // 計算可移動的最大 X 座標
  const maxX = Math.max(el.parentElement.clientWidth - el.offsetWidth, 0);

  // 每次向右移動 2px，到達最右邊後回到起點
  xPosition = xPosition >= maxX ? 0 : xPosition + 2;

  // 使用 transform 移動元素
  el.style.transform = `translate3d(${xPosition}px, 0, 0)`;

  // 在瀏覽器下一幀繼續執行，形成連續動畫
  frameId = requestAnimationFrame(moveBox);
}
```

上方範例直接呼叫 `moveBox()`。這時程式還處於 `setup` 階段，Vue 元件的 DOM 尚未掛載完成，因此無法取得方塊元素。如果沒有先判斷元素是否存在，程式就會報錯：

```jsx
try {
  moveBox();
} catch (error) {
  message.value = error instanceof Error ? error.message : String(error);
}
```

下方範例把 `moveBox()` 放進 `onMounted()`。等元件掛載完成後，程式就能取得方塊，動畫也能順利播放：

```jsx
onMounted(() => {
  moveBox();
});
```

### Demo 2：元件離去，動畫仍在默默執行

動畫需要等到 DOM 完成渲染才能開始執行，但元件卸載後，動畫並不會自動停止。
在這個 demo 中，按下`掛載方塊`後，兩個方塊都會開始移動；按下`移除方塊`後，它們也會一起從畫面上消失。
不同的是，下方方塊雖然已經從畫面移除，動畫仍持續在背景執行。
這樣會造成什麼問題呢？

兩個方塊都會在 `onMounted()` 執行後呼叫 `startAnimation()`去播放 `moveBox()`動畫：

```jsx
onMounted(() => {
  state.xPosition = 0;
  startAnimation();
});

function startAnimation() {
  isRunning.value = true;
  frameId = requestAnimationFrame(moveBox);
}
```

按下「移除方塊」後，兩個方塊都會從畫面卸載。不過，DOM 被移除不代表先前預約的動畫 callback 會自動停止。

上方範例會在 `onUnmounted()` 呼叫 `stopAnimation()`，再使用 `cancelAnimationFrame()` 取消下一次動畫：

```jsx
function stopAnimation() {
  cancelAnimationFrame(frameId);
  isRunning.value = false;
}

onUnmounted(() => {
  stopAnimation();
});
```

下方範例則故意不呼叫 `stopAnimation()`。雖然方塊已經看不見，`moveBox()` 還是會繼續執行下一幀：

```jsx
onUnmounted(() => {
  // 沒有呼叫 stopAnimation()
  emit("trace", "沒有取消動畫，callback 會繼續執行");
});
```

可以觀察到，如果動畫沒有被正常取消，即使元件已經卸載，動畫仍可能在背景持續執行

當方塊再次掛載時，新舊動畫就會同時執行並一起修改位置
原本每次只移動 2px，疊加後可能變成 4px、6px...，因此方塊會愈跑愈快

不過這個 demo 是為了讓問題更明顯，刻意讓舊的 callback 在方塊重新掛載後，繼續控制新建立的元素。實際開發時，未清理的 callback 不一定會出現完全相同的效果，但它仍可能在背景持續執行，造成額外的效能負擔。

### Demo 3：終點變了，你卻還停留在原地

一般來說，當資料或狀態改變時，動畫也需要配合更新後的畫面重新調整。
但如果沒有在`onUpdated()`中重新執行動畫，即使終點位置已經改變，方塊仍然會停在原本的位置。為什麼會有這個差別？

首先在`onMounted`，讓上下的方塊都移動到初始設定的終點，也就是中間位置：

```jsx
onMounted(() => {
  moveToEnd(topBox.value, topEnd.value, "top");
  moveToEnd(bottomBox.value, bottomEnd.value, "bottom");
});
```

按下按鈕 `改變終點位置`後，原本設定的終點位置會從中間改至最右側。

但 `onMounted()` 只會在元件第一次出現時執行，不會因為終點移動就再跑一次。
所以上面的方塊根本不知道終點變了，還是停在原本的位置；
而下方的方塊額外在 `onUpdated()` 再次執行動畫。當終點位置更新以後，它會繼續移動到新的位置：

```jsx
onUpdated(() => {
  if (!shouldMove) return;

  shouldMove = false;
  moveToEnd(bottomBox.value, bottomEnd.value, "bottom");
});
```

總而言之，這個 demo 表達的是，動畫的目標位置可能會跟著畫面改變。第一次進入頁面時，可以在 `onMounted` 取得位置；畫面更新後，則要用 `onUpdated` 或 `nextTick()` 等畫面更新完成，再讀取一次。

### 小結

生命週期還有許多其他的動畫應用。例如，元件的淡入淡出會搭配 `<Transition>` 的 enter、leave 等 Hook；頁面切換動畫通常會在 `onMounted()` 建立，並於 `onUnmounted()` 清理；需要等待畫面更新後才能執行的動畫，則會搭配 `nextTick()`。把這些瀏覽器運作的流程釐清，後面不管使用 CSS、GSAP、Canvas 或其他動畫工具，都比較不容易被奇怪的行為卡住。

那 Vue 的生命週期就先複習到這邊，明天馬上就要來開始講解動畫啦！　～敬請期待～

demo網頁連結:[30day-interactive-website-lab](https://mountainway54.github.io/30day-interactive-website-lab)
