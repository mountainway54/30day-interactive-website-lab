export const radians = degrees => degrees * Math.PI / 180
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const controls = {
  azimuth: { label: '水平角', min: -180, max: 180, step: 1, unit: '°' },
  elevation: { label: '俯仰角', min: 5, max: 80, step: 1, unit: '°' },
  distance: { label: '相機距離', min: 7, max: 16, step: 0.1, unit: '單位' },
  fov: { label: '垂直視野角 FOV', min: 30, max: 75, step: 1, unit: '°' },
  span: { label: '垂直顯示範圍', min: 4, max: 14, step: 0.1, unit: '單位' },
  lightAzimuth: { label: '光照方位角', min: -180, max: 180, step: 1, unit: '°' },
  lightElevation: { label: '光照仰角', min: 5, max: 85, step: 1, unit: '°' },
  intensity: { label: '光照強度', min: 0, max: 1, step: 0.01, unit: '' },
}

export function defaults() {
  return { azimuth: 25, elevation: 20, distance: 10, projection: 'perspective',
    fov: 45, span: 20 * Math.tan(radians(45) / 2),
    lightAzimuth: -45, lightElevation: 45, intensity: 0.8 }
}

export function sanitize(key, value, fallback) {
  const number = typeof value === 'string' && value.trim() === '' ? NaN : Number(value)
  const { min, max } = controls[key]
  return Number.isFinite(number) ? clamp(number, min, max) : fallback
}

// 在注視目標平面匹配尺度；不移動相機、不改動世界中的物件。
export function switchProjection(state, projection) {
  if (state.projection === projection) return { state: { ...state }, limited: false }
  const key = projection === 'orthographic' ? 'span' : 'fov'
  const raw = key === 'span'
    ? 2 * state.distance * Math.tan(radians(state.fov) / 2)
    : 2 * Math.atan(state.span / (2 * state.distance)) * 180 / Math.PI
  const value = sanitize(key, raw, defaults()[key])
  return { state: { ...state, projection, [key]: value }, limited: Math.abs(raw - value) > 1e-8 }
}

export function preset(name) {
  const state = defaults()
  if (name === 'front') Object.assign(state, { azimuth: 0, elevation: 10 })
  if (name === 'projection') Object.assign(state, { azimuth: 0, elevation: 15 })
  if (name === 'side') Object.assign(state, { lightAzimuth: -90, lightElevation: 20 })
  return state
}

export function direction(azimuth, elevation) {
  const a = radians(azimuth), e = radians(elevation)
  return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]
}

const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0)
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
const normalize = a => a.map(value => value / Math.hypot(...a))

export function viewMatrix(state) {
  const z = direction(state.azimuth, state.elevation)
  const x = normalize(cross([0, 1, 0], z)), y = cross(z, x)
  const eye = z.map((v, i) => v * state.distance + (i === 1 ? 1 : 0))
  return new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ])
}

export function projectionMatrix(state, aspect) {
  const near = 0.1, far = 100
  if (state.projection === 'orthographic') {
    return new Float32Array([2/(state.span*aspect),0,0,0, 0,2/state.span,0,0,
      0,0,-2/(far-near),0, 0,0,-(far+near)/(far-near),1])
  }
  const f = 1 / Math.tan(radians(state.fov) / 2)
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0,
    0,0,-(far+near)/(far-near),-1, 0,0,-2*far*near/(far-near),0])
}

export function makeObjects() {
  const data = []
  const faces = [
    { n: [0,0,1], p: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
    { n: [0,0,-1], p: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
    { n: [1,0,0], p: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
    { n: [-1,0,0], p: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
    { n: [0,1,0], p: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
    { n: [0,-1,0], p: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
  ]
  for (const { n, p } of faces) for (const i of [0,1,2,0,2,3]) {
    data.push(p[i][0]*0.8-1.45, p[i][1]*0.8+0.8, p[i][2]*0.8+1, ...n)
  }
  const point = (lat, lon) => {
    const t = lat * Math.PI / 32, p = lon * 2 * Math.PI / 48
    return [Math.sin(t)*Math.cos(p), Math.cos(t), Math.sin(t)*Math.sin(p)]
  }
  for (let lat = 0; lat < 32; lat++) for (let lon = 0; lon < 48; lon++) {
    const corners = [point(lat,lon), point(lat+1,lon), point(lat+1,lon+1), point(lat,lon+1)]
    for (const i of [0,1,2,0,2,3]) {
      const n = corners[i]
      data.push(n[0]*0.8+1.35, n[1]*0.8+0.8, n[2]*0.8-1, ...n)
    }
  }
  return new Float32Array(data)
}

export function makeGrid() {
  const data = []
  for (let i = -6; i <= 6; i++) {
    for (const p of [[i,0,-6],[i,0,6],[-6,0,i],[6,0,i]]) data.push(...p, 0,1,0)
  }
  return new Float32Array(data)
}

export function makeLightArrow(state) {
  const light = direction(state.lightAzimuth, state.lightElevation)
  const tip = [0, 2.3, 0]
  const side = normalize(cross(light, [0,1,0]))
  const up = cross(light, side), data = []
  const ring = (angle, offset, radius) => tip.map((v,i) => v + light[i]*offset
    + (side[i]*Math.cos(angle)+up[i]*Math.sin(angle))*radius)
  // 用實際三角形畫箭頭，不依賴各平台不一致的 WebGL 線寬。
  for (let i=0; i<12; i++) {
    const a = i*Math.PI/6, b = (i+1)*Math.PI/6
    const coneA = ring(a,0.35,0.13), coneB = ring(b,0.35,0.13)
    const startA = ring(a,0.35,0.025), startB = ring(b,0.35,0.025)
    const endA = ring(a,1.5,0.025), endB = ring(b,1.5,0.025)
    for (const p of [tip,coneA,coneB, startA,endA,endB, startA,endB,startB]) data.push(...p,0,1,0)
  }
  return new Float32Array(data)
}
