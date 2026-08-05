<script setup>
import { nextTick, onMounted, onUnmounted, onUpdated, ref } from 'vue'

const mountedBoxElement = ref(null)
const updatedBoxElement = ref(null)
const mountedEndpointElement = ref(null)
const updatedEndpointElement = ref(null)
const endpointChanged = ref(false)

let mountedAnimationFrameId = 0
let updatedAnimationFrameId = 0
let shouldRespondToUpdate = false

function moveToEndpoint(boxElement, endpointElement, animationType) {
  cancelAnimationFrame(
    animationType === 'mounted' ? mountedAnimationFrameId : updatedAnimationFrameId,
  )

  function moveBox() {
    const currentX = boxElement.offsetLeft
    const targetX = endpointElement.offsetLeft
    const nextX = Math.min(currentX + 4, targetX)

    boxElement.style.left = `${nextX}px`

    if (nextX < targetX) {
      const frameId = requestAnimationFrame(moveBox)

      if (animationType === 'mounted') mountedAnimationFrameId = frameId
      else updatedAnimationFrameId = frameId
    }
  }

  moveBox()
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  moveToEndpoint(mountedBoxElement.value, mountedEndpointElement.value, 'mounted')
  moveToEndpoint(updatedBoxElement.value, updatedEndpointElement.value, 'updated')
})

onUpdated(() => {
  if (!shouldRespondToUpdate) return

  shouldRespondToUpdate = false
  moveToEndpoint(updatedBoxElement.value, updatedEndpointElement.value, 'updated')
})

async function changeEndpoint() {
  shouldRespondToUpdate = true
  endpointChanged.value = true
  await nextTick()
}

async function resetDemo() {
  cancelAnimationFrame(mountedAnimationFrameId)
  cancelAnimationFrame(updatedAnimationFrameId)

  endpointChanged.value = false
  shouldRespondToUpdate = false
  await nextTick()

  mountedBoxElement.value.style.left = '0px'
  updatedBoxElement.value.style.left = '0px'

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  moveToEndpoint(mountedBoxElement.value, mountedEndpointElement.value, 'mounted')
  moveToEndpoint(updatedBoxElement.value, updatedEndpointElement.value, 'updated')
}

onUnmounted(() => {
  cancelAnimationFrame(mountedAnimationFrameId)
  cancelAnimationFrame(updatedAnimationFrameId)
})
</script>

<template>
  <div
    class="day-01-update-track"
    :data-endpoint-changed="endpointChanged"
    aria-label="onMounted 與 onUpdated 的動畫終點比較"
  >
    <p class="day-01-update-label day-01-update-mounted-label">onMounted()</p>
    <div ref="mountedEndpointElement" class="day-01-endpoint day-01-mounted-endpoint">
      <span>終點</span>
    </div>
    <div ref="mountedBoxElement" class="day-01-update-box day-01-mounted-box"></div>
    <p v-if="endpointChanged" class="day-01-update-message" aria-live="polite">
      <span>動畫只在元件掛載時建立一次</span>
      <span>之後資料更新不會重新執行動畫</span>
    </p>

    <p class="day-01-update-label day-01-update-updated-label">onUpdated()</p>
    <div ref="updatedEndpointElement" class="day-01-endpoint day-01-updated-endpoint">
      <span>終點</span>
    </div>
    <div ref="updatedBoxElement" class="day-01-update-box day-01-updated-box"></div>
  </div>

  <div class="controls">
    <button
      class="primary-action"
      type="button"
      :disabled="endpointChanged"
      @click="changeEndpoint"
    >
      改變終點位置
    </button>
    <button class="secondary-action" type="button" @click="resetDemo">重設 Demo</button>
  </div>
</template>
