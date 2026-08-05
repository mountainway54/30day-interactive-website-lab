<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const boxElement = ref(null)
const setupMessage = ref('')

let animationFrameId = 0
let xPosition = 0

// setup 執行時，Template ref 還是 null。
if (!boxElement.value) {
  setupMessage.value =
    '在 setup() 階段操作 DOM 時，元素還沒有渲染到畫面，因此無法取得對應的 DOM 元素並啟動動畫。'
}

function moveBox() {
  const box = boxElement.value

  if (!box) return

  const maxX = Math.max(box.parentElement.clientWidth - box.offsetWidth, 0)
  xPosition = xPosition >= maxX ? 0 : xPosition + 2
  box.style.transform = `translate3d(${xPosition}px, 0, 0)`
  animationFrameId = requestAnimationFrame(moveBox)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animationFrameId = requestAnimationFrame(moveBox)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <div class="day-01-timing-track" aria-label="setup 與 onMounted 的 DOM 操作時機比較">
    <p class="day-01-timing-label day-01-setup-label">setup()</p>
    <p class="day-01-setup-message">{{ setupMessage }}</p>

    <p class="day-01-timing-label day-01-mounted-label">onMounted()</p>
    <div ref="boxElement" class="day-01-timing-box" aria-label="移動中的方塊"></div>
  </div>
</template>
