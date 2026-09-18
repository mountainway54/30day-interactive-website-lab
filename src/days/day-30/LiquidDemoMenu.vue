<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import RefractiveGlass from './RefractiveGlass.vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const open = ref(false)
const glassReady = ref(false)
const root = ref(null)
const trigger = ref(null)
const panel = ref(null)
const id = `day-30-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const demos = computed(() => router.getRoutes()
  .filter((item) => Number.isInteger(item.meta.day))
  .sort((a, b) => b.meta.day - a.meta.day))

function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    panel.value?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }
}

async function focusFirst() {
  open.value = true
  await nextTick()
  panel.value?.querySelector('a')?.focus()
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close(true)
  }
  if (!open.value || !panel.value?.contains(event.target)) return
  const links = [...panel.value.querySelectorAll('a')]
  const index = links.indexOf(document.activeElement)
  let target
  if (event.key === 'ArrowDown') target = (index + 1) % links.length
  if (event.key === 'ArrowUp') target = (index - 1 + links.length) % links.length
  if (event.key === 'Home') target = 0
  if (event.key === 'End') target = links.length - 1
  if (target !== undefined) { event.preventDefault(); links[target]?.focus() }
}
function outside(event) { if (!root.value?.contains(event.target)) close() }
function focusOut(event) { if (!root.value?.contains(event.relatedTarget)) close() }

onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div ref="root" class="day-30-demo-menu" :class="{ 'is-open': open }" @keydown="onKeydown" @focusout="focusOut">
    <div class="day-30-glass-shell day-30-glass-surface" :class="{ 'day-30-glass-refraction-ready': glassReady }">
      <RefractiveGlass @ready="glassReady = $event" />
    <button
      ref="trigger" type="button" class="day-30-glass-trigger"
      :aria-expanded="open" :aria-controls="`${id}-panel`" aria-label="切換 Demo，現在是 Day 30"
      @click="toggle" @keydown.down.prevent="focusFirst"
    >
      <svg class="day-30-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.7" /><rect x="14" y="4" width="6" height="6" rx="1.7" />
        <rect x="4" y="14" width="6" height="6" rx="1.7" /><rect x="14" y="14" width="6" height="6" rx="1.7" />
      </svg>
      <strong>Day 30</strong>
      <svg class="day-30-menu-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    
      <nav :inert="!open" :aria-hidden="!open" :id="`${id}-panel`" ref="panel" class="day-30-glass-panel" aria-label="每日 Demo">

        <div class="day-30-menu-list" data-lenis-prevent>
          <RouterLink v-for="demo in demos" :key="demo.path" :to="demo.path"
            class="day-30-menu-link" :class="{ 'is-current': route.path === demo.path }"
            :aria-current="route.path === demo.path ? 'page' : undefined" @click="close(true)">
            <span class="day-30-menu-day">Day {{ String(demo.meta.day).padStart(2, '0') }}</span>

            <svg v-if="route.path === demo.path" class="day-30-menu-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-label="目前頁面"><path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </RouterLink>
        </div>
      </nav>
    </div>
  </div>
</template>
