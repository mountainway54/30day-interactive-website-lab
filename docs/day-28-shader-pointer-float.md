# Day 28｜讓模型漂在水面上：模型位移與 Shader 位移的效能取捨

今天繼續復刻 [Aether 1](https://aether1.ai/) 的互動效果。

仔細觀察後，我發現游標移到畫面不同位置時，產品會被推向不同方向，接著慢慢回彈，看起來就像物件漂在水面上。搭配昨天做的水波折射，整個畫面又多了一點漂浮感。

一開始請 AI 實作時，它直接修改模型在 3D 場景中的位置。效果做出來了，但互動時有明顯卡頓。後來我請它改用後製 Shader 處理位移，操作起來順暢許多。

今天就來拆開這兩種做法，看看差別在哪裡~~

可以搭配今天的 [demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-28)

## 第一版：移動模型模擬漂浮與回彈

最直覺的做法，是根據游標位置算出推開方向，再把位移加到模型上。

假設游標在產品左側，產品就稍微往右移；游標移到另一側，推力方向也跟著改變。如果直接把模型放到目標位置，動作會太硬，因此中間加上一段彈簧運動，讓產品慢慢靠近目標，帶一點回彈。

下面是用來說明第一版思路的簡化程式：

```js
// restPosition 是模型原本的位置。
// target 是游標決定的目標偏移，offset 是目前偏移。
force.copy(target).sub(offset);
velocity.addScaledVector(force, 16 * dt);
velocity.multiplyScalar(Math.exp(-6 * dt));
offset.addScaledVector(velocity, dt);

model.position.copy(restPosition).add(offset);
renderer.render(scene, camera);
```

`target - offset` 表示距離目標還差多少，這個差距會推動速度。阻尼則讓速度逐漸減小，避免模型一直來回晃動。`dt` 是兩次更新之間經過的秒數，用來把時間納入運動計算。

游標離開後，把 `target` 設回零，模型就會回到原位。這裡只是在模擬漂浮的手感，沒有真的計算水的浮力或流體。

這種做法會改變模型的世界座標，所以光照、遮擋與透視都能依照新的位置重新計算。如果產品需要在空間裡移動，這是很合理的選擇。

## 為什麼畫面開始卡頓？

修改 `model.position` 的幾個數值，本身通常很便宜。問題在於，為了讓新的位置出現在畫面上，後面還要重新渲染場景。

位移只有一點點，也不代表渲染工作只剩一點點。一般的 Three.js 場景渲染不會因為模型只移動幾個像素，就自動只重畫那一小塊區域。

而且，游標停下後，彈簧還要繼續回彈。這段期間每次更新位置，都需要產生新畫面。

這次場景裡有多種材質，包含透光外蓋使用的 `MeshPhysicalMaterial`，也有會產生陰影的點光源。每次完整渲染需要處理的工作，遠比更新位置多。

因此，不能直接把這次經驗理解成「移動模型會很慢」。簡單場景裡，直接移動模型完全可能很順。這次值得檢查的是：游標互動期間，有哪些昂貴的渲染工作被反覆執行？

## 重繪陰影與場景

控制器左右燈條附近各配置了一盞點光源，並開啟陰影，讓不透明外殼能擋住光線，避免藍光直接穿過模型。

點光源會向四面八方照射。Three.js 的點光源陰影需要朝六個方向繪製深度資訊，因此兩盞開啟陰影的點光源，更新陰影時就涉及十二個方向的陰影繪製。每個方向實際畫到哪些物件，仍會受到可見範圍與物件設定影響，不能直接換算成「整個畫面慢十二倍」。實作可以參考 [PointLightShadow 原始碼](https://github.com/mrdoob/three.js/blob/master/src/lights/PointLightShadow.js)。

在陰影自動更新的情況下，持續渲染場景也會反覆更新陰影。加上產品本身的材質與後製效果，游標的小幅互動就帶動了一整段渲染流程。

目前版本讓模型與燈光保持固定，便可以將點光源陰影改成需要時才更新：

```js
light.shadow.autoUpdate = false;
light.shadow.needsUpdate = true;
```

`autoUpdate = false` 關閉自動更新；`needsUpdate = true` 則要求下一次渲染建立陰影。之後如果會影響陰影的物件或燈光改變，就必須再次標記更新。這兩個屬性的行為可參考 [LightShadow 官方文件](https://threejs.org/docs/pages/LightShadow.html)。

這裡有兩份可以重用的資料：一份是光源看到的陰影貼圖，另一份是主相機看到的場景影像。兩者的更新時機不同。這次只有主相機運鏡時，場景影像需要重畫，但固定模型與固定點光源之間的陰影仍可沿用。

以上是從程式流程能確認的額外成本。這次沒有留下前後版本的 FPS 或 GPU 計時數據，所以「順暢許多」是操作時的觀察，還不能判定各項成本分別占了多少時間。

## 第二版改用 Shader 後製位移

昨天已經把 3D 場景渲染成影像，再用 Shader 修改取樣位置來製造水波。其實只要沿用這條流程，多加入一個整體位移量 `uOffset`也能達到移動模型的視覺效果。

彈簧計算仍然保留，只是算出來的 `floatOffset` 不再寫入 `model.position`，而是換算成畫面上的 UV 位移：

```js
projectedOffset.copy(floatOffset).project(camera);
projectedOrigin.set(0, 0, 0).project(camera);

refraction.setOffset(
  (projectedOffset.x - projectedOrigin.x) / 2,
  (projectedOffset.y - projectedOrigin.y) / 2,
);
```

`project(camera)` 會把世界座標投影到標準化裝置座標，畫面內的 X、Y 範圍是 `-1～1`。UV 的範圍是 `0～1`，所以這裡把兩個投影位置的差除以二，得到傳入 Shader 的位移量。

接著，把漂浮位移和昨天的水波偏移放進同一個取樣公式：

```glsl
vec2 sampleUv = vUv - uOffset + displacement;

if (
  any(lessThan(sampleUv, vec2(0.0))) ||
  any(greaterThan(sampleUv, vec2(1.0)))
) {
  gl_FragColor = vec4(0.0);
  return;
}
```

`uOffset` 負責整體漂浮，`displacement` 則是水波造成的局部扭曲。後面再沿用 Day 27 的 RGB 分離取樣。

這裡使用 `vUv - uOffset`。假設 `uOffset.x` 是正值，每個像素會往來源影像左邊取色，畫面內容看起來就往右移，方向才會和預期一致。

取樣座標超出影像範圍時，直接輸出透明，避免把邊緣像素一路拉長。不過，原本沒被相機畫進紋理的內容，Shader 也無法補回來，所以位移幅度仍要控制。

實際被平移的是整張 3D 場景影像，包含產品與影像裡的光影。

## 快取場景影像，區分游標互動與捲動運鏡

如果只是把位移改成 Shader，卻仍在每一幀透過 `RenderPass` 重畫場景，前面提到的場景成本還是存在。

這次效能改善的重要改動，是把場景先畫進 `WebGLRenderTarget`，再用 `TexturePass` 把這張紋理交給後製流程。`TexturePass` 的用途就是將指定紋理繪製到整個畫面，可以參考 [官方文件](https://threejs.org/docs/pages/TexturePass.html)。

```js
const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
});
const scenePass = new TexturePass(sceneTarget.texture);

composer.addPass(scenePass);
composer.addPass(pass);
composer.addPass(output);
```

渲染時，先判斷場景影像需不需要更新。以下保留目前實作的主要邏輯：

```js
render(refreshScene = true) {
  if (refreshScene || sceneDirty) {
    const previousTarget = renderer.getRenderTarget();

    try {
      renderer.setRenderTarget(sceneTarget);
      renderer.clear();
      renderer.render(scene, camera);
      sceneDirty = false;
    } finally {
      renderer.setRenderTarget(previousTarget);
    }
  }

  pass.uniforms.uTime.value = performance.now() / 1000;
  composer.render();
}
```

游標漂浮與水波動畫呼叫 `render(false)`，沿用快取的場景影像，只更新後製效果。捲動時，相機位置與觀看方向會改變，就呼叫預設的 `render()`，重新產生場景影像。

整個流程可以分成：

```text
只有游標互動：
快取的場景紋理 → 漂浮／水波 Shader → OutputPass → 畫面

捲動改變相機：
重新渲染 3D 場景 → 更新場景紋理 → 後製流程 → 畫面
```

容器尺寸改變時，也會調整 RenderTarget 的尺寸，並將 `sceneDirty` 設成 `true`，避免繼續使用舊尺寸的影像。未來如果加入模型動畫、材質變化或動態燈光，同樣要讓快取失效。

這裡還有一個小細節，Shader 讓產品看起來移動了，但 3D 模型其實還留在原位。如果直接用游標位置做 Raycaster 命中測試，就可能發生「明明指著產品，程式卻說沒碰到」的情況。假設畫面中的產品往右移了 20px，測試時就先把游標座標往左移回 20px，讓它對上原本的模型。

## 六、兩種做法的取捨：真實空間移動與螢幕效果

| 比較項目     | 移動 3D 模型                     | 後製 Shader 位移搭配場景快取   |
| ------------ | -------------------------------- | ------------------------------ |
| 改變的資料   | 模型的空間位置                   | 場景影像的取樣座標             |
| 透視與遮擋   | 依新位置重新計算                 | 沿用原本影像，不會露出新的表面 |
| 光照與陰影   | 可反映模型與光源的新關係         | 原有光影跟著影像一起移動       |
| 游標互動成本 | 需要重新渲染場景，陰影視設定更新 | 可重用場景影像，只執行後製     |
| 命中測試     | 可直接測試移動後的模型           | 需要補償畫面位移               |
| 適合的需求   | 空間移動、碰撞、物件間遮擋       | 小幅漂浮、晃動、畫面扭曲       |

這次想做的是產品展示裡的小幅漂浮，沒有要讓控制器撞到其他物件，也不需要因為這點位移看見新的側面。沿用原本光影、稍微移動畫面，已經能呈現我要的感覺。

除非是想讓產品大幅旋轉、翻到背面，或是在場景中穿過其他物件，就需要回到真正的 3D 變換。
