# Day 27｜水之呼吸！用 Shader 做出水波折射效果

昨天看到了一個很酷的網站，[Aether 1](https://aether1.ai/)，今天就來嘗試復刻他的 shader 效果~~

延續昨天的 Lenis 捲動與產品運鏡，今天讓游標移動的位置留下短暫的波紋。波紋經過的地方會出現扭曲，邊緣再帶一點 RGB 分離的色散效果。

可以搭配 [Day 27 Demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-27)　操作，把游標滑過手把邊緣，觀察輪廓的變化。

## 二、不改模型，改變畫面的取樣位置

前面介紹過透過位移貼圖來修改頂點位置，讓模型表面產生起伏，但今天要做的完全是不同的邏輯，比較像是在最後畫面產生的階段套上一層濾鏡。可以先把場景渲染成一張紋理，再交給 Shader 重新取樣。

`texture2D()` 的工作，是到紋理的指定座標讀取顏色。第一個參數 `tDiffuse` 是前一道後製流程輸出的影像，第二個參數則決定「要讀取影像的哪個位置」。

`vUv` 是目前像素對應的紋理座標，這裡的 UV 範圍是 `0～1`，所以 `(0.5, 0.5)` 就是影像中央。我們把原始取樣與偏移後的取樣放在一起看：

```
// 假設目前正在處理畫面中央的像素，vUv 是 vec2(0.5, 0.5)。
// 原始取樣：讀取來源影像 (0.5, 0.5) 的顏色。
vec4 originalColor = texture2D(tDiffuse, vUv);

// 將取樣位置向右偏移影像寬度的 2%，垂直位置不變。
vec2 displacement = vec2(0.02, 0.0);

// 偏移後取樣：改讀取來源影像 (0.52, 0.5) 的顏色。
vec4 refractedColor = texture2D(tDiffuse, vUv + displacement);

// 將偏移後讀到的顏色，輸出到目前正在處理的像素。
gl_FragColor = refractedColor;
```

這段程式執行後，畫面中央的像素仍然留在中央，但它顯示的顏色，改成從來源影像稍微靠右的位置取得。可以想成：我們正在替畫面中央填色，只是把取色的位置從 `(0.5, 0.5)` 移到 `(0.52, 0.5)`。`originalColor` 留在範例裡供比較，實際輸出使用的是 `refractedColor`。

因此，`displacement.x` 是正值，代表「往右讀取顏色」。右邊的內容被取來畫在目前位置，視覺上反而會往左移，不能直接把它理解成產品向右移動。

上面的固定偏移量只是用來說明取樣方式。如果整張畫面都使用相同偏移量，除了邊界處理之外，看起來會像整張影像平移。要讓輪廓彎曲，就需要讓不同像素使用不同的偏移量：波紋影響較強的位置偏移較多，影響較弱的位置偏移較少，產品邊緣才會出現局部拉伸與扭曲。

後面的水波公式，就是用來計算這個隨位置與時間變化的 `displacement`。把它加到 UV 上，再讀取顏色，就能模擬隔著波動水面觀看產品的「折射」感。

## 三、用 EffectComposer 串接後製流程

先匯入後製需要的工具：

```js
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
```

`EffectComposer` 會依加入順序執行每一道 Pass，也就是一次影像處理步驟。這次的順序是：

```text
場景與相機 → RenderPass → 水波 ShaderPass → OutputPass → Canvas
```

`RenderPass` 先畫出產品，`ShaderPass` 再讀取這張影像並加入折射。這種串接方式可以參考 [EffectComposer 官方文件](https://threejs.org/docs/pages/EffectComposer.html)。

我們先建立波紋資料與 ShaderPass。以下的 `vertexShader`、`fragmentShader` 是 GLSL 字串，後面會拆開說明內容：

```js
const composer = new EffectComposer(renderer);
const scenePass = new RenderPass(scene, camera);
const waves = Array.from(
  { length: 8 },
  () => new THREE.Vector4(0.5, 0.5, -10, 0),
);

const pass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uWaves: { value: waves },
    uTime: { value: 0 },
    uAspect: { value: 1 },
  },
  vertexShader,
  fragmentShader,
});

pass.uniforms.uWaves.value = waves;

const output = new OutputPass();
composer.addPass(scenePass);
composer.addPass(pass);
composer.addPass(output);
```

`ShaderPass` 預設會把上一道 Pass 的影像交給 `tDiffuse`，因此初始化時可以先填 `null`，不必自己每幀指定紋理。[ShaderPass 官方文件](https://threejs.org/docs/pages/ShaderPass.html)

這裡還有一個容易漏掉的地方：使用 Shader 物件建立 `ShaderPass` 時，uniforms 會被複製。因此建立後要把 `uWaves.value` 接回原本的 `waves`，後續游標事件更新陣列時，Shader 才會使用同一份資料。

最後的 `OutputPass` 負責色調映射與色彩空間轉換，會讀取 renderer 的相關設定。這次把它放在折射之後，完成最終輸出。[OutputPass 官方文件](https://threejs.org/docs/pages/OutputPass.html)

原本直接呼叫 `renderer.render(scene, camera)` 的位置，現在改成更新時間，再執行後製流程：

```js
pass.uniforms.uTime.value = performance.now() / 1000;
composer.render();
```

容器尺寸改變時，也要同步更新後製尺寸與寬高比：

```js
pass.uniforms.uAspect.value = width / Math.max(height, 1);
composer.setSize(width, height);
```

相機的 `aspect`、投影矩陣與 renderer 尺寸，仍然由元件的 `resize()` 一起更新。

## 四、記錄游標軌跡，建立波紋資料

如果只記錄游標現在的位置，波紋中心就會一直跟著游標跑。為了留下軌跡，我們保留最近 8 筆波紋，每一筆使用一個 `Vector4`：

| 分量     | 儲存內容           |
| -------- | ------------------ |
| `x`、`y` | 波紋中心的 UV 座標 |
| `z`      | 產生時間，單位為秒 |
| `w`      | 波紋強度           |

初始時間設成 `-10`，讓這些尚未使用的資料一開始就被判定為過期。

游標事件提供的是視窗座標，要先換算成 Canvas 裡的 `0～1` 座標：

```js
const bounds = renderer.domElement.getBoundingClientRect();
const x = (event.clientX - bounds.left) / bounds.width;
const y = 1 - (event.clientY - bounds.top) / bounds.height;

if (x < 0 || x > 1 || y < 0 || y > 1) return;
```

瀏覽器的 Y 座標往下增加，這裡使用的 UV 則往上增加，所以 `y` 要用 `1 - ...` 翻轉。

接著計算游標與上一次記錄位置的像素距離。第一次收到位置時，先記住座標，等下一次移動才產生波紋：

```js
const now = performance.now() / 1000;

if (lastX === null) {
  lastX = x;
  lastY = y;
  return;
}

const distance = Math.hypot(
  (x - lastX) * bounds.width,
  (y - lastY) * bounds.height,
);

if (now - lastEmission < 0.045 || distance < 2) return;

waves[index].set(x, y, now, Math.min(1, distance / 45 + 0.2));
index = (index + 1) % waves.length;

lastX = x;
lastY = y;
lastEmission = now;
activeUntil = now + 0.9;
```

這裡限制兩次波紋至少相隔 45 毫秒，而且游標至少移動 2 像素，避免細微抖動一直塞入資料。

強度使用移動距離計算，最多為 `1`。它是用位移量調整手感，沒有除以經過時間，因此並不是精確的游標速度。

`index` 走到陣列尾端後會回到 `0`，覆寫最舊的波紋。這樣不用持續新增物件，Shader 每個像素也只需要檢查固定的 8 筆資料。

## 五、用距離與時間算出擴散的水波

後製的 Vertex Shader 只需要傳遞 UV，並把用來覆蓋畫面的幾何繪製出來：

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Fragment Shader 使用以下變數：

```glsl
uniform sampler2D tDiffuse;
uniform vec4 uWaves[8];
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
```

接著在 `main()` 裡累加各個波紋的偏移：

```glsl
vec2 displacement = vec2(0.0);

for (int i = 0; i < 8; i++) {
  float age = uTime - uWaves[i].z;

  if (age >= 0.0 && age < 0.9) {
    vec2 delta = (vUv - uWaves[i].xy) * vec2(uAspect, 1.0);
    float distanceToWave = length(delta);
    float radius = 0.02 + age * 0.128;
    float envelope = exp(-pow((distanceToWave - radius) / 0.06, 2.0));
    float decay = pow(1.0 - age / 0.9, 2.0);
    float ripple = sin(distanceToWave * 65.0 - age * 9.0);

    displacement += delta / max(distanceToWave, 0.001)
      * envelope * decay * ripple * uWaves[i].w * 0.012;
  }
}
```

這段公式可以從「波紋在哪裡」開始看。

`age` 是波紋已經存在多久，只有出生後的 `0.9` 秒內會參與計算。`delta` 則是波紋中心指向目前像素的向量，`length(delta)` 算出兩者距離。

因為畫面通常不是正方形，UV 水平移動 `0.1` 和垂直移動 `0.1`，對應的像素距離可能不同。先將 X 乘上寬高比 `uAspect`，才不會把圓形波紋拉成橢圓。

### 決定向外擴散的位置

```glsl
float radius = 0.02 + age * 0.128;
```

波紋半徑從 `0.02` 開始，隨時間增加。這裡的距離是在寬高比校正後的座標中計算，並不是像素。

接著用 `envelope` 把效果集中在這個半徑附近：

```glsl
float envelope = exp(-pow((distanceToWave - radius) / 0.06, 2.0));
```

當像素距離剛好等於半徑，括號內是 `0`，結果就是 `1`。越遠離這一圈，數值越接近 `0`，因此形成一條邊緣柔和的環狀區域。`0.06` 控制這個區域的寬度。

### 讓環狀區域產生起伏

```glsl
float ripple = sin(distanceToWave * 65.0 - age * 9.0);
```

`sin()` 會在正負值之間變化，讓取樣位置交替往外、往內偏移。`65.0` 影響空間上的波紋密度，`9.0` 影響波形隨時間變化的速度。

這裡的環狀區域與正弦波各自隨時間移動，組合成短暫的擴散效果。它是一組用來調整視覺的公式，沒有模擬水面流體。

最後，`delta / max(distanceToWave, 0.001)` 提供徑向方向；分母保留最小值，避免波紋中心除以零。再乘上環狀範圍、衰減、正弦波、單筆強度，以及整體振幅 `0.012`，就得到這筆波紋的偏移量。

## 六、偏移 UV，讓產品輪廓產生折射

8 筆波紋相加後，先限制偏移量，再轉回原本的 UV 比例：

```glsl
displacement = clamp(
  displacement,
  vec2(-0.035),
  vec2(0.035)
) / vec2(uAspect, 1.0);

vec2 uv = clamp(
  vUv + displacement,
  vec2(0.001),
  vec2(0.999)
);
```

前面的計算將 X 乘上寬高比，現在要除回去。`clamp()` 則限制每個分量的大小，避免多個波紋重疊時把畫面拉得太遠。

新的取樣座標也限制在紋理內側，避免讀到範圍外。這是簡單的邊界處理；如果偏移量開得太大，邊緣仍可能出現拉伸，因此振幅也要一起控制。

只要使用這個 `uv` 讀取影像，就能看到基本折射：

```glsl
gl_FragColor = texture2D(tDiffuse, uv);
```

在純色區域，即使取樣位置移動，讀到的顏色也差不多，所以效果不明顯。游標經過按鍵、外殼與透明背景的交界時，取樣會跨過不同顏色，輪廓變形就比較容易看見。

## 七、錯開 RGB 取樣，加入色散效果

基本折射完成後，再讓紅、綠、藍使用稍微不同的取樣位置。以下取代上一節最後一行輸出：

```glsl
vec4 green = texture2D(tDiffuse, uv);

vec4 red = texture2D(
  tDiffuse,
  clamp(uv + displacement * 0.24, vec2(0.001), vec2(0.999))
);

vec4 blue = texture2D(
  tDiffuse,
  clamp(uv - displacement * 0.24, vec2(0.001), vec2(0.999))
);

float alpha = max(green.a, max(red.a, blue.a));
gl_FragColor = vec4(red.r, green.g, blue.b, alpha);
```

綠色維持剛剛的折射位置，紅色沿著偏移方向再多走一點，藍色則往反方向退一點。最後只取各自的 R、G、B 分量，組合成新的顏色。

`0.24` 控制色散程度。數值越大，輪廓旁邊的彩色分離越明顯；這次希望還能看清楚產品，所以只加少量。

由於位移本身會隨波紋衰減，色散也會一起消失。當 `displacement` 回到零，三個通道就回到相同的取樣位置。

這次 Canvas 有透明背景，因此也要處理 Alpha。我們取三次取樣中最大的 Alpha，保留通道偏移後延伸出去的邊緣；這是這個 Demo 採用的合成方式。
