<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const open = ref(false)
const picker = ref(null)
const trigger = ref(null)
const panel = ref(null)
const panelId = useId()
const dayLabel = computed(() => String(route.meta.day ?? 1).padStart(2, '0'))
const pages = router.getRoutes()
  .filter(page => Number.isInteger(page.meta.day) && !page.redirect)
  .sort((a, b) => a.meta.day - b.meta.day)

function close() { open.value = false }

async function openFromKeyboard() {
  open.value = true
  await nextTick()
  panel.value?.querySelector('a')?.focus()
}

function escape(event) {
  if (!open.value) return
  event.preventDefault()
  event.stopPropagation()
  close()
  trigger.value?.focus()
}

function outsidePointer(event) {
  if (!picker.value?.contains(event.target)) close()
}

function focusOut(event) {
  if (!picker.value?.contains(event.relatedTarget)) close()
}

watch(() => route.fullPath, close)
onMounted(() => document.addEventListener('pointerdown', outsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outsidePointer))
</script>

<template>
  <nav class="lab-nav" aria-label="系列導覽">
    <RouterLink class="brand" to="/day-01">Creative Frontend Lab</RouterLink>
    <div ref="picker" class="lab-day-picker" @keydown.esc="escape" @focusout="focusOut">
      <button ref="trigger" class="lab-day-trigger" type="button"
        :aria-expanded="open" :aria-controls="panelId"
        :aria-label="`目前 Day ${dayLabel}，選擇 Demo 頁面`"
        @click="open = !open" @keydown.down.prevent="openFromKeyboard">
        <span>{{ dayLabel }} <span class="lab-day-total">/ 30</span></span>
        <svg class="lab-day-chevron" :class="{ 'lab-day-chevron-open': open }" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <div v-if="open" :id="panelId" ref="panel" class="lab-day-panel">
        <ul class="lab-day-list" aria-label="Demo 頁面清單">
          <li v-for="page in pages" :key="page.path">
            <RouterLink :to="page.path" class="lab-day-link"
              :aria-label="`Day ${String(page.meta.day).padStart(2, '0')}：${page.meta.title}`"
              :aria-current="route.path === page.path ? 'page' : undefined"
              @click="close">
              <span class="lab-day-number">{{ String(page.meta.day).padStart(2, '0') }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
