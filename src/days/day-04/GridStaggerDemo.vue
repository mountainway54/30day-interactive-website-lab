<script setup>
import { gsap } from "gsap";
import { computed, onMounted, onUnmounted, ref } from "vue";

const stage = ref(null);
const from = ref("center");
const axis = ref("both");
const status = ref("READY");

let tween = null;

const staggerFrom = computed(() =>
  from.value === "xy" ? [0.25, 0.75] : from.value,
);
const staggerAxis = computed(() =>
  axis.value === "both" ? null : axis.value,
);
const axisCode = computed(() =>
  staggerAxis.value === null ? "null" : `"${staggerAxis.value}"`,
);
const fromCode = computed(() =>
  Array.isArray(staggerFrom.value)
    ? `[${staggerFrom.value.join(", ")}]`
    : `"${staggerFrom.value}"`,
);

function getDots() {
  return stage.value
    ? [...stage.value.querySelectorAll(".day-04-grid-stagger-dot")]
    : [];
}

function resetDemo() {
  tween?.kill();
  tween = null;
  const dots = getDots();
  gsap.killTweensOf(dots);
  gsap.set(dots, { scale: 1, backgroundColor: "#52616f" });
  status.value = "READY";
}

function playDemo() {
  resetDemo();
  const dots = getDots();
  if (dots.length !== 25) return;

  tween = gsap.to(dots, {
    scale: 1.65,
    backgroundColor: "#c63d2f",
    duration: 0.42,
    ease: "power2.inOut",
    repeat: 1,
    yoyo: true,
    stagger: {
      amount: 1,
      grid: [5, 5],
      from: staggerFrom.value,
      axis: staggerAxis.value,
    },
    onComplete: () => {
      status.value = "COMPLETE";
    },
  });
  status.value = "PLAYING";
}

onMounted(resetDemo);
onUnmounted(resetDemo);
</script>

<template>
  <section
    class="experiment day-04-followup"
    aria-labelledby="day-04-grid-stagger-title"
  >
    <header class="section-heading">
      <div>
        <p>GSAP STAGGER / 2D GRID</p>
        <h2 id="day-04-grid-stagger-title">
          用 <span class="heading-english">From</span> 與
          <span class="heading-english">Axis</span> 控制二維擴散方向
        </h2>
      </div>
      <div
        class="status"
        :data-active="status === 'PLAYING'"
        aria-live="polite"
      >
        <span></span>{{ status }}
      </div>
    </header>

    <div class="day-04-concept-grid">
      <div
        ref="stage"
        class="day-04-grid-stagger-stage"
        aria-label="5 乘 5 二維 Stagger 動畫預覽區"
      >
        <i
          v-for="index in 25"
          :key="index - 1"
          class="day-04-grid-stagger-dot"
          aria-hidden="true"
        ></i>
      </div>

      <div class="day-04-code-panel">
        <header>EDIT 2D STAGGER</header>
        <div class="day-04-concept-code day-04-grid-stagger-code">
          <code>
            <span>gsap.to(".dot", {{ "{" }}</span>
            <span>&nbsp;&nbsp;scale: 1.65,</span>
            <span>&nbsp;&nbsp;repeat: 1,</span>
            <span>&nbsp;&nbsp;yoyo: true,</span>
            <span>&nbsp;&nbsp;stagger: {{ "{" }}</span>
            <span>&nbsp;&nbsp;&nbsp;&nbsp;amount: 1,</span>
            <span>&nbsp;&nbsp;&nbsp;&nbsp;grid: [5, 5],</span>
            <label>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;from:</span>
              <select v-model="from" aria-label="Stagger 起始位置" @change="resetDemo">
                <option value="center">"center"</option>
                <option value="end">"end"</option>
                <option value="edges">"edges"</option>
                <option value="random">"random"</option>
                <option value="xy">[0.25, 0.75] (x, y)</option>
              </select>
            </label>
            <label>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;axis:</span>
              <select v-model="axis" aria-label="Stagger 擴散軸向" @change="resetDemo">
                <option value="both">null (both)</option>
                <option value="x">"x"</option>
                <option value="y">"y"</option>
              </select>
            </label>
            <span>&nbsp;&nbsp;{{ "}" }}</span>
            <span>{{ "}" }})</span>
            <span class="day-04-code-comment">
              // from: {{ fromCode }}, axis: {{ axisCode }}
            </span>
          </code>
        </div>
      </div>
    </div>

    <div class="controls day-04-controls">
      <button class="primary-action" type="button" @click="playDemo">
        播放動畫
      </button>
      <button class="secondary-action" type="button" @click="resetDemo">
        重設
      </button>
    </div>
  </section>
</template>
