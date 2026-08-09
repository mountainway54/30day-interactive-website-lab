# 30-Day Interactive Website Lab 實作規格

## 1. 文件用途

本文件提供 AI 開發代理新增 Demo 頁面時使用。

每一天的主題、互動方式與技術可能不同，不需要套用固定元件架構。先理解當日題目，再參考現有頁面的做法，選擇適合的實作。

視覺細節請同時參考 `UI-GUIDELINES.md`。

## 2. 不可省略的底線

- 每天放在獨立的 `src/days/day-NN/` 資料夾。
- 路由頁面命名為 `DayNNView.vue`，並註冊 lazy-loaded route。
- 全站與共用 CSS 放在 `src/assets/main.css`；Day 專屬 CSS 放在 `src/days/day-NN/day-NN.css`，由 `DayNNView.vue` 引入。
- Day 專屬 CSS 使用 `.day-NN-` 前綴。
- 元件卸載時清理動畫、計時器與事件監聽。若故意不清理，必須在畫面與程式註解中標示為錯誤示範。
- 重要互動結果直接顯示在畫面上，不只寫進 Console。

## 3. 建議的專案結構

```text
src/days/day-NN/
├─ DayNNView.vue
├─ day-NN.css
└─ 當日需要的子元件
```

`DayNNView.vue` 負責頁面編排與跨元件狀態。直接操作 DOM 或執行動畫的程式，通常放在擁有該 DOM 的子元件。

子元件依實際需要建立，不強制拆出展示區、控制面板或共用狀態檔。檔名使用 PascalCase，並清楚表達用途。

## 4. 元件與動畫原則

- 使用 Vue 3 Composition API 與 `<script setup>`。
- 單一元件使用的狀態留在元件內；多個元件共用的狀態放到共同父層。
- 父子元件可依情況使用 props、emit 或 `v-model`，保持資料流容易追蹤。
- Template ref 必須等到 DOM 掛載後再操作；資料更新後需要讀取新 DOM 時，使用 `nextTick()`。
- 播放新動畫前先停止舊動畫，重播與重設都要回到明確狀態。
- 使用者可調整的數值需處理無效輸入，並限制在 Demo 可承受的範圍。
- 動畫位移依容器實際尺寸計算，避免只適用於固定螢幕寬度。
- 動態狀態使用適當的 `aria-live`，互動元件要能使用鍵盤操作。
- 按鈕與重要狀態不要因切換而造成不必要的版面跳動。
- 頁面應提供足夠資訊，讓使用者看得懂操作造成的變化。

動畫工具依主題選擇。使用 `requestAnimationFrame` 時保存 frame id 並在卸載時取消；使用 GSAP 時停止既有 tween，並在卸載時清除該元素的動畫。

## 5. Router 設定

在 `src/router/index.js` 加入路由：

```js
{
  path: '/day-NN',
  name: 'day-NN',
  component: () => import('@/days/day-NN/DayNNView.vue'),
  meta: {
    day: NN,
    title: '當日主題',
  },
}
```

確認 route path、name、資料夾、檔名與頁首 Day 編號一致。完成後執行 `npm run build`。
