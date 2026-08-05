<script setup>
import { computed, nextTick, ref } from 'vue'

import AnimationCallbackPanel from './AnimationCallbackPanel.vue'
import MovingBox from './MovingBox.vue'

const cleanBoxMounted = ref(false)
const leakyBoxMounted = ref(false)
const orphanFrameCount = ref(0)
const leakedCallbackCount = ref(0)
const isMounted = computed(() => cleanBoxMounted.value || leakyBoxMounted.value)
const allBoxesMounted = computed(() => cleanBoxMounted.value && leakyBoxMounted.value)
const callbackCount = computed(
  () =>
    Number(cleanBoxMounted.value) + Number(leakyBoxMounted.value) + leakedCallbackCount.value,
)

function addTrace(message) {
  console.log(message)
}

function mountComponent() {
  cleanBoxMounted.value = true
  leakyBoxMounted.value = true
  addTrace('兩個方塊已掛載')
}

async function removeCleanBox() {
  await nextTick()
  cleanBoxMounted.value = false
  addTrace('上排方塊已移除，動畫已停止')
}

async function removeLeakyBox() {
  leakedCallbackCount.value++
  await nextTick()
  leakyBoxMounted.value = false
  addTrace('下排方塊已移除，但動畫還在執行')
}

async function removeBoxes() {
  const removals = []

  if (cleanBoxMounted.value) removals.push(removeCleanBox())
  if (leakyBoxMounted.value) removals.push(removeLeakyBox())

  await Promise.all(removals)
}

function reportOrphanFrame() {
  orphanFrameCount.value++
}

function resetDemo() {
  window.location.reload()
}
</script>

<template>
  <main class="day-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>01 / 30</span>
    </nav>

    <section class="experiment" aria-labelledby="experiment-title">
      <header class="section-heading">
        <div>
          <p>unmounted</p>
          <h2 id="experiment-title">元件卸載後動畫仍在執行</h2>
        </div>
        <div class="status" :data-active="isMounted">
          <span></span>
          {{ isMounted ? 'mounted' : 'unmounted' }}
        </div>
      </header>

      <div class="experiment-grid">
        <div class="stage">
          <div class="shared-track" aria-label="動畫清理比較區">
            <p class="row-label clean-label">有取消動畫</p>
            <MovingBox
              v-if="cleanBoxMounted"
              cleanup-enabled
              mode="clean"
              :report-orphan-frame="reportOrphanFrame"
              @trace="addTrace"
            />
            <p v-else class="row-empty clean-empty">∅ DOM 尚未掛載</p>

            <p class="row-label leaky-label">沒有取消動畫</p>
            <MovingBox
              v-if="leakyBoxMounted"
              :cleanup-enabled="false"
              mode="leaky"
              :report-orphan-frame="reportOrphanFrame"
              @trace="addTrace"
            />
            <p v-else class="row-empty leaky-empty">∅ DOM 尚未掛載</p>
          </div>
        </div>
        <AnimationCallbackPanel
          :callback-count="callbackCount"
          :is-mounted="isMounted"
          :orphan-frame-count="orphanFrameCount"
        />
      </div>

      <div class="controls">
        <button
          class="primary-action"
          type="button"
          :disabled="allBoxesMounted"
          @click="mountComponent"
        >
          掛載方塊
        </button>
        <button class="keep-running-action" type="button" :disabled="!isMounted" @click="removeBoxes">
          移除方塊
        </button>
        <button class="secondary-action" type="button" @click="resetDemo">重設 Demo</button>
      </div>
    </section>

  </main>
</template>

<style scoped>
.day-page {
  --ink: #17212b;
  --muted: #52616f;
  --paper: #c2c7cb;
  --surface: #edf2f5;
  --signal: #c63d2f;
  width: min(1180px, calc(100% - 40px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px 0 64px;
  background-color: var(--paper);
}

.lab-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--ink);
  font: 650 0.72rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.brand {
  color: inherit;
  text-decoration: none;
}

.section-heading p {
  margin: 0 0 18px;
  color: var(--signal);
  font: 700 0.72rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

code {
  padding: 0.12em 0.35em;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.48);
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 0.86em;
}

.experiment {
  margin-top: clamp(40px, 7vw, 80px);
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid var(--ink);
  background: rgba(237, 242, 245, 0.64);
  box-shadow: 12px 12px 0 var(--ink);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.section-heading p {
  margin-bottom: 9px;
}

.section-heading h2 {
  margin: 0;
  font: 700 clamp(1.5rem, 3vw, 2.5rem) / 1 Georgia, "Times New Roman", serif;
  letter-spacing: -0.045em;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font: 650 0.68rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7b8791;
}

.status[data-active="true"] span {
  background: var(--signal);
  box-shadow: 0 0 0 4px rgba(198, 61, 47, 0.15);
}

.stage {
  min-width: 0;
}

.shared-track {
  position: relative;
  min-height: 304px;
  overflow: hidden;
  border: 1px solid var(--ink);
  background:
    linear-gradient(rgba(23, 33, 43, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 33, 43, 0.08) 1px, transparent 1px),
    var(--surface);
  background-size: 24px 24px;
}

.row-label {
  position: absolute;
  left: 12px;
  z-index: 1;
  margin: 0;
  color: var(--muted);
  font: 700 0.7rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.08em;
}

.clean-label {
  top: 14px;
}

.leaky-label {
  top: 152px;
}

.row-empty {
  position: absolute;
  left: 50%;
  margin: 0;
  transform: translate(-50%, -50%);
  color: var(--muted);
  font: 650 0.7rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.08em;
}

.clean-empty {
  top: 82px;
}

.leaky-empty {
  top: 220px;
}

.shared-track::after {
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: var(--muted);
  font: 600 0.68rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.08em;
  content: "VIEWPORT / X";
}

.experiment-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
  gap: 16px;
}

.empty-stage {
  display: grid;
  place-content: center;
  border: 1px dashed #8997a2;
  color: var(--muted);
  text-align: center;
  background: rgba(255, 255, 255, 0.24);
}

.empty-stage span {
  color: var(--signal);
  font: 400 2rem/1 Georgia, serif;
}

.empty-stage p {
  margin: 10px 0 0;
  font: 650 0.7rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.08em;
}

.controls {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.controls button {
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid var(--ink);
  cursor: pointer;
  font-weight: 750;
}

.controls button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.primary-action {
  color: #fff;
  background: var(--signal);
}

.primary-action:hover {
  background: #a92f24;
}

.secondary-action {
  color: var(--ink);
  background: transparent;
}

.secondary-action:hover {
  background: rgba(23, 33, 43, 0.08);
}

.keep-running-action {
  color: var(--signal);
  background: transparent;
}

.keep-running-action:hover {
  color: #fff;
  background: var(--signal);
}

@media (max-width: 760px) {
  .day-page {
    width: min(100% - 24px, 620px);
    padding-top: 16px;
  }

  .experiment {
    padding: 20px;
    box-shadow: 7px 7px 0 var(--ink);
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .controls {
    align-items: stretch;
    flex-direction: column;
  }

  .experiment-grid {
    grid-template-columns: 1fr;
  }

}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }
}
</style>
