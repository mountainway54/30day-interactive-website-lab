<script setup>
import { computed, ref } from "vue";
import LabNav from "@/components/LabNav.vue";
import SceneDemo from "./SceneDemo.vue";
import {
  controls,
  defaults,
  sanitize,
  switchProjection,
} from "./scene-model.js";
import "./day-00.css";

const parameters = ref(defaults());
const renderStatus = ref({ ready: false, message: "" });
const projectionLimited = ref(false);
const projectionLabel = computed(() =>
  parameters.value.projection === "perspective" ? "透視投影" : "正交投影",
);
const groups = computed(() => [
  {
    id: "camera",
    title: "視角",
    english: "CAMERA",
    hint: "物件不動，改變你觀察它的位置。",
    keys: ["azimuth", "elevation", "distance"],
  },
  {
    id: "projection",
    title: "投影",
    english: "PROJECTION",
    hint: "把三維空間轉成平面畫面的方式。",
    keys: [parameters.value.projection === "perspective" ? "fov" : "span"],
  },
  {
    id: "light",
    title: "光照",
    english: "LIGHT",
    hint: "同一種材質，平面與曲面有不同的明暗。",
    keys: ["lightAzimuth", "lightElevation", "intensity"],
  },
]);
const controlCount = computed(() =>
  String(
    groups.value.reduce((sum, group) => sum + group.keys.length, 0),
  ).padStart(2, "0"),
);

function disabled(key) {
  return (
    !renderStatus.value.ready ||
    (key === "fov" && parameters.value.projection !== "perspective") ||
    (key === "span" && parameters.value.projection !== "orthographic")
  );
}
function display(key) {
  const digits =
    controls[key].step === 0.01 ? 2 : controls[key].step < 1 ? 1 : 0;
  return parameters.value[key].toFixed(digits);
}
function change(key, event) {
  parameters.value = {
    ...parameters.value,
    [key]: sanitize(key, event.target.value, parameters.value[key]),
  };
  event.target.value = parameters.value[key];
}
function keyChange(key, event) {
  if (disabled(key)) return;
  const { min, max, step } = controls[key];
  const value = parameters.value[key];
  const keys = {
    ArrowRight: value + step,
    ArrowUp: value + step,
    ArrowLeft: value - step,
    ArrowDown: value - step,
    Home: min,
    End: max,
    PageUp: value + step * 10,
    PageDown: value - step * 10,
  };
  if (!(event.key in keys)) return;
  event.preventDefault();
  parameters.value = {
    ...parameters.value,
    [key]: sanitize(key, Number(keys[event.key].toFixed(2)), value),
  };
}
function cameraChange(angles) {
  parameters.value = {
    ...parameters.value,
    azimuth: sanitize("azimuth", angles.azimuth, parameters.value.azimuth),
    elevation: sanitize(
      "elevation",
      angles.elevation,
      parameters.value.elevation,
    ),
  };
}
function projectionChange(projection) {
  if (parameters.value.projection === projection) return;
  const result = switchProjection(parameters.value, projection);
  parameters.value = result.state;
  projectionLimited.value = result.limited;
}
</script>

<template>
  <main class="day-page day-00-page">
    <LabNav />
    <section
      class="experiment day-00-experiment"
      aria-labelledby="day-00-title"
    >
      <header class="section-heading">
        <div>
          <p>WEBGL / LIGHT · PROJECTION · CAMERA</p>
          <h2 id="day-00-title">光照、投影與視角</h2>
        </div>
      </header>

      <div class="day-00-layout">
        <div class="day-00-observation">
          <div class="day-00-stage">
            <div class="day-00-stage-heading">
              <span>SCENE / 02 OBJECTS</span>
              <span>{{ projectionLabel }}</span>
            </div>
            <SceneDemo
              :parameters="parameters"
              @camera-change="cameraChange"
              @status="renderStatus = $event"
            />
            <p
              v-if="!renderStatus.ready && renderStatus.message"
              class="day-00-scene-error"
              role="status"
              aria-live="polite"
            >
              {{ renderStatus.message }}
            </p>
            <p id="day-00-drag-help" class="day-00-drag-help">
              拖曳移動相機 · 也可用右側或下方的視角滑桿操作
            </p>
            <div class="day-00-legend">
              <span class="day-00-light-key">↘</span>
              紅色箭頭＝光線行進方向，不是燈泡位置
            </div>
          </div>
        </div>

        <aside class="day-00-panel" aria-label="場景參數">
          <header class="day-00-panel-heading">
            <span>SCENE CONTROL</span>
            <strong>{{ controlCount }} PARAMS</strong>
          </header>
          <section
            v-for="group in groups"
            :key="group.id"
            class="day-00-control-group"
            :aria-labelledby="`day-00-${group.id}`"
          >
            <h3 :id="`day-00-${group.id}`">
              {{ group.title }} <span>{{ group.english }}</span>
            </h3>
            <p class="day-00-group-hint">{{ group.hint }}</p>
            <div
              v-if="group.id === 'projection'"
              class="day-00-projection-buttons"
              aria-label="投影方式"
            >
              <button
                type="button"
                :aria-pressed="parameters.projection === 'perspective'"
                :disabled="!renderStatus.ready"
                @click="projectionChange('perspective')"
              >
                透視
              </button>
              <button
                type="button"
                :aria-pressed="parameters.projection === 'orthographic'"
                :disabled="!renderStatus.ready"
                @click="projectionChange('orthographic')"
              >
                正交
              </button>
            </div>
            <div
              v-for="key in group.keys"
              :key="key"
              class="day-00-control"
              :class="{ 'day-00-control-disabled': disabled(key) }"
            >
              <div class="day-00-control-label">
                <label :for="`day-00-${key}`">{{ controls[key].label }}</label>
                <output :for="`day-00-${key}`" aria-live="off"
                  >{{ display(key)
                  }}<span v-if="controls[key].unit">
                    {{ controls[key].unit }}</span
                  ></output
                >
              </div>
              <input
                :id="`day-00-${key}`"
                type="range"
                :min="controls[key].min"
                :max="controls[key].max"
                :step="controls[key].step"
                :value="parameters[key]"
                :disabled="disabled(key)"
                :aria-valuetext="`${display(key)} ${controls[key].unit}`"
                @input="change(key, $event)"
                @keydown="keyChange(key, $event)"
              />
            </div>
            <p
              v-if="group.id === 'projection'"
              class="day-00-group-footnote"
              aria-live="polite"
            >
              透視調視野角；正交調顯示範圍。
              <span v-if="projectionLimited"
                >換算值超出可調範圍，已限制至邊界。</span
              >
            </p>
            <p v-if="group.id === 'light'" class="day-00-group-footnote">
              方向光 · 方位 0° 位於 +Z 側，正角度朝 +X
              側；仰角越大，光越從上方照來。
            </p>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>
