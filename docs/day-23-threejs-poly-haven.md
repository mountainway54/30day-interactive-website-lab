# Day 23｜Three.js(6) 開放授權材質庫：Poly Haven

雖然這幾天我們自己建立了塑膠、金屬、岩石、木材等不同材質，但實際上網路上有現成的「開放授權材質庫」可以使用。素材通常會提供一整套貼圖，包含顏色、法線、粗糙度與高度等資料，可以依需求搭配，不必每張都自己製作。

今天我們就來介紹其中一款：[Poly Haven](https://polyhaven.com/)。這次把 Day17 的卡比獸模型拿出來，換上三種下載好的材質，看看它會變成什麼樣子。

### 材質庫是什麼？

材質庫是把不同表面素材整理在一起，讓使用者挑選與下載的資源網站。例如木頭、岩石、生鏽金屬或布料，都可以找到對應的貼圖。

Poly Haven 提供 PBR 材質，也有 HDRI 環境貼圖與 3D 模型。今天使用的是 Textures 分類，下載後會得到多張互相對應的圖片。[Poly Haven](https://polyhaven.com/)

PBR 是 Physically Based Rendering，也就是以物理為基礎的渲染方式。我們前幾天使用的 `MeshStandardMaterial` 就屬於這類材質。素材庫提供表面資料，再由 Three.js 搭配場景光源計算外觀。

昨天我們自己生成木紋時，還需要處理色澤、陰影與紋路是否對齊。現成的 PBR 素材已經把不同用途的貼圖整理成一套，能省下不少準備時間。不過，網站預覽使用的模型、光源與環境，和我們的場景不同，下載後仍然需要調整。

### 挑選與下載 PBR 材質，認識貼圖檔案

進入 Poly Haven 的 Textures 頁面後，可以依照材質種類瀏覽，或輸入關鍵字搜尋。這次挑選了三套素材：

# 圖~~

| 素材                                                         | 今天的用途             |
| ------------------------------------------------------------ | ---------------------- |
| [Rusty Metal 04](https://polyhaven.com/a/rusty_metal_04)     | 觀察鏽蝕與金屬反射     |
| [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) | 呈現岩石地表的粗糙細節 |
| [Marble Cliff 05](https://polyhaven.com/a/marble_cliff_05)   | 比較另一種岩壁紋理     |

下載時會看到 Blend、glTF、MaterialX、ZIP 等選項。今天要自己在 Three.js 中組合材質，因此選擇 ZIP，解析度先使用 1K。這次下載的三組圖片都是 1024 × 1024，足夠先觀察 Demo 的效果。

# 圖~~

解壓縮後，先找 `textures` 資料夾。以鏽蝕金屬為例，這次下載包裡有這些檔案：

| 檔名                           | 內容                      | Three.js 對應                            |
| ------------------------------ | ------------------------- | ---------------------------------------- |
| `rusty_metal_04_diff_1k.jpg`   | 顏色                      | `map`                                    |
| `rusty_metal_04_nor_gl_1k.exr` | OpenGL 方向慣例的法線     | `normalMap`                              |
| `rusty_metal_04_rough_1k.exr`  | 粗糙度                    | `roughnessMap`                           |
| `rusty_metal_04_metal_1k.exr`  | 金屬度                    | `metalnessMap`                           |
| `rusty_metal_04_ao_1k.jpg`     | 環境遮蔽                  | `aoMap`                                  |
| `rusty_metal_04_disp_1k.png`   | 高度                      | `displacementMap`，也可供 `bumpMap` 使用 |
| `rusty_metal_04_arm_1k.jpg`    | 合併的 AO、粗糙度與金屬度 | 同時供三個材質屬性使用                   |

前幾天介紹過顏色、法線與高度，這裡多認識一張 `ARM`。它把三份灰階資料分別放進圖片的 RGB 通道：

| 通道 | 資料                        |
| ---- | --------------------------- |
| R    | Ambient Occlusion，環境遮蔽 |
| G    | Roughness，粗糙度           |
| B    | Metalness，金屬度           |

> 環境遮蔽(Ambient Occlusion)是用來補充表面凹隙等位置的間接光遮蔽感；粗糙度與金屬度則讓同一個材質的不同位置有不同反應。例如生鏽的區域與裸露金屬，可以使用不同的金屬度與粗糙度。

Three.js 的 `aoMap`、`roughnessMap`、`metalnessMap` 分別讀取 R、G、B，因此這次可以共用同一張 ARM 圖，不必再載入三張獨立圖片。[MeshStandardMaterial 文件](https://threejs.org/docs/pages/MeshStandardMaterial.html)

今天實際載入的是 Diffuse、Normal GL、ARM，共三張圖片。

### EXR 檔案

這次下載的法線圖副檔名是 `.exr`，和昨天使用的 PNG 不同。

EXR 是 OpenEXR 圖片格式，支援浮點數與多通道資料，常用在渲染、合成與 HDR 影像處理。相較於一般 8-bit JPG，它可以儲存更高精度的數值；

EXR 是儲存格式，`normalMap` 才是貼圖的用途。要特別注意的是，EXR 也能拿來存環境光照或其他資料，不一定都是環境貼圖。

Three.js 載入 JPG、PNG 時使用 `TextureLoader`，EXR 則改用額外匯入的 `EXRLoader`：

```js
import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

// normalUrl 指向下載的 *_nor_gl_1k.exr。
const normalMap = await new EXRLoader().loadAsync(normalUrl);
normalMap.colorSpace = THREE.NoColorSpace;
```

`EXRLoader` 會將 EXR 解碼為 Three.js 可使用的資料貼圖，再指定給材質即可，不必先轉成 PNG。[EXRLoader 文件](https://threejs.org/docs/pages/EXRLoader.html)

這張 EXR 儲存的是法線方向，因此設為 `NoColorSpace`。色彩空間要依資料用途決定，不能只看副檔名。今天也將法線圖的 `flipY` 設為 `true`，與 OBJ 上使用的一般圖片貼圖統一垂直方向；這是本次載入流程的設定，不代表所有模型都要照抄。

### 套用到模型

今天沿用 Day17 的卡比獸模型，但 Day17 的資料處理會略過 UV，當時只顯示單色模型沒有問題，現在貼圖需要 UV，因此改成直接使用 `OBJLoader` 解析原始檔案。

下面整理載入與套用材質的主要程式。`preset` 來自 Demo 的素材清單，包含 `color`、`normal`、`arm` 三張圖片，以及金屬度的預設值。

```js
async function createMaterial(preset) {
  // JPG 使用一般圖片載入器，EXR 使用專用載入器。
  const imageLoader = new THREE.TextureLoader();
  const exrLoader = new EXRLoader();

  // 同時載入顏色、法線與 ARM 貼圖，全部完成後才建立材質。
  const [colorMap, normalMap, armMap] = await Promise.all([
    imageLoader.loadAsync(preset.color),
    exrLoader.loadAsync(preset.normal),
    imageLoader.loadAsync(preset.arm),
  ]);

  // 顏色圖使用 sRGB；法線與 ARM 儲存數值資料，不做色彩空間轉換。
  colorMap.colorSpace = THREE.SRGBColorSpace;
  normalMap.colorSpace = THREE.NoColorSpace;
  armMap.colorSpace = THREE.NoColorSpace;

  for (const texture of [colorMap, normalMap, armMap]) {
    // 統一本次 OBJ 載入流程中，一般圖片與 EXR 的垂直方向。
    texture.flipY = true;
    // 允許水平與垂直重複，超出 0～1 的 UV 也能繼續取樣。
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    // 兩個方向先各重複一次，之後由控制面板同步調整。
    texture.repeat.set(1, 1);
    // 通知 Three.js 將修改後的貼圖設定更新到 GPU。
    texture.needsUpdate = true;
  }

  return new THREE.MeshStandardMaterial({
    color: "#ffffff", // 白色不會額外染色，保留顏色貼圖的色彩。
    map: colorMap, // 提供表面顏色。
    normalMap, // 改變光照計算的表面方向，呈現細節但不移動頂點。
    aoMap: armMap, // 讀取 ARM 的 R 通道，呈現環境遮蔽。
    roughnessMap: armMap, // 讀取 ARM 的 G 通道，控制各處粗糙度。
    metalnessMap: armMap, // 讀取 ARM 的 B 通道，控制各處金屬度。
    roughness: 1, // 粗糙度倍率，1 表示保留貼圖提供的數值。
    metalness: preset.metalness, // 金屬度倍率，由各套素材設定預設值。
    // 不套用位移貼圖，保留模型輪廓，避免接縫因頂點位移而裂開。
    displacementScale: 0,
    displacementBias: 0,
    side: THREE.DoubleSide, // 正反兩面都繪製，讓薄面片的背面也能顯示。
  });
}
```

上面省略了 Demo 的快取與錯誤處理，方便看出三張貼圖如何組成材質。取得材質後，走訪模型內的網格並替換：

```js
// 等待整套貼圖載入並建立好新材質，再替換模型外觀。
const material = await createMaterial(preset);

// 走訪模型，只有網格需要替換材質，群組等其他物件不處理。
model.traverse((object) => {
  if (object.isMesh) object.material = material;
});

render(); // 材質替換完成後，重新繪製畫面。
```

實際 Demo 會等新材質載入完成才替換；載入失敗時保留目前的模型外觀。舊材質會釋放，已下載的貼圖則保留在快取，切回同一種材質時可以重用，離開頁面後再統一清理。

套用後，可以在右側版面調整 UV 重複、法線強度、粗糙度倍率 金屬度倍率

這裡的粗糙度與金屬度是「倍率」。例如貼圖某處的粗糙度是 `0.8`，倍率設成 `0.5`，該處就會使用約 `0.4` 的粗糙度。

鏽蝕金屬的金屬度倍率預設為 `1`，兩種岩石則為 `0`。另外沿用之前介紹過的 `RoomEnvironment` 提供環境反射，讓金屬有周圍的光照可以反映。

### CC0 授權可以怎麼用？

最後補充一下這些材質庫的使用範圍。

Poly Haven 的素材採用 CC0 授權。更精確地說，CC0 是一種公眾領域貢獻宣告，作者會在法律允許的範圍內放棄著作權及相關權利。因此，使用者可以自由複製、修改與散布素材，也能用於商業用途，不需要另外取得許可。

除了 Poly Haven 之外，還有 ambientCG、TextureCan、Share Textures 等提供 CC0 素材的材質庫，有興趣的話也可以找來玩玩看。

以今天下載的材質為例，你可以調整顏色、轉換成其他貼圖格式、放進網站或遊戲中，也可以隨著自己的專案一起分享。Poly Haven 並不要求使用者署名，不過如果是在文章或公開作品中使用，附上素材來源連結，也能讓其他人更方便找到原始素材。

之後需要新的表面質感時，就可以先到這些材質庫尋找合適的素材，再依照模型與場景的需求進一步調整。自己實際做過貼圖之後，再回頭看這些下載下來的材質檔案，也會更容易理解每一張貼圖的用途，以及它們應該放在哪個位置。
