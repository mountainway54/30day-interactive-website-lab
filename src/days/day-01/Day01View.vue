<script setup>
import { computed, nextTick, ref } from "vue";

import AnimationCallbackPanel from "./AnimationCallbackPanel.vue";
import DomTimingDemo from "./DomTimingDemo.vue";
import MovingBox from "./MovingBox.vue";
import UpdatedTimingDemo from "./UpdatedTimingDemo.vue";

const cleanMounted = ref(false);
const leakyMounted = ref(false);
const orphanFrames = ref(0);
const leakedCallbacks = ref(0);
const anyMounted = computed(() => cleanMounted.value || leakyMounted.value);
const bothMounted = computed(() => cleanMounted.value && leakyMounted.value);
const callbackCount = computed(
  () =>
    Number(cleanMounted.value) +
    Number(leakyMounted.value) +
    leakedCallbacks.value,
);

function logTrace(message) {
  console.log(message);
}

function mountBoxes() {
  cleanMounted.value = true;
  leakyMounted.value = true;
  logTrace("兩個方塊已掛載");
}

async function removeCleanBox() {
  await nextTick();
  cleanMounted.value = false;
  logTrace("上排方塊已移除，動畫已停止");
}

async function removeLeakyBox() {
  leakedCallbacks.value++;
  await nextTick();
  leakyMounted.value = false;
  logTrace("下排方塊已移除，但動畫還在執行");
}

async function removeBoxes() {
  const removals = [];

  if (cleanMounted.value) removals.push(removeCleanBox());
  if (leakyMounted.value) removals.push(removeLeakyBox());

  await Promise.all(removals);
}

function countOrphanFrame() {
  orphanFrames.value++;
}

function resetDemo() {
  window.location.reload();
}
</script>

<template>
  <main class="day-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>01 / 30</span>
    </nav>

    <section
      class="experiment day-01-dom-section"
      aria-labelledby="dom-section-title"
    >
      <header class="section-heading">
        <div>
          <p>Demo 1：</p>
          <h2 id="dom-section-title">
            是<span class="heading-english">Callback</span>來得太早
          </h2>
        </div>
      </header>

      <p class="day-01-section-description">
        最常見的問題，是在 DOM 尚未掛載時，就直接呼叫需要操作元素的動畫函式。
      </p>

      <DomTimingDemo />
    </section>

    <section class="experiment" aria-labelledby="experiment-title">
      <header class="section-heading">
        <div>
          <p>Demo 2</p>
          <h2 id="experiment-title">元件離去，動畫仍在默默執行</h2>
        </div>
        <div class="status" :data-active="anyMounted">
          <span></span>
          {{ anyMounted ? "mounted" : "unmounted" }}
        </div>
      </header>

      <div class="experiment-grid">
        <div class="stage">
          <div class="shared-track" aria-label="動畫清理比較區">
            <p class="row-label clean-label">有取消動畫</p>
            <MovingBox
              v-if="cleanMounted"
              cleanup-enabled
              mode="clean"
              :report-orphan-frame="countOrphanFrame"
              @trace="logTrace"
            />
            <p v-else class="row-empty clean-empty">∅ DOM 尚未掛載</p>

            <p class="row-label leaky-label">沒有取消動畫</p>
            <MovingBox
              v-if="leakyMounted"
              :cleanup-enabled="false"
              mode="leaky"
              :report-orphan-frame="countOrphanFrame"
              @trace="logTrace"
            />
            <p v-else class="row-empty leaky-empty">∅ DOM 尚未掛載</p>
          </div>
        </div>
        <AnimationCallbackPanel
          :callback-count="callbackCount"
          :is-mounted="anyMounted"
          :orphan-frame-count="orphanFrames"
        />
      </div>

      <div class="controls">
        <button
          class="primary-action"
          type="button"
          :disabled="bothMounted"
          @click="mountBoxes"
        >
          掛載方塊
        </button>
        <button
          class="keep-running-action"
          type="button"
          :disabled="!anyMounted"
          @click="removeBoxes"
        >
          移除方塊
        </button>
        <button class="secondary-action" type="button" @click="resetDemo">
          重設 Demo
        </button>
      </div>
    </section>

    <section class="experiment" aria-labelledby="updated-section-title">
      <header class="section-heading">
        <div>
          <p>Demo 3</p>
          <h2 id="updated-section-title">終點變了，你卻還停留在原地</h2>
        </div>
      </header>

      <UpdatedTimingDemo />
    </section>
  </main>
</template>
