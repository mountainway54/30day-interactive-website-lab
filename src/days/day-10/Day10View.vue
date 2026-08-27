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
import ParticleSnorlaxDemo from "./ParticleSnorlaxDemo.vue";
import "./day-10.css";

const canvasRef = ref(null);
const canvasShellRef = ref(null);
const showMotionNotice = ref(false);
const isCanvasActive = ref(false);

const pointer = reactive({
  x: 0,
  y: 0,
  canvasX: 200,
  canvasY: 150,
});

const motion = reactive({
  eyeX: 0,
  eyeY: 0,
  leftEarRotation: 0,
  rightEarRotation: 0,
});

let canvasContext = null;
let eyeTween = null;
let earTimeline = null;
let resizeObserver = null;
let resizeFrame = null;
let mediaQuery = null;

const interactionLabel = computed(() =>
  isCanvasActive.value ? "CANVAS CONTACT" : "TRACKING POINTER",
);

const codeExample = `function trackPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;

  gsap.to(motion, {
    eyeX: gsap.utils.clamp(-9, 9, (event.clientX - centerX) / 28),
    eyeY: gsap.utils.clamp(-3.5, 3.5, (event.clientY - centerY) / 55),
    duration: 0.18,
    overwrite: "auto",
    onUpdate: drawScene,
  });
}

function rotateEarsTwice() {
  gsap.timeline()
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.09 })
    .to(motion, { leftEarRotation: 9, rightEarRotation: -9, duration: 0.12 })
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.12 })
    .to(motion, { leftEarRotation: 0, rightEarRotation: 0, duration: 0.11 });
}`;

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

function drawScene() {
  const ctx = canvasContext ?? resizeCanvas();
  if (!ctx) return;

  ctx.clearRect(0, 0, 400, 300);
  prepareContext(ctx);

  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.ellipse(200, 160, 120, 108, 0, 0, Math.PI * 2);
  ctx.fill();

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

  prepareContext(ctx);
  ctx.beginPath();
  ctx.moveTo(142 + motion.eyeX, 162 + motion.eyeY);
  ctx.lineTo(172 + motion.eyeX, 162 + motion.eyeY);
  ctx.moveTo(228 + motion.eyeX, 162 + motion.eyeY);
  ctx.lineTo(258 + motion.eyeX, 162 + motion.eyeY);
  ctx.stroke();

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

function updatePointerCoordinates(event) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;

  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.canvasX = gsap.utils.clamp(
    0,
    400,
    ((event.clientX - bounds.left) / bounds.width) * 400,
  );
  pointer.canvasY = gsap.utils.clamp(
    0,
    300,
    ((event.clientY - bounds.top) / bounds.height) * 300,
  );

  eyeTween?.kill();
  eyeTween = gsap.to(motion, {
    eyeX: gsap.utils.clamp(-9, 9, (event.clientX - centerX) / 28),
    eyeY: gsap.utils.clamp(-3.5, 3.5, (event.clientY - centerY) / 55),
    duration: 0.18,
    ease: "power2.out",
    overwrite: "auto",
    onUpdate: drawScene,
  });
}

function rotateEarsTwice() {
  earTimeline?.kill();
  earTimeline = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onUpdate: drawScene,
    onComplete: () => {
      earTimeline = null;
    },
  });
  earTimeline
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.09 })
    .to(motion, { leftEarRotation: 9, rightEarRotation: -9, duration: 0.12 })
    .to(motion, { leftEarRotation: -9, rightEarRotation: 9, duration: 0.12 })
    .to(motion, { leftEarRotation: 0, rightEarRotation: 0, duration: 0.11 });
}

function handleCanvasEnter() {
  isCanvasActive.value = true;
  rotateEarsTwice();
}

function handleCanvasLeave() {
  isCanvasActive.value = false;
}

function handleCanvasPointerDown(event) {
  if (event.pointerType !== "mouse") {
    isCanvasActive.value = true;
    rotateEarsTwice();
  }
}

function closeMotionNotice() {
  showMotionNotice.value = false;
}

onMounted(async () => {
  await nextTick();
  resizeCanvas();
  drawScene();

  window.addEventListener("pointermove", updatePointerCoordinates, {
    passive: true,
  });
  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  showMotionNotice.value = mediaQuery.matches;

  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
      drawScene();
    });
  });
  resizeObserver.observe(canvasShellRef.value);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", updatePointerCoordinates);
  eyeTween?.kill();
  earTimeline?.kill();
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <main class="day-page day-10-page">
    <LabNav />

    <section class="experiment day-10-experiment">
      <header class="section-heading">
        <div>
          <p>POINTER TRACKING / CANVAS HIT AREA</p>
          <h2>游標互動</h2>
        </div>
        <div class="status" data-active="true" aria-live="polite">
          <span aria-hidden="true"></span>
          {{ interactionLabel }}
        </div>
      </header>

      <p class="day-10-description">
        在頁面移動游標，觀察卡比獸的視線；進入 Canvas 時，雙耳會快速回應兩次。
      </p>

      <div class="day-10-layout">
        <section class="day-10-stage" aria-labelledby="day-10-stage-title">
          <header>
            <span id="day-10-stage-title">LIVE TRACKING / 400 × 300</span>
            <strong>{{ isCanvasActive ? "CONTACT" : "WATCHING" }}</strong>
          </header>
          <div
            ref="canvasShellRef"
            class="day-10-canvas-shell"
            :data-active="isCanvasActive"
            :style="{
              '--pointer-x': `${(pointer.canvasX / 400) * 100}%`,
              '--pointer-y': `${(pointer.canvasY / 300) * 100}%`,
            }"
          >
            <i class="day-10-crosshair" aria-hidden="true"></i>
            <canvas
              ref="canvasRef"
              role="img"
              aria-label="眼睛跟隨游標，游標進入畫布時雙耳快速旋轉兩下的 Canvas 卡比獸頭像"
              @pointerenter="handleCanvasEnter"
              @pointerleave="handleCanvasLeave"
              @pointerdown="handleCanvasPointerDown"
            >
              你的瀏覽器不支援 Canvas。
            </canvas>
          </div>
          <footer>
            <span
              >POINTER
              {{ String(Math.round(pointer.x)).padStart(4, "0") }}</span
            >
            <span>GLOBAL TRACKING</span>
            <span>{{ String(Math.round(pointer.y)).padStart(4, "0") }}</span>
          </footer>
        </section>

        <aside
          class="day-10-monitor"
          aria-label="游標與視線狀態"
          aria-live="polite"
        >
          <header>
            <span>TRACKING CHANNELS</span>
            <strong>04 LIVE</strong>
          </header>
          <dl>
            <div>
              <dt><span>POINTER X</span><small>頁面座標</small></dt>
              <dd>{{ pointer.x.toFixed(0) }} px</dd>
            </div>
            <div>
              <dt><span>POINTER Y</span><small>頁面座標</small></dt>
              <dd>{{ pointer.y.toFixed(0) }} px</dd>
            </div>
            <div>
              <dt><span>EYE X</span><small>水平追蹤</small></dt>
              <dd>{{ motion.eyeX.toFixed(1) }} px</dd>
              <i class="day-10-meter"
                ><b
                  :style="{ transform: `translateX(${motion.eyeX * 4}px)` }"
                ></b
              ></i>
            </div>
            <div>
              <dt><span>EYE Y</span><small>垂直追蹤</small></dt>
              <dd>{{ motion.eyeY.toFixed(1) }} px</dd>
              <i class="day-10-meter"
                ><b
                  :style="{ transform: `translateX(${motion.eyeY * 9}px)` }"
                ></b
              ></i>
            </div>
          </dl>
          <footer>
            <span>CANVAS</span>
            <strong>{{
              isCanvasActive ? "ENTERED / EARS × 2" : "STANDBY"
            }}</strong>
          </footer>
        </aside>
      </div>

      <section class="day-10-code-panel" aria-labelledby="day-10-code-title">
        <header>
          <span id="day-10-code-title">POINTER-TRACKING.JS</span>
          <strong>全頁追蹤 → Canvas 重畫</strong>
        </header>
        <pre><code>{{ codeExample }}</code></pre>
      </section>
    </section>

    <ParticleSnorlaxDemo />

    <div
      v-if="showMotionNotice"
      class="day-10-notice-backdrop"
      role="presentation"
    >
      <section
        class="day-10-motion-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-10-notice-title"
      >
        <button
          type="button"
          aria-label="關閉提示"
          title="關閉提示"
          @click="closeMotionNotice"
        >
          ×
        </button>
        <p>DISPLAY SETTING</p>
        <h2 id="day-10-notice-title">
          如要獲得完整體驗，請關閉「減少動態效果」。
        </h2>
      </section>
    </div>
  </main>
</template>
