<script setup>
import { gsap } from "gsap";
import { computed, onMounted, onUnmounted, ref } from "vue";

const stage = ref(null);
const stagger = ref(0.18);
const status = ref("READY");
let timeline = null;
let playbackDirection = "forward";

const isValid = computed(() => {
  const value = Number(stagger.value);
  return Number.isFinite(value) && value >= 0 && value <= 1;
});

function getBoxes() {
  return stage.value
    ? [...stage.value.querySelectorAll(".day-03-stagger-box")]
    : [];
}

function resetDemo() {
  timeline?.kill();
  timeline = null;
  const boxes = getBoxes();
  gsap.killTweensOf(boxes);
  gsap.set(boxes, { y: 0, rotation: 0, scale: 1, backgroundColor: "#52616f" });
  status.value = isValid.value ? "READY" : "INVALID";
}

function handleInput() {
  resetDemo();
}

function playDemo() {
  resetDemo();
  if (!isValid.value) return;
  const boxes = getBoxes();

  timeline = gsap.timeline({
    onComplete: () => {
      status.value = "COMPLETE";
    },
    onReverseComplete: () => {
      status.value = "READY";
    },
  });
  timeline.to(boxes, {
    y: -54,
    rotation: 90,
    scale: 1.15,
    backgroundColor: "#c63d2f",
    duration: 1.2,
    ease: "power2.inOut",
    stagger: Number(stagger.value),
  });
  playbackDirection = "forward";
  status.value = "PLAYING";
}

function reverseDemo() {
  if (!timeline || status.value !== "COMPLETE") return;
  playbackDirection = "reverse";
  status.value = "REVERSING";
  timeline.reverse();
}

function togglePause() {
  const isMoving = ["PLAYING", "REVERSING"].includes(status.value);
  if (!timeline || (!isMoving && status.value !== "PAUSED")) return;
  if (isMoving) {
    timeline.pause();
    status.value = "PAUSED";
  } else {
    timeline.resume();
    status.value = playbackDirection === "reverse" ? "REVERSING" : "PLAYING";
  }
}

onMounted(resetDemo);
onUnmounted(resetDemo);
</script>

<template>
  <section
    class="experiment day-03-followup"
    aria-labelledby="day-03-stagger-title"
  >
    <header class="section-heading">
      <div>
        <p>GSAP TIMELINE / STAGGER</p>
        <h2 id="day-03-stagger-title">
          用 <span class="heading-english"> Stagger </span> 錯開批次動畫與<span
            class="heading-english"
          >
            Reverse </span
          >反向播放
        </h2>
      </div>
      <div
        class="status"
        :data-active="['PLAYING', 'REVERSING'].includes(status)"
      >
        <span></span>{{ status }}
      </div>
    </header>

    <div class="day-03-concept-grid">
      <div
        ref="stage"
        class="day-03-stagger-stage"
        aria-label="Stagger 動畫預覽區"
      >
        <i
          v-for="number in 5"
          :key="number"
          class="day-03-stagger-box"
          aria-hidden="true"
        ></i>
      </div>

      <div class="day-03-code-panel">
        <header>EDIT STAGGER</header>
        <div class="day-03-concept-code day-03-stagger-code">
          <code>
            <span>tl.to(".box", {{ "{" }}</span>
            <span>&nbsp;&nbsp;y: -54,</span>
            <span>&nbsp;&nbsp;rotation: 90,</span>
            <label>
              <span>&nbsp;&nbsp;stagger:</span>
              <input
                v-model="stagger"
                aria-label="Stagger 間隔秒數"
                :aria-invalid="!isValid"
                inputmode="decimal"
                type="number"
                min="0"
                max="1"
                step="0.05"
                @input="handleInput"
              />
            </label>
            <span>{{ "}" }})</span>
            <span class="day-03-code-comment">//反向播放</span>
            <span>function reverseAnimation() {{ "{" }}</span>
            <span>&nbsp;&nbsp;tl.reverse()</span>
            <span>{{ "}" }}</span>
            <small v-if="!isValid">請輸入 0 至 1 秒</small>
          </code>
        </div>
      </div>
    </div>

    <div class="controls day-03-controls">
      <button
        class="primary-action"
        type="button"
        :disabled="!isValid"
        @click="playDemo"
      >
        播放動畫
      </button>
      <button
        class="secondary-action"
        type="button"
        :disabled="status !== 'COMPLETE'"
        @click="reverseDemo"
      >
        反向播放
      </button>
      <button
        class="secondary-action day-03-icon-action"
        type="button"
        :disabled="!['PLAYING', 'REVERSING', 'PAUSED'].includes(status)"
        :aria-label="
          ['PLAYING', 'REVERSING'].includes(status) ? '暫停' : '繼續'
        "
        :title="['PLAYING', 'REVERSING'].includes(status) ? '暫停' : '繼續'"
        @click="togglePause"
      >
        <svg
          v-if="['PLAYING', 'REVERSING'].includes(status)"
          aria-hidden="true"
          viewBox="0 0 24 24"
        >
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
        </svg>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24">
          <path d="M8 5.5 18 12 8 18.5Z" />
        </svg>
      </button>
      <button class="secondary-action" type="button" @click="resetDemo">
        重設
      </button>
    </div>
  </section>
</template>
