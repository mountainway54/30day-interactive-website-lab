<script setup>
import {
  computed,
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from "vue";
import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import LabNav from "@/components/LabNav.vue";
import modelSource from "../../../docs/3d/8660/143. Snorlax/snorlax.obj?raw";
import { presets } from "./materials";
import { createMergedModel } from "./mergedModel";
import "./day-23.css";

const canvas = ref(null),
  selected = ref(presets[0].id),
  active = ref("");
const ready = ref(false),
  busy = ref(false),
  error = ref(""),
  fatal = ref(false);
const current = computed(() => presets.find((p) => p.id === selected.value));
const activeLabel = computed(
  () => presets.find((p) => p.id === active.value)?.label ?? "尚未套用",
);
const settings = reactive({ repeat: 1, normal: 1, roughness: 1, metalness: 1 });
const sliders = [
  { key: "repeat", label: "UV 重複", min: 0.25, max: 4, step: 0.25 },
  { key: "normal", label: "法線強度", min: 0, max: 2, step: 0.05 },
  { key: "roughness", label: "粗糙度倍率", min: 0, max: 1, step: 0.05 },
  { key: "metalness", label: "金屬度倍率", min: 0, max: 1, step: 0.05 },
];
let renderer,
  scene,
  camera,
  orbit,
  observer,
  model,
  environment,
  material,
  maps,
  disposed = false,
  request = 0;
const cache = new Map(),
  resources = new Set();
function draw() {
  if (!disposed && renderer && !fatal.value) renderer.render(scene, camera);
}
function update() {
  if (!material || !maps) return;
  maps.forEach((texture) => texture.repeat.setScalar(settings.repeat));
  material.normalScale.setScalar(settings.normal);
  material.roughness = settings.roughness;
  material.metalness = settings.metalness;
  draw();
}
function input(control, event) {
  const value = Number(event.target.value);
  if (Number.isFinite(value))
    settings[control.key] = Math.max(control.min, Math.min(control.max, value));
}
function defaults(preset) {
  Object.assign(settings, {
    repeat: 1,
    normal: 1,
    roughness: 1,
    metalness: preset.metalness,
  });
}
async function loadMaps(preset) {
  if (cache.has(preset.id)) return cache.get(preset.id);
  const pending = (async () => {
    const results = await Promise.allSettled(
      [preset.color, preset.normal, preset.arm].map(async (url, index) => {
        const loader =
          index === 1 ? new EXRLoader() : new THREE.TextureLoader();
        const texture = await loader.loadAsync(url);
        if (disposed) {
          texture.dispose();
          throw new Error("disposed");
        }
        resources.add(texture);
        texture.colorSpace =
          index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        // EXR DataTexture 預設不翻轉，與 OBJ 的一般圖片貼圖統一方向。
        texture.flipY = true;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy(),
        );
        texture.needsUpdate = true;
        return texture;
      }),
    );
    if (results.some((r) => r.status === "rejected")) {
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          r.value.dispose();
          resources.delete(r.value);
        }
      });
      throw new Error("貼圖載入失敗");
    }
    return results.map((r) => r.value);
  })();
  cache.set(preset.id, pending);
  try {
    return await pending;
  } catch (reason) {
    cache.delete(preset.id);
    throw reason;
  }
}
async function choose(preset) {
  selected.value = preset.id;
  if (!ready.value || fatal.value) return;
  const token = ++request;
  busy.value = true;
  error.value = "";
  try {
    const loaded = await loadMaps(preset);
    if (disposed || token !== request || fatal.value) return;
    const [color, normal, arm] = loaded;
    // ARM：R = AO、G = Roughness、B = Metalness，共用同一張非色彩貼圖。
    // 使用法線貼圖呈現細節，避免位移造成模型接縫裂開。
    const next = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: color,
      normalMap: normal,
      roughnessMap: arm,
      metalnessMap: arm,
      aoMap: arm,
      displacementScale: 0,
      displacementBias: 0,
      side: THREE.DoubleSide,
    });
    model.material = next;
    material?.dispose();
    material = next;
    maps = loaded;
    active.value = preset.id;
    defaults(preset);
    update();
  } catch {
    if (!disposed && token === request)
      error.value = "材質載入失敗，保留目前模型。請按下方「重試載入」。";
  } finally {
    if (!disposed && token === request) busy.value = false;
  }
}
function reset() {
  const preset = presets.find((p) => p.id === active.value);
  if (preset) defaults(preset);
  orbit?.reset();
  update();
}
function lost(event) {
  event.preventDefault();
  fatal.value = true;
  busy.value = false;
  if (orbit) orbit.enabled = false;
  error.value = "WebGL 連線中斷，請重新整理頁面。";
}
watch(settings, update);
onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas.value,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(3.5, 2.3, 4.5);
    scene.add(new THREE.HemisphereLight("#ffffff", "#52616f", 1.3));
    const light = new THREE.DirectionalLight("#ffffff", 2.5);
    light.position.set(3, 5, 4);
    scene.add(light);
    const room = new RoomEnvironment(),
      generator = new THREE.PMREMGenerator(renderer);
    try {
      environment = generator.fromScene(room, 0.04);
      scene.environment = environment.texture;
    } finally {
      room.dispose();
      generator.dispose();
    }
    material = new THREE.MeshStandardMaterial({
      color: "#899b8a",
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    model = createMergedModel(modelSource, material);
    scene.add(model);
    orbit = new OrbitControls(camera, canvas.value);
    orbit.minDistance = 2;
    orbit.maxDistance = 15;
    orbit.listenToKeyEvents(canvas.value);
    orbit.addEventListener("change", draw);
    orbit.update();
    orbit.saveState();
    observer = new ResizeObserver(() => {
      const { width, height } = canvas.value.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    });
    observer.observe(canvas.value);
    canvas.value.addEventListener("webglcontextlost", lost);
    ready.value = true;
    choose(current.value);
  } catch {
    fatal.value = true;
    error.value =
      "無法啟動模型展示，請確認瀏覽器支援 WebGL 與硬體加速後重新整理。";
  }
});
onBeforeUnmount(() => {
  disposed = true;
  request++;
  observer?.disconnect();
  orbit?.removeEventListener("change", draw);
  orbit?.dispose();
  canvas.value?.removeEventListener("webglcontextlost", lost);
  model?.geometry.dispose();
  material?.dispose();
  resources.forEach((texture) => texture.dispose());
  cache.clear();
  environment?.dispose();
  renderer?.dispose();
});
</script>

<template>
  <main class="day-page day-23-page">
    <LabNav />
    <section class="experiment">
      <header class="section-heading">
        <div>
          <p>POLY HAVEN / PBR MATERIAL LIBRARY</p>
          <h2>套用材質庫材質</h2>
        </div>
      </header>
      <p class="day-23-intro">
        使用 Day17 的模型，將下載的整套 PBR
        貼圖一起套用。選擇材質，再調整表面細節與紋理尺度。
      </p>
      <div class="day-23-picker" aria-label="選擇材質">
        <button
          v-for="preset in presets"
          :key="preset.id"
          :aria-pressed="selected === preset.id"
          :disabled="!ready || fatal"
          @click="choose(preset)"
        >
          <img :src="preset.color" alt="" /><span
            >{{ preset.label }}<small>{{ preset.id }}</small></span
          >
        </button>
      </div>
      <div class="day-23-workbench">
        <div class="day-23-stage">
          <p class="day-23-caption">SNORLAX / {{ activeLabel }} · 01 網格</p>
          <canvas
            ref="canvas"
            tabindex="0"
            class="day-23-canvas"
            role="img"
            aria-label="可旋轉縮放的卡比獸材質預覽"
            aria-describedby="day-23-help"
          />
          <p id="day-23-help" class="day-23-caption">
            拖曳旋轉 · 滾輪縮放 · 右鍵／方向鍵平移<br />觸控：單指旋轉，雙指平移與縮放。
          </p>
        </div>
        <aside class="day-23-panel" aria-label="材質參數">
          <div
            v-for="control in sliders"
            :key="control.key"
            class="day-23-control"
          >
            <label :for="`day-23-${control.key}`"
              >{{ control.label
              }}<output>{{ settings[control.key].toFixed(2) }}</output></label
            ><input
              :id="`day-23-${control.key}`"
              type="range"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              :value="settings[control.key]"
              :disabled="!active || busy || fatal"
              @input="input(control, $event)"
            />
          </div>
          <p class="day-23-hint">
            粗糙度與金屬度為貼圖倍率。表面細節使用法線貼圖，保留模型原本的輪廓。
          </p>
          <p class="day-23-status" role="status" aria-live="polite">
            {{
              busy
                ? `正在載入${current.label}…`
                : error || `目前材質：${activeLabel}`
            }}<br />{{ active ? "03 張貼圖 / 1K" : "正在準備模型" }}
          </p>
        </aside>
      </div>
      <div class="controls">
        <button
          class="secondary-action"
          :disabled="!active || busy || fatal"
          @click="reset"
        >
          重設材質參數與視角</button
        ><button
          class="secondary-action"
          :disabled="!error || busy || fatal"
          @click="choose(current)"
        >
          重試載入
        </button>
      </div>
      <div class="day-23-details">
        <div>
          <h3>這套材質用了哪些貼圖？</h3>
          <p>
            Diffuse 提供顏色；Normal GL（EXR）提供表面方向；ARM 將
            AO、粗糙度與金屬度存進 R、G、B 通道。本 Demo 不使用位移貼圖。
          </p>
          <p>
            保留原模型
            UV；重複次數會同步套用到所有貼圖。材質切換後回到該素材的預設參數。
          </p>
        </div>
        <div>
          <h3>素材來源</h3>
          <a :href="current.source" target="_blank" rel="noopener"
            >{{ current.id }} ↗</a
          >
          <p>Poly Haven · CC0<br />此處授權說明僅指材質貼圖。</p>
        </div>
      </div>
    </section>
  </main>
</template>
