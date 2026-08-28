# Day 11｜WebGL(1)

經過了鐵人賽的 1/3 ，我們終於來到了 WebGL，可喜可賀！如我們在 day7 有稍微提過的，WebGL 也是 `<canvas>` 中的另一種繪圖環境，是瀏覽器中的 GPU 圖形 API，可以把大量頂點與像素運算交給顯示卡處理，因此很適合 3D 場景、複雜特效和大量圖形資料。

實際開發時，多數前端工程師不會直接裸寫 WebGL，而是使用上層函式庫，例如 Three.js，因此 WebGL 會著重原理與渲染邏輯，而非實作語法。

首先，WebGL 與 Canvas 2D 最大的不同，在於多了一個將資料交給 GPU 處理的過程。整個流程可以想像成：

JavaScript 中準備好圖形的頂點座標  
⇒ 再透過 Buffer 將這些資料傳給 GPU  
⇒ Vertex Shader 會逐一處理每個頂點，決定它們最終出現在畫面上的位置  
⇒ 經過 Rasterization 轉換成螢幕上需要處理的像素片段  
⇒ Fragment Shader 決定每個片段的顏色
最後才形成我們實際看到的畫面。

!image.png
