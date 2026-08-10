<script setup>
import { gsap } from "gsap";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";

import "./day-03.css";
import LabelTimelineDemo from "./LabelTimelineDemo.vue";

const DURATION = 2;
const BASE_TWEEN = Object.freeze({ duration: DURATION, ease: "power2.inOut" });

const MOVE = Object.freeze({
  label: "MOVE",
  createVars: ({ maxX }) => ({ ...BASE_TWEEN, x: maxX }),
});

const ROTATE = Object.freeze({
  label: "ROTATE",
  createVars: () => ({ ...BASE_TWEEN, rotation: 360 }),
});

const FLIP = Object.freeze({
  label: "FLIP",
  createVars: () => ({ ...BASE_TWEEN, rotationY: 180 }),
});

const COLOR = Object.freeze({
  label: "COLOR",
  createVars: ({ signalColor }) => ({
    ...BASE_TWEEN,
    "--day-03-front": signalColor,
    "--day-03-back": signalColor,
  }),
});

const SCALE = Object.freeze({
  label: "SCALE",
  createVars: () => ({ ...BASE_TWEEN, scale: 1.5 }),
});

const ANIMATIONS = Object.freeze([MOVE, ROTATE, FLIP, COLOR, SCALE]);
const defaults = Object.freeze(["1.5", "<-1", ">0.5", "+=0.2"]);
const labels = ANIMATIONS.map((animation) => animation.label);

const box = ref(null);
const stage = ref(null);
const positionInputs = reactive([...defaults]);
const errors = reactive(["", "", "", ""]);
const status = ref("READY");
const currentTime = ref(0);
const totalTime = ref(0);
const tracks = ref([]);
const lastValidTracks = ref([]);
const hasReducedMotion = ref(false);

let timeline = null;
let reducedMotionQuery = null;

const isValid = computed(() => errors.every((error) => !error));
const isPlaying = computed(() => status.value === "PLAYING");
const canPause = computed(() => ["PLAYING", "PAUSED"].includes(status.value));
const playheadStyle = computed(() => ({
  "--day-03-progress": totalTime.value
    ? `${Math.min((currentTime.value / totalTime.value) * 100, 100)}%`
    : "0%",
}));

function validatePosition(value) {
  const trimmed = value.trim();
  const absoluteSeconds = trimmed.match(/^\d+(?:\.\d{1,2})?$/);

  if (absoluteSeconds) {
    const seconds = Number(trimmed);
    return seconds <= 10 ? "" : "絕對時間必須介於 0 至 10 秒";
  }

  const timelineEndOffset = trimmed.match(/^([+-])=(\d+(?:\.\d{1,2})?)$/);

  if (timelineEndOffset) {
    const offset = Number(timelineEndOffset[2]);
    return offset <= 2 ? "" : "偏移必須介於 -2 至 2 秒";
  }

  const match = trimmed.match(/^([<>])(?:(?:([+-])=)?(-?\d+(?:\.\d{1,2})?))?$/);

  if (!match) return "請輸入 0–10 秒，或使用 +=、-=、<、> 相對位置";

  const sign = match[2];
  const rawNumber = match[3];
  if (sign && rawNumber?.startsWith("-")) return "請勿同時使用運算符與負號";

  const offset =
    rawNumber === undefined
      ? 0
      : Number(`${sign === "-" ? "-" : ""}${rawNumber}`);

  if (!Number.isFinite(offset) || offset < -2 || offset > 2) {
    return "偏移必須介於 -2 至 2 秒";
  }

  return "";
}

function resetBox() {
  if (!box.value) return;
  gsap.set(box.value, {
    x: 0,
    rotation: 0,
    rotationY: 0,
    scale: 1,
    "--day-03-front": "#52616f",
    "--day-03-back": "#ffffff",
  });
}

function killTimeline() {
  timeline?.kill();
  timeline = null;
  if (box.value) gsap.killTweensOf(box.value);
}

function createTimeline() {
  if (!box.value || !stage.value || !isValid.value) return null;

  const maxX = Math.max(
    stage.value.clientWidth - box.value.offsetWidth - 64,
    0,
  );
  const signalColor =
    getComputedStyle(box.value).getPropertyValue("--signal").trim() ||
    "#c63d2f";
  const tl = gsap.timeline({ paused: true });
  const tweenRefs = [];

  ANIMATIONS.forEach((animation, index) => {
    const vars = animation.createVars({ maxX, signalColor });
    const position = index === 0 ? undefined : positionInputs[index - 1].trim();

    if (position === undefined) tl.to(box.value, vars);
    else tl.to(box.value, vars, position);

    tweenRefs.push(tl.recent());
  });

  const children = tweenRefs;
  const earliestStart = Math.min(...children.map((child) => child.startTime()));
  const latestEnd = Math.max(...children.map((child) => child.endTime()));
  const span = latestEnd - earliestStart;
  const nextTracks = children.map((child, index) => ({
    label: labels[index],
    left: ((child.startTime() - earliestStart) / span) * 100,
    width: (child.duration() / span) * 100,
  }));

  tracks.value = nextTracks;
  lastValidTracks.value = nextTracks;
  totalTime.value = tl.duration();
  tl.eventCallback("onUpdate", () => {
    currentTime.value = tl.time();
  });
  tl.eventCallback("onComplete", () => {
    currentTime.value = totalTime.value;
    status.value = "COMPLETE";
  });

  return tl;
}

async function rebuildTimeline({ resetStatus = true } = {}) {
  killTimeline();
  await nextTick();
  resetBox();
  currentTime.value = 0;

  if (!isValid.value) {
    tracks.value = lastValidTracks.value;
    status.value = "INVALID";
    return;
  }

  timeline = createTimeline();
  if (resetStatus) status.value = "READY";
}

function handleInput(index) {
  errors[index] = validatePosition(positionInputs[index]);
  rebuildTimeline();
}

async function playTimeline() {
  await rebuildTimeline({ resetStatus: false });
  if (!timeline || !isValid.value) return;
  status.value = "PLAYING";
  timeline.play(0);
}

function togglePause() {
  if (!timeline || !canPause.value) return;
  if (isPlaying.value) {
    timeline.pause();
    status.value = "PAUSED";
  } else {
    timeline.resume();
    status.value = "PLAYING";
  }
}

function resetDemo() {
  positionInputs.splice(0, positionInputs.length, ...defaults);
  errors.splice(0, errors.length, "", "", "", "");
  rebuildTimeline();
}

function updateReducedMotion(event) {
  hasReducedMotion.value = event.matches;
}

function formatTime(value) {
  return Number(value || 0)
    .toFixed(2)
    .padStart(5, "0");
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  hasReducedMotion.value = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", updateReducedMotion);
  rebuildTimeline();
});

onUnmounted(() => {
  killTimeline();
  reducedMotionQuery?.removeEventListener("change", updateReducedMotion);
});
</script>

<template>
  <main class="day-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>03 / 30</span>
    </nav>

    <section class="experiment" aria-labelledby="day-03-title">
      <header class="section-heading">
        <div>
          <p>GSAP TIMELINE</p>
          <h2 id="day-03-title">
            用 <span class="heading-english">Position Parameter</span> 編排動畫
          </h2>
        </div>
        <div class="status" :data-active="isPlaying">
          <span></span>
          {{ status }}
        </div>
      </header>

      <p v-if="hasReducedMotion" class="day-03-motion-warning" role="status">
        本頁包含位移、旋轉、翻轉與縮放動畫。為獲得完整動畫體驗，請取消「減少動態效果」設定。
      </p>

      <div class="day-03-grid">
        <div class="day-03-visual-column">
          <div
            ref="stage"
            class="day-03-stage"
            aria-label="Timeline 動畫預覽區"
          >
            <div ref="box" class="day-03-box" aria-label="進行五種動畫的方塊">
              <span
                class="day-03-face day-03-face-front"
                aria-hidden="true"
              ></span>
              <span
                class="day-03-face day-03-face-back"
                aria-hidden="true"
              ></span>
            </div>
          </div>

          <div
            class="day-03-timeline"
            :data-invalid="!isValid"
            aria-label="Timeline 動畫排程"
          >
            <div class="day-03-ruler" aria-hidden="true">
              <span>0</span>
              <span>{{ formatTime(totalTime) }}s</span>
            </div>
            <div class="day-03-track-area">
              <div
                class="day-03-playhead"
                :style="playheadStyle"
                aria-hidden="true"
              ></div>
              <div
                v-for="track in tracks"
                :key="track.label"
                class="day-03-track-row"
              >
                <span>{{ track.label }}</span>
                <div class="day-03-track-line">
                  <i
                    :style="{
                      left: `${track.left}%`,
                      width: `${track.width}%`,
                    }"
                  ></i>
                </div>
              </div>
            </div>
            <p v-if="!isValid" class="day-03-chart-message">修正參數後更新</p>
          </div>
        </div>

        <aside class="day-03-side-column">
          <div class="day-03-code-panel">
            <header>EDIT POSITION</header>
            <div class="day-03-code-scroll">
              <code>
                <span
                  >const MOVE = {{ "{" }} x: distance, duration: 2
                  {{ "}" }}</span
                >
                <span
                  >const ROTATE = {{ "{" }} rotation: 360, duration: 2
                  {{ "}" }}</span
                >
                <span
                  >const FLIP = {{ "{" }} rotationY: 180, duration: 2
                  {{ "}" }}</span
                >
                <span
                  >const COLOR = {{ "{" }} colors: #c63d2f, duration: 2
                  {{ "}" }}</span
                >
                <span
                  >const SCALE = {{ "{" }} scale: 1.5, duration: 2
                  {{ "}" }}</span
                >
                <span>tl.to(".box", MOVE)</span>
                <label v-for="(value, index) in positionInputs" :key="index">
                  <span>.to(".box", {{ labels[index + 1] }},</span>
                  <input
                    v-model="positionInputs[index]"
                    :aria-describedby="
                      errors[index] ? `day-03-error-${index}` : undefined
                    "
                    :aria-invalid="Boolean(errors[index])"
                    :aria-label="`${labels[index + 1]} 的 Position Parameter`"
                    autocomplete="off"
                    spellcheck="false"
                    type="text"
                    @input="handleInput(index)"
                  />
                  <span>)</span>
                  <small v-if="errors[index]" :id="`day-03-error-${index}`">{{
                    errors[index]
                  }}</small>
                </label>
                <span class="day-03-code-comment"
                  >// 純數字：timeline 起點後的絕對秒數，例如 1.5</span
                >
                <span class="day-03-code-comment"
                  >// "&lt;"：對齊前一段動畫的開始時間</span
                >
                <span class="day-03-code-comment"
                  >// "&gt;"：對齊前一段動畫的結束時間</span
                >
                <span class="day-03-code-comment"
                  >// "+="／"-="：從 timeline 結尾向後／向前偏移</span
                >
              </code>
            </div>
          </div>
        </aside>
      </div>

      <div class="controls day-03-controls">
        <button
          class="primary-action"
          type="button"
          :disabled="!isValid"
          @click="playTimeline"
        >
          播放動畫
        </button>
        <button
          class="secondary-action day-03-icon-action"
          type="button"
          :disabled="!canPause"
          :aria-label="isPlaying ? '暫停' : '繼續'"
          :title="isPlaying ? '暫停' : '繼續'"
          @click="togglePause"
        >
          <svg v-if="isPlaying" aria-hidden="true" viewBox="0 0 24 24">
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

    <LabelTimelineDemo />
  </main>
</template>
