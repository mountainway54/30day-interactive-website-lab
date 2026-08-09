<script setup>
import { gsap } from "gsap";
import { onMounted, onUnmounted, ref } from "vue";

const stage = ref(null);
const status = ref("READY");
let timeline = null;

function getBoxes() {
  return stage.value ? [...stage.value.querySelectorAll(".day-03-label-box")] : [];
}

function resetDemo() {
  timeline?.kill();
  timeline = null;
  const boxes = getBoxes();
  gsap.killTweensOf(boxes);
  gsap.set(boxes, { x: 0, rotation: 0, backgroundColor: "#52616f" });
  status.value = "READY";
}

function playDemo() {
  resetDemo();
  const boxes = getBoxes();
  if (!stage.value || boxes.length !== 3) return;

  const maxX = Math.max(
    stage.value.clientWidth - boxes[0].offsetLeft - boxes[0].offsetWidth - 28,
    0,
  );
  timeline = gsap.timeline({
    onComplete: () => {
      status.value = "COMPLETE";
    },
  });

  timeline
    .addLabel("start", 0)
    .to(boxes[0], { x: maxX, duration: 1.4, ease: "power2.inOut" }, "start")
    .addLabel("turn", "start+=0.6")
    .to(boxes[1], {
      x: maxX,
      rotation: 180,
      duration: 1.4,
      ease: "power2.inOut",
    }, "turn")
    .to(boxes[2], {
      x: maxX,
      backgroundColor: "#c63d2f",
      duration: 1.4,
      ease: "power2.inOut",
    }, "turn+=0.4");

  status.value = "PLAYING";
}

function togglePause() {
  if (!timeline || !["PLAYING", "PAUSED"].includes(status.value)) return;
  if (status.value === "PLAYING") {
    timeline.pause();
    status.value = "PAUSED";
  } else {
    timeline.resume();
    status.value = "PLAYING";
  }
}

onMounted(resetDemo);
onUnmounted(resetDemo);
</script>

<template>
  <section class="experiment day-03-followup" aria-labelledby="day-03-label-title">
    <header class="section-heading">
      <div>
        <p>GSAP TIMELINE / LABEL</p>
        <h2 id="day-03-label-title">用 <span class="heading-english">Label</span> 命名時間位置</h2>
      </div>
      <div class="status" :data-active="status === 'PLAYING'">
        <span></span>{{ status }}
      </div>
    </header>

    <div class="day-03-concept-grid">
      <div ref="stage" class="day-03-label-stage" aria-label="Label Timeline 動畫預覽區">
        <div v-for="label in ['START', 'TURN', 'TURN + 0.4']" :key="label" class="day-03-label-lane">
          <small>{{ label }}</small>
          <i class="day-03-label-box" aria-hidden="true"></i>
        </div>
      </div>

      <div class="day-03-code-panel">
        <header>LABEL TIMELINE</header>
        <div class="day-03-concept-code">
          <code>
            <span>tl.addLabel("start", 0)</span>
            <span>.to(".a", MOVE, "start")</span>
            <span>.addLabel("turn", "start+=0.6")</span>
            <span>.to(".b", ROTATE, "turn")</span>
            <span>.to(".c", COLOR, "turn+=0.4")</span>
          </code>
        </div>
      </div>
    </div>

    <div class="controls day-03-controls">
      <button class="primary-action" type="button" @click="playDemo">播放動畫</button>
      <button
        class="secondary-action day-03-icon-action"
        type="button"
        :disabled="!['PLAYING', 'PAUSED'].includes(status)"
        :aria-label="status === 'PLAYING' ? '暫停' : '繼續'"
        :title="status === 'PLAYING' ? '暫停' : '繼續'"
        @click="togglePause"
      >
        <svg v-if="status === 'PLAYING'" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
        </svg>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24">
          <path d="M8 5.5 18 12 8 18.5Z" />
        </svg>
      </button>
      <button class="secondary-action" type="button" @click="resetDemo">重設</button>
    </div>
  </section>
</template>
