<script setup>
import { gsap } from "gsap";
import { computed, onMounted, onUnmounted, ref } from "vue";

const root = ref(null);
const stage = ref(null);
const follower = ref(null);
const mode = ref("quickTo");
const pointerX = ref(0);
const pointerY = ref(0);
const followerX = ref(0);
const followerY = ref(0);
const updateCount = ref(0);
const lastAction = ref("已建立 quickTo() 控制器");
const hasReducedMotion = ref(false);

let modeContext = null;
let xTo = null;
let yTo = null;
let setX = null;
let setY = null;
let reducedMotionQuery = null;

const isQuickTo = computed(() => mode.value === "quickTo");
const modeLabel = computed(() =>
  isQuickTo.value ? "quickTo()" : "quickSetter()",
);
const behaviorLabel = computed(() =>
  isQuickTo.value ? "TWEENED" : "IMMEDIATE",
);
const codeExample = computed(() =>
  isQuickTo.value
    ? `const xTo = gsap.quickTo(follower, "x", {\n  duration: 0.45,\n  ease: "power3.out"\n});\n\nstage.addEventListener("pointermove", (event) => {\n  xTo(nextX);\n});`
    : `const setX = gsap.quickSetter(follower, "x", "px");\n\nstage.addEventListener("pointermove", (event) => {\n  setX(nextX);\n});`,
);

function readFollowerPosition() {
  if (!follower.value) return;
  followerX.value = Math.round(
    Number(gsap.getProperty(follower.value, "x")) || 0,
  );
  followerY.value = Math.round(
    Number(gsap.getProperty(follower.value, "y")) || 0,
  );
}

function clearMode() {
  xTo?.tween?.kill();
  yTo?.tween?.kill();
  modeContext?.revert();
  modeContext = null;
  xTo = null;
  yTo = null;
  setX = null;
  setY = null;
}

function initializeMode(x = followerX.value, y = followerY.value) {
  if (!root.value || !follower.value) return;
  clearMode();
  gsap.set(follower.value, { x, y });

  modeContext = gsap.context(() => {
    if (isQuickTo.value) {
      const config = {
        duration: 0.45,
        ease: "power3.out",
        overwrite: "auto",
        onUpdate: readFollowerPosition,
      };
      xTo = gsap.quickTo(follower.value, "x", config);
      yTo = gsap.quickTo(follower.value, "y", config);
    } else {
      setX = gsap.quickSetter(follower.value, "x", "px");
      setY = gsap.quickSetter(follower.value, "y", "px");
    }
  }, root.value);
  readFollowerPosition();
}

function getClampedPosition(event) {
  const rect = stage.value.getBoundingClientRect();
  const followerRect = follower.value.getBoundingClientRect();
  const halfWidth = followerRect.width / 2;
  const halfHeight = followerRect.height / 2;

  return {
    x: gsap.utils.clamp(
      0,
      rect.width - followerRect.width,
      event.clientX - rect.left - halfWidth,
    ),
    y: gsap.utils.clamp(
      0,
      rect.height - followerRect.height,
      event.clientY - rect.top - halfHeight,
    ),
  };
}

function handlePointerMove(event) {
  if (!stage.value || !follower.value) return;
  const next = getClampedPosition(event);
  pointerX.value = Math.round(next.x);
  pointerY.value = Math.round(next.y);
  updateCount.value += 1;

  if (isQuickTo.value) {
    xTo?.(next.x);
    yTo?.(next.y);
  } else {
    setX?.(next.x);
    setY?.(next.y);
    followerX.value = pointerX.value;
    followerY.value = pointerY.value;
  }
}

function toggleMode() {
  const x = Number(gsap.getProperty(follower.value, "x")) || 0;
  const y = Number(gsap.getProperty(follower.value, "y")) || 0;
  mode.value = isQuickTo.value ? "quickSetter" : "quickTo";
  lastAction.value = `已切換至 ${mode.value}()`;
  initializeMode(x, y);
}

function centerFollower() {
  if (!stage.value || !follower.value) return;
  const x = (stage.value.clientWidth - follower.value.offsetWidth) / 2;
  const y = (stage.value.clientHeight - follower.value.offsetHeight) / 2;
  followerX.value = Math.round(x);
  followerY.value = Math.round(y);
  pointerX.value = followerX.value;
  pointerY.value = followerY.value;
  initializeMode(x, y);
}

function updateReducedMotion(event) {
  hasReducedMotion.value = event.matches;
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  hasReducedMotion.value = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", updateReducedMotion);
  stage.value?.addEventListener("pointermove", handlePointerMove);
  centerFollower();
});

onUnmounted(() => {
  stage.value?.removeEventListener("pointermove", handlePointerMove);
  reducedMotionQuery?.removeEventListener("change", updateReducedMotion);
  clearMode();
});
</script>

<template>
  <section
    ref="root"
    class="experiment day-06-experiment"
    aria-labelledby="day-06-pointer-title"
  >
    <header class="section-heading">
      <div>
        <p>EXPERIMENT B / HIGH-FREQUENCY INPUT</p>
        <h2 id="day-06-pointer-title">
          比較兩種 <span class="heading-english">Pointer</span>
        </h2>
      </div>
      <span class="day-06-index">POINTER → TRANSFORM</span>
    </header>

    <p class="day-06-description">
      在舞台內移動滑鼠或手指，再切換模式比較平滑追趕與立即貼合。兩者都會重用預先建立的更新函式。quickTo()
      會透過 Tween 平滑追向新值；quickSetter() 則不建立
      Tween，收到新值就立即套用。
    </p>

    <p v-if="hasReducedMotion" class="day-06-motion-warning" role="status">
      系統目前偏好減少動態；為保留 API 差異，本實驗仍會播放完整追蹤效果。
    </p>

    <div class="day-06-pointer-layout">
      <div>
        <div
          ref="stage"
          class="day-06-pointer-stage"
          aria-label="Pointer 跟隨互動區，移動滑鼠或手指控制圓形"
        >
          <span class="day-06-axis-label is-x" aria-hidden="true"
            >X / INPUT</span
          >
          <span class="day-06-axis-label is-y" aria-hidden="true"
            >Y / OUTPUT</span
          >
          <i ref="follower" class="day-06-follower" aria-hidden="true">
            <span></span>
          </i>
          <p>在此區域移動 POINTER</p>
        </div>

        <div class="day-06-mode-row">
          <button
            class="day-06-switch"
            type="button"
            role="switch"
            :aria-checked="!isQuickTo"
            :aria-label="`切換更新模式，目前為 ${modeLabel}`"
            @click="toggleMode"
          >
            <span aria-hidden="true"></span>
          </button>
          <div>
            <strong>{{ modeLabel }}</strong>
            <p>
              {{
                isQuickTo
                  ? "重用 Tween，帶 easing 追向新值"
                  : "略過 Tween，立即寫入 transform"
              }}
            </p>
          </div>
          <b>{{ behaviorLabel }}</b>
        </div>
      </div>

      <aside class="day-06-hud" aria-label="Pointer 實驗即時狀態">
        <header>
          <span>LIVE INPUT</span
          ><strong aria-live="polite">{{ modeLabel }}</strong>
        </header>
        <dl>
          <div>
            <dt>POINTER X</dt>
            <dd>{{ String(pointerX).padStart(3, "0") }}</dd>
          </div>
          <div>
            <dt>POINTER Y</dt>
            <dd>{{ String(pointerY).padStart(3, "0") }}</dd>
          </div>
          <div>
            <dt>FOLLOWER X</dt>
            <dd>{{ String(followerX).padStart(3, "0") }}</dd>
          </div>
          <div>
            <dt>FOLLOWER Y</dt>
            <dd>{{ String(followerY).padStart(3, "0") }}</dd>
          </div>
          <div>
            <dt>UPDATES</dt>
            <dd>{{ String(updateCount).padStart(4, "0") }}</dd>
          </div>
          <div>
            <dt>MODEL</dt>
            <dd>{{ behaviorLabel }}</dd>
          </div>
        </dl>
        <p aria-live="polite">{{ lastAction }}</p>
      </aside>
    </div>

    <aside class="day-06-code-panel" aria-label="目前 Pointer 模式程式碼">
      <header>
        <span>ACTIVE IMPLEMENTATION</span><strong>{{ behaviorLabel }}</strong>
      </header>
      <pre><code>{{ codeExample }}</code></pre>
    </aside>
  </section>
</template>
