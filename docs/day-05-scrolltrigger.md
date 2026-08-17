前幾天我們已經用 Tween、Timeline 和 Stagger 做出動畫，也學會怎麼安排播放順序。不過到目前為止，動畫都要靠程式或按鈕觸發。今天換一種很常在形象網站看到的做法：讓動畫跟著頁面捲動。

這次會用到 GSAP 的 ScrollTrigger。它可以監聽元素在頁面上的位置，決定動畫什麼時候開始、在哪裡結束，也能把 Timeline 的播放進度直接綁在捲動距離上。

老樣子，建議搭配 Day 5 Demo 一起操作。

簡單來說，這個 Demo 會把一條 GSAP Timeline 映射到 5 個視窗高度的捲動距離，讓時間軸與頁面捲動連動。往下捲動時，畫面會依序帶到 `trigger`、`start`、`end`、`scrub` 和 `pin` 五個段落，右下角也會顯示目前的動畫進度。

### 先註冊 ScrollTrigger

ScrollTrigger 是 GSAP 的外掛，使用前要先引入並註冊：

```jsx
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
```

接著可以把 `scrollTrigger` 設定放進 Tween，也可以像這次的 Demo 一樣，直接放在 Timeline 上：

```jsx
const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: story.value,
    start: "top top",
    end: "+=500%",
    scrub: 0.8,
    pin: stage.value,
  },
});
```

接下來簡單說明每個參數的作用:

### trigger：要綁定哪個元素

`trigger` 是 ScrollTrigger 用來判斷位置的目標元素。這次 Demo 把外層容器 `.story` 設為 `trigger`。當視窗捲動到指定位置後，ScrollTrigger 才會開始控制 Timeline。

要注意的是，`trigger` 只是觸發動畫的參考點，不一定是正在播放動畫的元素。Timeline 真正控制的，可以是容器裡的其他元素。

### start：動畫從哪裡開始

接著用 `start` 決定觸發時機：

`"top top"` 裡有兩個位置。前面的 `top` 代表 trigger 的頂端，後面的 `top` 代表瀏覽器視窗的頂端。合起來就是：當故事容器的頂端碰到視窗頂端時，動畫開始。

如果改成 `start: "top center"`：

動畫就會提早在 trigger 頂端抵達視窗中央時啟動。

剛開始用 ScrollTrigger 時，我覺得 `start` 最容易看得霧煞煞。開發階段可以先加上 `markers: true`，頁面會直接標出 start、end 與 scroller 的位置，比一直猜座標快很多。完成後記得把 markers 關掉。

### end：這段動畫可以捲多遠

知道起點後，還需要用 `end` 設定終點：`end: "+=500%"`

`+=` 代表從 start 的位置繼續往後計算，而 `500%` 是五個視窗高度。這次 Demo 的動畫 Timeline 有五個段落，所以平均下來每段會對應到一個視窗高度。

這裡設定的是捲動範圍，不是動畫秒數。使用者捲得快，Timeline 就前進得快；停下來時，動畫也會停在當下的進度。如果只需要固定距離，也可以改用像 `end: "+=1200"` 這樣的像素值。

### scrub：綁定動畫 Timeline 與捲動進度

真正讓動畫跟著捲動的設定是 `scrub`：

設為 `true` 時，Timeline 會依照目前的捲動進度播放。向下捲就往前播放，往上捲則倒著回去。

`scrub` 也可以設定為數字：`scrub: 0.8`，代表動畫需要花 0.8 秒趕上目前的捲動進度，會多一點緩衝。我自己覺得這樣看起來比較順，但數值太大也會太拖泥帶水，還是要依畫面節奏調整。這種設定常用於製作視差滾動（parallax）效果。

另外，`scrub` 和 `toggleActions` 是兩種不同的控制方式。前者讓進度跟著捲動，後者則是在進入或離開觸發範圍時執行 `play`、`reverse` 等動作。一般不會把兩者放在同一個 ScrollTrigger 裡。

### pin：固定舞台直到動畫結束

Demo 捲動時，整個動畫舞台會停在畫面中，直到五幕動畫播完才離開。這段效果來自 `pin: stage.value`。`trigger` 負責計算捲動範圍，`stage` 則是被固定的元素。ScrollTrigger 預設會在固定區域後方補上空間，避免後面的內容突然往上擠。

有一個實作上的小提醒：如果固定中的元素還要做大量位移，最好把外層當作 pin 的目標，再去移動裡面的子元素。這樣定位比較穩定，也比較不容易遇到 pin 的位置和動畫 transform 互相影響。

### 小結

今天先用五個設定認識 ScrollTrigger：`trigger` 決定觀察目標，`start` 與 `end` 畫出捲動範圍，`scrub` 將動畫進度交給捲動位置，`pin` 則把舞台留在視窗中。

剛開始設定時，我最常卡住的不是動畫本身，而是「哪個元素的哪個位置，碰到視窗的哪裡」。遇到動畫太早開始、捲不到結尾或 pin 突然跳動時，可以先打開 markers，把 start 和 end 看清楚，再回頭調整數值。

現在我們已經能把前幾天做的 Tween、Timeline 與 Stagger 接到頁面捲動上。下一篇會繼續拿這些設定做更完整的滾動互動。

demo 網頁連結：30day-interactive-website-lab
