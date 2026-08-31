<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const canvas = ref(null);
const ready = ref(false);
const status = ref("");
const interaction = ref("等待操作");

const INITIAL = Object.freeze({
  modelPitch: -0.4,
  modelYaw: 0.6,
  cameraPitch: 0,
  cameraYaw: 0,
});
const angles = reactive({ ...INITIAL });
const coordinates = reactive({
  model: [1, 1, 1],
  world: [0, 0, 0],
  view: [0, 0, 0],
  clip: [0, 0, 0, 0],
  ndc: [0, 0, 0],
  screen: [0, 0],
});
let gl;
let program;
let buffer;
let observer;
let drag;
let modelLocation;
let viewLocation;
let projectionLocation;
let highlightLocation;
const shaders = [];

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform bool u_highlight;
varying vec3 v_color;
void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);
  vec3 normal = mat3(u_model) * a_normal;
  float light = 0.55 + 0.45 * max(dot(normal, normalize(vec3(-1.0, 2.0, 3.0))), 0.0);
  v_color = a_color * light;
  gl_Position = u_projection * u_view * worldPosition;
  gl_PointSize = u_highlight ? 18.0 : 1.0;
}`;

const fragmentSource = `
precision mediump float;
varying vec3 v_color;
uniform bool u_highlight;
void main() {
  if (u_highlight) {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) discard;
    vec3 pointColor = distanceToCenter < 0.25
      ? vec3(0.965, 0.945, 0.902)
      : vec3(0.776, 0.239, 0.184);
    gl_FragColor = vec4(pointColor, 1.0);
    return;
  }
  gl_FragColor = vec4(v_color, 1.0);
}`;

const rows = computed(() => [
  {
    key: "model",
    number: "01",
    name: "Model Space 模型空間",
    note: "模型內固定",
    values: coordinates.model,
    suffix: "",
  },
  {
    key: "world",
    number: "02",
    name: "WORLD",
    note: "× Model Matrix",
    values: coordinates.world,
    suffix: "",
  },
  {
    key: "view",
    number: "03",
    name: "VIEW",
    note: "× View Matrix",
    values: coordinates.view,
    suffix: "",
  },
  {
    key: "clip",
    number: "04",
    name: "CLIP",
    note: "× Projection Matrix",
    values: coordinates.clip,
    suffix: "",
  },
  {
    key: "ndc",
    number: "05",
    name: "NDC",
    note: "xyz ÷ w",
    values: coordinates.ndc,
    suffix: "",
  },
  {
    key: "screen",
    number: "06",
    name: "SCREEN",
    note: "Viewport Mapping",
    values: coordinates.screen,
    suffix: " px",
  },
]);

const modelAngleLabel = computed(
  () => `${degrees(angles.modelYaw)}° / ${degrees(angles.modelPitch)}°`,
);
const cameraAngleLabel = computed(
  () => `${degrees(angles.cameraYaw)}° / ${degrees(angles.cameraPitch)}°`,
);

function degrees(value) {
  return Math.round((value * 180) / Math.PI);
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toFixed(digits);
}

function formatValues(row) {
  const digits = row.key === "screen" ? 0 : 2;
  return `(${row.values.map((value) => formatNumber(value, digits)).join(", ")})${row.suffix}`;
}

function mat4Multiply(a, b) {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      result[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3];
    }
  }
  return result;
}

function transformPoint(matrix, point) {
  return [0, 1, 2, 3].map(
    (row) =>
      matrix[row] * point[0] +
      matrix[4 + row] * point[1] +
      matrix[8 + row] * point[2] +
      matrix[12 + row] * point[3],
  );
}

function rotationX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lookAt(eye, target = [0, 0, 0]) {
  const z = normalize([
    eye[0] - target[0],
    eye[1] - target[1],
    eye[2] - target[2],
  ]);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1,
  ]);
}

function getMatrices(aspect = 1) {
  const model = mat4Multiply(
    rotationY(angles.modelYaw),
    rotationX(angles.modelPitch),
  );
  const radius = 4.8;
  const cameraCos = Math.cos(angles.cameraPitch);
  const eye = [
    Math.sin(angles.cameraYaw) * cameraCos * radius,
    Math.sin(angles.cameraPitch) * radius,
    Math.cos(angles.cameraYaw) * cameraCos * radius,
  ];
  const view = lookAt(eye);
  const near = 0.1;
  const far = 100;
  const f = 1 / Math.tan(Math.PI / 8);
  const projection = new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
  return { model, view, projection };
}

function updateCoordinates(matrices) {
  const modelPoint = [1, 1, 1, 1];
  const worldPoint = transformPoint(matrices.model, modelPoint);
  const viewPoint = transformPoint(matrices.view, worldPoint);
  const clipPoint = transformPoint(matrices.projection, viewPoint);
  const ndcPoint = clipPoint.slice(0, 3).map((value) => value / clipPoint[3]);
  const cssWidth = canvas.value?.clientWidth || 1;
  const cssHeight = canvas.value?.clientHeight || 1;
  const screenPoint = [
    (ndcPoint[0] + 1) * 0.5 * cssWidth,
    (1 - ndcPoint[1]) * 0.5 * cssHeight,
  ];
  coordinates.model = modelPoint.slice(0, 3);
  coordinates.world = worldPoint.slice(0, 3);
  coordinates.view = viewPoint.slice(0, 3);
  coordinates.clip = clipPoint;
  coordinates.ndc = ndcPoint;
  coordinates.screen = screenPoint;
}

function compile(type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("無法建立著色器");
  shaders.push(shader);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      `著色器編譯失敗：${gl.getShaderInfoLog(shader) || "未知錯誤"}`,
    );
  }
  return shader;
}

function release() {
  if (!gl) return;
  if (buffer) gl.deleteBuffer(buffer);
  if (program) gl.deleteProgram(program);
  shaders.forEach((shader) => gl.deleteShader(shader));
  shaders.length = 0;
  buffer = null;
  program = null;
}

function draw() {
  if (!ready.value || !gl || gl.isContextLost()) return;
  const displayWidth = Math.max(1, canvas.value.clientWidth);
  const displayHeight = Math.max(1, canvas.value.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(displayWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(displayHeight * dpr));
  if (
    canvas.value.width !== pixelWidth ||
    canvas.value.height !== pixelHeight
  ) {
    canvas.value.width = pixelWidth;
    canvas.value.height = pixelHeight;
  }

  const matrices = getMatrices(displayWidth / displayHeight);
  gl.viewport(0, 0, pixelWidth, pixelHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniformMatrix4fv(modelLocation, false, matrices.model);
  gl.uniformMatrix4fv(viewLocation, false, matrices.view);
  gl.uniformMatrix4fv(projectionLocation, false, matrices.projection);
  gl.uniform1i(highlightLocation, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // 追蹤點即使位於背面也保持可見，讓投影後的位置能持續被觀察。
  gl.disable(gl.DEPTH_TEST);
  gl.uniform1i(highlightLocation, 1);
  gl.drawArrays(gl.POINTS, 2, 1);
  gl.enable(gl.DEPTH_TEST);
  updateCoordinates(matrices);
}

function initialize() {
  try {
    gl = canvas.value.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: true,
    });
    if (!gl) throw new Error("無法啟用 WebGL，請確認硬體加速設定");
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error("無法建立 WebGL 程式");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        `著色器連結失敗：${gl.getProgramInfoLog(program) || "未知錯誤"}`,
      );
    }
    gl.useProgram(program);

    const faces = [
      {
        n: [0, 0, 1],
        p: [
          [-1, -1, 1],
          [1, -1, 1],
          [1, 1, 1],
          [-1, 1, 1],
        ],
      },
      {
        n: [0, 0, -1],
        p: [
          [1, -1, -1],
          [-1, -1, -1],
          [-1, 1, -1],
          [1, 1, -1],
        ],
      },
      {
        n: [1, 0, 0],
        p: [
          [1, -1, 1],
          [1, -1, -1],
          [1, 1, -1],
          [1, 1, 1],
        ],
      },
      {
        n: [-1, 0, 0],
        p: [
          [-1, -1, -1],
          [-1, -1, 1],
          [-1, 1, 1],
          [-1, 1, -1],
        ],
      },
      {
        n: [0, 1, 0],
        p: [
          [-1, 1, 1],
          [1, 1, 1],
          [1, 1, -1],
          [-1, 1, -1],
        ],
      },
      {
        n: [0, -1, 0],
        p: [
          [-1, -1, -1],
          [1, -1, -1],
          [1, -1, 1],
          [-1, -1, 1],
        ],
      },
    ];
    const vertices = [];
    for (const face of faces) {
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const position = face.p[index];
        const color = position[1] > 0 ? [0.91, 0.35, 0.68] : [0.22, 0.17, 0.79];
        vertices.push(...position, ...color, ...face.n);
      }
    }

    buffer = gl.createBuffer();
    if (!buffer) throw new Error("無法建立頂點資料");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    for (const [name, offset] of [
      ["a_position", 0],
      ["a_color", 12],
      ["a_normal", 24],
    ]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset);
    }

    modelLocation = gl.getUniformLocation(program, "u_model");
    viewLocation = gl.getUniformLocation(program, "u_view");
    projectionLocation = gl.getUniformLocation(program, "u_projection");
    highlightLocation = gl.getUniformLocation(program, "u_highlight");
    gl.clearColor(0, 0, 0, 0);
    ready.value = true;
    status.value = "";
    draw();
  } catch (error) {
    ready.value = false;
    status.value = error.message;
    release();
  }
}

function clampCameraPitch(value) {
  const limit = Math.PI * 0.46;
  return Math.max(-limit, Math.min(limit, value));
}

function pointerDown(event) {
  if (!ready.value || drag || (event.button !== 0 && event.button !== 2))
    return;
  event.preventDefault();
  canvas.value.setPointerCapture(event.pointerId);
  drag = {
    id: event.pointerId,
    mode: event.button === 2 ? "camera" : "model",
    x: event.clientX,
    y: event.clientY,
  };
  interaction.value =
    drag.mode === "model" ? "MODEL MATRIX 更新中" : "VIEW MATRIX 更新中";
}

function pointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const scale = (Math.PI * 2) / Math.max(1, canvas.value.clientWidth);
  const deltaX = (event.clientX - drag.x) * scale;
  const deltaY = (event.clientY - drag.y) * scale;
  if (drag.mode === "model") {
    angles.modelYaw += deltaX;
    angles.modelPitch += deltaY;
  } else {
    angles.cameraYaw -= deltaX;
    angles.cameraPitch = clampCameraPitch(angles.cameraPitch + deltaY);
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
  draw();
}

function pointerEnd(event) {
  if (drag?.id !== event.pointerId) return;
  drag = null;
  interaction.value = "等待操作";
  if (canvas.value.hasPointerCapture(event.pointerId))
    canvas.value.releasePointerCapture(event.pointerId);
}

function keyboardRotate(event) {
  const delta = event.shiftKey ? 0.12 : 0.08;
  const isCamera = event.shiftKey;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
    return;
  event.preventDefault();
  const targetYaw = isCamera ? "cameraYaw" : "modelYaw";
  const targetPitch = isCamera ? "cameraPitch" : "modelPitch";
  if (event.key === "ArrowLeft") angles[targetYaw] -= delta;
  if (event.key === "ArrowRight") angles[targetYaw] += delta;
  if (event.key === "ArrowUp") angles[targetPitch] -= delta;
  if (event.key === "ArrowDown") angles[targetPitch] += delta;
  if (isCamera) angles.cameraPitch = clampCameraPitch(angles.cameraPitch);
  interaction.value = isCamera
    ? "鍵盤調整 VIEW MATRIX"
    : "鍵盤調整 MODEL MATRIX";
  draw();
}

function reset() {
  Object.assign(angles, INITIAL);
  interaction.value = "已重設模型與相機";
  draw();
  canvas.value?.focus();
}

function contextLost(event) {
  event.preventDefault();
  ready.value = false;
  drag = null;
  interaction.value = "等待 WebGL 恢復";
  status.value = "WebGL 連線中斷，等待恢復";
}

function contextRestored() {
  release();
  initialize();
}

onMounted(() => {
  initialize();
  observer = new ResizeObserver(draw);
  observer.observe(canvas.value);
  window.addEventListener("resize", draw);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", draw);
  drag = null;
  release();
});
</script>

<template>
  <section class="experiment" aria-labelledby="day-13-title">
    <header class="section-heading">
      <div>
        <p>WEBGL / COORDINATE SPACES</p>
        <h2 id="day-13-title">一個頂點如何走到螢幕上</h2>
      </div>
      <div class="day-13-live-status" aria-live="polite">
        <span aria-hidden="true"></span>{{ interaction }}
      </div>
    </header>

    <p class="day-13-description">
      追蹤立方體的
      <code>(1, 1, 1)</code> 頂點，觀察它經過六個座標空間後，如何成為 Canvas
      上的像素。
    </p>

    <div class="day-13-workbench">
      <div class="day-13-stage">
        <div class="day-13-stage-header">
          <span>TRACKED VERTEX</span>
          <strong>(1, 1, 1)</strong>
        </div>
        <canvas
          ref="canvas"
          class="day-13-canvas"
          tabindex="0"
          role="img"
          aria-label="可旋轉的漸層立方體，紅白圓點標示正在追蹤的頂點"
          aria-describedby="day-13-help"
          @pointerdown="pointerDown"
          @pointermove="pointerMove"
          @pointerup="pointerEnd"
          @pointercancel="pointerEnd"
          @lostpointercapture="pointerEnd"
          @contextmenu.prevent
          @keydown="keyboardRotate"
          @webglcontextlost="contextLost"
          @webglcontextrestored="contextRestored"
        >
          你的瀏覽器不支援 Canvas。
        </canvas>
        <div class="day-13-input-legend" aria-hidden="true">
          <span><i class="day-13-mouse-left"></i>左鍵：旋轉模型</span>
          <span><i class="day-13-mouse-right"></i>右鍵：旋轉相機</span>
        </div>
        <p id="day-13-help" class="day-13-keyboard-help">
          鍵盤：方向鍵旋轉模型；Shift + 方向鍵旋轉相機
        </p>
      </div>

      <aside class="day-13-readout" aria-label="頂點座標轉換結果">
        <div class="day-13-readout-header">
          <span>VERTEX PIPELINE</span>
          <span>LIVE</span>
        </div>
        <ol class="day-13-space-list" aria-live="polite" aria-atomic="true">
          <li
            v-for="row in rows"
            :key="row.key"
            :class="`day-13-space-${row.key}`"
          >
            <span class="day-13-space-number">{{ row.number }}</span>
            <div>
              <div class="day-13-space-title">
                <strong>{{ row.name }}</strong>
                <small>{{ row.note }}</small>
              </div>
              <output>{{ formatValues(row) }}</output>
            </div>
          </li>
        </ol>
        <div class="day-13-angle-readout">
          <div>
            <span>MODEL YAW / PITCH</span><output>{{ modelAngleLabel }}</output>
          </div>
          <div>
            <span>CAMERA YAW / PITCH</span
            ><output>{{ cameraAngleLabel }}</output>
          </div>
        </div>
      </aside>
    </div>

    <p v-if="status" class="day-13-error" role="status" aria-live="polite">
      {{ status }}
    </p>

    <div class="controls day-13-controls">
      <button type="button" class="secondary-action" @click="reset">
        重設模型與相機
      </button>
    </div>
  </section>
</template>
