# Day 24｜Ammo.js 物理引擎打造真實材質互動

前幾天透過 Three.js 的材質、貼圖與光線，讓物件表面有了不同的質感。但假設今天的材質不是剛體，他的表面會隨著環境的影響、使用者的互動，產生不同的形變，三角網格的做邊也會變化，該如何達成呢? 這時候就該輪到「物理引擎」登場拉~~

## 甚麼是物理引擎？

物理引擎是一套用來模擬真實世界物理現象的系統，例如碰撞偵測、加速度、重力、摩擦力與空氣阻力等，讓虛擬物件能呈現更接近現實的運動與互動效果。

這次我們選用 Ammo.js。Ammo.js 是透過 Emscripten 將 Bullet Physics 移植至 JavaScript／WebAssembly 環境的物理引擎，讓瀏覽器也能進行重力、碰撞、剛體、關節以及軟體（Soft Body）等物理模擬。

除了常見的剛體碰撞之外，Ammo.js 也能處理較複雜的軟體模擬，例如繩索、布料，以及可產生形變的立體物件，因此很適合應用在網頁 3D 場景與互動式物理效果中。

在物理模擬中，常見的物件可以分成兩類：

- **Rigid Body（剛體）**：受到力量時會移動、旋轉，但形狀保持不變。
- **Soft Body（軟體）**：物件上的節點可以相對移動，因此能被壓扁、拉伸或扭曲。

剛體模型相對簡單，因此我們今天著重於實現軟體材質。

老樣子，我們可以搭配 demo 來實際操作~ 👉🏿 [demo連結](https://mountainway54.github.io/30day-interactive-website-lab/#/day-24)

## GSAP 動畫控制數值

我們可以加入之前學過的 GSAP，建立一個代表按壓力道的物件，再利用 GSAP 控制它的數值。

```js
const pressure = { value: 0 };

gsap.to(pressure, {
  value: 36,
  duration: 0.16,
  ease: "power2.out",
});
```

我們先設定一個壓力數值，讓 `pressure.value` 在 0.16 秒內從 `0` 增加到 `36`。

接著，在每一次物理更新時，把這個數值轉成施加在球體上的力量。Ammo.js 會根據當下的形狀、速度與約束，計算出新的頂點位置。

在這裡 GSAP 控制的是「如何施力」，Ammo.js 計算的是「受力後如何變形」。

要特別注意的是，球體的落下由 Ammo.js 的重力驅動，落地後的回彈則由碰撞反應、球體約束與內部壓力共同產生，因此不需要另外安排一段上下移動的動畫。

## 柔軟材質的模擬原理

我們可以把球體想像成一個**包成球狀的封閉曲面**。曲面由許多節點組成，節點之間透過連結與約束維持形狀。當局部受到外力時，附近的節點也會被牽動，使形變沿著表面傳遞。

這個 Demo 使用**封閉三角網格搭配內部壓力**，模擬類似彈性充氣球的效果。當球體受到擠壓或碰撞時，表面的約束與內部壓力會共同作用，使球體產生形變，並逐漸恢復原本的形狀。

這裡的「柔軟」並不是單純改變模型外觀，而是來自 **Ammo.js 的軟體物理設定**。透過調整壓力、剛性、阻尼等參數，可以控制球體受到外力時的變形程度，以及恢復形狀的速度。

建立 Soft Body 後，可以調整幾個重要參數：

```js
const cfg = body.get_m_cfg();
const material = body.get_m_materials().at(0);

material.set_m_kLST(0.55); // 表面連結的線性剛性
cfg.set_kDP(0.003); // 阻尼
cfg.set_kPR(180); // 內部壓力
```

這些參數可以這樣理解：

- 剛性：越高，表面連結越不容易被拉伸
- 阻尼：消耗運動能量，影響晃動多久才會停下
- 內部壓力：從內側支撐封閉球面，影響球體飽滿程度與受壓反應

參數必須配合球體大小、質量與網格密度調整。

## 實作球體落下與回彈

首先，建立支援 Soft Body 的物理世界：

> A 代表已經完成初始化的 Ammo.js 實例

```js
// 建立支援軟體與剛體的碰撞設定
const config = new A.btSoftBodyRigidBodyCollisionConfiguration();

// 處理物件之間的碰撞
const dispatcher = new A.btCollisionDispatcher(config);

// 初步篩選可能發生碰撞的物件配對
const broadphase = new A.btDbvtBroadphase();

// 計算剛體的碰撞反應與約束
const solver = new A.btSequentialImpulseConstraintSolver();

// 處理軟體物件的模擬
const softSolver = new A.btDefaultSoftBodySolver();

// 建立同時支援軟體與剛體的物理世界
const world = new A.btSoftRigidDynamicsWorld(
  dispatcher,
  broadphase,
  solver,
  config,
  softSolver,
);

// 設定重力方向：沿 Y 軸向下，加速度為 9.81
const gravity = new A.btVector3(0, -9.81, 0);

// 設定物理世界的重力
world.setGravity(gravity);

// 同步設定軟體模擬使用的重力
world.getWorldInfo().set_m_gravity(gravity);
```

這個世界負責管理碰撞與物理更新。重力設定為沿著 Y 軸向下，球體加入後就會受到重力影響。地面則使用質量為 `0` 的剛體，讓它固定在原位。畫面中的地平面網格只是視覺參考，真正擋住球體的是 Ammo.js 裡的碰撞形狀。至於建立地面剛體的程式碼範例，我補充在 [demo](https://mountainway54.github.io/30day-interactive-website-lab/#/day-24) 下方。

接著，準備球體的三角網格~ 前幾天使用 SphereGeometry 建立球體，這次則改用三角形分布較均勻的 IcosahedronGeometry，讓物理節點分布更均勻，有助於呈現較一致的受力形變。：

```js
const source = new THREE.IcosahedronGeometry(1.5, 5);

// 本次沒有使用貼圖，先移除會影響頂點合併的屬性
source.deleteAttribute("normal");
source.deleteAttribute("uv");

const geometry = mergeVertices(source);
source.dispose();

const vertices = Array.from(geometry.attributes.position.array);
const indices = Array.from(geometry.index.array);

// 將球體放到空中
for (let i = 1; i < vertices.length; i += 3) {
  vertices[i] += 5.5;
}
```

先合併位於相同位置的頂點，讓球面具有連續的連接關係，再將頂點與三角形索引交給 Ammo.js，這裡我們使用`CreateFromTriMesh()` 是把三角網格轉成 Soft Body 的關鍵操作。：

```js
// 建立軟體物件的輔助工具
const helper = new A.btSoftBodyHelpers();

// 使用頂點座標與三角形索引建立 Soft Body
const body = helper.CreateFromTriMesh(
  world.getWorldInfo(), // 物理世界資訊，包含軟體模擬使用的重力等設定
  vertices, // 頂點座標，依序排列為 [x, y, z, ...]
  indices, // 三角形索引，每三個索引組成一個三角形
  indices.length / 3, // 三角形數量
  true, // 隨機排列約束的求解順序，減少固定順序造成的偏差
);
```

設定好前一節的剛性、阻尼與內部壓力，再持續推進物理世界：

```js
const fixedStep = 1 / 120;

world.stepSimulation(fixedStep, 1, fixedStep);
```

實際 Demo 使用累積時間的方式，以固定的 `1 / 120` 秒更新物理，避免不同畫面幀率直接改變模擬步長。

球體加入物理世界後，便會在持續更新的物理模擬中受到重力影響，從初始高度向下墜落，直到碰到地平面。
接觸地面後，球體底部會先受壓，接著在約束與內部壓力作用下回彈。本次也在最初幾次彈跳後提高阻尼，讓它逐漸穩定下來。

不過，此時改變的仍然是 Ammo.js 內部資料。我們還要把節點位置同步回 Three.js：

```js
// 取得 Ammo.js 軟體物件的所有節點
const nodes = body.get_m_nodes();
// 取得 Three.js 幾何的頂點座標資料
const positions = geometry.attributes.position;
// 將物理節點的位置同步到對應的渲染頂點
for (let i = 0; i < nodes.size(); i++) {
  const position = nodes.at(i).get_m_x();

  positions.setXYZ(i, position.x(), position.y(), position.z());
}

// 通知 Three.js 將更新後的頂點資料上傳至 GPU
positions.needsUpdate = true;
// 重新計算頂點法線，讓光影符合變形後的表面
geometry.computeVertexNormals();
// 更新包圍球，供視野裁切與射線檢測使用
geometry.computeBoundingSphere();
// 更新包圍盒，供範圍判斷與球體中心計算使用
geometry.computeBoundingBox();
```

## 點擊球面產生局部形變

球體已經會落下與回彈，接著讓滑鼠也能對它施力。

第一步是使用 Three.js 的 `Raycaster` 找到滑鼠點中的球面位置：

> Raycaster 是一種射線碰撞偵測工具，它會從相機或指定位置發射一條看不見的射線，檢查射線穿過哪些 3D 物件，因此常用來實作滑鼠點擊選取物件、Hover 偵測、物件互動，以及判斷視線前方是否有障礙物。

```js
const rect = canvas.getBoundingClientRect();

pointer.set(
  ((event.clientX - rect.left) / rect.width) * 2 - 1,
  -((event.clientY - rect.top) / rect.height) * 2 + 1,
);

raycaster.setFromCamera(pointer, camera);

const hit = raycaster.intersectObject(ball)[0];

if (hit) {
  poke(hit.point);
}
```

取得點擊位置後，找出附近的節點。這次使用距離計算影響權重：

```js
const radius = 1.05;
const selected = [];

for (let i = 0; i < positions.count; i++) {
  vertex.fromBufferAttribute(positions, i);

  const distance = vertex.distanceTo(point);

  if (distance < radius) {
    selected.push({
      index: i,
      weight: (1 - distance / radius) ** 2,
    });
  }
}
```

越靠近點擊中心，權重越大；越接近影響範圍的邊緣，權重越小。

這樣按下去時會形成漸變的凹陷，避免整片表面以相同力道一起移動。

接著，將點擊位置朝球體中心的方向，作為往內按壓的方向：

```js
const direction = center.clone().sub(point).normalize();
```

再按照權重，把總力道分配到選中的節點：

```js
const totalWeight = selected.reduce((sum, node) => sum + node.weight, 0);

if (totalWeight > 0) {
  for (const node of selected) {
    const strength = (pressure.value * node.weight) / totalWeight;

    force.setValue(
      direction.x * strength,
      direction.y * strength,
      direction.z * strength,
    );

    body.addForce(force, node.index);
  }
}
```

`body.addForce(force, node.index)` 就是這次局部形變的核心：對指定的物理節點施力。這段施力需要在按壓期間的每次物理更新前執行。只呼叫一次，代表的作用時間會短得多。

最後，使用 GSAP 安排力道的進入與釋放：

```js
let tween;
const pressure = { value: 0 };

function animatePressure() {
  tween?.kill();
  pressure.value = 0;

  tween = gsap.to(pressure, {
    value: 36,
    duration: 0.16,
    ease: "power2.out",

    onComplete() {
      tween = gsap.to(pressure, {
        value: 0,
        duration: 1.8,
        ease: "power2.inOut",
      });
    },
  });
}
```

前半段快速增加力道，讓點擊有立即回應；後半段慢慢減少力道，讓球面逐漸恢復。

## 小結

今天透過 Ammo.js 建立了一顆會受重力、碰撞與局部外力影響的柔軟球體，再用 GSAP 控制按壓力量的變化。

整個互動可以串成：

**滑鼠點擊 → 找到球面位置 → 選取附近節點 → GSAP 改變力道 → Ammo.js 計算形變 → Three.js 更新畫面。**

調整手感時，可以先從按壓範圍、施力大小與釋放時間下手，再逐步修改剛性、阻尼與內部壓力，觀察各個參數造成的差異。

最後，離開頁面時也要停止 GSAP 動畫與更新迴圈，從物理世界移除物件，並釋放自行建立的 Ammo.js 與 Three.js 資源，讓 Demo 能夠安全地重播與切換。
