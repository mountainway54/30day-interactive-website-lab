# Day 4｜利用 Stagger 排列規律動畫

昨天我們介紹了 Timeline 的 Position Parameter 與 Label，學會安排不同 Tween 在時間軸上的位置。今天要介紹另一個 GSAP 非常好用的函式 `stagger`，它可以讓多個元素播放相同動畫，還能讓他們依照相同的時間間距依序播放。

老樣子，我們可以搭配 demo 來實際操作~ 👉🏿 demo連結

**## 不用替每個方塊各寫一段 Tween**

如果畫面上有五個方塊，當然可以分別替它們建立 Tween：

```jsx
const tl = gsap
  .timeline()
  .to(".box-1", { y: -54, rotation: 90, scale: 1.15 })
  .to(".box-2", { y: -54, rotation: 90, scale: 1.15 })
  .to(".box-3", { y: -54, rotation: 90, scale: 1.15 })
  .to(".box-4", { y: -54, rotation: 90, scale: 1.15 })
  .to(".box-5", { y: -54, rotation: 90, scale: 1.15 });
```

但這些方塊的動畫內容完全相同，只有開始時間不同。這類重複動畫更適合交給 `stagger`：

```jsx
const tl = gsap.timeline().to(".box", {
  y: -54,
  rotation: 90,
  scale: 1.15,
  duration: 1.2,
  ease: "power2.inOut",
  stagger: {
    each: 0.18,
  },
});
```

這代表相鄰兩個元素的開始時間相差 `0.18` 秒
五個方塊的開始時間會是：0.00s / 0.18s / 0.36s / 0.54s / 0.72s

`stagger` 不會縮短每個方塊自己的動畫時間。上面的 `duration` 仍然是 `1.2` 秒，只有開始時間被依序錯開。

### **each 與 amount**

實際上 stagger 有兩種用法 `each` 與 `amount`，stagger 預設的是使用 `each`，因此上方範例中`stagger: 0.18` 就是 `each: 0.18` 的簡寫。

- `each` 是控制每個元素之間固定的時間差
- `amount` 是控制「第一個動畫起點」與「最後一個動畫的起點」之間的時間差，讓 GSAP 自動計算每個元素動畫的間距

如果將 demo 中的each: 0.18換成amount: 1，五個方塊的「起始時間」會平均分布在 1 秒內，因此會是：0.00s / 0.25s / 0.50s / 0.75s / 1.00s，整組動畫會是 1 秒 + 1.2 秒，總共會是 2.2 秒。

### 二維 Stagger

Stagger 不只能處理一排元素，也可以依照二維網格中的距離安排順序

第二個 Demo 使用 25 個方塊組成 5 × 5 網格，Stagger 可以依據 `from`與`axis` 去以不同順序播放動畫：

```jsx
gsap.to(".dot", {
  scale: 1.65,
  backgroundColor: "#c63d2f",
  duration: 0.42,
  ease: "power2.inOut",
  repeat: 1,
  yoyo: true,
  stagger: {
    amount: 1,
    grid: [5, 5],
    from: "center",
    axis: null,
  },
});
```

#### grid：告訴 GSAP 元素如何排列

`grid: [5, 5]` 表示畫面上的元素排列成五欄、五列。設定後，GSAP 會依元素在網格中的距離計算 stagger，而不是只按照 DOM 中的先後順序播放。

當實際排列與 GSAP 設定的 Grid 不一致時，建議使用 `grid: "auto"`，讓 GSAP 自動依照元素在畫面上的實際排列判斷 Grid，或是用在RWD的排版也很適合。

#### from：決定擴散起點

| 設定           | 動畫順序                 |
| -------------- | ------------------------ |
| `"center"`     | 從網格中央向外擴散       |
| `"end"`        | 從目標陣列的尾端開始     |
| `"edges"`      | 從外圍往中央推進         |
| `"random"`     | 每次播放都隨機排列順序   |
| `[0.25, 0.75]` | 從偏左下方的自訂座標開始 |

陣列形式使用的是比例座標，不是方塊的整數欄列。`[0, 0]` 接近左上角，`[1, 1]` 接近右下角，因此 `[0.25, 0.75]` 代表偏左下方的位置。

#### axis：限制距離計算方向

| 設定   | 動畫方向                      |
| ------ | ----------------------------- |
| `null` | 同時計算 x 與 y，形成二維擴散 |
| `"x"`  | 只依水平方向的距離錯開        |
| `"y"`  | 只依垂直方向的距離錯開        |

例如 `from: "center"` 搭配 `axis: "x"` 時，動畫會從中間欄位向左右展開；改成 `axis: "y"` 後，則會從中間列向上下展開。

#### 反向播放

最後補充一個很常用的功能「反向播放」。動畫完成後，可以呼叫 `reverse()`，讓同一段動畫依相反順序返回初始狀態：

```jsx
function reverseAnimation() {
  tl.reverse();
}
```

#### 小結：

今天我們學會使用 stagger 去讓陣列物件去重複執行相同動畫，明天我們將會繼續學習 GSAP 的ScrollTrigger，就可以結合先前的動畫，製作一個簡單的互動。
