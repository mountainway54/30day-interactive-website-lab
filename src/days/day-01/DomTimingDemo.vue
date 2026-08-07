<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const box = ref(null)
const message = ref('')

let frameId = 0
let xPosition = 0

function moveBox() {
  const el = box.value

  const maxX = Math.max(el.parentElement.clientWidth - el.offsetWidth, 0)
  xPosition = xPosition >= maxX ? 0 : xPosition + 2
  el.style.transform = `translate3d(${xPosition}px, 0, 0)`
  frameId = requestAnimationFrame(moveBox)
}

// 直接在 setup 階段呼叫，此時 box.value 還是 null。
try {
  moveBox()
} catch (error) {
  message.value = error instanceof Error ? error.message : String(error)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  frameId = requestAnimationFrame(moveBox)
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
})
</script>

<template>
  <div class="day-01-timing-track" aria-label="setup 與 onMounted 的 DOM 操作時機比較">
    <p class="day-01-timing-label day-01-setup-label">直接呼叫 moveBox()</p>
    <p class="day-01-setup-message">{{ message }}</p>

    <p class="day-01-timing-label day-01-mounted-label">在 onMounted() 中呼叫</p>
    <div ref="box" class="day-01-timing-box" aria-label="移動中的方塊"></div>
  </div>
</template>
