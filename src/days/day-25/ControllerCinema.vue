<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";

const host = ref(null);
const ready = ref(false);
const error = ref("");
const loading = ref("正在載入控制器模型");
const progress = ref(0);
const playing = ref(false);
const elapsed = ref(0);
const shots = [
  {
    en: "THE FORM",
    text: "熟悉的輪廓，進入遊戲之前。",
    x: 0,
    y: 3.1,
    z: 5.9,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE INPUT",
    text: "靠近搖桿與每一次精準輸入。",
    x: 0,
    y: 4,
    z: 1,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE PROFILE",
    text: "沿著握把，讀出力量的曲線。",
    x: 4,
    y: 1,
    z: 1,
    tx: 0.55,
    ty: -0.1,
    tz: 0,
  },
  {
    en: "THE TRIGGER",
    text: "越過肩鍵，轉向背面的控制。",
    x: 5,
    y: 5,
    z: -2,
    tx: 0,
    ty: 0,
    tz: 0,
  },
  {
    en: "THE FORM",
    text: "準備就緒，回到遊戲中心。",
    x: 0,
    y: 3.1,
    z: 5.9,
    tx: 0,
    ty: 0,
    tz: 0,
  },
];
const shotIndex = computed(() =>
  Math.min(
    4,
    Math.floor(Math.max(0, elapsed.value - 1) / 4) +
      (elapsed.value >= 1 ? 1 : 0),
  ),
);
const shot = computed(() => shots[shotIndex.value]);
const stateText = computed(() =>
  !ready.value
    ? "準備中"
    : playing.value
      ? "播放中"
      : elapsed.value >= 18
        ? "播放完畢"
        : "已暫停",
);
let renderer,
  scene,
  camera,
  model,
  timeline,
  observer,
  environment,
  disposed = false;
const abort = new AbortController();
const pose = { ...shots[0] };
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function render() {
  if (!renderer || disposed) return;
  const mobileScale = camera.aspect < 0.8 ? 1.28 : 1;
  camera.position.set(
    pose.x * mobileScale,
    pose.y * mobileScale,
    pose.z * mobileScale,
  );
  camera.lookAt(pose.tx, pose.ty, pose.tz);
  renderer.render(scene, camera);
}
function pause() {
  timeline?.pause();
  playing.value = false;
}
function play() {
  if (!ready.value || error.value) return;
  if (elapsed.value >= 18) timeline.restart();
  else timeline.play();
  playing.value = true;
}
function replay() {
  if (ready.value && !error.value) {
    timeline.restart();
    playing.value = true;
  }
}
function resize() {
  if (!renderer || !host.value) return;
  const { width, height } = host.value.getBoundingClientRect();
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  render();
}
function visibility() {
  if (document.hidden) pause();
}
function motionChange() {
  if (reduced.matches) pause();
}
function contextLost(event) {
  event.preventDefault();
  pause();
  error.value = "3D 顯示已中斷，請重新整理頁面。";
}
function disposeModel(root) {
  const materials = new Set();
  root?.traverse((object) => {
    object.geometry?.dispose();
    if (object.material)
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach((m) => materials.add(m));
  });
  materials.forEach((m) => m.dispose());
}

onMounted(async () => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x080a10, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute("aria-label", "遊戲控制器產品運鏡展示");
    renderer.domElement.setAttribute("role", "img");
    host.value.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x111522, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-4, 6, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5b9dff, 4.5);
    rim.position.set(5, 2, -5);
    scene.add(rim);
    observer = new ResizeObserver(resize);
    observer.observe(host.value);
    resize();
    const response = await fetch(
      `${import.meta.env.BASE_URL}models/controller/controller.bin`,
      { signal: abort.signal },
    );
    if (!response.ok) throw new Error(`模型下載失敗 (${response.status})`);
    const total = Number(response.headers.get("content-length"));
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total)
        progress.value = Math.min(95, Math.round((loaded / total) * 95));
    }
    loading.value = "正在準備材質與光線";
    const buffer = await new Response(
      new Blob(chunks).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
    if (disposed) return;
    const result = await new GLTFLoader().parseAsync(buffer, "");
    if (disposed) {
      disposeModel(result.scene);
      return;
    }
    model = result.scene;
    const materialCache = new Map();
    model.traverse((object) => {
      if (!object.isMesh) return;
      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const replacements = sourceMaterials.map((source) => {
        const name = source.name.toLowerCase();
        if (materialCache.has(name)) return materialCache.get(name);
        let options = { color: 0x171a23, roughness: 0.38, metalness: 0.08 };
        if (name.includes("white"))
          options = { color: 0xd9dce3, roughness: 0.24, metalness: 0.04 };
        else if (name.includes("emission"))
          options = {
            color: 0x4a8eff,
            emissive: 0x226dff,
            emissiveIntensity: 3,
            roughness: 0.3,
          };
        else if (name.includes("glas"))
          options = {
            color: 0x75809a,
            roughness: 0.12,
            metalness: 0.15,
            transparent: true,
            opacity: 0.72,
          };
        else if (
          name.includes("contact") ||
          name === "usb" ||
          name.includes("logo")
        )
          options = { color: 0x8791a5, roughness: 0.2, metalness: 0.82 };
        const replacement = new THREE.MeshStandardMaterial({
          ...options,
          name: source.name,
        });
        materialCache.set(name, replacement);
        return replacement;
      });
      object.material = Array.isArray(object.material)
        ? replacements
        : replacements[0];
      sourceMaterials.forEach((source) => source.dispose());
    });
    // Blender stores the controller face on its Z-up plane. Rotate that plane
    // toward the camera so the opening shot reads like a product photograph.
    const modelRotation = new THREE.Euler(Math.PI / 2 - 0.45, 0, 0);
    model.rotation.copy(modelRotation);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 4.6 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    scene.add(model);
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    timeline = gsap.timeline({
      paused: true,
      defaults: { ease: "power2.inOut" },
      onUpdate() {
        elapsed.value = timeline.time();
        render();
      },
      onComplete() {
        playing.value = false;
      },
    });
    timeline.to(pose, { duration: 1, x: shots[0].x }, 0);
    shots.slice(1).forEach((next, index) => {
      const start = 1 + index * 4;
      timeline.addLabel(next.en + index, start);
      timeline.to(
        pose,
        {
          x: next.x,
          y: next.y,
          z: next.z,
          tx: next.tx,
          ty: next.ty,
          tz: next.tz,
          duration: 3,
        },
        start,
      );
      timeline.to(pose, { duration: 1, x: next.x }, start + 3);
    });
    timeline.to(pose, { duration: 1, x: shots[0].x }, 17);
    progress.value = 100;
    ready.value = true;
    render();
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", motionChange);
    if (!reduced.matches && !document.hidden) play();
  } catch (cause) {
    if (!disposed) {
      error.value = "無法載入 3D 產品，請重新整理頁面再試一次。";
      console.error(cause);
    }
  }
});
onBeforeUnmount(() => {
  disposed = true;
  abort.abort();
  timeline?.kill();
  observer?.disconnect();
  document.removeEventListener("visibilitychange", visibility);
  reduced.removeEventListener("change", motionChange);
  renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
  disposeModel(model);
  environment?.dispose();
  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>

<template>
  <section class="day-25-cinema" aria-label="遊戲控制器產品展示">
    <div ref="host" class="day-25-viewport"></div>
    <div
      v-if="!ready || error"
      class="day-25-loading"
      role="status"
      aria-live="polite"
    >
      <span class="day-25-loading-brand">player / one</span>
      <span class="day-25-loading-number"
        >{{ error ? "—" : String(progress).padStart(2, "0")
        }}<small v-if="!error">%</small></span
      >
      <p>{{ error || loading }}</p>
      <div class="day-25-loading-track" v-if="!error">
        <span :style="{ transform: `scaleX(${progress / 100})` }"></span>
      </div>
    </div>
    <footer class="day-25-footer">
      <div class="day-25-caption" aria-live="polite">
        <span
          >{{ String(shotIndex + 1).padStart(2, "0") }} / 05 —
          {{ shot.en }}</span
        >
        <p>{{ shot.text }}</p>
      </div>
      <div class="day-25-player">
        <div class="day-25-playback" role="group" aria-label="運鏡播放控制">
          <button
            aria-label="播放"
            title="播放"
            :disabled="!ready || playing || !!error"
            @click="play"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5 19 12 8 19Z" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            aria-label="暫停"
            title="暫停"
            :disabled="!ready || !playing || !!error"
            @click="pause"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6v12M15 6v12" />
            </svg>
          </button>
          <button
            aria-label="重播"
            title="重播"
            :disabled="!ready || !!error"
            @click="replay"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 9a7 7 0 1 1 0 6M5 4v5h5" />
            </svg>
          </button>
        </div>
        <div class="day-25-time">
          <span aria-live="polite">{{ stateText }}</span
          ><span>{{ elapsed.toFixed(0).padStart(2, "0") }} / 18 s</span>
        </div>
        <div
          class="day-25-progress"
          role="progressbar"
          aria-label="運鏡進度"
          :aria-valuenow="Math.round(elapsed)"
          :aria-valuemin="0"
          :aria-valuemax="18"
        >
          <span :style="{ transform: `scaleX(${elapsed / 18})` }"></span>
        </div>
      </div>
    </footer>
  </section>
</template>
