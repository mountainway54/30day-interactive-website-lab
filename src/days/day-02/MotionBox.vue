<script setup>
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

gsap.registerPlugin(CustomEase)

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  replayKey: {
    type: Number,
    required: true,
  },
})

const box = ref(null)
let tween = null

function safeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function play() {
  await nextTick()
  if (!box.value) return

  tween?.kill()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(box.value, { clearProps: 'transform' })
    return
  }

  const stageWidth = box.value.parentElement?.clientWidth ?? 0
  const maxX = Math.max(stageWidth - box.value.offsetWidth - 32, 0)
  const requestedX = safeNumber(props.settings.x)
  const x = Math.min(Math.max(requestedX, -maxX), maxX)
  const rotation = safeNumber(props.settings.rotation)
  const duration = Math.max(safeNumber(props.settings.duration, 1.2), 0)
  const delay = Math.max(safeNumber(props.settings.delay), 0)
  const ease = props.settings.ease === 'customBezier'
    ? CustomEase.create(
        'customBezier',
        [
          safeNumber(props.settings.bezierX1, 0.22),
          safeNumber(props.settings.bezierY1, 1),
          safeNumber(props.settings.bezierX2, 0.36),
          safeNumber(props.settings.bezierY2, 1),
        ].join(','),
      )
    : props.settings.ease || 'none'

  gsap.set(box.value, { x: 0, rotation: 0 })

  try {
    tween = gsap.to(box.value, {
      x,
      rotation,
      duration,
      delay,
      ease,
      overwrite: true,
    })
  } catch {
    tween = gsap.to(box.value, {
      x,
      rotation,
      duration,
      delay,
      ease: 'none',
      overwrite: true,
    })
  }
}

watch(
  () => [
    props.settings.x,
    props.settings.rotation,
    props.settings.duration,
    props.settings.delay,
    props.settings.ease,
    props.settings.bezierX1,
    props.settings.bezierY1,
    props.settings.bezierX2,
    props.settings.bezierY2,
    props.replayKey,
  ],
  play,
)

onMounted(play)

onUnmounted(() => {
  tween?.kill()
  gsap.killTweensOf(box.value)
})
</script>

<template>
  <div ref="box" class="day-02-motion-box" aria-label="可調整動畫的方塊">
    <span aria-hidden="true">→</span>
  </div>
</template>
