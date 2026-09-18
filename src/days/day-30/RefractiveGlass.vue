<script setup>
import { inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import { glassSceneKey } from './glassScene.js'
import { createGlassMap } from './glassOptics.js'

const emit = defineEmits(['ready'])
const host = ref(null)
const copy = ref(null)
const filter = shallowRef(null)
const prefix = `day-30-lens-${useId().replace(/[^\w-]/g, '')}`
const source = inject(glassSceneKey)
let context, observer, unsubscribe, preference
let frame = 0, revision = 0, generation = 0, mapWidth = 0
let disposed = false
const urls = new Set()

function revoke(url) { URL.revokeObjectURL(url); urls.delete(url) }
const box = ref({ width: 1, height: 46 })
// Three optical strips: fixed top/bottom bevels and a stretchable straight edge.
// Changing height never stretches the rounded corners or waits for a new PNG.
async function rebuild(width) {
  const current = ++generation
  const map = createGlassMap(width, 88)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = 88
  canvas.getContext('2d').putImageData(new ImageData(map.pixels, width, 88), 0, 0)
  const created = []
  try {
    for (const [y, height] of [[0, 22], [44, 1], [66, 22]]) {
      const strip = document.createElement('canvas')
      strip.width = width; strip.height = height
      strip.getContext('2d').drawImage(canvas, 0, y, width, height, 0, 0, width, height)
      const blob = await new Promise((resolve) => strip.toBlob(resolve))
      if (!blob || disposed || current !== generation) { created.forEach(revoke); return }
      const url = URL.createObjectURL(blob)
      urls.add(url); created.push(url)
      const image = new Image()
      image.src = url
      await image.decode()
    }
    if (disposed || current !== generation) { created.forEach(revoke); return }
    const previous = filter.value
    filter.value = { id: `${prefix}-${++revision}`, strips: created, scale: map.scale }
    await nextTick()
    previous?.strips.forEach(revoke)
    if (!disposed) emit('ready', !preference.matches)
  } catch (error) { created.forEach(revoke); throw error }
}
function queue() {
  if (!disposed && !document.hidden && !preference?.matches && !frame) frame = requestAnimationFrame(draw)
}
function draw() {
  frame = 0
  if (disposed || document.hidden || preference.matches) return
  const rect = host.value.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height))
  box.value = { width, height }
  const ratio = Math.min(devicePixelRatio, 2)
  const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio)
  if (copy.value.width !== pixelWidth || copy.value.height !== pixelHeight) {
    copy.value.width = pixelWidth; copy.value.height = pixelHeight
  }
  context.clearRect(0, 0, pixelWidth, pixelHeight)
  // Counter-position a live copy at 1:1 CSS coordinates. Only the small lens
  // surface reaches the SVG filter, never a full-screen filtered layer.
  let overlayAnimating = false
  for (const name of ['background', 'ripple', 'controller']) {
    if (name === 'ripple') {
      overlayAnimating = source.overlays.get('ripple')?.(context, rect, pixelWidth, pixelHeight) || false
      continue
    }
    const layer = source.sources.get(name)
    if (!layer) continue
    const sx = layer.canvas.width / innerWidth, sy = layer.canvas.height / innerHeight
    context.drawImage(layer.canvas, rect.left * sx, rect.top * sy, rect.width * sx, rect.height * sy, 0, 0, pixelWidth, pixelHeight)
  }
  if (mapWidth !== width) {
    mapWidth = width
    rebuild(width).catch((error) => { emit('ready', false); console.warn('玻璃位移圖無法建立。', error) })
  }
  if (overlayAnimating) queue()
}
function visibility() { cancelAnimationFrame(frame); frame = 0; queue() }
function preferenceChanged() { emit('ready', !!filter.value && !preference.matches); visibility() }

onMounted(() => {
  context = copy.value.getContext('2d')
  preference = matchMedia('(prefers-reduced-transparency: reduce)')
  observer = new ResizeObserver(queue)
  observer.observe(host.value)
  unsubscribe = source.subscribe(queue)
  window.addEventListener('resize', queue)
  document.addEventListener('visibilitychange', visibility)
  preference.addEventListener('change', preferenceChanged)
  queue()
})
onBeforeUnmount(() => {
  disposed = true; generation++
  cancelAnimationFrame(frame)
  observer?.disconnect(); unsubscribe?.()
  window.removeEventListener('resize', queue)
  document.removeEventListener('visibilitychange', visibility)
  preference?.removeEventListener('change', preferenceChanged)
  urls.forEach(revoke)
})
</script>

<template>
  <div ref="host" class="day-30-glass-refraction" aria-hidden="true">
    <svg class="day-30-glass-defs" focusable="false">
      <defs>
        <!-- Fixed-size bevel strips prevent optical stretching during resize. -->
        <filter v-if="filter" :id="`${filter.id}-${box.height}`" :key="`${filter.id}-${box.height}`"
          filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" :width="box.width" :height="box.height" color-interpolation-filters="sRGB">
          <feImage :href="filter.strips[0]" x="0" y="0" :width="box.width" height="22" preserveAspectRatio="none" result="top" />
          <feImage :href="filter.strips[1]" x="0" y="22" :width="box.width" :height="Math.max(1, box.height - 44)" preserveAspectRatio="none" result="middle" />
          <feImage :href="filter.strips[2]" x="0" :y="box.height - 22" :width="box.width" height="22" preserveAspectRatio="none" result="bottom" />
          <feMerge result="optics"><feMergeNode in="top" /><feMergeNode in="middle" /><feMergeNode in="bottom" /></feMerge>
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" edgeMode="duplicate" result="soft" />
          <feDisplacementMap in="soft" in2="optics" :scale="filter.scale" xChannelSelector="R" yChannelSelector="G" result="bent" />
          <!-- A restrained smoke tint preserves refraction without the previous
               white veil; the blue channel carries only the hairline rim. -->
          <feColorMatrix in="bent" type="matrix" values=".82 0 0 0 0  0 .83 0 0 0  0 0 .86 0 0  0 0 0 1 0" result="smoked" />
          <feColorMatrix in="optics" type="matrix" values="0 0 .7 0 0  0 0 .78 0 0  0 0 .9 0 0  0 0 0 0 1" result="rim" />
          <feBlend in="smoked" in2="rim" mode="screen" />
        </filter>
      </defs>
    </svg>
    <div class="day-30-glass-copy" :style="{ filter: filter ? `url(#${filter.id}-${box.height})` : 'none' }"><canvas ref="copy"></canvas></div>
  </div>
</template>
