<script setup>
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { computed, onMounted, onUnmounted, ref } from "vue";

import "./day-05.css";

gsap.registerPlugin(ScrollTrigger);

const scenes = Object.freeze([
  {
    key: "trigger",
    label: "TRIGGER",
    title: "指定故事從哪個元素開始",
    description:
      "trigger 是 ScrollTrigger 觀察的目標。當故事容器進入指定位置，這段時間軸才開始接收捲動進度。",
    value: '.day-05-story',
    code: 'ScrollTrigger.create({\n  trigger: ".story"\n})',
  },
  {
    key: "start",
    label: "START",
    title: "定義觸發點與視窗的交會時刻",
    description:
      'start: "top top" 表示 trigger 頂端碰到視窗頂端時啟動。方塊越過基準線，讓交會位置變得可見。',
    value: '"top top"',
    code: 'ScrollTrigger.create({\n  start: "top top"\n})',
  },
  {
    key: "end",
    label: "END",
    title: "用捲動距離決定動畫的範圍",
    description:
      'end: "+=500%" 將五個視窗高度映射成完整時間軸。延伸的線段就是這段可用範圍。',
    value: '"+=500%"',
    code: 'ScrollTrigger.create({\n  end: "+=500%"\n})',
  },
  {
    key: "scrub",
    label: "SCRUB",
    title: "讓播放頭跟著閱讀進度移動",
    description:
      "scrub: 0.8 讓動畫追隨捲動並帶有短暫緩衝。向上捲動時，碰撞、旋轉與換色也會逐格倒轉。",
    value: "0.8",
    code: 'gsap.to(".shape", {\n  x: 300,\n  scrollTrigger: { scrub: true }\n})',
  },
  {
    key: "pin",
    label: "PIN",
    title: "固定舞台，直到敘事完成",
    description:
      "pin 讓同一個舞台留在視窗內，內容持續改變而不必切換展示框；抵達終點後才回到一般頁面流。",
    value: '.day-05-stage',
    code: 'ScrollTrigger.create({\n  trigger: ".story",\n  pin: true\n})',
  },
]);

const story = ref(null);
const stage = ref(null);
const circle = ref(null);
const square = ref(null);
const orbit = ref(null);
const axis = ref(null);
const activeSceneIndex = ref(0);
const progress = ref(0);
const hasReducedMotion = ref(false);

let animationContext = null;
let reducedMotionQuery = null;

const activeScene = computed(() => scenes[activeSceneIndex.value]);
const sceneCount = scenes.length;
const sceneNumber = computed(() =>
  String(activeSceneIndex.value + 1).padStart(2, "0"),
);
const progressLabel = computed(() =>
  `${Math.round(progress.value * 100)}`.padStart(3, "0"),
);

function setReducedMotion(event) {
  hasReducedMotion.value = event.matches;
}

function buildScrollStory() {
  if (!story.value || !stage.value) return;

  animationContext = gsap.context(() => {
    gsap.set(stage.value, {
      "--day-05-stage-bg": "#F5F1E8",
      "--day-05-primary": "#B38A4A",
      "--day-05-secondary": "#405B50",
      "--day-05-line": "#783C3C",
    });

    const timeline = gsap.timeline({
      defaults: { duration: 1, ease: "power2.inOut" },
      scrollTrigger: {
        trigger: story.value,
        start: "top top",
        end: "+=500%",
        scrub: 0.8,
        pin: stage.value,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          progress.value = self.progress;
          activeSceneIndex.value = Math.min(
            Math.floor(self.progress * sceneCount),
            sceneCount - 1,
          );
        },
      },
    });

    timeline
      .fromTo(
        circle.value,
        { xPercent: -180, yPercent: -210, scaleX: 0.72, scaleY: 1.25 },
        {
          duration: 0.65,
          xPercent: -70,
          yPercent: 90,
          scaleX: 1.22,
          scaleY: 0.72,
          ease: "bounce.out",
        },
        0,
      )
      .to(
        circle.value,
        {
          duration: 0.35,
          xPercent: -35,
          yPercent: 8,
          scaleX: 1,
          scaleY: 1,
          ease: "power2.out",
        },
        0.65,
      )
      .to(
        stage.value,
        {
          "--day-05-stage-bg": "#D6C4A8",
          "--day-05-primary": "#C97958",
          "--day-05-secondary": "#405B50",
          "--day-05-line": "#783C3C",
        },
        1,
      )
      .fromTo(
        square.value,
        { xPercent: -360, rotation: -18, scaleX: 1.35, scaleY: 0.72 },
        {
          duration: 0.6,
          xPercent: -52,
          rotation: 12,
          scaleX: 0.78,
          scaleY: 1.2,
          ease: "back.out(2.8)",
        },
        1,
      )
      .to(
        circle.value,
        { duration: 0.4, xPercent: 58, rotation: 42, ease: "power2.out" },
        1.6,
      )
      .to(
        square.value,
        { duration: 0.4, xPercent: -116, rotation: -24, ease: "power2.out" },
        1.6,
      )
      .to(
        stage.value,
        {
          "--day-05-stage-bg": "#899B8A",
          "--day-05-primary": "#783C3C",
          "--day-05-secondary": "#F5F1E8",
          "--day-05-line": "#405B50",
        },
        2,
      )
      .fromTo(
        axis.value,
        { scaleX: 0.08, opacity: 0.35 },
        { scaleX: 1, opacity: 1, transformOrigin: "left center" },
        2,
      )
      .to(circle.value, { xPercent: 148, scale: 0.78, rotation: 180 }, 2)
      .to(square.value, { xPercent: -205, scale: 0.82, rotation: -135 }, 2)
      .to(
        stage.value,
        {
          "--day-05-stage-bg": "#6F9294",
          "--day-05-primary": "#F5F1E8",
          "--day-05-secondary": "#C97958",
          "--day-05-line": "#D6C4A8",
        },
        3,
      )
      .to(
        orbit.value,
        { rotation: 270, scale: 1.08, ease: "power2.inOut" },
        3,
      )
      .to(circle.value, { xPercent: 14, yPercent: -116, rotation: 340 }, 3)
      .to(square.value, { xPercent: -28, yPercent: 102, rotation: 225 }, 3)
      .to(
        stage.value,
        {
          "--day-05-stage-bg": "#C7DDE2",
          "--day-05-primary": "#356C82",
          "--day-05-secondary": "#7FA9B5",
          "--day-05-line": "#315B6A",
        },
        4,
      )
      .to(orbit.value, { rotation: 360, scale: 0.7, ease: "none" }, 4)
      .to(
        circle.value,
        {
          xPercent: 28,
          yPercent: 0,
          scale: 0.72,
          rotation: 360,
          ease: "none",
        },
        4,
      )
      .to(
        square.value,
        {
          xPercent: -38,
          yPercent: 0,
          scale: 0.72,
          rotation: 405,
          ease: "none",
        },
        4,
      )
      .to(
        axis.value,
        {
          scaleX: 0.36,
          transformOrigin: "center center",
          ease: "none",
        },
        4,
      );
  }, story.value);
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  hasReducedMotion.value = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", setReducedMotion);
  buildScrollStory();
});

onUnmounted(() => {
  reducedMotionQuery?.removeEventListener("change", setReducedMotion);
  animationContext?.revert();
  animationContext = null;
});
</script>

<template>
  <main class="day-page day-05-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>05 / 30</span>
    </nav>

    <section ref="story" class="day-05-story" aria-label="五幕 ScrollTrigger 教學">
      <div ref="stage" class="day-05-stage">
        <div class="day-05-stage-grid" aria-hidden="true"></div>

        <p v-if="hasReducedMotion" class="day-05-motion-warning" role="status">
          本頁會依照捲動進度播放位移、縮放與彈性碰撞；目前仍保留完整示範效果。
        </p>

        <div class="day-05-stage-copy">
          <p>{{ activeScene.label }} / {{ sceneNumber }}</p>
          <h3>{{ activeScene.title }}</h3>
          <p>{{ activeScene.description }}</p>
        </div>

        <div class="day-05-geometry" aria-hidden="true">
          <div ref="orbit" class="day-05-orbit">
            <span ref="axis" class="day-05-axis"></span>
            <span ref="circle" class="day-05-circle"></span>
            <span ref="square" class="day-05-square"></span>
            <i class="day-05-tick day-05-tick-a"></i>
            <i class="day-05-tick day-05-tick-b"></i>
            <i class="day-05-tick day-05-tick-c"></i>
          </div>
        </div>

        <aside class="day-05-hud" aria-label="ScrollTrigger 即時狀態">
          <header>
            <span>CODE EXAMPLE</span>
            <strong aria-live="polite">{{ sceneNumber }} / 05</strong>
          </header>
          <pre><code>{{ activeScene.code }}</code></pre>
          <div class="day-05-code-meta">
            <span>{{ activeScene.label }}</span>
            <strong>{{ progressLabel }}%</strong>
          </div>
          <div class="day-05-progress" aria-hidden="true">
            <i :style="{ transform: `scaleX(${progress})` }"></i>
          </div>
        </aside>

        <div class="day-05-scene-rail" aria-hidden="true">
          <span
            v-for="(scene, index) in scenes"
            :key="scene.key"
            :data-active="index === activeSceneIndex"
          >
            {{ String(index + 1).padStart(2, "0") }}
          </span>
        </div>
      </div>
    </section>
    <div class="day-05-end-buffer" aria-hidden="true"></div>
  </main>
</template>
