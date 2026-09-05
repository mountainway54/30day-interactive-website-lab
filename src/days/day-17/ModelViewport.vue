<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { validateGltf } from './gltf-data.js'

const props = defineProps({ initialSource: String, wireframe: Boolean })
const emit = defineEmits(['status', 'busy'])
const host = ref(null)
let renderer, scene, camera, controls, observer, model, loadedScenes = [], disposed = false, loading = false
function disposeRoots(roots) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  roots.forEach(root => root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry)
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue
      materials.add(material)
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value) })
    }
  }))
  geometries.forEach(item => item.dispose())
  textures.forEach(item => { item.source?.data?.close?.(); item.dispose() })
  materials.forEach(item => item.dispose())
}
function draw() { if (!disposed && renderer) renderer.render(scene, camera) }
function resetView() {
  if (!controls) return
  camera.position.set(3.5, 2.3, 4.5)
  controls.target.set(0, 0, 0)
  controls.update()
  draw()
}
function applyWireframe() {
  model?.traverse(object => {
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (material && 'wireframe' in material) material.wireframe = props.wireframe
    }
  })
  draw()
}
async function load(text) {
  if (loading || disposed) return
  if (!renderer) { emit('status', { error: true, message: '無法建立 WebGL 渲染器，請確認瀏覽器已啟用硬體加速。' }); return }
  loading = true
  emit('busy', true)
  let candidate
  try {
    const data = validateGltf(text)
    const manager = new THREE.LoadingManager()
    manager.setURLModifier(url => {
      if (!url.startsWith('data:') && !url.startsWith('blob:')) throw new Error('僅支援內嵌資料，無法讀取外部資源。')
      return url
    })
    candidate = await new GLTFLoader(manager).parseAsync(data, '')
    if (disposed) { disposeRoots(candidate.scenes); return }
    const root = candidate.scene
    if (!root) throw new Error('找不到可渲染的場景。')
    const stats = { vertices: 0, triangles: 0, meshes: 0 }
    root.traverse(object => {
      if (!object.isMesh) return
      const position = object.geometry.getAttribute('position')
      if (!position) return
      for (let i = 0; i < position.count; i++) {
        if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) throw new Error('頂點包含無效座標。')
      }
      stats.vertices += position.count
      stats.triangles += (object.geometry.index?.count ?? position.count) / 3
      stats.meshes++
      if (!object.geometry.getAttribute('normal')) object.geometry.computeVertexNormals()
    })
    if (!stats.meshes) throw new Error('場景中沒有可渲染的三角網格。')
    const bounds = new THREE.Box3().setFromObject(root)
    const center = bounds.getCenter(new THREE.Vector3())
    const extent = bounds.getSize(new THREE.Vector3())
    const diameter = Math.max(extent.x, extent.y, extent.z)
    if (!Number.isFinite(diameter) || diameter <= 0) throw new Error('模型尺寸無效，請檢查頂點資料。')
    const wrapper = new THREE.Group()
    wrapper.add(root)
    wrapper.scale.setScalar(2.8 / diameter)
    wrapper.position.copy(center).multiplyScalar(-2.8 / diameter)
    if (model) scene.remove(model)
    disposeRoots(loadedScenes)
    loadedScenes = candidate.scenes
    model = wrapper
    scene.add(model)
    applyWireframe()
    resetView()
    emit('status', { message: '模型已渲染。拖曳旋轉、滾輪縮放；修改左側資料後，按「渲染模型」更新。', stats })
  } catch (error) {
    if (candidate && candidate.scenes !== loadedScenes) disposeRoots(candidate.scenes)
    if (!disposed) emit('status', { error: true, message: `渲染失敗：${error.message || '請檢查 glTF 資料。'}${model ? '（保留上一個模型）' : ''}` })
  } finally {
    loading = false
    if (!disposed) emit('busy', false)
  }
}
function keyboard(event) {
  if (!controls) return
  const offset = camera.position.clone().sub(controls.target)
  const spherical = new THREE.Spherical().setFromVector3(offset)
  if (event.key === 'ArrowLeft') spherical.theta -= 0.12
  else if (event.key === 'ArrowRight') spherical.theta += 0.12
  else if (event.key === 'ArrowUp') spherical.phi -= 0.12
  else if (event.key === 'ArrowDown') spherical.phi += 0.12
  else if (event.key === '+' || event.key === '=') spherical.radius = Math.max(2, spherical.radius * 0.9)
  else if (event.key === '-') spherical.radius = Math.min(15, spherical.radius * 1.1)
  else return
  event.preventDefault()
  spherical.makeSafe()
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical))
  controls.update()
}
onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x52616f, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(3, 5, 4)
    scene.add(light)
    host.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', '3D 模型預覽')
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 2
    controls.maxDistance = 15
    controls.addEventListener('change', draw)
    observer = new ResizeObserver(() => {
      const { width, height } = host.value.getBoundingClientRect()
      renderer.setSize(width, height)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      draw()
    })
    observer.observe(host.value)
    resetView()
    load(props.initialSource)
  } catch {
    emit('status', { error: true, message: '無法啟動 WebGL。請使用支援 WebGL 2 的瀏覽器並啟用硬體加速。' })
  }
})
watch(() => props.wireframe, applyWireframe)
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  controls?.removeEventListener('change', draw)
  controls?.dispose()
  disposeRoots(loadedScenes)
  renderer?.dispose()
  renderer?.domElement.remove()
})
defineExpose({ load, resetView })
</script>

<template>
  <div ref="host" class="day-17-canvas" tabindex="0" role="group" aria-label="模型操作區：方向鍵旋轉，加減鍵縮放" @keydown="keyboard">
    <span class="day-17-orbit-hint">拖曳旋轉 · 滾輪縮放<br>鍵盤：方向鍵 / + −</span>
  </div>
</template>
