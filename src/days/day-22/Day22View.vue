<script setup>
import { onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import LabNav from '@/components/LabNav.vue'
import normalUrl from '../../../docs/images/day22-wood-uv.png'
import colorUrl from '../../../docs/images/day22-wood-color.png'
import heightUrl from '../../../docs/images/day22-wood-height.png'
import './day-22.css'

const canvas = ref(null), ready = ref(false), error = ref('')
const colorEnabled = ref(true), normalEnabled = ref(true)
const bumpEnabled = ref(false), displacementEnabled = ref(true)
const displacementStrength = 0.05, surfaceRoughness = 0.4, bumpStrength = 1.0
const defaults = { repeatU: 1, repeatV: 1, offsetU: 0, offsetV: 0, strength: 1 }
const settings = reactive({ ...defaults })
const sliders = [
  { key: 'repeatU', label: 'U 水平重複', min: 1, max: 4, step: .25 },
  { key: 'repeatV', label: 'V 垂直重複', min: 1, max: 4, step: .25 },
  { key: 'offsetU', label: 'U 水平偏移', min: 0, max: 1, step: .01 },
  { key: 'offsetV', label: 'V 垂直偏移', min: 0, max: 1, step: .01 },
  { key: 'strength', label: '法線強度', min: 0, max: 3, step: .05 },
]
let renderer, scene, camera, geometry, material, orbit, observer, disposed = false
const textures = []
function render() { if (ready.value && !disposed) renderer.render(scene, camera) }
function update() {
  if (!ready.value) return
  for (const texture of textures) {
    texture.repeat.set(settings.repeatU, settings.repeatV)
    texture.offset.set(settings.offsetU, settings.offsetV)
  }
  const map = colorEnabled.value ? textures[0] : null
  const normalMap = normalEnabled.value ? textures[1] : null
  const bumpMap = bumpEnabled.value ? textures[2] : null
  const displacementMap = displacementEnabled.value ? textures[2] : null
  if (material.map !== map || material.normalMap !== normalMap || material.bumpMap !== bumpMap || material.displacementMap !== displacementMap) {
    material.map = map
    material.normalMap = normalMap
    material.bumpMap = bumpMap
    material.displacementMap = displacementMap
    material.needsUpdate = true
  }
  material.normalScale.setScalar(settings.strength)
  material.bumpScale = bumpEnabled.value ? bumpStrength : 0
  material.displacementScale = displacementEnabled.value ? displacementStrength : 0
  material.displacementBias = -material.displacementScale / 2
  material.roughness = surfaceRoughness
  render()
}
function input(control, event) {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) settings[control.key] = Math.min(control.max, Math.max(control.min, value))
}
function reset() {
  Object.assign(settings, defaults)
  colorEnabled.value = normalEnabled.value = true
  bumpEnabled.value = false
  displacementEnabled.value = true
  orbit?.reset()
  update()
}
// Three.js 的 normalMap 會優先於 bumpMap；互斥切換確保開啟的效果確實生效。
function toggleNormal() {
  normalEnabled.value = !normalEnabled.value
  if (normalEnabled.value) bumpEnabled.value = false
}
function toggleBump() {
  bumpEnabled.value = !bumpEnabled.value
  if (bumpEnabled.value) normalEnabled.value = false
}
function inactive(key) {
  return !ready.value || (key === 'strength' && !normalEnabled.value)
}
watch([settings, colorEnabled, normalEnabled, bumpEnabled, displacementEnabled], update)
function lost(event) {
  event.preventDefault()
  ready.value = false
  if (orbit) orbit.enabled = false
  error.value = '3D 繪圖連線已中斷，請重新整理頁面。'
}
onMounted(async () => {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(38, 1, .1, 30)
    camera.position.set(0, 0, 4.2)
    // 沿用 Day21 的半徑、細分與光源。
    geometry = new THREE.SphereGeometry(1, 192, 128)
    material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: surfaceRoughness, metalness: 0 })
    const mesh = new THREE.Mesh(geometry, material)
    // GPU 位移超出原始包圍球，避免平移時被過早裁除。
    mesh.frustumCulled = false
    scene.add(mesh)
    scene.add(new THREE.HemisphereLight('#f5f1e8', '#405b50', 1.1))
    const light = new THREE.DirectionalLight('#ffffff', 3)
    light.position.set(-Math.SQRT2 * 2, 2, Math.SQRT2 * 2)
    scene.add(light)
    orbit = new OrbitControls(camera, canvas.value)
    orbit.minDistance = 1.5
    orbit.maxDistance = 12
    orbit.minPolarAngle = .12
    orbit.maxPolarAngle = Math.PI - .12
    orbit.listenToKeyEvents(canvas.value)
    orbit.addEventListener('change', render)
    orbit.saveState()
    observer = new ResizeObserver(() => {
      const { width, height } = canvas.value.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      render()
    })
    observer.observe(canvas.value)
    canvas.value.addEventListener('webglcontextlost', lost)
    const loader = new THREE.TextureLoader()
    await Promise.all([colorUrl, normalUrl, heightUrl].map((url, index) => new Promise((resolve, reject) => {
      const texture = loader.load(url, loaded => {
        if (disposed) loaded.dispose()
        resolve()
      }, undefined, reject)
      textures[index] = texture
      // 顏色需要 sRGB 解碼；法線與灰階高度都是資料，使用 NoColorSpace。
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    })))
    if (disposed || error.value) return
    // textures[2] 是依同一張木紋顏色圖生成的獨立灰階圖，供位移與凹凸共用。
    ready.value = true
    update()
  } catch {
    if (disposed) return
    error.value = '無法載入 3D 場景或木紋貼圖，請確認網路與瀏覽器硬體加速後重新整理。'
  }
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  orbit?.removeEventListener('change', render)
  orbit?.dispose()
  canvas.value?.removeEventListener('webglcontextlost', lost)
  textures.forEach(texture => texture.dispose())
  geometry?.dispose()
  material?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <main class="day-page day-22-page">
    <LabNav />
    <section class="experiment">
      <header class="section-heading"><div><p>THREE.JS / UV &amp; MATERIAL MAPS</p><h2><span class="heading-english">UV</span> 貼圖與材質貼圖：把木紋包上球體</h2></div></header>
      <p class="day-22-description">沿用 Day21 的球體，透過 UV 座標包覆木紋。顏色貼圖決定色澤，法線與凹凸貼圖改變表面光照，位移貼圖則讓球體輪廓產生起伏。</p>
      <div class="day-22-workbench">
        <div class="day-22-stage">
          <p class="day-22-label">WOOD / 球體表面預覽</p>
          <canvas ref="canvas" class="day-22-canvas" tabindex="0" role="img" aria-label="可旋轉與縮放的木紋球體" aria-describedby="day-22-help" />
          <p class="day-22-caption">SphereGeometry · 半徑 1 · 細分 192 × 128</p>
          <p id="day-22-help" class="day-22-caption">左鍵旋轉；右鍵／方向鍵平移；滾輪縮放。觸控：單指旋轉，雙指平移與縮放。</p>
          <p v-if="error" class="day-22-error" role="alert">{{ error }}</p>
        </div>
        <aside class="day-22-panel" aria-label="UV 與材質控制">
          <div v-for="control in sliders" :key="control.key" class="day-22-control">
            <label :for="`day-22-${control.key}`">{{ control.label }}<output>{{ settings[control.key].toFixed(2) }}</output></label>
            <input :id="`day-22-${control.key}`" type="range" :min="control.min" :max="control.max" :step="control.step" :value="settings[control.key]" :disabled="inactive(control.key)" @input="input(control, $event)" />
          </div>
          <p class="day-22-readout" aria-live="polite">{{ error ? '場景載入失敗' : ready ? '03 張貼圖已載入' : '木紋貼圖載入中…' }}<br />顏色：{{ colorEnabled ? '開啟' : '關閉' }}<br />表面：{{ normalEnabled ? 'normalMap' : bumpEnabled ? 'bumpMap' : '無起伏貼圖' }}</p>
        </aside>
      </div>
      <div class="controls day-22-actions">
        <button :class="colorEnabled ? 'primary-action' : 'secondary-action'" :disabled="!ready" :aria-pressed="colorEnabled" @click="colorEnabled = !colorEnabled">木紋顏色：{{ colorEnabled ? '開啟' : '關閉' }}</button>
        <button :class="normalEnabled ? 'primary-action' : 'secondary-action'" :disabled="!ready" :aria-pressed="normalEnabled" @click="toggleNormal">法線起伏：{{ normalEnabled ? '開啟' : '關閉' }}</button>
        <button :class="bumpEnabled ? 'primary-action' : 'secondary-action'" :disabled="!ready" :aria-pressed="bumpEnabled" @click="toggleBump">凹凸起伏：{{ bumpEnabled ? '開啟' : '關閉' }}</button>
        <button :class="displacementEnabled ? 'primary-action' : 'secondary-action'" :disabled="!ready" :aria-pressed="displacementEnabled" @click="displacementEnabled = !displacementEnabled">實際位移：{{ displacementEnabled ? '開啟' : '關閉' }}</button>
        <button class="secondary-action" :disabled="!ready" @click="reset">重設參數與視角</button>
      </div>
      <p class="day-22-note day-22-mode-help">法線與凹凸擇一啟用；切換會關閉另一種，避免 normalMap 優先而讓 bumpMap 看不出變化。位移可搭配任一表面效果，或單獨開啟。</p>
      <div class="day-22-maps">
        <figure><a :href="colorUrl" target="_blank" rel="noopener"><img :src="colorUrl" alt="生成的棕色木紋顏色貼圖" /></a><figcaption><strong>COLOR / 顏色貼圖</strong><span>map · sRGB</span>依原圖紋理生成，提供木頭色澤。</figcaption></figure>
        <figure><a :href="normalUrl" target="_blank" rel="noopener"><img :src="normalUrl" alt="使用者提供的紫藍色木紋法線貼圖" /></a><figcaption><strong>NORMAL / 原始法線貼圖</strong><span>normalMap · NoColorSpace</span>RGB 記錄表面方向，改變光照而不改變輪廓。</figcaption></figure>
        <figure><a :href="heightUrl" target="_blank" rel="noopener"><img :src="heightUrl" alt="依相同木紋顏色貼圖生成的灰階高度貼圖" /></a><figcaption><strong>HEIGHT / 灰階高度貼圖</strong><span>displacementMap + bumpMap</span>同一張木紋生成的灰階圖，供位移與凹凸共用。</figcaption></figure>
      </div>
      <p class="day-22-note day-22-height-help"><code>displacementMap</code> 與 <code>bumpMap</code> 共用上方的灰階高度圖，以 NoColorSpace 取樣，亮處高、暗處低。位移以 0.5 為中心向內外移動；凹凸只改變光照。灰階圖依木紋顏色圖生成，為近似高度，並非實際量測深度。</p>
      <p class="day-22-note">UV 是幾何表面對應圖片的位置。所有貼圖同步重複與偏移，讓色澤與起伏一起移動；球體兩極會擠壓紋理，左右接縫則取決於圖片邊緣是否連續，開啟位移時可能更明顯。生成的色紋與原始法線為近似對應，並非逐像素還原。</p>
    </section>
  </main>
</template>
