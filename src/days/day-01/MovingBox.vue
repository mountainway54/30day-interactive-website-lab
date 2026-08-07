<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import { sharedState } from './sharedAnimationState.js'

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
let orphanFrames = 0

const state = sharedState[props.mode]

function moveBox() {
  const ownBox = box.value

  if (!ownBox) {
    orphanFrames++
    props.reportOrphanFrame()

  }

  // 故意讓未清理的舊動畫找到重新掛載的新方塊
  const el = ownBox ?? document.querySelector(`[data-animation-mode="${props.mode}"]`)

  if (!el) {
    frameId = requestAnimationFrame(moveBox)
    return
  }

  const maxX = Math.max(el.parentElement.clientWidth - el.offsetWidth, 0)

  state.xPosition += 2

  if (state.xPosition >= maxX) {
    state.xPosition = 0
  }

  el.style.transform = `translate3d(${state.xPosition}px, 0, 0)`
  frameId = requestAnimationFrame(moveBox)
}

function startAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('trace', '系統已設定減少動態效果，因此不播放動畫')
    return
  }

  isRunning.value = true
  emit('trace', '動畫開始')
  frameId = requestAnimationFrame(moveBox)
}

function stopAnimation() {
  cancelAnimationFrame(frameId)
  isRunning.value = false
  emit('trace', '動畫已取消')
}

onMounted(() => {
  state.xPosition = 0
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
    aria-label="移動中的方塊"
  ></div>
</template>
