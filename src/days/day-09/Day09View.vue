<script setup>
import LabNav from '@/components/LabNav.vue'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { gsap } from "gsap";
import "./day-09.css";

const canvasRef = ref(null);
const canvasShellRef = ref(null);
const isPaused = ref(false);
const isReset = ref(false);
const reduceMotion = ref(false);
const progress = ref(0);

const motion = reactive({
  eyeX: 0,
  leftEarRotation: 0,
  rightEarRotation: 0,
});

const motionStart = {
  eyeX: -6,
  leftEarRotation: -3,
  rightEarRotation: 3,
};

const motionEnd = {
  eyeX: 6,
  leftEarRotation: 3,
  rightEarRotation: -3,
};

let timeline = null;
let mediaMatcher = null;
let resizeObserver = null;
let resizeFrame = null;
let canvasContext = null;

const statusLabel = computed(() => {
  if (reduceMotion.value) return "REDUCED MOTION";
  if (isReset.value) return "RESET";
  return isPaused.value ? "PAUSED" : "PLAYING";
});

const toggleLabel = computed(() => (isPaused.value ? "繼續動畫" : "暫停動畫"));
const progressLabel = computed(
  () => `${String(Math.round(progress.value * 100)).padStart(2, "0")}%`,
);

function resizeCanvas() {
  const canvas = canvasRef.value;
  const shell = canvasShellRef.value;
  if (!canvas || !shell) return null;

  const cssWidth = Math.min(Math.max(shell.clientWidth - 32, 240), 560);
  const cssHeight = cssWidth * 0.75;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * pixelRatio);
  canvas.height = Math.round(cssHeight * pixelRatio);

  canvasContext = canvas.getContext("2d");
  canvasContext.setTransform(
    (cssWidth / 400) * pixelRatio,
    0,
    0,
    (cssHeight / 300) * pixelRatio,
    0,
    0,
  );
  return canvasContext;
}

function prepareContext(ctx) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#17212b";
}

function drawHead(ctx) {
  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.ellipse(200, 160, 120, 108, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEar(ctx, points, pivot, rotation) {
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.moveTo(points[0].x - pivot.x, points[0].y - pivot.y);
  ctx.lineTo(points[1].x - pivot.x, points[1].y - pivot.y);
  ctx.lineTo(points[2].x - pivot.x, points[2].y - pivot.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFace(ctx) {
  ctx.fillStyle = "#f1dfb6";
  ctx.beginPath();
  ctx.ellipse(200, 178, 100, 78, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.moveTo(140, 94);
  ctx.lineTo(260, 94);
  ctx.lineTo(200, 134);
  ctx.closePath();
  ctx.fill();
}

function drawEyes(ctx) {
  ctx.beginPath();
  ctx.moveTo(142 + motion.eyeX, 162);
  ctx.lineTo(172 + motion.eyeX, 162);
  ctx.moveTo(228 + motion.eyeX, 162);
  ctx.lineTo(258 + motion.eyeX, 162);
  ctx.stroke();
}

function drawMouth(ctx) {
  ctx.beginPath();
  ctx.moveTo(168, 196);
  ctx.lineTo(232, 196);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(166, 196);
  ctx.lineTo(182, 196);
  ctx.lineTo(174, 186);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(218, 196);
  ctx.lineTo(234, 196);
  ctx.lineTo(226, 186);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawScene() {
  const ctx = canvasContext ?? resizeCanvas();
  if (!ctx) return;

  ctx.clearRect(0, 0, 400, 300);
  prepareContext(ctx);
  drawHead(ctx);
  drawEar(
    ctx,
    [
      { x: 96, y: 108 },
      { x: 118, y: 48 },
      { x: 154, y: 76 },
    ],
    { x: 96, y: 108 },
    motion.leftEarRotation,
  );
  drawEar(
    ctx,
    [
      { x: 246, y: 76 },
      { x: 282, y: 48 },
      { x: 304, y: 108 },
    ],
    { x: 304, y: 108 },
    motion.rightEarRotation,
  );
  drawFace(ctx);
  prepareContext(ctx);
  drawEyes(ctx);
  drawMouth(ctx);

  if (timeline) progress.value = timeline.progress();
}

function killTimeline() {
  timeline?.kill();
  timeline = null;
}

function createTimeline() {
  killTimeline();
  gsap.set(motion, motionStart);
  isPaused.value = false;
  isReset.value = false;

  timeline = gsap.timeline({
    repeat: -1,
    yoyo: true,
    onUpdate: drawScene,
  });
  timeline.to(
    motion,
    {
      ...motionEnd,
      duration: 1.8,
      ease: "sine.inOut",
    },
    0,
  );
  drawScene();
}

function togglePlayback() {
  if (reduceMotion.value) return;
  if (!timeline) {
    createTimeline();
    return;
  }

  isPaused.value = !isPaused.value;
  isReset.value = false;
  timeline.paused(isPaused.value);
}

function replayAnimation() {
  if (reduceMotion.value) return;
  createTimeline();
}

function resetAnimation() {
  killTimeline();
  gsap.set(motion, {
    eyeX: 0,
    leftEarRotation: 0,
    rightEarRotation: 0,
  });
  progress.value = 0;
  isPaused.value = true;
  isReset.value = true;
  drawScene();
}

onMounted(async () => {
  await nextTick();
  resizeCanvas();

  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
      drawScene();
    });
  });
  resizeObserver.observe(canvasShellRef.value);

  mediaMatcher = gsap.matchMedia();
  mediaMatcher.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      canAnimate: "(prefers-reduced-motion: no-preference)",
    },
    (context) => {
      reduceMotion.value = context.conditions.reduceMotion;
      if (reduceMotion.value) resetAnimation();
      else createTimeline();

      return () => killTimeline();
    },
  );
});

onBeforeUnmount(() => {
  killTimeline();
  mediaMatcher?.revert();
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <main class="day-page day-09-page">
    <LabNav />

    <section class="experiment day-09-experiment">
      <header class="section-heading">
        <div>
          <p>GSAP TIMELINE / CANVAS STATE</p>
          <h2>
            搭配 <span class="heading-english">GSAP</span> 讓
            <span class="heading-english">Canvas</span> 動起來
          </h2>
        </div>
        <div class="status" :data-active="!isPaused && !reduceMotion">
          <span aria-hidden="true"></span>
          {{ statusLabel }}
        </div>
      </header>

      <p class="day-09-description">
        GSAP 控制的是繪圖狀態(數值)，而非 Canvas 元素。 <br />
        眼睛水平游移、雙耳反向擺動，每次更新都清除並重畫完整畫面。
      </p>

      <div class="day-09-layout">
        <section class="day-09-stage" aria-labelledby="day-09-stage-title">
          <header>
            <span id="day-09-stage-title">LIVE CANVAS / 400 × 300</span>
            <strong>{{ progressLabel }}</strong>
          </header>
          <div ref="canvasShellRef" class="day-09-canvas-shell">
            <canvas
              ref="canvasRef"
              role="img"
              aria-label="眼睛左右移動、雙耳輕微擺動的 Canvas 卡比獸頭像"
            >
              你的瀏覽器不支援 Canvas。
            </canvas>
          </div>
          <footer aria-hidden="true">
            <span>FRAME 00</span>
            <div><i :style="{ '--progress': progress }"></i></div>
            <span>FRAME 100</span>
          </footer>
        </section>

        <aside class="day-09-monitor" aria-label="GSAP 動畫狀態">
          <header>
            <span>MOTION CHANNELS</span>
            <strong>03 ACTIVE</strong>
          </header>
          <dl>
            <div>
              <dt><span>EYE X</span><small>水平位移</small></dt>
              <dd>{{ motion.eyeX.toFixed(1) }} px</dd>
              <i class="day-09-meter"
                ><b
                  :style="{ transform: `translateX(${motion.eyeX * 4}px)` }"
                ></b
              ></i>
            </div>
            <div>
              <dt><span>EAR L</span><small>左耳角度</small></dt>
              <dd>{{ motion.leftEarRotation.toFixed(1) }}°</dd>
              <i class="day-09-meter"
                ><b
                  :style="{
                    transform: `translateX(${motion.leftEarRotation * 8}px)`,
                  }"
                ></b
              ></i>
            </div>
            <div>
              <dt><span>EAR R</span><small>右耳角度</small></dt>
              <dd>{{ motion.rightEarRotation.toFixed(1) }}°</dd>
              <i class="day-09-meter"
                ><b
                  :style="{
                    transform: `translateX(${motion.rightEarRotation * 8}px)`,
                  }"
                ></b
              ></i>
            </div>
          </dl>
          <footer aria-live="polite">
            <span>TIMELINE</span>
            <strong>{{ statusLabel }}</strong>
          </footer>
        </aside>
      </div>

      <div class="controls day-09-controls">
        <button
          class="primary-action"
          type="button"
          :disabled="reduceMotion"
          @click="togglePlayback"
        >
          {{ toggleLabel }}
        </button>
        <button
          class="secondary-action"
          type="button"
          :disabled="reduceMotion"
          @click="replayAnimation"
        >
          重新播放
        </button>
        <button
          class="keep-running-action"
          type="button"
          @click="resetAnimation"
        >
          重設靜止畫面
        </button>
      </div>

      <p v-if="reduceMotion" class="day-09-motion-note" role="status">
        系統已啟用減少動態效果，因此保留靜止完成圖。
      </p>

      <section class="day-09-code-panel" aria-labelledby="day-09-code-title">
        <header>
          <span id="day-09-code-title">CANVAS-MOTION.JS</span>
          <strong>狀態更新 → 完整重畫</strong>
        </header>
        <pre><code><span class="day-09-code-comment">// 建立卡比獸每一幀會使用的動畫狀態</span>
<span class="day-09-code-keyword">const</span> motion = {
  eyeX: <span class="day-09-code-number">-6</span>, <span class="day-09-code-comment">// 眼睛從左側開始移動</span>
  leftEarRotation: <span class="day-09-code-number">-3</span>, <span class="day-09-code-comment">// 左耳初始旋轉角度</span>
  rightEarRotation: <span class="day-09-code-number">3</span>, <span class="day-09-code-comment">// 右耳朝相反方向旋轉</span>
};

<span class="day-09-code-comment">// 建立會無限往返播放的 GSAP Timeline</span>
<span class="day-09-code-keyword">const</span> timeline = gsap.timeline({
  repeat: <span class="day-09-code-number">-1</span>, <span class="day-09-code-comment">// -1 代表無限重複</span>
  yoyo: <span class="day-09-code-keyword">true</span>, <span class="day-09-code-comment">// 抵達終點後反向播放</span>
  onUpdate: drawScene, <span class="day-09-code-comment">// 每次更新都重新繪製 Canvas</span>
});

<span class="day-09-code-comment">// 將眼睛與左右耳同步補間到另一側</span>
timeline.to(motion, {
  eyeX: <span class="day-09-code-number">6</span>, <span class="day-09-code-comment">// 眼睛往右移動</span>
  leftEarRotation: <span class="day-09-code-number">3</span>, <span class="day-09-code-comment">// 左耳往外旋轉</span>
  rightEarRotation: <span class="day-09-code-number">-3</span>, <span class="day-09-code-comment">// 右耳維持反方向</span>
  duration: <span class="day-09-code-number">1.8</span>, <span class="day-09-code-comment">// 單程動畫時間為 1.8 秒</span>
  ease: <span class="day-09-code-string">"sine.inOut"</span>, <span class="day-09-code-comment">// 使用平順的加速與減速</span>
});

<span class="day-09-code-comment">// 以三角形外側頂點為中心旋轉並繪製耳朵</span>
<span class="day-09-code-keyword">function</span> <span class="day-09-code-function">drawEar</span>(ctx, points, pivot, rotation) {
  ctx.save(); <span class="day-09-code-comment">// 保存目前的 Canvas 狀態</span>
  ctx.translate(pivot.x, pivot.y); <span class="day-09-code-comment">// 將原點移到外側頂點</span>
  ctx.rotate((rotation * Math.PI) / <span class="day-09-code-number">180</span>); <span class="day-09-code-comment">// 將角度轉成弧度</span>

  <span class="day-09-code-comment">// 改用相對座標畫出三角形耳朵</span>
  ctx.beginPath();
  ctx.moveTo(points[<span class="day-09-code-number">0</span>].x - pivot.x, points[<span class="day-09-code-number">0</span>].y - pivot.y);
  ctx.lineTo(points[<span class="day-09-code-number">1</span>].x - pivot.x, points[<span class="day-09-code-number">1</span>].y - pivot.y);
  ctx.lineTo(points[<span class="day-09-code-number">2</span>].x - pivot.x, points[<span class="day-09-code-number">2</span>].y - pivot.y);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); <span class="day-09-code-comment">// 還原座標系，避免影響其他圖形</span>
}</code></pre>
      </section>
    </section>
  </main>
</template>
