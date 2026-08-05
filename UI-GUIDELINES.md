# Creative Frontend Lab UI 規範

這份文件記錄目前 Day 01 的介面規則。新增頁面時以此為基礎，保留系列一致性，再依當天技術調整 Demo 內容。

## CSS 管理

- 全站樣式統一放在 `src/assets/main.css`。
- `src/main.js` 已載入 `main.css`，元件內不需要重複 `import`。
- Vue 元件原則上不放 `<style>`。
- 新頁面的專屬 class 建議加上日期前綴，例如 `.day-02-stage`，避免全域樣式互相覆蓋。
- 共用 class 可沿用 `.day-page`、`.lab-nav`、`.experiment`、`.section-heading`、`.controls`。

## 色彩

| 用途 | 色碼 | CSS 變數 |
| --- | --- | --- |
| 全站背景／Cool Gray | `#c2c7cb` | `--paper` |
| 主要文字／框線 | `#17212b` | `--ink` |
| 次要文字 | `#52616f` | `--muted` |
| Demo 淺色表面 | `#edf2f5` | `--surface` |
| 強調色／主要操作 | `#c63d2f` | `--signal` |
| 強調色 Hover | `#a92f24` | — |
| 深色資訊面板 | `#17212b` | — |

新頁面應優先使用既有變數。若 Demo 技術需要額外顏色，可新增頁面專屬變數，但不要改變全站背景、主要文字與強調色。

## 字體

- 一般文字：`Aptos`、`Noto Sans TC`、`Microsoft JhengHei`、sans-serif。
- 區塊主標題：`20px`，使用 `Georgia`、`Times New Roman`、serif，字重 `700`。
- 主標題中的英文使用 `.heading-english` 包覆，改用 `Aptos`、`Noto Sans TC`、`Microsoft JhengHei`、sans-serif，字重 `800`；中文維持襯線體。
- 狀態、標籤與技術資訊：`Cascadia Code`、`Consolas`、monospace。
- 主標題上方的英文小標使用 `Cascadia Code`、`Consolas`、monospace，字重 `700`。
- 英文小標統一顯示為大寫、使用較寬字距，字級 `0.72rem`，並套用強調色。
- Demo 內的狀態標籤與技術資訊維持 monospace，字級約 `0.68rem–0.72rem`。
- 內文行高以 `1.6–1.7` 為主。

## 頁面結構

每一個 Day 頁面使用以下基本順序：

```vue
<template>
  <main class="day-page">
    <nav class="lab-nav">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>02 / 30</span>
    </nav>

    <section class="experiment">
      <header class="section-heading">
        <div>
          <p>技術或狀態名稱</p>
          <h2>當天 Demo 主題</h2>
        </div>
      </header>

      <!-- 當天的互動 Demo -->

      <div class="controls">
        <!-- 操作按鈕 -->
      </div>
    </section>
  </main>
</template>
```

## 版面

- 頁面最大寬度：`1180px`。
- 桌面左右留白：至少 `20px`。
- 頂部導覽列使用細框線分隔。
- Demo 主區塊與導覽列之間使用響應式間距：`clamp(40px, 7vw, 80px)`。
- Demo 容器使用 `1px` 深色邊框與 `12px` 硬陰影。
- 雙欄 Demo 使用 `1.6fr / 0.8fr`，左側放主要展示、右側放狀態或數據。
- 元件間距以 `12px`、`16px`、`18px`、`24px` 為主要級距。

## 按鈕

- 最小高度：`48px`。
- 左右內距：`22px`。
- 邊框：`1px solid var(--ink)`。
- 主要操作使用紅底白字。
- 次要操作使用透明底與深色文字。
- 警示或實驗性操作使用透明底與紅色文字。
- Disabled 狀態保留原位置，使用 `opacity: 0.38` 與 `not-allowed` 游標，避免版面跳動。
- 所有按鈕應固定呈現，不因狀態切換而改變排列。

## Demo 與狀態面板

- 動畫展示區使用 `24px × 24px` 網格背景。
- 狀態面板使用深色背景、monospace 字體與兩位數數量，例如 `00`、`01`、`02`。
- 畫面要能直接呈現操作結果，不應只依賴 Console。
- Console 訊息保持短句，不加時間，例如「動畫開始」、「動畫已取消」。
- 故意示範錯誤時，必須清楚標示原因，並提供「重設 Demo」方式。

## 響應式

斷點使用 `760px`：

- `.day-page` 左右留白改為 `12px`。
- Demo 容器 padding 改為 `20px`，陰影改為 `7px`。
- 雙欄內容改成單欄。
- 標題與狀態改為上下排列。
- 控制按鈕改為垂直排列並維持滿寬。

## 動態效果與無障礙

- 動畫元件必須處理 `prefers-reduced-motion: reduce`。
- 互動按鈕使用原生 `<button>`，並提供清楚的文字。
- 動態狀態面板使用 `aria-live="polite"`。
- 純裝飾元素使用 `aria-hidden="true"`。
- 鍵盤焦點使用 `3px` 強調色外框。
- 元件卸載時應清除 `requestAnimationFrame`、計時器與事件監聽；若故意不清除，需標明這是錯誤示範。

## 新增 Day 頁面

1. 在 `src/days/` 建立資料夾，例如 `day-02/`。
2. 建立 `Day02View.vue`，使用上述頁面結構。
3. 將當天專屬元件放在同一個 Day 資料夾。
4. 將新樣式加到 `src/assets/main.css`，並以 `.day-02-` 前綴命名。
5. 在 `src/router/index.js` 新增 lazy-loaded route：

```js
{
  path: '/day-02',
  name: 'day-02',
  component: () => import('@/days/day-02/Day02View.vue'),
  meta: {
    day: 2,
    title: '當天主題',
  },
}
```

6. 將頁首天數更新為 `02 / 30`。
7. 執行 `npm run build`，確認路由、響應式版面與正式建置正常。

## 新頁面檢查清單

- [ ] 頁面使用 `.day-page` 與 `.lab-nav`。
- [ ] Day 編號與 Router path 正確。
- [ ] 樣式集中於 `src/assets/main.css`。
- [ ] 頁面專屬 class 使用 Day 前綴。
- [ ] 桌面與手機版面皆可操作。
- [ ] 按鈕不因狀態切換而改變排列。
- [ ] 動態資訊可從畫面直接理解。
- [ ] 動畫、計時器與事件監聽有正確清理。
- [ ] 支援 reduced motion 與鍵盤焦點。
- [ ] `npm run build` 通過。
