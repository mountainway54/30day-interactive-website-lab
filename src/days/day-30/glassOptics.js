// Architecture / optics reference: https://glass.outpacestudios.com/
// Original implementation: integrate a Snell-law bevel into a scalar potential,
// then differentiate that potential so rounded corners have continuous offsets.
export function createGlassMap(width, height) {
  const radius = Math.min(20, width / 2, height / 2)
  const band = Math.min(22, height / 2)
  const step = .25
  const count = Math.ceil(band / step)
  const offsets = new Float64Array(count + 1)
  const potential = new Float64Array(count + 1)
  for (let i = count - 1; i >= 0; i--) {
    const depth = Math.min(1, Math.max(.001, i / count))
    const tilt = Math.atan((1 - depth) ** 3 / (1 - (1 - depth) ** 4) ** .75)
    const transmitted = Math.asin(Math.sin(tilt) / 1.5)
    // Limit the derivative to keep the mapping from folding over itself.
    offsets[i] = Math.min(18 * Math.sin(tilt - transmitted), offsets[i + 1] + step * .8)
  }
  for (let i = 1; i <= count; i++) potential[i] = potential[i - 1] + (offsets[i] + offsets[i - 1]) * step / 2
  function distance(x, y) {
    const qx = Math.abs(x - width / 2) - width / 2 + radius
    const qy = Math.abs(y - height / 2) - height / 2 + radius
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
  }
  function field(x, y) {
    const index = Math.min(count, Math.max(0, -distance(x, y) / step))
    const lower = Math.floor(index)
    return potential[lower] + (potential[Math.min(count, lower + 1)] - potential[lower]) * (index - lower)
  }
  const pixels = new Uint8ClampedArray(width * height * 4)
  const scale = 32
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const px = x + .5, py = y + .5
    const dx = field(px + .5, py) - field(px - .5, py)
    const dy = field(px, py + .5) - field(px, py - .5)
    const nx = distance(px + .5, py) - distance(px - .5, py)
    const ny = distance(px, py + .5) - distance(px, py - .5)
    const facing = (nx * -.6 + ny * -.8) / Math.max(.001, Math.hypot(nx, ny))
    // Keep the specular line tight to the physical rim. A wider falloff reads
    // like a painted glow instead of a polished glass edge.
    const highlight = Math.exp(-(((distance(px, py) + .55) / .58) ** 2))
      * (.08 + .58 * Math.max(0, facing) + .14 * Math.max(0, -facing))
    const i = (y * width + x) * 4
    pixels[i] = 255 * (.5 + dx / scale)
    pixels[i + 1] = 255 * (.5 + dy / scale)
    pixels[i + 2] = 255 * highlight
    pixels[i + 3] = 255
  }
  return { pixels, scale }
}
