<script setup>
import { computed, reactive, ref } from "vue";

import "./day-02.css";

import MotionBox from "./MotionBox.vue";
import MotionControlPanel from "./MotionControlPanel.vue";

const defaults = Object.freeze({
  x: 420,
  rotation: 360,
  duration: 1.2,
  delay: 0,
  ease: "power3.out",
  bezierX1: 0.22,
  bezierY1: 1,
  bezierX2: 0.36,
  bezierY2: 1,
});

const settings = reactive({ ...defaults });
const replayKey = ref(0);
const bezierPoints = computed(() =>
  [
    settings.bezierX1,
    settings.bezierY1,
    settings.bezierX2,
    settings.bezierY2,
  ].join(", "),
);

function replayAnimation() {
  replayKey.value++;
}

function resetDemo() {
  Object.assign(settings, defaults);
  replayKey.value++;
}
</script>

<template>
  <main class="day-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>02 / 30</span>
    </nav>

    <section class="experiment" aria-labelledby="day-02-title">
      <header class="section-heading">
        <div>
          <p>GSAP(1) Tween</p>
          <h2 id="day-02-title">
            基本參數：<span class="heading-english"
              >xyz、rotation、duration、delay、ease</span
            >
          </h2>
        </div>
        <div class="status" data-active="true">
          <span></span>
          ready
        </div>
      </header>

      <div class="day-02-grid">
        <div class="day-02-stage" aria-label="動畫預覽區">
          <p class="day-02-axis-label">0</p>
          <p class="day-02-axis-label day-02-axis-end">X</p>
          <MotionBox :settings="settings" :replay-key="replayKey" />
        </div>

        <MotionControlPanel v-model="settings" />
      </div>

      <pre
        class="day-02-code"
        aria-label="目前的 GSAP 程式碼"
      ><code><template v-if="settings.ease === 'customBezier'"><span>CustomEase.create('customBezier', '{{ bezierPoints }}')</span>

</template><span>tween = gsap.to(box.value, {</span>
  x: <strong>{{ settings.x }}</strong>,
  rotation: <strong>{{ settings.rotation }}</strong>,
  duration: <strong>{{ settings.duration }}</strong>,
  delay: <strong>{{ settings.delay }}</strong>,
  ease: <strong>'{{ settings.ease }}'</strong>,
})</code></pre>

      <div class="controls day-02-controls">
        <button
          class="day-02-replay-action"
          type="button"
          @click="replayAnimation"
        >
          重播動畫
        </button>
        <button class="secondary-action" type="button" @click="resetDemo">
          重設 Demo
        </button>
      </div>
    </section>
  </main>
</template>
