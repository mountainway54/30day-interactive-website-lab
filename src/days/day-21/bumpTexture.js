// 在球面上取樣 3D 高度場，再展開成灰階貼圖，讓左右接縫與兩極保持連續。
// 這是 Demo 自行實作的數值雜訊，不是 Three.js 內建函式。

// 線性插值：依照 t 的比例，取得 a 與 b 之間的值。
const mix = (a, b, t) => a + (b - a) * t
// 平滑插值權重，讓格點交界處的高度變化更自然。
const smooth = t => t * t * (3 - 2 * t)

// 將格點座標轉成固定的偽隨機值；相同座標每次都得到相同結果。
function hash(x, y, z) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}

// 3D value noise：在周圍八個格點的數值之間做插值。
function noise(x, y, z) {
  // 找出取樣點所在格子的起點。
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  // 將格子內的局部座標轉成平滑權重。
  const u = smooth(x - ix), v = smooth(y - iy), w = smooth(z - iz)
  // 先在同一個 Z 平面的四個角點之間，沿 X、Y 方向插值。
  const plane = dz => mix(
    mix(hash(ix, iy, iz + dz), hash(ix + 1, iy, iz + dz), u),
    mix(hash(ix, iy + 1, iz + dz), hash(ix + 1, iy + 1, iz + dz), u), v)
  // 再沿 Z 方向混合前後兩個平面。
  return mix(plane(0), plane(1), w)
}

// 將高度資料畫到 Canvas；scale 由 Demo 滑桿限制在 0.7～2.8。
export function drawBumpTexture(canvas, scale) {
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  const pixels = context.createImageData(canvas.width, canvas.height)
  // 尺度越大，取樣頻率越低，紋理看起來就越大塊。
  const frequency = 5 / scale
  for (let y = 0; y < canvas.height; y++) {
    // 垂直方向對應球面由上到下的角度（0～π）。
    const theta = y / (canvas.height - 1) * Math.PI
    for (let x = 0; x < canvas.width; x++) {
      // 水平方向繞球面一圈（0～2π），首尾對應相同位置。
      const phi = x / (canvas.width - 1) * Math.PI * 2
      // 將角度轉成 3D 取樣座標；加 12 是固定偏移，用來選取雜訊區域。
      const px = Math.sin(theta) * Math.cos(phi) * frequency + 12
      const py = Math.cos(theta) * frequency + 12
      const pz = Math.sin(theta) * Math.sin(phi) * frequency + 12
      // 疊加大、中、小三種尺度，以大塊起伏為主，補上少量細節。
      const height = .76 * noise(px, py, pz) + .19 * noise(px * 2.7, py * 2.7, pz * 2.7) + .05 * noise(px * 7, py * 7, pz * 7)
      // 以中灰為中心提高對比，限制在 0～1，再轉成 0～255。
      const value = Math.round(Math.max(0, Math.min(1, (height - .5) * 1.6 + .5)) * 255)
      // 每個像素有 R、G、B、A 四個通道；RGB 相同即為灰階。
      const i = (y * canvas.width + x) * 4
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value
      pixels.data[i + 3] = 255 // 完全不透明。
    }
  }
  // 一次寫入整張圖片，供預覽與 CanvasTexture 使用。
  context.putImageData(pixels, 0, 0)
}
