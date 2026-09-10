<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import LabNav from '@/components/LabNav.vue'
import { drawBumpTexture } from './bumpTexture'
import bumpTextureSource from './bumpTexture.js?raw'
import './day-21.css'

// 將原始碼拆成文字片段，透過 Vue 插值上色，保留縮排且不解析成 HTML。
const sourceTokens = []
const syntax = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(const|let|export|function|return|for)\b|(\b\d+(?:\.\d+)?\b|\.\d+\b)|\b([A-Za-z_$][\w$]*)(?=\s*\()/g
let sourceOffset = 0
for (const match of bumpTextureSource.matchAll(syntax)) {
  if (match.index > sourceOffset) sourceTokens.push({ text: bumpTextureSource.slice(sourceOffset, match.index) })
  const kind = match[1] ? 'comment' : match[2] ? 'literal' : match[3] ? 'keyword' : match[4] ? 'literal' : 'function'
  sourceTokens.push({ text: match[0], kind })
  sourceOffset = match.index + match[0].length
}
sourceTokens.push({ text: bumpTextureSource.slice(sourceOffset) })

const canvas = ref(null), preview = ref(null)
const strength = ref(35), scale = ref(1.6), enabled = ref(true)
const displacement = ref(.7), displaced = ref(true)
const ready = ref(false), error = ref('')
let renderer, scene, camera, geometry, material, texture, light, observer, frame, orbit
function render() { if (renderer && ready.value) renderer.render(scene, camera) }
function update() {
  if (!material) return
  material.bumpScale = enabled.value ? strength.value : 0
  material.displacementScale = displaced.value ? displacement.value : 0
  material.displacementBias = -material.displacementScale / 2
  render()
}
function input(target, event, min, max) {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) target.value = Math.max(min, Math.min(max, value))
}
const setDisplacement = event => input(displacement, event, 0, 1.2)
const setStrength = event => input(strength, event, 0, 80)
const setScale = event => input(scale, event, .7, 2.8)
function reset() { displacement.value = .7; displaced.value = true; strength.value = 35; scale.value = 1.6; enabled.value = true; orbit?.reset(); update() }
watch([strength, enabled, displacement, displaced], update)
watch(scale, () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    drawBumpTexture(preview.value, scale.value)
    if (texture) texture.needsUpdate = true
    render()
  })
})
function lost(event) { event.preventDefault(); ready.value = false; if (orbit) orbit.enabled = false; error.value = '3D 繪圖連線已中斷，請重新整理頁面。' }
onMounted(() => {
  drawBumpTexture(preview.value, scale.value)
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(38, 1, .1, 30)
    camera.position.set(0, 0, 4.2)
    texture = new THREE.CanvasTexture(preview.value)
    texture.colorSpace = THREE.NoColorSpace
    geometry = new THREE.SphereGeometry(1, 192, 128)
    material = new THREE.MeshStandardMaterial({ color: '#6f9294', roughness: .72, metalness: 0, bumpMap: texture, bumpScale: strength.value, displacementMap: texture, displacementScale: displacement.value, displacementBias: -displacement.value / 2 })
    const mesh = new THREE.Mesh(geometry, material)
    // GPU 位移超出原始球體包圍範圍，避免平移時過早被裁除。
    mesh.frustumCulled = false
    scene.add(mesh)
    scene.add(new THREE.HemisphereLight('#f5f1e8', '#405b50', 1.1))
    light = new THREE.DirectionalLight('#ffffff', 3)
    light.position.set(-Math.SQRT2 * 2, 2, Math.SQRT2 * 2)
    scene.add(light)
    orbit = new OrbitControls(camera, canvas.value)
    orbit.enablePan = true
    orbit.enableZoom = true
    orbit.minDistance = 1.5
    orbit.maxDistance = 12
    orbit.minPolarAngle = 0.12
    orbit.maxPolarAngle = Math.PI - 0.12
    orbit.listenToKeyEvents(canvas.value)
    orbit.addEventListener('change', render)
    orbit.update()
    orbit.saveState()
    ready.value = true
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
    update()
  } catch {
    ready.value = false
    error.value = '無法啟動 3D 展示，請確認瀏覽器已開啟硬體加速，再重新整理頁面。'
  }
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  orbit?.removeEventListener('change', render)
  orbit?.dispose()
  canvas.value?.removeEventListener('webglcontextlost', lost)
  geometry?.dispose(); material?.dispose(); texture?.dispose(); renderer?.dispose()
})
</script>

<template>
  <main class="day-page day-21-page">
    <LabNav />
    <section class="experiment">
      <header class="section-heading"><div><p>THREE.JS / DISPLACEMENT &amp; BUMP MAP</p><h2><span class="heading-english">displacementMap</span> 與 <span class="heading-english">bumpMap</span>：輪廓與表面起伏</h2></div></header>
      <p class="day-21-description">同一張灰階貼圖，分別控制頂點位移與表面光照。切換兩種效果，拖曳觀察輪廓和紋理的差異。</p>
      <div class="day-21-workbench">
        <div class="day-21-stage">
          <p class="day-21-label">SURFACE / 表面預覽</p>
          <canvas ref="canvas" class="day-21-canvas" tabindex="0" aria-describedby="day-21-help" role="img" :aria-label="`球體位移${displaced ? '開啟' : '關閉'}，凹凸效果${enabled ? '開啟' : '關閉'}，強度 ${strength.toFixed(2)}`" />
          <p class="day-21-caption">固定青綠色 · 霧面材質 · 光源固定在世界座標</p>
          <p id="day-21-help" class="day-21-caption">左鍵：旋轉；右鍵／方向鍵：平移；滾輪／中鍵：縮放。觸控：單指旋轉、雙指平移與縮放。</p>
          <p v-if="error" class="day-21-error" role="alert">{{ error }}</p>
        </div>
        <aside class="day-21-panel" aria-label="紋理控制">
          <label for="day-21-scale">紋理尺度 <output>{{ scale.toFixed(2) }}</output></label>
          <input id="day-21-scale" type="range" min="0.7" max="2.8" step="0.1" :value="scale" :disabled="!ready" @input="setScale" />
          <p class="day-21-hint">往右調整，紋理起伏越大塊。</p>
          <label for="day-21-displacement">位移強度 <output>{{ displacement.toFixed(2) }}</output></label>
          <input id="day-21-displacement" type="range" min="0" max="1.2" step="0.01" :value="displacement" :disabled="!ready" @input="setDisplacement" />
          <p class="day-21-hint">改變頂點位置，觀察球體邊緣的起伏。</p>
          <label for="day-21-strength">凹凸強度 <output>{{ strength.toFixed(2) }}</output></label>
          <input id="day-21-strength" type="range" min="0" max="80" step="1" :value="strength" :disabled="!ready" @input="setStrength" />
          <figure class="day-21-map"><canvas ref="preview" role="img" aria-label="目前球體使用的灰階高度貼圖" /><figcaption>HEIGHT MAP / 灰階貼圖</figcaption></figure>
          <p class="day-21-readout" aria-live="polite">{{ ready ? (enabled ? '凹凸效果已開啟' : '凹凸效果已關閉') : '3D 展示尚未就緒' }}<br />displacementScale = {{ displaced ? displacement.toFixed(2) : '0.00' }}<br />bumpScale = {{ enabled ? strength.toFixed(2) : '0.00' }}</p>
        </aside>
      </div>
      <div class="controls"><button class="primary-action" :disabled="!ready" :aria-pressed="displaced" @click="displaced = !displaced">實際位移：{{ displaced ? '開啟' : '關閉' }}</button><button class="primary-action" :disabled="!ready" :aria-pressed="enabled" @click="enabled = !enabled">凹凸效果：{{ enabled ? '開啟' : '關閉' }}</button><button class="secondary-action" :disabled="!ready" @click="reset">重設參數與視角</button></div>
    </section>
    <section class="experiment day-21-notes" aria-labelledby="day-21-source-title">
      <header class="section-heading">
        <div><p>SOURCE CODE</p><h2 id="day-21-source-title"><span class="heading-english">bumpTexture.js</span>：灰階貼圖生成程式碼</h2></div>
      </header>
      <pre tabindex="0" aria-label="bumpTexture.js 完整程式碼，含中文註解"><code><span v-for="(token, index) in sourceTokens" :key="index" :class="token.kind ? `day-21-code-${token.kind}` : undefined">{{ token.text }}</span></code></pre>
    </section>
  </main>
</template>
