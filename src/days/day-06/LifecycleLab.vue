<script setup>
import { gsap } from "gsap";
import { computed, onMounted, onUnmounted, ref } from "vue";

const leftStage = ref(null);
const rightStage = ref(null);
const leftStatus = ref("READY");
const rightStatus = ref("READY");
const lastAction = ref("等待同步開始");

let leftContext = null;
let rightContext = null;
let leftTimeline = null;
let rightTimeline = null;

const canStart = computed(
  () => leftStatus.value === "READY" && rightStatus.value === "READY",
);

const codeExample = computed(() => {
  if (lastAction.value.includes("kill")) {
    return `// 清除 context 收集的所有動畫\nleftContext.kill();\n// inline styles 保留在停止當下`;
  }

  if (lastAction.value.includes("revert")) {
    return `// 清理 context 內所有動畫\nrightContext.revert();\n// inline styles 一併還原`;
  }

  if (lastAction.value.includes("重設")) {
    return `leftContext?.revert();\nrightContext?.revert();\nbuildBothTimelines();`;
  }

  return `const context = gsap.context(() => {\n  timeline = gsap.timeline({ paused: true });\n}, stageRef);`;
});

function createTimeline(stageRef, side) {
  let context = null;
  let timeline = null;

  context = gsap.context(() => {
    const samples = gsap.utils.toArray(".day-06-sample");

    timeline = gsap.timeline({
      paused: true,
      repeat: -1,
      yoyo: true,
      defaults: { duration: 1.15, ease: "power2.inOut" },
    });

    timeline
      .to(samples[0], { x: 76, rotation: 180, backgroundColor: "#c97958" }, 0)
      .to(samples[1], { y: -38, scale: 1.35, backgroundColor: "#b38a4a" }, 0.12)
      .to(samples[2], { x: -70, rotation: -135, scale: 0.76 }, 0.24);
  }, stageRef);

  if (side === "left") {
    leftContext = context;
    leftTimeline = timeline;
  } else {
    rightContext = context;
    rightTimeline = timeline;
  }
}

function buildBothTimelines() {
  if (!leftStage.value || !rightStage.value) return;
  createTimeline(leftStage.value, "left");
  createTimeline(rightStage.value, "right");
}

function clearStageStyles() {
  const samples = [leftStage.value, rightStage.value].flatMap((stageRef) =>
    stageRef ? [...stageRef.querySelectorAll(".day-06-sample")] : [],
  );
  gsap.set(samples, { clearProps: "all" });
}

function startBoth() {
  if (!canStart.value) return;
  leftTimeline?.play(0);
  rightTimeline?.play(0);
  leftStatus.value = "ACTIVE";
  rightStatus.value = "ACTIVE";
  lastAction.value = "兩側 Timeline 同步播放";
}

function killLeft() {
  if (leftStatus.value !== "ACTIVE") return;
  leftContext?.kill();
  leftContext = null;
  leftTimeline = null;
  leftStatus.value = "KILLED";
  lastAction.value = "左側執行 context.kill()，保留目前樣式";
}

function revertRight() {
  if (rightStatus.value !== "ACTIVE") return;
  rightContext?.revert();
  rightContext = null;
  rightTimeline = null;
  rightStatus.value = "REVERTED";
  lastAction.value = "右側執行 context.revert()，回復初始樣式";
}

function resetBoth() {
  leftContext?.revert();
  rightContext?.revert();
  leftContext = null;
  rightContext = null;
  leftTimeline = null;
  rightTimeline = null;
  clearStageStyles();
  leftStatus.value = "READY";
  rightStatus.value = "READY";
  lastAction.value = "整組重設並重建 context";
  buildBothTimelines();
}

onMounted(buildBothTimelines);
onUnmounted(() => {
  leftContext?.revert();
  rightContext?.revert();
  clearStageStyles();
});
</script>

<template>
  <section
    class="experiment day-06-experiment"
    aria-labelledby="day-06-lifecycle-title"
  >
    <header class="section-heading">
      <div>
        <p>EXPERIMENT A / ANIMATION OWNERSHIP</p>
        <h2 id="day-06-lifecycle-title">
          比較兩種 <span class="heading-english">context</span> 方法
        </h2>
      </div>
      <span class="day-06-index">KILL ↔ REVERT</span>
    </header>

    <p class="day-06-description">
      兩側使用完全相同的 context。觀察 如何停在當下，以及
      <code>context.revert()</code> 如何連同 GSAP 寫入的樣式一起還原。
      <code>context.revert()</code> 會還原動畫造成的樣式變更並清除動畫；
      <code>context.kill()</code> 則只停止並清除動畫，不會還原元素樣式。
    </p>

    <div class="day-06-lifecycle-grid">
      <article class="day-06-specimen-card">
        <header>
          <div><span>SCOPE / LEFT</span><strong>context.kill()</strong></div>
          <span
            class="day-06-state"
            :data-state="leftStatus"
            aria-live="polite"
          >
            <i></i>{{ leftStatus }}
          </span>
        </header>
        <div
          ref="leftStage"
          class="day-06-sample-stage"
          aria-label="context kill 動畫舞台"
        >
          <i class="day-06-sample is-circle" aria-hidden="true"></i>
          <i class="day-06-sample is-square" aria-hidden="true"></i>
          <i class="day-06-sample is-diamond" aria-hidden="true"></i>
        </div>
        <p>清除 context 收集的全部動畫，保留停止瞬間的 transform 與顏色。</p>
      </article>

      <article class="day-06-specimen-card">
        <header>
          <div><span>SCOPE / RIGHT</span><strong>context.revert()</strong></div>
          <span
            class="day-06-state"
            :data-state="rightStatus"
            aria-live="polite"
          >
            <i></i>{{ rightStatus }}
          </span>
        </header>
        <div
          ref="rightStage"
          class="day-06-sample-stage"
          aria-label="context revert 動畫舞台"
        >
          <i class="day-06-sample is-circle" aria-hidden="true"></i>
          <i class="day-06-sample is-square" aria-hidden="true"></i>
          <i class="day-06-sample is-diamond" aria-hidden="true"></i>
        </div>
        <p>清理 context 管理的動畫，並移除動畫產生的 inline styles。</p>
      </article>
    </div>

    <div class="controls day-06-controls">
      <button
        class="primary-action"
        type="button"
        :disabled="!canStart"
        @click="startBoth"
      >
        同步開始
      </button>
      <button
        class="secondary-action"
        type="button"
        :disabled="leftStatus !== 'ACTIVE'"
        @click="killLeft"
      >
        左側 context.kill()
      </button>
      <button
        class="secondary-action"
        type="button"
        :disabled="rightStatus !== 'ACTIVE'"
        @click="revertRight"
      >
        右側 context.revert()
      </button>
      <button class="secondary-action" type="button" @click="resetBoth">
        整組重設
      </button>
    </div>

    <aside class="day-06-code-panel" aria-label="目前操作程式碼">
      <header>
        <span>LAST ACTION</span><strong>{{ lastAction }}</strong>
      </header>
      <pre><code>{{ codeExample }}</code></pre>
    </aside>
  </section>
</template>
