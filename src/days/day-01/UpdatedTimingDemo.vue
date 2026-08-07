<script setup>
import { nextTick, onMounted, onUnmounted, onUpdated, ref } from 'vue'

const topBox = ref(null)
const bottomBox = ref(null)
const topEnd = ref(null)
const bottomEnd = ref(null)
const hasMoved = ref(false)

let topFrameId = 0
let bottomFrameId = 0
let shouldMove = false

function moveToEnd(box, end, row) {
  cancelAnimationFrame(row === 'top' ? topFrameId : bottomFrameId)

  function moveBox() {
    const currentX = box.offsetLeft
    const targetX = end.offsetLeft
    const nextX = Math.min(currentX + 4, targetX)

    box.style.left = `${nextX}px`

    if (nextX < targetX) {
      const frameId = requestAnimationFrame(moveBox)

      if (row === 'top') topFrameId = frameId
      else bottomFrameId = frameId
    }
  }

  moveBox()
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  moveToEnd(topBox.value, topEnd.value, 'top')
  moveToEnd(bottomBox.value, bottomEnd.value, 'bottom')
})

onUpdated(() => {
  if (!shouldMove) return

  shouldMove = false
  moveToEnd(bottomBox.value, bottomEnd.value, 'bottom')
})

async function changeEnd() {
  shouldMove = true
  hasMoved.value = true
  await nextTick()
}

async function resetDemo() {
  cancelAnimationFrame(topFrameId)
  cancelAnimationFrame(bottomFrameId)

  hasMoved.value = false
  shouldMove = false
  await nextTick()

  topBox.value.style.left = '0px'
  bottomBox.value.style.left = '0px'

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  moveToEnd(topBox.value, topEnd.value, 'top')
  moveToEnd(bottomBox.value, bottomEnd.value, 'bottom')
}

onUnmounted(() => {
  cancelAnimationFrame(topFrameId)
  cancelAnimationFrame(bottomFrameId)
})
</script>

<template>
  <div
    class="day-01-update-track"
    :data-endpoint-changed="hasMoved"
    aria-label="onMounted 與 onUpdated 的動畫終點比較"
  >
    <p class="day-01-update-label day-01-update-mounted-label">onMounted()</p>
    <div ref="topEnd" class="day-01-endpoint day-01-mounted-endpoint">
      <span>終點</span>
    </div>
    <div ref="topBox" class="day-01-update-box day-01-mounted-box"></div>
    <p v-if="hasMoved" class="day-01-update-message" aria-live="polite">
      <span>動畫只在元件掛載時建立一次</span>
      <span>之後資料更新不會重新執行動畫</span>
    </p>

    <p class="day-01-update-label day-01-update-updated-label">onUpdated()</p>
    <div ref="bottomEnd" class="day-01-endpoint day-01-updated-endpoint">
      <span>終點</span>
    </div>
    <div ref="bottomBox" class="day-01-update-box day-01-updated-box"></div>
  </div>

  <div class="controls">
    <button
      class="primary-action"
      type="button"
      :disabled="hasMoved"
      @click="changeEnd"
    >
      改變終點位置
    </button>
    <button class="secondary-action" type="button" @click="resetDemo">重設 Demo</button>
  </div>
</template>
