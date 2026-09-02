<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const canvas = ref(null)
const brightness = ref(100)
const ready = ref(false)
const status = ref('')
const interaction = ref('等待操作')

const INITIAL = Object.freeze({
  modelPitch: -0.4,
  modelYaw: 0.6,
  cameraPitch: 0,
  cameraYaw: 0,
  brightness: 100,
})
const angles = reactive({ ...INITIAL })

const brightnessLabel = computed(() => `${brightness.value}%`)
const brightnessMultiplier = computed(() => brightness.value / 100)

let gl
let program
let buffer
let observer
let drag
let modelLocation
let viewLocation
let projectionLocation
let lightDirectionLocation
let brightnessLocation
const shaders = []

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform vec3 u_lightDirection;
uniform float u_brightness;

varying vec3 v_color;

void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);
  vec3 normal = normalize(mat3(u_model) * a_normal);
  float diffuse = max(dot(normal, u_lightDirection), 0.0);
  float light = (0.55 + 0.45 * diffuse) * u_brightness;

  v_color = a_color * light;
  gl_Position = u_projection * u_view * worldPosition;
}`

const fragmentSource = `
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}`

function normalize(vector) {
  const length = Math.hypot(...vector) || 1
  return vector.map(value => value / length)
}

function calculateFaceNormal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  return normalize([
    ab[1] * bc[2] - ab[2] * bc[1],
    ab[2] * bc[0] - ab[0] * bc[2],
    ab[0] * bc[1] - ab[1] * bc[0],
  ])
}

function mat4Multiply(a, b) {
  const result = new Float32Array(16)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      result[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3]
    }
  }
  return result
}

function rotationX(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
}

function rotationY(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function lookAt(eye, target = [0, 0, 0]) {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]])
  const x = normalize(cross([0, 1, 0], z))
  const y = cross(z, x)
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ])
}

function getMatrices(aspect) {
  const model = mat4Multiply(rotationY(angles.modelYaw), rotationX(angles.modelPitch))
  const radius = 4.8
  const cameraCos = Math.cos(angles.cameraPitch)
  const eye = [
    Math.sin(angles.cameraYaw) * cameraCos * radius,
    Math.sin(angles.cameraPitch) * radius,
    Math.cos(angles.cameraYaw) * cameraCos * radius,
  ]
  const near = 0.1
  const far = 100
  const f = 1 / Math.tan(Math.PI / 8)
  const projection = new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ])
  return { model, view: lookAt(eye), projection }
}

function compile(type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('無法建立著色器')
  shaders.push(shader)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`著色器編譯失敗：${gl.getShaderInfoLog(shader) || '未知錯誤'}`)
  }
  return shader
}

function release() {
  if (!gl) return
  if (buffer) gl.deleteBuffer(buffer)
  if (program) gl.deleteProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  shaders.length = 0
  buffer = null
  program = null
}

function draw() {
  if (!ready.value || !gl || gl.isContextLost()) return
  const displayWidth = Math.max(1, canvas.value.clientWidth)
  const displayHeight = Math.max(1, canvas.value.clientHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pixelWidth = Math.round(displayWidth * dpr)
  const pixelHeight = Math.round(displayHeight * dpr)
  if (canvas.value.width !== pixelWidth || canvas.value.height !== pixelHeight) {
    canvas.value.width = pixelWidth
    canvas.value.height = pixelHeight
  }

  const matrices = getMatrices(displayWidth / displayHeight)
  gl.viewport(0, 0, pixelWidth, pixelHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.useProgram(program)
  gl.uniformMatrix4fv(modelLocation, false, matrices.model)
  gl.uniformMatrix4fv(viewLocation, false, matrices.view)
  gl.uniformMatrix4fv(projectionLocation, false, matrices.projection)
  gl.uniform3fv(lightDirectionLocation, normalize([-1, 2, 3]))
  gl.uniform1f(brightnessLocation, brightnessMultiplier.value)
  gl.drawArrays(gl.TRIANGLES, 0, 36)
}

function initialize() {
  try {
    gl = canvas.value.getContext('webgl', { alpha: true, antialias: true, depth: true })
    if (!gl) throw new Error('無法啟用 WebGL，請確認硬體加速設定')

    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    program = gl.createProgram()
    if (!program) throw new Error('無法建立 WebGL 程式')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`著色器連結失敗：${gl.getProgramInfoLog(program) || '未知錯誤'}`)
    }
    gl.useProgram(program)

    const faces = [
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
      [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
      [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
      [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
      [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
    ]
    const vertices = []
    for (const face of faces) {
      const normal = calculateFaceNormal(face[0], face[1], face[2])
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const position = face[index]
        const color = position[1] > 0 ? [0.91, 0.35, 0.68] : [0.22, 0.17, 0.79]
        vertices.push(...position, ...color, ...normal)
      }
    }

    buffer = gl.createBuffer()
    if (!buffer) throw new Error('無法建立頂點資料')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    for (const [name, offset] of [['a_position', 0], ['a_color', 12], ['a_normal', 24]]) {
      const location = gl.getAttribLocation(program, name)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset)
    }

    modelLocation = gl.getUniformLocation(program, 'u_model')
    viewLocation = gl.getUniformLocation(program, 'u_view')
    projectionLocation = gl.getUniformLocation(program, 'u_projection')
    lightDirectionLocation = gl.getUniformLocation(program, 'u_lightDirection')
    brightnessLocation = gl.getUniformLocation(program, 'u_brightness')
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor(0, 0, 0, 0)
    ready.value = true
    status.value = ''
    draw()
  } catch (error) {
    ready.value = false
    status.value = error.message
    release()
  }
}

function clampCameraPitch(value) {
  const limit = Math.PI * 0.46
  return Math.max(-limit, Math.min(limit, value))
}

function pointerDown(event) {
  if (!ready.value || drag || (event.button !== 0 && event.button !== 2)) return
  event.preventDefault()
  canvas.value.setPointerCapture(event.pointerId)
  drag = {
    id: event.pointerId,
    mode: event.button === 2 ? 'camera' : 'model',
    x: event.clientX,
    y: event.clientY,
  }
  interaction.value = drag.mode === 'model' ? '旋轉模型' : '旋轉相機'
}

function pointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return
  const scale = (Math.PI * 2) / Math.max(1, canvas.value.clientWidth)
  const deltaX = (event.clientX - drag.x) * scale
  const deltaY = (event.clientY - drag.y) * scale
  if (drag.mode === 'model') {
    angles.modelYaw += deltaX
    angles.modelPitch += deltaY
  } else {
    angles.cameraYaw -= deltaX
    angles.cameraPitch = clampCameraPitch(angles.cameraPitch + deltaY)
  }
  drag.x = event.clientX
  drag.y = event.clientY
  draw()
}

function pointerEnd(event) {
  if (drag?.id !== event.pointerId) return
  drag = null
  interaction.value = '等待操作'
  if (canvas.value.hasPointerCapture(event.pointerId)) {
    canvas.value.releasePointerCapture(event.pointerId)
  }
}

function keyboardRotate(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const isCamera = event.shiftKey
  const yawKey = isCamera ? 'cameraYaw' : 'modelYaw'
  const pitchKey = isCamera ? 'cameraPitch' : 'modelPitch'
  const delta = 0.08
  if (event.key === 'ArrowLeft') angles[yawKey] -= delta
  if (event.key === 'ArrowRight') angles[yawKey] += delta
  if (event.key === 'ArrowUp') angles[pitchKey] -= delta
  if (event.key === 'ArrowDown') angles[pitchKey] += delta
  if (isCamera) angles.cameraPitch = clampCameraPitch(angles.cameraPitch)
  interaction.value = isCamera ? '鍵盤旋轉相機' : '鍵盤旋轉模型'
  draw()
}

function updateBrightness() {
  brightness.value = Math.max(0, Math.min(150, Number(brightness.value) || 0))
  interaction.value = `亮度調整為 ${brightness.value}%`
  draw()
}

function reset() {
  angles.modelPitch = INITIAL.modelPitch
  angles.modelYaw = INITIAL.modelYaw
  angles.cameraPitch = INITIAL.cameraPitch
  angles.cameraYaw = INITIAL.cameraYaw
  brightness.value = INITIAL.brightness
  interaction.value = '已重設光照與視角'
  draw()
  canvas.value?.focus()
}

function contextLost(event) {
  event.preventDefault()
  ready.value = false
  drag = null
  interaction.value = '等待 WebGL 恢復'
  status.value = 'WebGL 連線中斷，等待恢復'
}

function contextRestored() {
  release()
  initialize()
}

onMounted(() => {
  initialize()
  observer = new ResizeObserver(draw)
  observer.observe(canvas.value)
  window.addEventListener('resize', draw)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', draw)
  drag = null
  release()
})
</script>

<template>
  <section class="experiment" aria-labelledby="day-15-title">
    <header class="section-heading">
      <div>
        <p>WEBGL / DIRECTIONAL LIGHT</p>
        <h2 id="day-15-title">用 <span class="heading-english">Shader</span> 算出受光後的顏色</h2>
      </div>
      <div class="day-15-live-status" aria-live="polite">
        <span aria-hidden="true"></span>{{ interaction }}
      </div>
    </header>

    <p class="day-15-description">
      固定方向的平行光照向立方體。旋轉模型觀察各面的明暗，再調整整體亮度比較結果。
    </p>

    <div class="day-15-workbench">
      <div class="day-15-stage">
        <div class="day-15-stage-header">
          <span>LIGHT DIRECTION</span>
          <strong>(-1, 2, 3)</strong>
        </div>
        <canvas
          ref="canvas"
          class="day-15-canvas"
          tabindex="0"
          role="img"
          aria-label="受到固定平行光照射、可旋轉且可調整亮度的立方體"
          aria-describedby="day-15-help"
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
        <div class="day-15-input-legend" aria-hidden="true">
          <span><i class="day-15-mouse-left"></i>左鍵：旋轉模型</span>
          <span><i class="day-15-mouse-right"></i>右鍵：旋轉相機</span>
        </div>
        <p id="day-15-help" class="day-15-keyboard-help">
          鍵盤：方向鍵旋轉模型；Shift + 方向鍵旋轉相機
        </p>
      </div>

      <aside class="day-15-light-panel" aria-label="光照亮度控制">
        <div class="day-15-panel-header">
          <span>LIGHT CALCULATION</span>
          <span>LIVE</span>
        </div>

        <div class="day-15-meter" aria-hidden="true">
          <span class="day-15-light-ray"></span>
          <span class="day-15-lit-face" :style="{ opacity: 0.25 + brightnessMultiplier * 0.5 }"></span>
        </div>

        <div class="day-15-control-block">
          <div class="day-15-control-label">
            <label for="day-15-brightness">整體亮度</label>
            <output for="day-15-brightness">{{ brightnessLabel }}</output>
          </div>
          <input
            id="day-15-brightness"
            v-model.number="brightness"
            class="day-15-range"
            type="range"
            min="0"
            max="150"
            step="1"
            @input="updateBrightness"
          />
          <div class="day-15-range-scale" aria-hidden="true">
            <span>0%</span><span>100%</span><span>150%</span>
          </div>
        </div>

        <dl class="day-15-values" aria-live="polite">
          <div><dt>AMBIENT</dt><dd>0.55</dd></div>
          <div><dt>DIFFUSE</dt><dd>0.45 × max(dot(N, L), 0)</dd></div>
          <div><dt>BRIGHTNESS</dt><dd>{{ brightnessMultiplier.toFixed(2) }}</dd></div>
        </dl>

        <div class="day-15-formula">
          <span>FINAL COLOR</span>
          <code>a_color × light × {{ brightnessMultiplier.toFixed(2) }}</code>
        </div>
      </aside>
    </div>

    <p v-if="status" class="day-15-error" role="status" aria-live="polite">{{ status }}</p>

    <div class="controls day-15-controls">
      <button type="button" class="secondary-action" @click="reset">重設光照與視角</button>
    </div>
  </section>
</template>
