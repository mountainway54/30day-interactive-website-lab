<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = defineProps({ kind: { type: String, required: true } })
const isCube = props.kind === 'cube'
const prefix = isCube ? 'day-19' : 'day-20'
const id = `${prefix}-${props.kind}`
const canvas = ref(null)
const ready = ref(false)
const status = ref('準備場景')
const error = ref('')
const initial = { ambientIntensity: 0.55, directionalIntensity: 0.45, shininess: 32, strength: 72, specular: true, pitch: -23, yaw: 34 }
const values = reactive({ ...initial })
let renderer, scene, camera, orbit, mesh, ambient, light, observer

function draw() {
  if (ready.value) renderer.render(scene, camera)
}

function resize() {
  if (!ready.value) return
  const { width, height } = canvas.value.getBoundingClientRect()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(Math.max(1, width), Math.max(1, height), false)
  camera.aspect = Math.max(1, width) / Math.max(1, height)
  camera.zoom = Math.min(1, camera.aspect)
  camera.updateProjectionMatrix()
  draw()
}

function update() {
  for (const [key, min, max] of [['ambientIntensity', 0, 2], ['directionalIntensity', 0, 2], ['shininess', 2, 128], ['strength', 0, 100], ['pitch', -180, 180], ['yaw', -180, 180]]) {
    values[key] = THREE.MathUtils.clamp(Number(values[key]) || 0, min, max)
  }
  if (!ready.value) return
  if (isCube) {
    ambient.intensity = values.ambientIntensity
    light.intensity = values.directionalIntensity
    mesh.rotation.set(THREE.MathUtils.degToRad(values.pitch), THREE.MathUtils.degToRad(values.yaw), 0, 'YXZ')
  } else {
    mesh.material.shininess = values.shininess
    // MeshPhongMaterial 沒有 specularStrength；以 specular 顏色乘上強度。
    mesh.material.specular.setRGB(1, 0.94, 0.82).multiplyScalar(values.specular ? values.strength / 100 : 0)
  }
  status.value = isCube ? `環境光 ${values.ambientIntensity.toFixed(2)} · 平行光 ${values.directionalIntensity.toFixed(2)}` : `高光${values.specular ? '開啟' : '關閉'} · 集中度 ${values.shininess}`
  draw()
}

function reset() {
  Object.assign(values, initial)
  orbit?.reset()
  update()
  status.value = '已重設參數與視角'
}

function cameraChanged() {
  status.value = '相機已移動 · 光源固定在世界座標'
  draw()
}

function contextLost(event) {
  event.preventDefault()
  ready.value = false
  if (orbit) orbit.enabled = false
  error.value = 'WebGL 連線中斷，等待瀏覽器恢復；若未恢復，請重新整理頁面。'
}

function contextRestored() {
  // 延至 Three.js 內部的 context restored handler 完成後才重繪。
  queueMicrotask(() => {
    if (!renderer) return
    ready.value = true
    orbit.enabled = true
    error.value = ''
    update()
    resize()
  })
}

function release() {
  observer?.disconnect()
  window.removeEventListener('resize', resize)
  orbit?.removeEventListener('change', cameraChanged)
  orbit?.dispose()
  scene?.traverse(object => {
    object.geometry?.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => material?.dispose())
  })
  renderer?.dispose()
  renderer = null
  ready.value = false
}

onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, isCube ? 0 : 1.42, isCube ? 5.8 : 4.6)

    const geometry = isCube ? new THREE.BoxGeometry(2, 2, 2) : new THREE.SphereGeometry(1, 48, 40)
    const material = isCube
      ? new THREE.MeshLambertMaterial({ vertexColors: true })
      : new THREE.MeshPhongMaterial({ color: '#6f9294', shininess: 32 })
    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    if (isCube) {
      // 幾何與法向量由 BoxGeometry 產生，只保留原版需要的頂點漸層配色。
      const positions = geometry.getAttribute('position')
      const colors = []
      for (let i = 0; i < positions.count; i++) {
        const color = new THREE.Color(positions.getY(i) > 0 ? '#e859ad' : '#382bca')
        colors.push(color.r, color.g, color.b)
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    } else {
      const grid = new THREE.GridHelper(8, 20, '#6f9294', '#b1babd')
      grid.position.y = -1
      scene.add(grid)
    }
    ambient = new THREE.AmbientLight(0xffffff, isCube ? 0.55 : 0.26)
    light = new THREE.DirectionalLight(0xffffff, isCube ? 0.45 : 0.74)
    light.position.set(...(isCube ? [-1, 2, 3] : [-1, 1.6, 2.4]))
    scene.add(ambient, light)

    orbit = new OrbitControls(camera, canvas.value)
    orbit.enablePan = true
    orbit.enableZoom = true
    orbit.minPolarAngle = 0.12
    orbit.maxPolarAngle = Math.PI - 0.12
    orbit.listenToKeyEvents(canvas.value)
    orbit.addEventListener('change', cameraChanged)
    orbit.update()
    orbit.saveState()
    ready.value = true
    update()
    observer = new ResizeObserver(resize)
    observer.observe(canvas.value)
    window.addEventListener('resize', resize)
    resize()
  } catch (cause) {
    error.value = `無法建立 Three.js 場景，請確認瀏覽器支援 WebGL 2 並開啟硬體加速。${cause.message}`
    status.value = '場景無法啟動'
    release()
  }
})
onBeforeUnmount(release)
</script>

<template>
  <section class="experiment" :aria-labelledby="`${id}-title`">
    <header class="section-heading">
      <div>
        <p>THREE.JS / {{ isCube ? 'DAY 15 REWRITE' : 'DAY 16 REWRITE' }}</p>
        <h2 :id="`${id}-title`">{{ isCube ? '立方體的平行光，交給' : '球面的鏡面高光，交給' }} <span class="heading-english">{{ isCube ? 'Lambert' : 'Phong' }}</span></h2>
      </div>
      <span :class="`${prefix}-badge`">{{ isCube ? '01 / DIFFUSE' : '01 / SPECULAR' }}</span>
    </header>
    <p :class="`${prefix}-description`">{{ isCube ? '轉動模型，觀察各面的明暗；拖曳改變觀察角度，光源始終固定在世界座標。' : '拖曳繞著球體觀察，看看高光如何隨視線移動。調整集中度與強度，或關閉鏡面反射比較差異。' }}</p>
    <div :class="`${prefix}-workbench`">
      <div :class="`${prefix}-stage`">
        <div :class="`${prefix}-stage-label`">{{ isCube ? 'BOX GEOMETRY / VERTEX COLORS' : 'SPHERE GEOMETRY / XZ GRID' }}</div>
        <canvas ref="canvas" :class="`${prefix}-canvas`" tabindex="0" role="img" :aria-label="isCube ? '平行光照射的漸層立方體' : '具有鏡面高光的球體'" :aria-describedby="`${id}-help`" @webglcontextlost="contextLost" @webglcontextrestored="contextRestored">瀏覽器不支援 Canvas。</canvas>
        <p :id="`${id}-help`" :class="`${prefix}-help`">左鍵：旋轉；右鍵／方向鍵：平移；滾輪／中鍵：縮放。觸控：單指旋轉、雙指平移與縮放{{ isCube ? '；滑桿：旋轉模型' : '' }}</p>
      </div>
      <aside :class="`${prefix}-panel`" :aria-label="isCube ? '立方體控制' : '球體材質控制'">
        <div :class="`${prefix}-panel-label`">{{ isCube ? 'LIGHT & ROTATION' : 'MATERIAL CONTROL' }}</div>
        <template v-if="isCube">
          <label :for="`${id}-ambient`">環境光強度 <output>{{ values.ambientIntensity.toFixed(2) }}</output></label>
          <input :id="`${id}-ambient`" v-model.number="values.ambientIntensity" type="range" min="0" max="2" step="0.01" :disabled="!ready" @input="update" />
          <label :for="`${id}-directional`">平行光強度 <output>{{ values.directionalIntensity.toFixed(2) }}</output></label>
          <input :id="`${id}-directional`" v-model.number="values.directionalIntensity" type="range" min="0" max="2" step="0.01" :disabled="!ready" @input="update" />
          <label :for="`${id}-pitch`">模型 X 軸 <output>{{ values.pitch }}°</output></label>
          <input :id="`${id}-pitch`" v-model.number="values.pitch" type="range" min="-180" max="180" :disabled="!ready" @input="update" />
          <label :for="`${id}-yaw`">模型 Y 軸 <output>{{ values.yaw }}°</output></label>
          <input :id="`${id}-yaw`" v-model.number="values.yaw" type="range" min="-180" max="180" :disabled="!ready" @input="update" />
        </template>
        <template v-else>
          <label :for="`${id}-shininess`">高光集中度 <output>{{ values.shininess }}</output></label>
          <input :id="`${id}-shininess`" v-model.number="values.shininess" type="range" min="2" max="128" :disabled="!ready || !values.specular" @input="update" />
          <p :class="`${prefix}-range-hint`">2 寬廣 ← → 128 集中</p>
          <label :for="`${id}-strength`">高光強度 <output>{{ values.strength }}%</output></label>
          <input :id="`${id}-strength`" v-model.number="values.strength" type="range" min="0" max="100" :disabled="!ready || !values.specular" @input="update" />
        </template>
        <div :class="`${prefix}-readout`" aria-live="polite">{{ status }}</div>
        <code :class="`${prefix}-snippet`">{{ isCube ? 'mesh.rotation.set(x, y, 0)\nambient.intensity = ambientIntensity\nlight.intensity = directionalIntensity\nrenderer.render(scene, camera)' : 'material.shininess = shininess\nmaterial.specular\n  .setRGB(1, 0.94, 0.82)\n  .multiplyScalar(strength)' }}</code>
      </aside>
    </div>
    <p v-if="error" :class="`${prefix}-error`" role="alert">{{ error }}</p>
    <div class="controls">
      <button v-if="!isCube" type="button" class="primary-action" :disabled="!ready" :aria-pressed="values.specular" @click="values.specular = !values.specular; update()">{{ values.specular ? '關閉鏡面反射' : '開啟鏡面反射' }}</button>
      <button type="button" class="secondary-action" :disabled="!ready" @click="reset">重設參數與視角</button>
    </div>
  </section>
</template>
