# Day 29｜Three.js 粒子系統：從爆發、漂浮到旋流

倒數第二天~~ 還是繼續來繼續復刻 [aether1.ai](https://aether1.ai/) 的視覺效果，它透過許多細小的氣泡呈現出水中的感覺
前兩天替控制器加上水波與漂浮效果，今天繼續處理周圍的粒子。

可以搭配今天的 [demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-29) 觀察。

## 一、粒子系統的基本組成：位置、速度與外觀

一顆粒子需要哪些資料？先從位置開始，再決定速度，下一刻要往哪個方向移動、多快？最後才是畫面上看到的大小、顏色與透明度。

這次使用幾個陣列保存資料，相同索引代表同一顆粒子：

```js
const positions = new Float32Array(capacity * 3);
const velocities = new Float32Array(capacity * 2);
const ages = new Float32Array(capacity);
const seeds = new Float32Array(capacity);
const sizes = new Float32Array(capacity);
```

| 資料         | 每顆粒子的內容 | 用途                            |
| ------------ | -------------- | ------------------------------- |
| `positions`  | 三個數值       | X、Y 位置，以及控制明暗的隨機值 |
| `velocities` | 兩個數值       | X、Y 方向的速度                 |
| `ages`       | 一個數值       | 出生後經過的秒數                |
| `seeds`      | 一個數值       | 固定的隨機相位，讓運動有差異    |
| `sizes`      | 一個數值       | 點的顯示尺寸                    |

雖然用了 Three.js，這次粒子其實是在 XY 平面移動。`positions` 的第三個值借用 Z 欄位儲存明暗變化，Shader 投影時會把真正的 Z 設成零，沒有用它製造透視深度。

讀取第 `i` 顆粒子時，位置從 `i * 3` 開始，速度則從 `i * 2` 開始：

```js
const p = i * 3;
const v = i * 2;

positions[p] += velocities[v] * dt;
positions[p + 1] += velocities[v + 1] * dt;
```

`dt` 是這次更新距離上次更新經過的秒數。速度乘上時間，才是這一幀要移動的距離。

粒子年齡也不一定代表壽命。這次 `ages` 用來控制旋流逐漸加入，沒有設定時間一到就消失。容量用完後，新的爆發會覆寫較早的一批粒子。

## 二、用 BufferGeometry 與 Points 建立粒子

如果替每顆粒子建立一個球體，就得管理許多物件與三角形。這次只需要小圓點，可以把位置集中放進一份 `BufferGeometry`，再交給 `Points` 繪製。`Points` 就是 Three.js 用來顯示點雲的物件，接受幾何資料與材質作為參數，詳見 [Points 官方文件](https://threejs.org/docs/pages/Points.html)。

```js
const geometry = new THREE.BufferGeometry();
const position = new THREE.BufferAttribute(positions, 3);
position.setUsage(THREE.DynamicDrawUsage);

geometry.setAttribute("position", position);
geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
geometry.setDrawRange(0, 0);

// material 會在下一節建立。
const points = new THREE.Points(geometry, material);
points.frustumCulled = false;
scene.add(points);
```

`BufferAttribute` 的第二個參數表示每筆資料有幾個分量。位置是三個，尺寸是一個；`aSize` 是我們自己命名的 attribute，之後會在 Shader 裡讀取。

`DynamicDrawUsage` 提示底層這份資料會經常改動，但不會自動同步陣列。每一幀修改完所有粒子的位置後，仍要設定：

```js
position.needsUpdate = true;
```

這會通知 Three.js 在後續渲染時上傳變更。設定方式可參考 [BufferAttribute 官方文件](https://threejs.org/docs/pages/BufferAttribute.html)。只改變 uniform 時，則直接修改它的 `.value`。

一開始 `setDrawRange(0, 0)` 表示先不畫任何粒子。爆發時填入資料，再把繪製數量改成目前啟用的數量：

```js
geometry.setDrawRange(0, count);
geometry.attributes.aSize.needsUpdate = true;
```

## 三、用 Shader 畫出空心圓與柔光

`Points` 的每個點會形成一塊方形的繪製區域。我們可以在 Fragment Shader 裡，依照像素與中心的距離決定透明度，讓方形區域只留下圓環。

先建立材質。以下 `vertexShader` 與 `fragmentShader` 分別使用後面的 GLSL 內容：

```js
const material = new THREE.ShaderMaterial({
  transparent: true,
  depthTest: false,
  depthWrite: false,
  uniforms: {
    uPixelRatio: { value: renderer.getPixelRatio() },
  },
  vertexShader,
  fragmentShader,
});
```

這裡使用 `WebGLRenderer` 搭配 `ShaderMaterial`。Three.js 會提供 `position`、`projectionMatrix`、`modelViewMatrix` 等內建資料，自訂的 `aSize` 則由前面的幾何 attribute 傳入。

Vertex Shader 先處理位置與尺寸：

```glsl
attribute float aSize;
uniform float uPixelRatio;
varying float vDepth;

void main() {
  vDepth = position.z;
  gl_Position = projectionMatrix * modelViewMatrix
    * vec4(position.xy, 0.0, 1.0);
  gl_PointSize = aSize * uPixelRatio;
}
```

`gl_PointSize` 控制點在繪圖緩衝區中的像素尺寸。乘上 renderer 實際使用的 pixel ratio，可讓 CSS 顯示尺寸大致維持一致；容器重新設定解析度時，也要同步更新這個 uniform。

接著是 Fragment Shader：

```glsl
varying float vDepth;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float radius = length(p);

  float ring = smoothstep(0.58, 0.68, radius)
    * (1.0 - smoothstep(0.72, 0.82, radius));

  float halo = smoothstep(0.48, 0.68, radius)
    * (1.0 - smoothstep(0.76, 1.0, radius)) * 0.12;

  float alpha = (ring * 0.68 + halo)
    * mix(0.28, 0.8, vDepth);

  vec3 color = mix(
    vec3(0.18, 0.39, 0.62),
    vec3(0.43, 0.73, 0.98),
    ring
  );

  gl_FragColor = vec4(color, alpha);
}
```

`gl_PointCoord` 是單顆粒子內部的座標，範圍為 `0～1`。乘二再減一後，中心變成 `(0, 0)`，因此 `length(p)` 就能得到像素到中心的距離。

`smoothstep(a, b, radius)` 會在距離從 `a` 增加到 `b` 時，平滑地從零變成一。圓環由兩段變化相乘：內側逐漸出現，外側逐漸消失，中間保留一圈。

`halo` 使用更寬的範圍、更低的透明度，讓圓環旁邊多一層淡淡的柔光。中心依然透明，粒子重疊時比較不會全部糊成實心光點。

## 四、從分布到爆發：設定初始位置、速度與阻力

粒子飛出去之前，先決定它們要往哪些方向散開。
最簡單的方式是隨機取角度，再透過三角函數換成方向：

```js
const angle = Math.random() * Math.PI * 2;
const radius = 0.8 + Math.random() * 0.4;
const x = Math.cos(angle) * radius;
const y = Math.sin(angle) * radius;
```

這個簡化版本會形成環狀分布，半徑採等機率抽樣，並不是依面積均勻分布。

實際 Demo 則先建立左右兩側共八個群集，每個群集有不同的角度、寬度與半徑。約 88% 的粒子落在群集附近，其餘散落在其他方向，再用正弦與餘弦稍微擾動半徑，讓輪廓不會太整齊。

分布決定後，把初始位置縮到中心附近，速度沿著相同方向向外：

```js
positions[p] = x * 0.1;
positions[p + 1] = y * 0.1;
positions[p + 2] = Math.random();

velocities[v] = x * 1.9;
velocities[v + 1] = y * 1.9;

ages[i] = 0;
seeds[i] = Math.random() * Math.PI * 2;
sizes[i] = 3 + Math.random() * 5;
```

這裡的 `x`、`y` 是分布的參考向量，並非粒子最後一定會到達的目標。它們同時決定初始位置和速度：離中心較遠的參考點，也會得到較大的爆發速度。

接下來，每一幀先讓速度衰減，再更新位置：

```js
const dt = Math.min((now - previous) / 1000, 0.04);
previous = now;
const drag = Math.exp(-2.1 * dt);

for (let i = 0; i < count; i++) {
  const p = i * 3;
  const v = i * 2;

  ages[i] += dt;
  velocities[v] *= drag;
  velocities[v + 1] *= drag;
  positions[p] += velocities[v] * dt;
  positions[p + 1] += velocities[v + 1] * dt;
}

position.needsUpdate = true;
```

如果每一幀固定乘上 `0.98`，高更新率的螢幕每秒會多乘幾次，粒子也就停得比較快。`Math.exp(-2.1 * dt)` 把阻力與經過時間連在一起，能降低這種差異。`2.1` 越大，速度衰減越快。

這裡的位移仍是逐幀近似計算，不同時間步長下不會完全相同。`dt` 上限則用來避免偶爾卡頓時，粒子突然跳很遠；代價是很慢的幀會少推進一些模擬時間。

爆發速度慢下來後，粒子會接近停住。我們再加入很輕微的徑向伸縮：

```js
const flow = Math.min(ages[i] * 0.4, 1);
const radialDrift = 1 + Math.sin(time * 0.35 + seeds[i]) * 0.004 * flow * dt;

positions[p] *= radialDrift;
positions[p + 1] *= radialDrift;
```

`radialDrift` 在一附近變動，粒子會緩慢向外或向內漂移。`seeds[i]` 在出生時決定，之後保持不變，所以每顆粒子的變化連續，又不會同時膨脹、同時收縮。若每幀重新亂數，畫面就容易變成抖動。

## 五、用旋轉公式建立逆時針流場

最後，讓粒子繞中心緩緩旋轉。

在 X 向右、Y 向上的座標中，把 `(x, y)` 旋轉正角度 `θ`，可以寫成：

```text
x' = x cosθ - y sinθ
y' = x sinθ + y cosθ
```

拿右側的 `(1, 0)` 試試看。旋轉一個小的正角度後，X 稍微減少、Y 增加，粒子往右上方走，也就是逆時針。

今天使用正交相機，從正 Z 看向 XY 平面，Y 軸向上，因此公式的正角度符合畫面上的逆時針。如果沿用 Canvas 2D 的 Y 軸向下座標，看到的方向就會相反。

實作放在爆發位移之後：

```js
const flow = Math.min(ages[i] * 0.4, 1);
const angularSpeed = 0.028 + Math.sin(seeds[i]) * 0.006;
const turn = angularSpeed * flow * dt;

const cos = Math.cos(turn);
const sin = Math.sin(turn);
const x = positions[p];
const y = positions[p + 1];

positions[p] = x * cos - y * sin;
positions[p + 1] = x * sin + y * cos;
```

`angularSpeed` 的單位是弧度／秒，這裡維持在 `0.022～0.034`，所以每顆粒子都朝逆時針轉，只是速度稍微不同。

`flow` 則會在出生後約 2.5 秒從零增加到一。剛出現時以向外爆發為主，接著阻力減弱爆發速度，旋轉逐漸加入，動作便自然接上。

計算時要先保存原本的 `x`、`y`。如果先覆寫 X，再用改過的 X 算 Y，就不再是同一次旋轉了。

為什麼不直接寫成下面這樣？

```js
// 旋轉速度場的 Euler 近似，先保存舊座標。
const x = positions[p];
const y = positions[p + 1];
positions[p] = x - y * turn;
positions[p + 1] = y + x * turn;
```

這樣確實會繞圈，但每一步的半徑平方會變成：

```text
x'² + y'² = (x² + y²) × (1 + turn²)
```

只要 `turn` 不為零，半徑就會增加。誤差不斷累積後，粒子便會慢慢向外散開；步長很小時不明顯，放大轉速或遇到較長的幀就比較容易看出來。

使用完整的 `sin`、`cos` 旋轉公式，純旋轉部分能在浮點誤差範圍內維持半徑。想要向外漂多少，再交給前面的爆發速度與 `radialDrift` 控制。
