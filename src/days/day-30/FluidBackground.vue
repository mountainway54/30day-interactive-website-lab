<script setup>
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { glassSceneKey } from './glassScene.js'
import * as THREE from 'three'

const props = defineProps({ paused: Boolean })
const glassScene = inject(glassSceneKey, null)
const host = ref(null)
let renderer, geometry, material, observer, scene, camera, preference
let frame = 0
let previous = 0
let elapsed = 0
let lost = false

// Broad color fields with a small, smooth warp: gently changing silhouettes,
// without fine noise, nested turbulence, or bright water-fold details.
const fragmentShader = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - .5) * vec2(resolution.x / resolution.y, 1.);
    float t = time * .065;
    p += .14 * vec2(sin(p.y * 3.5 + t), sin(p.x * 2.8 - t * .8));
    vec2 blueCenter = vec2(-.48 + .18*sin(t*.7), .2 + .12*cos(t));
    vec2 deepBlueCenter = vec2(.5 + .16*cos(t*.6), -.3 + .13*sin(t*.8));
    vec2 b = (p - blueCenter) * vec2(.85, 1.35);
    vec2 v = (p - deepBlueCenter) * vec2(1.05, .9);
    float blueLight = exp(-3.8 * dot(b, b));
    float deepBlueLight = exp(-4.2 * dot(v, v));
    vec3 color = vec3(.004, .009, .025)
      + vec3(.12, .36, .82) * blueLight * .85
      + vec3(.06, .22, .55) * deepBlueLight * .8;
    float vignette = 1. - .35 * smoothstep(.15, .8, length(vUv - .5));
    gl_FragColor = vec4(color * vignette, 1.);
  }
`

function draw() {
  if (!renderer || lost) return
  material.uniforms.time.value = elapsed
  renderer.render(scene, camera)
  glassScene?.publish('background', renderer.domElement)
}

function tick(now) {
  frame = requestAnimationFrame(tick)
  // A soft background needs only 30 fps; cap resolution independently of the model.
  if (now - previous < 1000 / 30) return
  elapsed += Math.min((now - previous) / 1000, .1)
  previous = now
  draw()
}

function sync() {
  cancelAnimationFrame(frame)
  frame = 0
  if (!renderer || lost) return
  draw()
  if (!props.paused && !document.hidden && !preference.matches) {
    previous = performance.now()
    frame = requestAnimationFrame(tick)
  }
}

function resize() {
  const { width, height } = host.value.getBoundingClientRect()
  const scale = Math.min(.75, 1100 / Math.max(width, height))
  renderer.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), false)
  material.uniforms.resolution.value.set(width, Math.max(height, 1))
  draw()
}

function contextLost(event) {
  event.preventDefault()
  lost = true
  cancelAnimationFrame(frame)
}
function contextRestored() { lost = false; sync() }

watch(() => props.paused, sync)
onMounted(() => {
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, depth: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(1)
    host.value.appendChild(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.Camera()
    geometry = new THREE.PlaneGeometry(2, 2)
    material = new THREE.ShaderMaterial({
      uniforms: { resolution: { value: new THREE.Vector2(1, 1) }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(geometry, material))
    observer = new ResizeObserver(resize)
    observer.observe(host.value)
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    renderer.domElement.addEventListener('webglcontextrestored', contextRestored)
    document.addEventListener('visibilitychange', sync)
    preference.addEventListener('change', sync)
    resize()
    sync()
  } catch (error) {
    // The CSS gradient remains visible when a WebGL context is unavailable.
    lost = true
    console.warn('流動背景無法啟動，使用靜態漸層。', error)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  preference?.removeEventListener('change', sync)
  renderer?.domElement.removeEventListener('webglcontextlost', contextLost)
  renderer?.domElement.removeEventListener('webglcontextrestored', contextRestored)
  geometry?.dispose()
  material?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div ref="host" class="day-30-gradient" aria-hidden="true"></div>
</template>
