# Day 2｜GSAP 入門（1）：認識基礎參數

首先，我們先來認識 GSAP。GSAP的全名是 GreenSock Animation Platform，顧名思義就是GreenSock 公司開發的一套網頁動畫工具與函式庫，可以透過 JavaScript 控制 DOM 元素的屬性與樣式，製作流暢且複雜的網頁動畫效果。

### 先了解 Tween 的概念

Tween 可以理解為傳統動畫中「補間」的概念。白話來說，就是指定動畫的「起點」與「終點」，系統便會自動計算並產生中間的變化過程。

像是 `gsap.to()` 用來定義動畫的結束狀態；`gsap.from()` 則是定義「動」之前的樣子；而 `gsap.fromTo()` 可以同時指定開始與結束狀態，至於兩者之間的變化，就交由 GSAP 自動完成。

!image.png

### 基本參數：**xyz、rotation、**duration、delay、ease

以`gsap.to()`為例，一個基本的 Tween 可能會的像這樣：

```jsx
gsap.to(".box", {
  x: 300,
  rotation: 360,
  duration: 2,
  delay: 3,
  ease: "power3.out",
});
```

- **`x / y / z`**：控制元素的座標位置，實際上是透過 CSS `transform` 來實現
- **`rotation`**：用來控制元素旋轉的角度，例如 `rotation: 360` 代表旋轉一整圈
- **`duration`**：是用來設定動畫從開始到完成所需要的時間，單位為秒
- **`delay`**是用來設定動畫開始前需要等待多久，單位為秒
- **`ease`**：用來控制動畫移動過程中的速度變化，詳細可以參考 Day04 - Easing 基礎篇

所以，上方程式碼換成白話就是：

> 讓 `.box` 延遲 3 秒後開始，在 2 秒內向右移動 300px，同時旋轉 360 度，並以power3.out的速度曲線（先快後慢）完成動畫

最後，我同樣有做一個 demo 來實際操作，可以手動輸入不同的參數去看動畫產生的效果
歡迎玩玩看 ⇒ Day 2 Demo　

明天，我們會繼續講解 GSAP 時間軸 (timeline) 的概念
