<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { createPointerRefraction } from './pointerRefraction.js'
import { createPointerFloat } from '../day-28/pointerFloat.js'
import { createResonanceParticles } from './resonanceParticles.js'

const root = ref(null)
const viewport = ref(null)
const particleViewport = ref(null)
let particles
const ready = ref(false)
const rippleActive = ref(false)
const rippleRun = ref(0)
let finalChapterRipplePlayed = false
const backgroundPaused = ref(document.hidden)
function syncBackgroundVisibility() { backgroundPaused.value = document.hidden }
const error = ref('')
const loading = ref('正在載入控制器模型')
const loadProgress = ref(0)
const scrollProgress = ref(0)
const activeIndex = ref(0)

const chapters = [
  {
    label: '',
    title: '控制器正面',
    quiet: true,
  },
  {
    label: 'TOUCH / 01',
    title: '觸碰板',
    detail: '滑動／點按輸入 · 多點觸控介面',
  },
  {
    label: 'CONTROL / 02',
    title: '類比操作桿',
    detail: '移動／瞄準／方向 · 高精度類比輸入',
  },
  {
    label: 'TENSION / 03',
    title: '自適應扳機',
    detail: 'L2／R2 動態阻力 · 依情境改變力量與張力',
  },
  {
    label: '',
    title: 'Heighten Your Senses',
    detail: '激發你的感官',
  },
]

const poses = [
  { x: 0, y: 3.72, z: 7.08, tx: 0, ty: 0, tz: 0 },
  { x: 0, y: 4, z: 1, tx: 0, ty: 0, tz: 0 },
  { x: 4, y: 1, z: 1, tx: 0.55, ty: -0.1, tz: 0 },
  { x: 5, y: 5, z: -2, tx: 0, ty: 0, tz: 0 },
  { x: 0, y: 3.72, z: 7.08, tx: 0, ty: 0, tz: 0 },
]

const currentLabel = computed(() => chapters[activeIndex.value]?.label ?? chapters[0].label)
const abortController = new AbortController()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const pose = { ...poses[0] }

let renderer
let refraction
let pointerFloat
const floatOffset = new THREE.Vector3()
const projectedOffset = new THREE.Vector3()
const projectedOrigin = new THREE.Vector3()
let scene
let camera
let model
let environment
const internalLights = []
let resizeObserver
let cameraTimeline
let lenis
let disposed = false

function finishRipple() {
  rippleActive.value = false
}

function startRipple() {
  // Remount so reaching chapter 05 during the opening wave restarts it cleanly.
  rippleRun.value += 1
  rippleActive.value = true
}

function disposeModel(target) {
  const materials = new Set()
  target?.traverse((object) => {
    object.geometry?.dispose()
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.filter(Boolean).forEach((material) => materials.add(material))
  })
  materials.forEach((material) => material.dispose())
}

function render(refreshScene = true) {
  if (!renderer || disposed) return
  const mobileScale = camera.aspect < 0.8 ? 1.28 : 1
  camera.position.set(pose.x * mobileScale, pose.y * mobileScale, pose.z * mobileScale)
  camera.lookAt(pose.tx, pose.ty, pose.tz)
  camera.updateMatrixWorld()
  if (refraction) {
    projectedOffset.copy(floatOffset).project(camera)
    projectedOrigin.set(0, 0, 0).project(camera)
    refraction.setOffset((projectedOffset.x - projectedOrigin.x) / 2,
      (projectedOffset.y - projectedOrigin.y) / 2)
    refraction.render(refreshScene)
  }
  else renderer.render(scene, camera)
}

function resize() {
  if (!renderer || !viewport.value) return
  const { width, height } = viewport.value.getBoundingClientRect()
  camera.aspect = width / Math.max(1, height)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  refraction?.resize(width, height)
  render()
  pointerFloat?.refresh()
}

function updateFromScroll(event) {
  const progress = THREE.MathUtils.clamp(event.progress || 0, 0, 1)
  scrollProgress.value = progress
  activeIndex.value = Math.min(chapters.length - 1, Math.round(progress * (chapters.length - 1)))
  cameraTimeline?.progress(progress)
  pointerFloat?.refresh()
  if (ready.value && !finalChapterRipplePlayed && activeIndex.value === chapters.length - 1) {
    finalChapterRipplePlayed = true
    startRipple()
  }
}

function contextLost(event) {
  event.preventDefault()
  error.value = '3D 顯示已中斷，請重新整理頁面。'
  finishRipple()
  particles?.dispose()
  pointerFloat?.dispose()
  refraction?.dispose()
  refraction = null
}

onMounted(async () => {
  document.addEventListener('visibilitychange', syncBackgroundVisibility)
  window.scrollTo({ top: 0, behavior: 'auto' })
  lenis = new Lenis({
    autoRaf: true,
    lerp: reducedMotion.matches ? 1 : 0.075,
    smoothWheel: !reducedMotion.matches,
    wheelMultiplier: 0.9,
  })
  lenis.stop()
  lenis.on('scroll', updateFromScroll)
  lenis.scrollTo(0, { immediate: true, force: true })

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x07101a, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.96
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', '隨捲動改變視角的 DualSense 控制器')
    viewport.value.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('webglcontextlost', contextLost)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    environment = pmrem.fromScene(room)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.08
    room.dispose()
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x08111e, 0.08))
    const key = new THREE.DirectionalLight(0xffffff, 8)
    key.position.set(-8, 4, 3)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x4e98ff, 5.2)
    rim.position.set(5, 2, -5)
    scene.add(rim)

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(viewport.value)
    resize()

    const response = await fetch(`${import.meta.env.BASE_URL}models/controller/controller.bin`, {
      signal: abortController.signal,
    })
    if (!response.ok) throw new Error(`模型下載失敗 (${response.status})`)

    const total = Number(response.headers.get('content-length'))
    const reader = response.body.getReader()
    const chunks = []
    let loaded = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      if (total) loadProgress.value = Math.min(95, Math.round((loaded / total) * 95))
    }

    loading.value = '正在準備材質與光線'
    const buffer = await new Response(
      new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer()
    if (disposed) return

    const result = await new GLTFLoader().parseAsync(buffer, '')
    if (disposed) {
      disposeModel(result.scene)
      return
    }

    model = result.scene
    const materialCache = new Map()
    model.traverse((object) => {
      if (!object.isMesh) return
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const replacements = sources.map((source) => {
        const name = source.name.toLowerCase()
        if (materialCache.has(name)) return materialCache.get(name)
        let options = { color: 0x141925, roughness: 0.78, metalness: 0.08 }
        if (name.includes('white')) options = { color: 0xe3e6ec, roughness: 0.22, metalness: 0.04 }
        else if (name === 'buttons_inner') options = {
          color: 0xf0f3f8,
          roughness: 0.45,
          metalness: 0,
          side: THREE.DoubleSide,
        }
        else if (name.includes('emission')) options = {
          color: 0x00102a,
          emissive: 0x004cff,
          emissiveIntensity: 1.2,
          roughness: 0.65,
          metalness: 0,
          envMapIntensity: 0,
          toneMapped: false,
        }
        else if (name.includes('glas')) options = {
          color: 0xf5f8ff,
          roughness: 0.16,
          metalness: 0,
          transmission: 0.95,
          opacity: 1,
          ior: 1.49,
          // Local model units; Three.js scales the transmission ray with the model.
          thickness: 0.0004,
          envMapIntensity: 0.65,
        }
        else if (name.includes('contact') || name === 'usb' || name.includes('logo')) options = { color: 0x8995aa, roughness: 0.2, metalness: 0.82 }
        const Material = name.includes('glas') ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial
        const material = new Material({ ...options, name: source.name })
        materialCache.set(name, material)
        return material
      })
      object.material = Array.isArray(object.material) ? replacements : replacements[0]
      object.receiveShadow = true
      // Let light leave the luminous strips and clear caps; opaque shells block it.
      object.castShadow = !sources.some((source) => /emission|glas/i.test(source.name))
      sources.forEach((source) => source.dispose())
    })

    const modelRotation = new THREE.Euler(Math.PI / 2 - 0.45, 0, 0)
    model.rotation.copy(modelRotation)
    const bounds = new THREE.Box3().setFromObject(model)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const scale = 4.6 / Math.max(size.x, size.y, size.z)
    model.scale.setScalar(scale)
    model.position.copy(center).multiplyScalar(-scale)
    scene.add(model)
    model.updateMatrixWorld(true)

    // Place the LEDs just inside the actual left/right light-strip geometry.
    const stripPoints = [[], []]
    const modelCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    model.traverse((object) => {
      if (!object.isMesh || !/emission/i.test(object.material.name ?? '')) return
      const positions = object.geometry.getAttribute('position')
      for (let i = 0; i < positions.count; i += 1) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, i)
        object.localToWorld(point)
        stripPoints[point.x < modelCenter.x ? 0 : 1].push(point)
      }
    })
    stripPoints.forEach((points) => {
      if (!points.length) return
      const stripCenter = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3())
      const light = new THREE.PointLight(0x004cff, 5.4, 1.4, 2)
      light.position.copy(stripCenter).addScaledVector(
        modelCenter.clone().sub(stripCenter).normalize(), 0.015,
      )
      light.castShadow = true
      light.shadow.mapSize.set(512, 512)
      light.shadow.camera.near = 0.005
      light.shadow.camera.far = 1.4
      light.shadow.bias = -0.0001
      // Model and lights stay fixed; shader drift reuses these shadow maps.
      light.shadow.autoUpdate = false
      light.shadow.needsUpdate = true
      scene.add(light)
      internalLights.push(light)
    })

    cameraTimeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onUpdate: render })
    poses.slice(1).forEach((next) => {
      cameraTimeline.to(pose, { ...next, duration: 1 })
    })

    await renderer.compileAsync(scene, camera)
    if (disposed) return
    loadProgress.value = 100
    refraction = createPointerRefraction(renderer, scene, camera, () => render(false))
    resize()
    ready.value = true
    particles = createResonanceParticles(particleViewport.value, refraction.waves)
    lenis.scrollTo(0, { immediate: true, force: true })
    render()
    pointerFloat = createPointerFloat(renderer.domElement, model, floatOffset, camera, () => render(false))
    startRipple()
    particles?.burst()
    lenis.resize()
    lenis.start()
  } catch (cause) {
    if (!disposed) {
      error.value = '無法載入 3D 產品，請重新整理頁面再試一次。'
      finishRipple()
      particles?.dispose()
      console.error(cause)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  particles?.dispose()
  document.removeEventListener('visibilitychange', syncBackgroundVisibility)
  abortController.abort()
  lenis?.off('scroll', updateFromScroll)
  lenis?.destroy()
  cameraTimeline?.kill()
  resizeObserver?.disconnect()
  renderer?.domElement.removeEventListener('webglcontextlost', contextLost)
  refraction?.dispose()
  pointerFloat?.dispose()
  disposeModel(model)
  internalLights.forEach((light) => {
    light.shadow.dispose()
    light.removeFromParent()
  })
  internalLights.length = 0
  environment?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div ref="root" class="day-29-story">
    <div v-if="rippleActive && !error" :key="rippleRun" class="day-29-ripples" :class="{ 'day-29-ripples-paused': backgroundPaused }" aria-hidden="true">
      <span @animationend="finishRipple"></span>
    </div>
    <div ref="particleViewport" class="day-29-particles" aria-hidden="true"></div>
    <div ref="viewport" class="day-29-viewport"></div>

    <div class="day-29-aura" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>

    <div v-if="!ready || error" class="day-29-loading" role="status" aria-live="polite">
      <span class="day-29-loading-brand">player / one</span>
      <strong>{{ error ? '—' : String(loadProgress).padStart(2, '0') }}<small v-if="!error">%</small></strong>
      <p>{{ error || loading }}</p>
      <div v-if="!error" class="day-29-loading-track">
        <span :style="{ transform: `scaleX(${loadProgress / 100})` }"></span>
      </div>
    </div>

    <aside class="day-29-rail" aria-label="閱讀進度">
      <span class="day-29-rail-label" aria-live="polite">{{ currentLabel }}</span>
      <div class="day-29-rail-track">
        <span :style="{ transform: `scaleY(${scrollProgress})` }"></span>
      </div>
      <span>{{ String(activeIndex + 1).padStart(2, '0') }} / 05</span>
    </aside>

    <section
      v-for="(chapter, index) in chapters"
      :key="index"
      class="day-29-chapter"
      :class="[`day-29-chapter-${index + 1}`, { 'is-active': activeIndex === index }]"
      :aria-label="chapter.title"
    >
      <div v-if="!chapter.quiet" class="day-29-copy">
        <h2>{{ chapter.title }}</h2>
        <p class="day-29-detail">{{ chapter.detail }}</p>
      </div>
      <div
        v-if="index === 0"
        class="day-29-scroll-cue"
        :style="{ opacity: Math.max(0, 1 - scrollProgress * 50) }"
        aria-hidden="true"
      >
        <span>SCROLL TO EXPLORE</span><i></i>
      </div>
    </section>
  </div>
</template>
