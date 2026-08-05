<script setup>
import { computed, nextTick, ref } from 'vue'

import AnimationCallbackPanel from './AnimationCallbackPanel.vue'
import DomTimingDemo from './DomTimingDemo.vue'
import MovingBox from './MovingBox.vue'
import UpdatedTimingDemo from './UpdatedTimingDemo.vue'

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

    <section class="experiment day-01-dom-section" aria-labelledby="dom-section-title">
      <header class="section-heading">
        <div>
          <p>animation before onMounted</p>
          <h2 id="dom-section-title"><span class="heading-english">DOM</span> 掛載前無法操作元素</h2>
        </div>
      </header>

      <p class="day-01-section-description">
        最常見的問題是在 <code>setup()</code> 或 <code>created()</code> 就操作 DOM。
      </p>

      <DomTimingDemo />
    </section>

    <section class="experiment" aria-labelledby="experiment-title">
      <header class="section-heading">
        <div>
          <p>Animation not cleaned up</p>
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

    <section class="experiment" aria-labelledby="updated-section-title">
      <header class="section-heading">
        <div>
          <p>onMounted vs onUpdated</p>
          <h2 id="updated-section-title">更新後重新取得動畫終點</h2>
        </div>
      </header>

      <UpdatedTimingDemo />
    </section>

  </main>
</template>
