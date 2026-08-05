<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import { sharedAnimationState } from './sharedAnimationState.js'

const props = defineProps({
  cleanupEnabled: {
    type: Boolean,
    default: true,
  },
  mode: {
    type: String,
    required: true,
  },
  reportOrphanFrame: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['trace'])

const box = ref(null)
const isRunning = ref(false)

let frameId = 0
let orphanFrameCount = 0

const animationState = sharedAnimationState[props.mode]

function animate() {
  const ownElement = box.value

  if (!ownElement) {
    orphanFrameCount++
    props.reportOrphanFrame()

  }

  // 故意讓未清理的舊動畫找到重新掛載的新方塊
  const element = ownElement ?? document.querySelector(`[data-animation-mode="${props.mode}"]`)

  if (!element) {
    frameId = requestAnimationFrame(animate)
    return
  }

  const maxX = Math.max(element.parentElement.clientWidth - element.offsetWidth, 0)

  animationState.xPosition += 2

  if (animationState.xPosition >= maxX) {
    animationState.xPosition = 0
  }

  element.style.transform = `translate3d(${animationState.xPosition}px, 0, 0)`
  frameId = requestAnimationFrame(animate)
}

function startAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('trace', '系統已設定減少動態效果，因此不播放動畫')
    return
  }

  isRunning.value = true
  emit('trace', '動畫開始')
  frameId = requestAnimationFrame(animate)
}

function stopAnimation() {
  cancelAnimationFrame(frameId)
  isRunning.value = false
  emit('trace', '動畫已取消')
}

onMounted(() => {
  animationState.xPosition = 0
  emit('trace', '方塊 DOM 已經出現在頁面上')
  startAnimation()
})

onUnmounted(() => {
  if (props.cleanupEnabled) {
    stopAnimation()
  } else {
    emit('trace', '沒有取消動畫，callback 會繼續執行')
  }

  emit('trace', '方塊元件已卸載')
})
</script>

<template>
  <div
    ref="box"
    class="moving-box"
    :data-animation-mode="mode"
    :data-running="isRunning"
  >
    <span>DOM</span>
    <small>{{ isRunning ? 'running' : 'still' }}</small>
  </div>
</template>

