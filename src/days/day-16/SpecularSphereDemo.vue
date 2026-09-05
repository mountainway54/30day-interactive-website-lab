<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const canvas = ref(null)
const ready = ref(false)
const status = ref('')
const interaction = ref('等待操作')
const shininess = ref(32)
const specularStrength = ref(0.72)
const specularEnabled = ref(true)

const INITIAL_CAMERA = Object.freeze({ yaw: 0, pitch: 0.3 })
const camera = reactive({ ...INITIAL_CAMERA })
const shininessLabel = computed(() => String(Math.round(shininess.value)).padStart(3, '0'))
const strengthLabel = computed(() => `${Math.round(specularStrength.value * 100)}%`)
const materialLabel = computed(() => {
  if (!specularEnabled.value) return 'MATTE / 漫反射'
  if (shininess.value >= 72) return 'POLISHED / 集中高光'
  if (shininess.value >= 24) return 'SATIN / 柔和高光'
  return 'SOFT / 寬廣高光'
})

let gl
let program
let observer
let drag
let indexCount = 0
let positionBuffer
let normalBuffer
let indexBuffer
let gridBuffer
let axisBuffer
let gridVertexCount = 0
let positionAttributeLocation
let normalAttributeLocation
let modelLocation
let viewLocation
let projectionLocation
let lightDirectionLocation
let cameraPositionLocation
let baseColorLocation
let specularColorLocation
let specularStrengthLocation
let shininessLocation
let unlitLocation
const shaders = []

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;

void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);
  v_worldPosition = worldPosition.xyz;
  v_worldNormal = normalize(mat3(u_model) * a_normal);
  gl_Position = u_projection * u_view * worldPosition;
}`

const fragmentSource = `
precision mediump float;

uniform vec3 u_lightDirection;
uniform vec3 u_cameraPosition;
uniform vec3 u_baseColor;
uniform vec3 u_specularColor;
uniform float u_specularStrength;
uniform float u_shininess;
uniform float u_unlit;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;

void main() {
  if (u_unlit > 0.5) {
    gl_FragColor = vec4(u_baseColor, 1.0);
    return;
  }

  vec3 normal = normalize(v_worldNormal);
  vec3 lightDirection = normalize(u_lightDirection);
  float nDotL = dot(normal, lightDirection);

  // 將明暗交界稍微延伸到背光面，避免 Lambert 截斷形成生硬邊界。
  float diffuse = smoothstep(-0.28, 0.90, nDotL);

  vec3 viewDirection = normalize(u_cameraPosition - v_worldPosition);
  vec3 reflectedDirection = reflect(-lightDirection, normal);
  float specular = 0.0;

  if (nDotL > 0.0) {
    float specularAngle = max(dot(viewDirection, reflectedDirection), 0.0);
    specular = pow(specularAngle, u_shininess);
  }

  vec3 ambientColor = u_baseColor * 0.26;
  vec3 diffuseColor = u_baseColor * diffuse * 0.74;
  vec3 specularColor = u_specularColor * specular * u_specularStrength;
  vec3 finalColor = ambientColor + diffuseColor + specularColor;

  gl_FragColor = vec4(min(finalColor, vec3(1.0)), 1.0);
}`

function normalize(vector) {
  const length = Math.hypot(...vector) || 1
  return vector.map(value => value / length)
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

function identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

function perspective(aspect) {
  const near = 0.1
  const far = 100
  const f = 1 / Math.tan(Math.PI / 8)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ])
}

function createSphere(radius = 1, latitudeBands = 40, longitudeBands = 48) {
  const positions = []
  const normals = []
  const indices = []

  for (let latitude = 0; latitude <= latitudeBands; latitude += 1) {
    const phi = (latitude / latitudeBands) * Math.PI
    const sinPhi = Math.sin(phi)
    const cosPhi = Math.cos(phi)

    for (let longitude = 0; longitude <= longitudeBands; longitude += 1) {
      const theta = (longitude / longitudeBands) * Math.PI * 2
      const normalX = sinPhi * Math.cos(theta)
      const normalY = cosPhi
      const normalZ = sinPhi * Math.sin(theta)
      positions.push(radius * normalX, radius * normalY, radius * normalZ)
      normals.push(normalX, normalY, normalZ)
    }
  }

  for (let latitude = 0; latitude < latitudeBands; latitude += 1) {
    for (let longitude = 0; longitude < longitudeBands; longitude += 1) {
      const first = latitude * (longitudeBands + 1) + longitude
      const second = first + longitudeBands + 1
      indices.push(first, first + 1, second)
      indices.push(second, first + 1, second + 1)
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  }
}

function createXZGrid(size = 4, divisions = 20, height = 0) {
  const vertices = []
  const step = (size * 2) / divisions

  for (let index = 0; index <= divisions; index += 1) {
    const value = -size + index * step
    if (Math.abs(value) < 0.0001) continue
    vertices.push(value, height, -size, value, height, size)
    vertices.push(-size, height, value, size, height, value)
  }

  return {
    grid: new Float32Array(vertices),
    axes: new Float32Array([
      -size, height, 0, size, height, 0,
      0, height, -size, 0, height, size,
    ]),
  }
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

function bindAttribute(location, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
}

function release() {
  if (!gl) return
  if (positionBuffer) gl.deleteBuffer(positionBuffer)
  if (normalBuffer) gl.deleteBuffer(normalBuffer)
  if (indexBuffer) gl.deleteBuffer(indexBuffer)
  if (gridBuffer) gl.deleteBuffer(gridBuffer)
  if (axisBuffer) gl.deleteBuffer(axisBuffer)
  if (program) gl.deleteProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  shaders.length = 0
  positionBuffer = null
  normalBuffer = null
  indexBuffer = null
  gridBuffer = null
  axisBuffer = null
  program = null
}

function getCameraPosition() {
  const radius = 4.8
  const pitchCos = Math.cos(camera.pitch)
  return [
    Math.sin(camera.yaw) * pitchCos * radius,
    Math.sin(camera.pitch) * radius,
    Math.cos(camera.yaw) * pitchCos * radius,
  ]
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

  const eye = getCameraPosition()
  gl.viewport(0, 0, pixelWidth, pixelHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.useProgram(program)
  gl.uniformMatrix4fv(modelLocation, false, identity())
  gl.uniformMatrix4fv(viewLocation, false, lookAt(eye, [0, -0.16, 0]))
  gl.uniformMatrix4fv(projectionLocation, false, perspective(displayWidth / displayHeight))

  // 先繪製位於世界座標的 XZ 地面網格。
  gl.uniform1f(unlitLocation, 1)
  gl.disableVertexAttribArray(normalAttributeLocation)
  gl.vertexAttrib3f(normalAttributeLocation, 0, 1, 0)
  bindAttribute(positionAttributeLocation, gridBuffer)
  gl.uniform3fv(baseColorLocation, [0.64, 0.67, 0.66])
  gl.drawArrays(gl.LINES, 0, gridVertexCount)

  bindAttribute(positionAttributeLocation, axisBuffer)
  gl.uniform3fv(baseColorLocation, [0.79, 0.24, 0.18])
  gl.drawArrays(gl.LINES, 0, 2)
  gl.uniform3fv(baseColorLocation, [0.28, 0.48, 0.51])
  gl.drawArrays(gl.LINES, 2, 2)

  // 再恢復球體屬性並繪製逐像素光照。
  gl.uniform1f(unlitLocation, 0)
  bindAttribute(positionAttributeLocation, positionBuffer)
  bindAttribute(normalAttributeLocation, normalBuffer)
  gl.uniform3fv(lightDirectionLocation, normalize([-1, 1.6, 2.4]))
  gl.uniform3fv(cameraPositionLocation, eye)
  gl.uniform3fv(baseColorLocation, [0.29, 0.53, 0.55])
  gl.uniform3fv(specularColorLocation, [1, 0.94, 0.82])
  gl.uniform1f(specularStrengthLocation, specularEnabled.value ? specularStrength.value : 0)
  gl.uniform1f(shininessLocation, shininess.value)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)
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

    const sphere = createSphere()
    const xzGrid = createXZGrid()
    indexCount = sphere.indices.length
    gridVertexCount = xzGrid.grid.length / 3
    positionBuffer = gl.createBuffer()
    normalBuffer = gl.createBuffer()
    indexBuffer = gl.createBuffer()
    gridBuffer = gl.createBuffer()
    axisBuffer = gl.createBuffer()
    if (!positionBuffer || !normalBuffer || !indexBuffer || !gridBuffer || !axisBuffer) {
      throw new Error('無法建立場景資料')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, xzGrid.grid, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, xzGrid.axes, gl.STATIC_DRAW)

    positionAttributeLocation = gl.getAttribLocation(program, 'a_position')
    normalAttributeLocation = gl.getAttribLocation(program, 'a_normal')
    bindAttribute(positionAttributeLocation, positionBuffer)
    bindAttribute(normalAttributeLocation, normalBuffer)

    modelLocation = gl.getUniformLocation(program, 'u_model')
    viewLocation = gl.getUniformLocation(program, 'u_view')
    projectionLocation = gl.getUniformLocation(program, 'u_projection')
    lightDirectionLocation = gl.getUniformLocation(program, 'u_lightDirection')
    cameraPositionLocation = gl.getUniformLocation(program, 'u_cameraPosition')
    baseColorLocation = gl.getUniformLocation(program, 'u_baseColor')
    specularColorLocation = gl.getUniformLocation(program, 'u_specularColor')
    specularStrengthLocation = gl.getUniformLocation(program, 'u_specularStrength')
    shininessLocation = gl.getUniformLocation(program, 'u_shininess')
    unlitLocation = gl.getUniformLocation(program, 'u_unlit')

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

function clampPitch(value) {
  return Math.max(0.06, Math.min(Math.PI * 0.38, value))
}

function pointerDown(event) {
  if (!ready.value || drag || event.button !== 0) return
  event.preventDefault()
  canvas.value.setPointerCapture(event.pointerId)
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
  interaction.value = '正在移動相機'
}

function pointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return
  const scale = (Math.PI * 1.5) / Math.max(1, canvas.value.clientWidth)
  camera.yaw -= (event.clientX - drag.x) * scale
  camera.pitch = clampPitch(camera.pitch + (event.clientY - drag.y) * scale)
  drag.x = event.clientX
  drag.y = event.clientY
  draw()
}

function pointerEnd(event) {
  if (drag?.id !== event.pointerId) return
  drag = null
  interaction.value = '相機位置已更新'
  if (canvas.value.hasPointerCapture(event.pointerId)) canvas.value.releasePointerCapture(event.pointerId)
}

function keyboardMove(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const delta = 0.08
  if (event.key === 'ArrowLeft') camera.yaw -= delta
  if (event.key === 'ArrowRight') camera.yaw += delta
  if (event.key === 'ArrowUp') camera.pitch = clampPitch(camera.pitch + delta)
  if (event.key === 'ArrowDown') camera.pitch = clampPitch(camera.pitch - delta)
  interaction.value = '鍵盤移動相機'
  draw()
}

function updateShininess() {
  shininess.value = Math.max(2, Math.min(128, Number(shininess.value) || 2))
  interaction.value = `高光集中度 ${Math.round(shininess.value)}`
  draw()
}

function updateStrength() {
  specularStrength.value = Math.max(0, Math.min(1, Number(specularStrength.value) || 0))
  interaction.value = `高光強度 ${Math.round(specularStrength.value * 100)}%`
  draw()
}

function toggleSpecular() {
  specularEnabled.value = !specularEnabled.value
  interaction.value = specularEnabled.value ? '鏡面反射已開啟' : '鏡面反射已關閉'
  draw()
}

function reset() {
  Object.assign(camera, INITIAL_CAMERA)
  shininess.value = 32
  specularStrength.value = 0.72
  specularEnabled.value = true
  interaction.value = '已重設材質與相機'
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
  <section class="experiment" aria-labelledby="day-16-title">
    <header class="section-heading">
      <div>
        <p>WEBGL / PHONG SPECULAR</p>
        <h2 id="day-16-title">讓球體表面出現會移動的<span class="heading-english">高光</span></h2>
      </div>
      <div class="day-16-live-status" aria-live="polite">
        <span aria-hidden="true"></span>{{ interaction }}
      </div>
    </header>

    <p class="day-16-description">
      拖曳改變觀察位置，看看反射方向接近視線時，高光如何在球面移動。
    </p>

    <div class="day-16-workbench">
      <div class="day-16-stage">
        <div class="day-16-stage-header">
          <span>WORLD SPACE / XZ GRID</span>
          <strong>{{ materialLabel }}</strong>
        </div>
        <div class="day-16-canvas-wrap">
          <canvas
            ref="canvas"
            class="day-16-canvas"
            tabindex="0"
            role="img"
            aria-label="位於 XZ 平面網格上、具有鏡面高光並可移動觀察位置的 WebGL 球體"
            aria-describedby="day-16-help"
            @pointerdown="pointerDown"
            @pointermove="pointerMove"
            @pointerup="pointerEnd"
            @pointercancel="pointerEnd"
            @lostpointercapture="pointerEnd"
            @keydown="keyboardMove"
            @webglcontextlost="contextLost"
            @webglcontextrestored="contextRestored"
          >
            你的瀏覽器不支援 Canvas。
          </canvas>
        </div>
        <p id="day-16-help" class="day-16-help">拖曳或使用方向鍵移動相機，觀察高光位置</p>
      </div>

      <aside class="day-16-panel" aria-label="鏡面反射參數控制">
        <div class="day-16-panel-header">
          <span>MATERIAL READOUT</span>
          <span>{{ specularEnabled ? 'SPECULAR ON' : 'SPECULAR OFF' }}</span>
        </div>

        <div class="day-16-control-block">
          <div class="day-16-control-label">
            <label for="day-16-shininess">高光集中度</label>
            <output for="day-16-shininess">{{ shininessLabel }}</output>
          </div>
          <input
            id="day-16-shininess"
            v-model.number="shininess"
            class="day-16-range"
            type="range"
            min="2"
            max="128"
            step="1"
            @input="updateShininess"
          />
          <div class="day-16-range-scale" aria-hidden="true"><span>SOFT</span><span>SHARP</span></div>
        </div>

        <div class="day-16-control-block">
          <div class="day-16-control-label">
            <label for="day-16-strength">高光強度</label>
            <output for="day-16-strength">{{ strengthLabel }}</output>
          </div>
          <input
            id="day-16-strength"
            v-model.number="specularStrength"
            class="day-16-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :disabled="!specularEnabled"
            @input="updateStrength"
          />
          <div class="day-16-range-scale" aria-hidden="true"><span>0%</span><span>100%</span></div>
        </div>

        <dl class="day-16-values" aria-live="polite">
          <div><dt>AMBIENT</dt><dd>0.26</dd></div>
          <div><dt>DIFFUSE</dt><dd>0.74 × smoothstep(-0.28, 0.90, dot(N, L))</dd></div>
          <div><dt>SPECULAR</dt><dd>{{ specularEnabled ? `pow(dot(V, R), ${Math.round(shininess)})` : '0.00' }}</dd></div>
        </dl>

        <div class="day-16-formula">
          <span>FINAL COLOR</span>
          <code>ambient + diffuse + specular</code>
        </div>
      </aside>
    </div>

    <p v-if="status" class="day-16-error" role="status" aria-live="polite">{{ status }}</p>

    <div class="controls day-16-controls">
      <button type="button" class="primary-action" :aria-pressed="specularEnabled" @click="toggleSpecular">
        {{ specularEnabled ? '關閉鏡面反射' : '開啟鏡面反射' }}
      </button>
      <button type="button" class="secondary-action" @click="reset">重設材質與相機</button>
    </div>
  </section>
</template>
