<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { loadAmmo } from "./loadAmmo";
import { gsap } from "gsap";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import LabNav from "@/components/LabNav.vue";
import { createSoftWorld } from "./softWorld";
import "./day-24.css";
import groundSource from "./groundExample.js?raw";

// 沿用 Day 21 的文字分段上色，透過插值保留原始碼，不解析 HTML。
const groundTokens = [];
const syntax = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(const|let|new|export|function|return|for)\b|(\b\d+(?:\.\d+)?\b|\.\d+\b)|\b([A-Za-z_$][\w$]*)(?=\s*\()/g;
let sourceOffset = 0;
for (const match of groundSource.matchAll(syntax)) {
  if (match.index > sourceOffset) groundTokens.push({ text: groundSource.slice(sourceOffset, match.index) });
  const kind = match[1] ? "comment" : match[2] ? "literal" : match[3] ? "keyword" : match[4] ? "literal" : "function";
  groundTokens.push({ text: match[0], kind });
  sourceOffset = match.index + match[0].length;
}
groundTokens.push({ text: groundSource.slice(sourceOffset) });

const canvas = ref(null),
  ready = ref(false),
  error = ref(""),
  paused = ref(false);
const status = ref("正在載入物理引擎"),
  pokes = ref(0),
  height = ref("0.00"),
  wire = ref(false);
let renderer,
  scene,
  camera,
  physics,
  ball,
  observer,
  environment,
  frame = 0,
  disposed = false;
let last = 0,
  accumulator = 0,
  elapsed = 0,
  lastStatus = 0,
  tween,
  patch = [],
  direction;
const pressure = { value: 0 };
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
const center = new THREE.Vector3();
function poke(point) {
  if (!ready.value || paused.value || error.value) return;
  physics.geometry.boundingBox.getCenter(center);
  direction = center.clone().sub(point).normalize();
  patch = physics.select(point);
  if (!patch.length) return;
  tween?.kill();
  pressure.value = 0;
  pokes.value++;
  status.value = "按壓中";
  tween = gsap.to(pressure, {
    value: 36,
    duration: 0.16,
    ease: "power2.out",
    onComplete() {
      status.value = "緩慢恢復中";
      tween = gsap.to(pressure, {
        value: 0,
        duration: 1.8,
        ease: "power2.inOut",
      });
    },
  });
}
function click(event) {
  if (!ready.value) return;
  const rect = canvas.value.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObject(ball)[0];
  if (hit) poke(hit.point);
}
function pokeFront() {
  if (!ready.value) return;
  physics.geometry.boundingBox.getCenter(center);
  ray.set(camera.position, center.clone().sub(camera.position).normalize());
  const hit = ray.intersectObject(ball)[0];
  if (hit) poke(hit.point);
}
function reset() {
  if (!ready.value) return;
  tween?.kill();
  pressure.value = 0;
  patch = [];
  elapsed = 0;
  accumulator = 0;
  paused.value = false;
  pokes.value = 0;
  physics.reset();
  status.value = "自由落下中";
}
function togglePause() {
  paused.value = !paused.value;
  if (paused.value) tween?.pause();
  else tween?.resume();
}
function toggleWire() {
  wire.value = !wire.value;
  ball.material.wireframe = wire.value;
}
function lost(event) {
  event.preventDefault();
  error.value = "WebGL 連線中斷，請重新整理頁面。";
  cancelAnimationFrame(frame);
  tween?.kill();
}
function tick(now) {
  if (disposed || error.value) return;
  frame = requestAnimationFrame(tick);
  const delta = Math.min((now - (last || now)) / 1000, 0.05);
  last = now;
  if (!paused.value && !document.hidden) {
    accumulator += delta;
    while (accumulator >= 1 / 120) {
      if (pressure.value > 0 && direction)
        physics.press(patch, direction, pressure.value);
      physics.step(1 / 120);
      accumulator -= 1 / 120;
      elapsed += 1 / 120;
    }
  }
  if (now - lastStatus > 200) {
    physics.geometry.boundingBox.getCenter(center);
    height.value = center.y.toFixed(2);
    if (!tween?.isActive() && !paused.value)
      status.value =
        elapsed < 0.85
          ? "自由落下中"
          : elapsed < 4
            ? "落地回彈中"
            : "點擊球面，試試柔軟手感";
    lastStatus = now;
  }
  renderer.render(scene, camera);
}
function visibility() {
  if (document.hidden) tween?.pause();
  else if (!paused.value) tween?.resume();
  last = 0;
  accumulator = 0;
}
onMounted(async () => {
  try {
    const A = await loadAmmo();
    if (disposed) return;
    renderer = new THREE.WebGLRenderer({
      canvas: canvas.value,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 2.2, 0);
    scene.add(new THREE.HemisphereLight("#ffffff", "#52616f", 2));
    const light = new THREE.DirectionalLight("#fff3df", 3);
    light.position.set(-3, 7, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, {
      left: -7,
      right: 7,
      top: 8,
      bottom: -7,
    });
    light.shadow.normalBias = 0.03;
    scene.add(light);
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(24, 24, "#899b8a", "#aab5b8");
    grid.position.y = -0.008;
    scene.add(grid);
    physics = createSoftWorld(A);
    physics.reset(
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 1.55 : 5.5,
    );
    ball = new THREE.Mesh(
      physics.geometry,
      new THREE.MeshPhysicalMaterial({
        color: "#c97958",
        roughness: 0.32,
        metalness: 0,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
      }),
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);
    observer = new ResizeObserver(() => {
      const { width, height } = canvas.value.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 0.8 ? 13 : 10;
      camera.lookAt(0, 2.2, 0);
      camera.updateProjectionMatrix();
    });
    observer.observe(canvas.value);
    canvas.value.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visibility);
    ready.value = true;
    status.value = "自由落下中";
    frame = requestAnimationFrame(tick);
  } catch (reason) {
    console.error(reason);
    error.value = "無法啟動軟球展示，請確認瀏覽器支援 WebGL 後重新整理。";
  }
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  tween?.kill();
  observer?.disconnect();
  document.removeEventListener("visibilitychange", visibility);
  canvas.value?.removeEventListener("webglcontextlost", lost);
  scene?.traverse((object) => {
    if (object.geometry && object !== ball) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((m) => m.dispose());
    }
  });
  physics?.dispose();
  environment?.dispose();
  renderer?.dispose();
});
</script>

<template>
  <main class="day-page day-24-page">
    <LabNav />
    <section class="experiment">
      <header class="section-heading">
        <div>
          <p>AMMO.JS / SOFT BODY PHYSICS</p>
          <h2><span class="heading-english">Ammo.js </span> 物理引擎</h2>
        </div>
        <span class="day-24-tag">柔軟球體實驗</span>
      </header>
      <div class="day-24-layout">
        <div class="day-24-stage" :aria-busy="!ready && !error">
          <span class="day-24-caption">SOFT SPHERE / 01</span>
          <canvas
            ref="canvas"
            class="day-24-canvas"
            aria-label="柔軟球體，可點擊球面按壓，也可使用下方戳一下按鈕"
            @pointerdown="click"
          />
          <div v-if="!ready || error" class="day-24-overlay" role="status">
            {{ error || status }}
          </div>
          <span class="day-24-hint">點擊球面 · 觸控也可以</span>
        </div>
        <aside class="day-24-panel">
          <p class="day-24-panel-label">球體觀察</p>
          <strong class="day-24-state" aria-live="polite">{{
            paused ? "已暫停" : status
          }}</strong>
          <dl>
            <div>
              <dt>中心高度</dt>
              <dd>{{ height }} <small>m</small></dd>
            </div>
            <div>
              <dt>按壓次數</dt>
              <dd>{{ String(pokes).padStart(2, "0") }}</dd>
            </div>
          </dl>
          <p>
            落地時，接觸面先受壓，形變沿著球面傳遞，再由彈性與內部壓力撐回。
          </p>
          <p>切換線框，可以看見每一塊表面如何被拉動。</p>
          <span class="day-24-engine"
            >Ammo.js 計算形變<br />GSAP 控制施力與釋放</span
          >
        </aside>
      </div>
      <div class="controls">
        <button
          class="primary-action"
          :disabled="!ready || !!error"
          @click="reset"
        >
          重新落下
        </button>
        <button
          class="secondary-action"
          :disabled="!ready || paused || !!error"
          @click="pokeFront"
        >
          戳一下
        </button>
        <button
          class="secondary-action"
          :disabled="!ready || !!error"
          :aria-pressed="paused"
          @click="togglePause"
        >
          {{ paused ? "繼續模擬" : "暫停模擬" }}
        </button>
        <button
          class="secondary-action"
          :disabled="!ready || !!error"
          :aria-pressed="wire"
          @click="toggleWire"
        >
          {{ wire ? "隱藏線框" : "顯示線框" }}
        </button>
      </div>
      <section class="day-24-ground-note" aria-labelledby="day-24-ground-title">
        <header class="section-heading">
          <div>
            <p>AMMO.JS / GROUND COLLISION</p>
            <h2 id="day-24-ground-title">真正擋住球體的地面在哪裡？</h2>
          </div>
        </header>
        <p>畫面中的地平面網格由 Three.js 的 <code>GridHelper</code> 繪製，只是視覺參考。真正擋住球體的是 Ammo.js 裡的 <code>btBoxShape</code>，它是一個固定不動的箱形碰撞體。</p>
        <p>箱體厚度為 0.5，中心設在 <code>y = -0.25</code>，因此頂面剛好位於 <code>y = 0</code>。透過 <code>world.addRigidBody(ground)</code> 加入物理世界後，才能參與碰撞。</p>
        <pre class="day-24-code" tabindex="0" role="region" aria-label="建立地面碰撞體的 JavaScript 程式碼"><code><span v-for="(token, index) in groundTokens" :key="index" :class="token.kind ? `day-24-code-${token.kind}` : undefined">{{ token.text }}</span></code></pre>
        <p class="day-24-ground-footnote">Demo 會追蹤這些自行建立的 Ammo.js 物件，並在離開頁面時移除剛體、依序釋放資源。</p>
      </section>
    </section>
  </main>
</template>
