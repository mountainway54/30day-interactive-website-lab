<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { createPointerRefraction } from './pointerRefraction.js'

const root = ref(null)
const viewport = ref(null)
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
  { x: 0, y: 3.1, z: 5.9, tx: 0, ty: 0, tz: 0 },
  { x: 0, y: 4, z: 1, tx: 0, ty: 0, tz: 0 },
  { x: 4, y: 1, z: 1, tx: 0.55, ty: -0.1, tz: 0 },
  { x: 5, y: 5, z: -2, tx: 0, ty: 0, tz: 0 },
  { x: 0, y: 3.1, z: 5.9, tx: 0, ty: 0, tz: 0 },
]

const currentLabel = computed(() => chapters[activeIndex.value]?.label ?? chapters[0].label)
const abortController = new AbortController()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const pose = { ...poses[0] }

let renderer
let refraction
let scene
let camera
let model
let environment
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

function render() {
  if (!renderer || disposed) return
  const mobileScale = camera.aspect < 0.8 ? 1.28 : 1
  camera.position.set(pose.x * mobileScale, pose.y * mobileScale, pose.z * mobileScale)
  camera.lookAt(pose.tx, pose.ty, pose.tz)
  if (refraction) refraction.render()
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
}

function updateFromScroll(event) {
  const progress = THREE.MathUtils.clamp(event.progress || 0, 0, 1)
  scrollProgress.value = progress
  activeIndex.value = Math.min(chapters.length - 1, Math.round(progress * (chapters.length - 1)))
  cameraTimeline?.progress(progress)
  if (ready.value && !finalChapterRipplePlayed && activeIndex.value === chapters.length - 1) {
    finalChapterRipplePlayed = true
    startRipple()
  }
}

function contextLost(event) {
  event.preventDefault()
  error.value = '3D 顯示已中斷，請重新整理頁面。'
  finishRipple()
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
    room.dispose()
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x08111e, 1.15))
    const key = new THREE.DirectionalLight(0xffffff, 3.4)
    key.position.set(-4, 6, 7)
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
        let options = { color: 0x141925, roughness: 0.36, metalness: 0.08 }
        if (name.includes('white')) options = { color: 0xe3e6ec, roughness: 0.22, metalness: 0.04 }
        else if (name.includes('emission')) options = { color: 0x4a8eff, emissive: 0x236fff, emissiveIntensity: 3.4, roughness: 0.28 }
        else if (name.includes('glas')) options = { color: 0x72809b, roughness: 0.1, metalness: 0.12, transparent: true, opacity: 0.72 }
        else if (name.includes('contact') || name === 'usb' || name.includes('logo')) options = { color: 0x8995aa, roughness: 0.2, metalness: 0.82 }
        const material = new THREE.MeshStandardMaterial({ ...options, name: source.name })
        materialCache.set(name, material)
        return material
      })
      object.material = Array.isArray(object.material) ? replacements : replacements[0]
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

    cameraTimeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onUpdate: render })
    poses.slice(1).forEach((next) => {
      cameraTimeline.to(pose, { ...next, duration: 1 })
    })

    await renderer.compileAsync(scene, camera)
    if (disposed) return
    loadProgress.value = 100
    refraction = createPointerRefraction(renderer, scene, camera, render)
    resize()
    ready.value = true
    lenis.scrollTo(0, { immediate: true, force: true })
    render()
    startRipple()
    lenis.resize()
    lenis.start()
  } catch (cause) {
    if (!disposed) {
      error.value = '無法載入 3D 產品，請重新整理頁面再試一次。'
      finishRipple()
      console.error(cause)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('visibilitychange', syncBackgroundVisibility)
  abortController.abort()
  lenis?.off('scroll', updateFromScroll)
  lenis?.destroy()
  cameraTimeline?.kill()
  resizeObserver?.disconnect()
  renderer?.domElement.removeEventListener('webglcontextlost', contextLost)
  refraction?.dispose()
  disposeModel(model)
  environment?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div ref="root" class="day-27-story">
    <div v-if="rippleActive && !error" :key="rippleRun" class="day-27-ripples" :class="{ 'day-27-ripples-paused': backgroundPaused }" aria-hidden="true">
      <span @animationend="finishRipple"></span>
    </div>
    <div ref="viewport" class="day-27-viewport"></div>

    <div class="day-27-aura" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>

    <div v-if="!ready || error" class="day-27-loading" role="status" aria-live="polite">
      <span class="day-27-loading-brand">player / one</span>
      <strong>{{ error ? '—' : String(loadProgress).padStart(2, '0') }}<small v-if="!error">%</small></strong>
      <p>{{ error || loading }}</p>
      <div v-if="!error" class="day-27-loading-track">
        <span :style="{ transform: `scaleX(${loadProgress / 100})` }"></span>
      </div>
    </div>

    <aside class="day-27-rail" aria-label="閱讀進度">
      <span class="day-27-rail-label" aria-live="polite">{{ currentLabel }}</span>
      <div class="day-27-rail-track">
        <span :style="{ transform: `scaleY(${scrollProgress})` }"></span>
      </div>
      <span>{{ String(activeIndex + 1).padStart(2, '0') }} / 05</span>
    </aside>

    <section
      v-for="(chapter, index) in chapters"
      :key="index"
      class="day-27-chapter"
      :class="[`day-27-chapter-${index + 1}`, { 'is-active': activeIndex === index }]"
      :aria-label="chapter.title"
    >
      <div v-if="!chapter.quiet" class="day-27-copy">
        <h2>{{ chapter.title }}</h2>
        <p class="day-27-detail">{{ chapter.detail }}</p>
      </div>
      <div
        v-if="index === 0"
        class="day-27-scroll-cue"
        :style="{ opacity: Math.max(0, 1 - scrollProgress * 50) }"
        aria-hidden="true"
      >
        <span>SCROLL TO EXPLORE</span><i></i>
      </div>
    </section>
  </div>
</template>
