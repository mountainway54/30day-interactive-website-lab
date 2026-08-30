<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)
const status = ref('')
const ready = ref(false)
const pitch = ref(-0.4)
const yaw = ref(0.6)
let gl, program, buffer, observer, rotationLocation, projectionLocation, wireframeLocation
let drag = null
const shaders = []

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;
uniform vec2 u_rotation;
uniform mat4 u_projection;
varying vec3 v_color;
void main() {
  float cx = cos(u_rotation.x), sx = sin(u_rotation.x);
  float cy = cos(u_rotation.y), sy = sin(u_rotation.y);
  mat3 rx = mat3(1.,0.,0., 0.,cx,sx, 0.,-sx,cx);
  mat3 ry = mat3(cy,0.,-sy, 0.,1.,0., sy,0.,cy);
  mat3 rotation = ry * rx;
  vec3 position = rotation * a_position + vec3(0., 0., -4.8);
  vec3 normal = rotation * a_normal;
  float light = 0.55 + 0.45 * max(dot(normal, normalize(vec3(-1.,2.,3.))), 0.);
  v_color = a_color * light;
  gl_Position = u_projection * vec4(position, 1.);
}`
const fragmentSource = `
precision mediump float;
varying vec3 v_color;
uniform bool u_wireframe;
void main() {
  gl_FragColor = vec4(u_wireframe ? vec3(0.902, 0.420, 0.369) : v_color, 1.);
}
`

function compile(type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('無法建立著色器')
  shaders.push(shader)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('3D 著色器編譯失敗')
  return shader
}

function release() {
  if (!gl) return
  if (buffer) gl.deleteBuffer(buffer)
  if (program) gl.deleteProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  shaders.length = 0
  buffer = program = null
}

function draw() {
  if (!ready.value || gl.isContextLost()) return
  const size = Math.max(1, Math.round(canvas.value.clientWidth * Math.min(window.devicePixelRatio || 1, 2)))
  if (canvas.value.width !== size || canvas.value.height !== size) {
    canvas.value.width = canvas.value.height = size
  }
  gl.viewport(0, 0, size, size)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.uniform2f(rotationLocation, pitch.value, yaw.value)
  gl.uniform1i(wireframeLocation, 0)
  // 將填色表面的深度稍微推後，避免共面的框線閃爍；背面框線仍由深度測試遮擋。
  if (drag) {
    gl.enable(gl.POLYGON_OFFSET_FILL)
    gl.polygonOffset(1, 1)
  }
  gl.drawArrays(gl.TRIANGLES, 0, 36)
  gl.disable(gl.POLYGON_OFFSET_FILL)
  if (drag) {
    gl.uniform1i(wireframeLocation, 1)
    // 每三個頂點形成一個閉合框線，包含每個方形面內部的對角線。
    for (let first = 0; first < 36; first += 3) {
      gl.drawArrays(gl.LINE_LOOP, first, 3)
    }
  }
}

function initialize() {
  try {
    gl = canvas.value.getContext('webgl', { alpha: true, antialias: true, depth: true })
    if (!gl) throw new Error('無法啟用 WebGL，請確認硬體加速設定')
    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    program = gl.createProgram()
    if (!program) throw new Error('無法建立 3D 程式')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('3D 著色器連結失敗')
    gl.useProgram(program)
    // 每面拆成兩個三角形；獨立法線讓六個面保有清楚的明暗差異。
    const faces = [
      { n: [0,0,1], p: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
      { n: [0,0,-1], p: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
      { n: [1,0,0], p: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
      { n: [-1,0,0], p: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
      { n: [0,1,0], p: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
      { n: [0,-1,0], p: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
    ]
    const vertices = []
    for (const face of faces) {
      for (const index of [0,1,2,0,2,3]) {
        const p = face.p[index]
        vertices.push(...p, ...(p[1] > 0 ? [0.91,0.35,0.68] : [0.22,0.17,0.79]), ...face.n)
      }
    }
    buffer = gl.createBuffer()
    if (!buffer) throw new Error('無法建立 3D 頂點資料')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    for (const [name, offset] of [['a_position',0], ['a_color',12], ['a_normal',24]]) {
      const location = gl.getAttribLocation(program, name)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset)
    }
    rotationLocation = gl.getUniformLocation(program, 'u_rotation')
    projectionLocation = gl.getUniformLocation(program, 'u_projection')
    wireframeLocation = gl.getUniformLocation(program, 'u_wireframe')
    // 45° 視角、正方形畫布、near = 0.1、far = 100；column-major 透視矩陣。
    const f = 1 / Math.tan(Math.PI / 8)
    gl.uniformMatrix4fv(projectionLocation, false, new Float32Array([
      f,0,0,0, 0,f,0,0, 0,0,-100.1/99.9,-1, 0,0,-20/99.9,0,
    ]))
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor(0,0,0,0)
    ready.value = true
    status.value = ''
    draw()
  } catch (error) {
    ready.value = false
    status.value = error.message
    release()
  }
}

function pointerDown(event) {
  if (!ready.value || drag || event.button !== 0) return
  canvas.value.setPointerCapture(event.pointerId)
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
  draw()
}
function pointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return
  const scale = Math.PI * 2 / Math.max(1, canvas.value.clientWidth)
  yaw.value = (yaw.value + (event.clientX - drag.x) * scale) % (Math.PI * 2)
  pitch.value = (pitch.value + (event.clientY - drag.y) * scale) % (Math.PI * 2)
  drag.x = event.clientX
  drag.y = event.clientY
  draw()
}
function pointerEnd(event) {
  if (drag?.id !== event.pointerId) return
  drag = null
  if (canvas.value.hasPointerCapture(event.pointerId)) canvas.value.releasePointerCapture(event.pointerId)
  draw()
}
function contextLost(event) {
  event.preventDefault()
  ready.value = false
  drag = null
  status.value = 'WebGL 連線中斷，等待恢復'
}
function contextRestored() { release(); initialize() }

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
  <section class="experiment" aria-labelledby="day-12-cube-title">
    <header class="section-heading">
      <div>
        <p>WEBGL / FROM 2D TO 3D</p>
        <h2 id="day-12-cube-title">從三角形到 <span class="heading-english">3D</span> 立方體</h2>
      </div>
    </header>
    <p class="day-12-description">加上 Z 軸，將 12 個三角形組成六個面。拖曳立方體，觀察透視與前後遮擋。</p>
    <div class="day-12-layout">
      <div class="day-12-stage">
        <div class="day-12-stage-label">PERSPECTIVE / 3D</div>
        <canvas ref="canvas" class="day-12-cube-canvas" role="img"
          aria-label="可旋轉的粉紅與藍紫漸層立方體" aria-describedby="day-12-cube-help"
          @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd"
          @pointercancel="pointerEnd" @lostpointercapture="pointerEnd"
          @webglcontextlost="contextLost" @webglcontextrestored="contextRestored">
          你的瀏覽器不支援 Canvas。
        </canvas>
        <p id="day-12-cube-help" class="day-12-coordinate-note">拖曳時顯示三角形框線，放開隱藏</p>
      </div>
      <p v-if="status" class="day-12-status" role="status" aria-live="polite">{{ status }}</p>
    </div>
  </section>
</template>
