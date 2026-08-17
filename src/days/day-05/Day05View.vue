<script setup>
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import "./day-05.css";

gsap.registerPlugin(ScrollTrigger);

const scenes = Object.freeze([
  {
    key: "trigger",
    label: "TRIGGER",
    title: "指定要操作的元素",
    description:
      "trigger 是 ScrollTrigger 用來判斷觸發時機的目標元素。當它捲動到指定位置後，動畫便開始跟隨捲動進度。",
    value: ".day-05-story",
    code: 'ScrollTrigger.create({\n  trigger: ".story"\n})',
  },
  {
    key: "start",
    label: "START",
    title: "定義觸發點",
    description:
      'start 用來設定 ScrollTrigger 的起點。start: "top top" 表示當 trigger 的頂端碰到視窗頂端時，ScrollTrigger 開始生效。第一個 top 是 trigger 元素的頂端，第二個 top 是瀏覽器視窗的頂端。',
    value: '"top top"',
    code: 'ScrollTrigger.create({\n  start: "top top"\n})',
  },
  {
    key: "end",
    label: "END",
    title: "決定捲動垂直範圍",
    description:
      'end: "+=500%" 表示從 start 的位置開始，再往下捲動相當於 5 個視窗高度的距離後結束。',
    value: '"+=500%"',
    code: 'ScrollTrigger.create({\n  end: "+=500%"\n})',
  },
  {
    key: "scrub",
    label: "SCRUB",
    title: "動畫綁定滾動進度",
    description:
      "scrub: 0.8 讓動畫追隨捲動並帶有短暫緩衝，代表動畫會花 0.8 秒追上目前的 Scroll 位置，所以有比較柔順、帶慣性的感覺。",
    value: "0.8",
    code: 'gsap.to(".shape", {\n  x: 300,\n  scrollTrigger: { scrub: 0.8 }\n})',
  },
  {
    key: "pin",
    label: "PIN",
    title: "固定視窗直到結束",
    description:
      "pin 讓同一個舞台留在視窗內，內容持續改變而不必切換展示框；抵達終點後才回到一般頁面流。",
    value: ".day-05-stage",
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
const showMarkers = ref(false);
const scrubValue = ref(0.8);
const scrubInput = ref("0.8");

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

function applyScrubValue() {
  const parsedValue = Number.parseFloat(scrubInput.value);
  const nextValue = Number.isFinite(parsedValue)
    ? Math.min(5, Math.max(0.1, parsedValue))
    : scrubValue.value;

  scrubValue.value = Math.round(nextValue * 10) / 10;
  scrubInput.value = scrubValue.value.toFixed(1);
}

function syncChapterScrollerMarkerVisibility() {
  document
    .querySelectorAll(".gsap-marker-scroller-start, .gsap-marker-scroller-end")
    .forEach((marker) => {
      marker.style.visibility = marker.classList.contains("marker-STORY")
        ? "visible"
        : "hidden";
    });
}

function placeChapterMarkerLabel(marker, placement) {
  if (!marker) return;

  const markerWidth = marker.offsetWidth;
  const markerHeight = marker.offsetHeight;
  const label = document.createElement("span");

  label.className = `day-05-chapter-marker-label is-${placement}`;
  label.textContent = marker.textContent;
  marker.textContent = "";
  marker.style.width = `${markerWidth}px`;
  marker.style.height = `${markerHeight}px`;
  marker.classList.add("day-05-chapter-marker");
  marker.append(label);
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
        scrub: scrubValue.value,
        pin: stage.value,
        markers: showMarkers.value,
        id: "STORY",
        refreshPriority: -1,
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
      .to(orbit.value, { rotation: 270, scale: 1.08, ease: "power2.inOut" }, 3)
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

    if (showMarkers.value) {
      const storyTrigger = timeline.scrollTrigger;

      scenes.forEach((scene, index) => {
        const chapterTrigger = ScrollTrigger.create({
          trigger: story.value,
          id: `${String(index + 1).padStart(2, "0")} ${scene.label}`,
          start: () =>
            storyTrigger.start +
            ((storyTrigger.end - storyTrigger.start) * index) / sceneCount,
          end: () =>
            storyTrigger.start +
            ((storyTrigger.end - storyTrigger.start) * (index + 1)) /
              sceneCount,
          markers: {
            startColor: "#c63d2f",
            endColor: "#405b50",
            fontSize: "10px",
            fontWeight: "700",
            indent: 28 + index * 32,
          },
          invalidateOnRefresh: true,
          refreshPriority: index,
        });

        placeChapterMarkerLabel(chapterTrigger.markerStart, "below");
        placeChapterMarkerLabel(chapterTrigger.markerEnd, "above");
      });
    }
  }, story.value);
}

async function rebuildScrollStory() {
  animationContext?.revert();
  animationContext = null;
  await nextTick();
  buildScrollStory();
  ScrollTrigger.refresh();
  if (showMarkers.value) syncChapterScrollerMarkerVisibility();
}

watch(showMarkers, rebuildScrollStory);
watch(scrubValue, rebuildScrollStory);

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

    <section
      ref="story"
      class="day-05-story"
      aria-label="五幕 ScrollTrigger 教學"
    >
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
            <div class="day-05-hud-tools">
              <label class="day-05-scrub-control">
                <span>SCRUB</span>
                <input
                  v-model="scrubInput"
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  inputmode="decimal"
                  aria-label="Scrub 緩衝秒數"
                  @change="applyScrubValue"
                />
              </label>
              <label class="day-05-marker-toggle">
                <input v-model="showMarkers" type="checkbox" />
                <span>MARKERS</span>
              </label>
              <strong aria-live="polite">{{ sceneNumber }} / 05</strong>
            </div>
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
