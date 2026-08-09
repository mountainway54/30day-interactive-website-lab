# 30-Day Interactive Website Lab

這裡是我的前端互動實驗場。

我會用三十天做三十個 Demo 頁面，把動畫、DOM、Vue 生命週期和各種互動細節真的放進瀏覽器裡跑。比起只貼一段看起來沒問題的程式碼，我更想知道：按鈕連點會怎樣？元件拆掉之後，動畫是不是還在背景偷跑？參數改壞了，畫面會不會直接投降？

每一天挑一個題目動手試。有時從最小範例開始，有時也會故意把錯誤留在畫面上，讓正確與錯誤的差別不只存在 Console 裡。

## 目前的實驗

- Day 01：DOM 與 Vue 生命週期，看看 callback 太早或太晚出現會惹出什麼麻煩。
- Day 02：用 Input 控制 GSAP Tween，直接調整位移、旋轉、時間與 easing。
- Day 03–30：施工中。這張實驗桌還會繼續變亂。

啟動後可從 `#/day-01` 或 `#/day-02` 進入各日 Demo。

## 把實驗室跑起來

需要 Node.js `22.18.0` 以上版本，或 `24.12.0` 以上版本。

```sh
npm install
npm run dev
```

正式建置：

```sh
npm run build
```

預覽建置結果：

```sh
npm run preview
```

## 使用的東西

Vue 3、Vite、Vue Router、Pinia，以及負責不少動畫工作的 GSAP。

## 開發前先看這裡

如果你準備新增下一天，先讀完這兩份文件。裡面記著元件怎麼拆、動畫怎麼收，以及這個系列目前長什麼樣子。

- [實作規格](./IMPLEMENTATION-SPEC.md)：程式結構、資料流與動畫生命週期
- [UI 規範](./UI-GUIDELINES.md)：視覺、版面與無障礙規則
