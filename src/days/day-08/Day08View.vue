<script setup>
import LabNav from "@/components/LabNav.vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import "./day-08.css";

const canvasRef = ref(null);
const canvasShellRef = ref(null);
const currentStep = ref(0);
const isDrawing = ref(false);
const isCleared = ref(false);
const reduceMotion = ref(false);

const steps = [
  "準備畫布",
  "繪製橢圓頭部",
  "加上大角度三角耳朵",
  "疊上橢圓臉部",
  "完成五官與牙齒",
];
const stepApis = ["ellipse()", "lineTo()", "ellipse()", "stroke() + fill()"];

let stepTimer = null;
let resizeObserver = null;
let resizeFrame = null;

const stepLabel = computed(() => steps[currentStep.value]);
const progressLabel = computed(
  () => `${String(currentStep.value).padStart(2, "0")} / 04`,
);

const drawingCode = `function drawSnorlax(step = 4) {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#17212b";

  // 畫高度較扁的藍綠色橢圓頭部
  if (step >= 1) {
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.ellipse(200, 160, 120, 108, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 畫頂角較大的左右三角形耳朵
  if (step >= 2) {
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.moveTo(96, 108);
    ctx.lineTo(118, 48);
    ctx.lineTo(154, 76);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(246, 76);
    ctx.lineTo(282, 48);
    ctx.lineTo(304, 108);
    ctx.closePath();
    ctx.fill();
  }

  // 畫奶油色的橢圓臉部
  if (step >= 3) {
    ctx.fillStyle = "#f1dfb6";
    ctx.beginPath();
    ctx.ellipse(200, 178, 100, 78, 0, 0, Math.PI * 2);
    ctx.fill();

    // 畫寬版且超出臉部上緣的藍綠色倒三角形美人尖
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.moveTo(140, 94);
    ctx.lineTo(260, 94);
    ctx.lineTo(200, 134);
    ctx.closePath();
    ctx.fill();
  }

  // 畫閉上的眼睛
  if (step >= 4) {
    ctx.beginPath();
    ctx.moveTo(142, 162);
    ctx.lineTo(172, 162);
    ctx.moveTo(228, 162);
    ctx.lineTo(258, 162);
    ctx.stroke();

    // 畫寬版水平嘴線
    ctx.beginPath();
    ctx.moveTo(170, 196);
    ctx.lineTo(230, 196);
    ctx.stroke();

    // 畫左右兩顆頂角較大的白色三角形牙齒
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
    ctx.lineWidth = 7;
  }
}`;

function setupCanvas() {
  const canvas = canvasRef.value;
  const shell = canvasShellRef.value;
  if (!canvas || !shell) return null;

  const cssWidth = Math.min(shell.clientWidth - 32, 560);
  const cssHeight = cssWidth * 0.75;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * pixelRatio);
  canvas.height = Math.round(cssHeight * pixelRatio);

  const context = canvas.getContext("2d");
  context.setTransform(
    (cssWidth / 400) * pixelRatio,
    0,
    0,
    (cssHeight / 300) * pixelRatio,
    0,
    0,
  );
  return context;
}

function drawSnorlax(step = 4) {
  const ctx = setupCanvas();
  if (!ctx) return;

  ctx.clearRect(0, 0, 400, 300);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#17212b";

  // 畫高度較扁的藍綠色橢圓頭部
  if (step >= 1) {
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.ellipse(200, 160, 120, 108, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 畫頂角較大的左右三角形耳朵
  if (step >= 2) {
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.moveTo(96, 108);
    ctx.lineTo(118, 48);
    ctx.lineTo(154, 76);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(246, 76);
    ctx.lineTo(282, 48);
    ctx.lineTo(304, 108);
    ctx.closePath();
    ctx.fill();
  }

  // 畫奶油色的橢圓臉部
  if (step >= 3) {
    ctx.fillStyle = "#f1dfb6";
    ctx.beginPath();
    ctx.ellipse(200, 178, 100, 78, 0, 0, Math.PI * 2);
    ctx.fill();

    // 畫寬版且超出臉部上緣的藍綠色倒三角形美人尖
    ctx.fillStyle = "#365f64";
    ctx.beginPath();
    ctx.moveTo(140, 94);
    ctx.lineTo(260, 94);
    ctx.lineTo(200, 134);
    ctx.closePath();
    ctx.fill();
  }

  // 畫閉上的眼睛
  if (step >= 4) {
    ctx.beginPath();
    ctx.moveTo(142, 162);
    ctx.lineTo(172, 162);
    ctx.moveTo(228, 162);
    ctx.lineTo(258, 162);
    ctx.stroke();

    // 畫寬版水平嘴線
    ctx.beginPath();
    ctx.moveTo(168, 196);
    ctx.lineTo(232, 196);
    ctx.stroke();

    // 畫左右兩顆頂角較大的白色三角形牙齒
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
    ctx.lineWidth = 7;
  }
}

function stopSequence() {
  if (stepTimer !== null) {
    window.clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function runSequence() {
  stopSequence();
  isCleared.value = false;

  if (reduceMotion.value) {
    currentStep.value = 4;
    isDrawing.value = false;
    drawSnorlax(4);
    return;
  }

  currentStep.value = 0;
  isDrawing.value = true;
  drawSnorlax(0);

  const advance = () => {
    currentStep.value += 1;
    drawSnorlax(currentStep.value);
    if (currentStep.value < 4) {
      stepTimer = window.setTimeout(advance, 500);
    } else {
      stepTimer = null;
      isDrawing.value = false;
    }
  };

  stepTimer = window.setTimeout(advance, 400);
}

function clearCanvas() {
  stopSequence();
  isDrawing.value = false;
  currentStep.value = 0;
  isCleared.value = true;
  const ctx = setupCanvas();
  ctx?.clearRect(0, 0, 400, 300);
}

onMounted(async () => {
  reduceMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  await nextTick();
  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      drawSnorlax(isCleared.value ? 0 : currentStep.value);
    });
  });
  resizeObserver.observe(canvasShellRef.value);
  runSequence();
});

onBeforeUnmount(() => {
  stopSequence();
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <main class="day-page day-08-page">
    <LabNav />

    <section class="experiment day-08-experiment">
      <header class="section-heading">
        <div>
          <p>HTML5 CANVAS / BASIC SHAPES</p>
          <h2>
            <span class="heading-english">Canvas</span>
            基本圖形：畫一張卡比獸頭像
          </h2>
        </div>
        <div class="status" :data-active="isDrawing">
          <span aria-hidden="true"></span>
          {{ isDrawing ? "DRAWING" : isCleared ? "CLEARED" : "COMPLETE" }}
        </div>
      </header>

      <div class="day-08-layout">
        <div class="day-08-canvas-card">
          <header>
            <span>CANVAS / 400 × 300</span>
            <strong aria-live="polite"
              >{{ progressLabel }}｜{{ stepLabel }}</strong
            >
          </header>
          <div ref="canvasShellRef" class="day-08-canvas-shell">
            <canvas
              ref="canvasRef"
              role="img"
              aria-label="使用 Canvas 基本圖形繪製的幾何卡比獸頭像"
            >
              你的瀏覽器不支援 Canvas。
            </canvas>
          </div>
          <footer>
            <span>ORIGIN (0, 0)</span>
            <span>BITMAP / 2D CONTEXT</span>
          </footer>
        </div>

        <aside class="day-08-api-panel" aria-label="本次使用的 Canvas API">
          <header>
            <span>DRAWING TOOLKIT</span>
            <strong>04 STEPS</strong>
          </header>
          <ol>
            <li
              v-for="(step, index) in steps.slice(1)"
              :key="step"
              :data-active="currentStep === index + 1"
            >
              <span>{{ String(index + 1).padStart(2, "0") }}</span>
              <div>
                <strong>{{ step }}</strong>
                <small>{{ stepApis[index] }}</small>
              </div>
            </li>
          </ol>
        </aside>
      </div>

      <div class="controls day-08-controls">
        <button
          class="primary-action"
          type="button"
          :disabled="isDrawing"
          @click="runSequence"
        >
          重播繪製
        </button>
        <button
          class="secondary-action"
          type="button"
          :disabled="isCleared"
          @click="clearCanvas"
        >
          清除畫布
        </button>
      </div>

      <section class="day-08-code-panel" aria-labelledby="day-08-code-title">
        <header>
          <span id="day-08-code-title">DRAW-SNORLAX.JS</span>
          <strong>所有圖形集中在同一個繪圖函式</strong>
        </header>
        <pre><code>{{ drawingCode }}</code></pre>
      </section>
    </section>
  </main>
</template>
