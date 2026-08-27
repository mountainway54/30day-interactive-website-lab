<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import './day-11.css'
import CubeDemo from './CubeDemo.vue'

const canvasRef = ref(null)
const status = ref('')
const ready = ref(false)
let gl, program, buffer, observer
const shaders = []

const vertexSource = `
attribute vec2 a_position;
attribute vec3 a_color;
varying vec3 v_color;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`
const fragmentSource = `
precision mediump float;
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}`

function compile(type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('無法建立著色器')
  shaders.push(shader)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('著色器編譯失敗')
  }
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
  const canvas = canvasRef.value
  const size = Math.max(1, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)))
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = canvas.height = size
  }
  gl.viewport(0, 0, size, size)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  status.value = ''
}

function initialize() {
  try {
    gl = canvasRef.value.getContext('webgl', { alpha: true, antialias: true })
    if (!gl) throw new Error('此瀏覽器無法啟用 WebGL，請確認硬體加速設定或更換瀏覽器')
    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    program = gl.createProgram()
    if (!program) throw new Error('無法建立 WebGL 程式')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('著色器連結失敗')
    gl.useProgram(program)
    buffer = gl.createBuffer()
    if (!buffer) throw new Error('無法建立頂點資料')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // 每個頂點：x、y、r、g、b。底部同色，GPU 插值產生垂直漸層。
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0.78, 0.91, 0.35, 0.68,
      -0.78, -0.72, 0.22, 0.17, 0.79,
      0.78, -0.72, 0.22, 0.17, 0.79,
    ]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    const color = gl.getAttribLocation(program, 'a_color')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 20, 0)
    gl.enableVertexAttribArray(color)
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 20, 8)
    ready.value = true
    draw()
  } catch (error) {
    ready.value = false
    status.value = error.message
    release()
  }
}

function contextLost(event) {
  event.preventDefault()
  ready.value = false
  status.value = 'WebGL 連線中斷，等待恢復'
}

function contextRestored() {
  release()
  initialize()
}

onMounted(() => {
  initialize()
  observer = new ResizeObserver(draw)
  observer.observe(canvasRef.value)
  window.addEventListener('resize', draw)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', draw)
  release()
})
</script>

<template>
  <main class="day-page day-11-page">
    <nav class="lab-nav" aria-label="系列導覽">
      <a class="brand" href="#/day-01">Creative Frontend Lab</a>
      <span>11 / 30</span>
    </nav>
    <section class="experiment">
      <header class="section-heading">
        <div>
          <p>WEBGL / FIRST TRIANGLE</p>
          <h2><span class="heading-english">WebGL</span> 漸層三角形</h2>
        </div>
      </header>
      <p class="day-11-description">三個頂點、一個三角形。從頂端的粉紅，到底部的藍紫，讓 GPU 自動填入中間的色彩。</p>
      <div class="day-11-layout">
        <div class="day-11-stage">
          <div class="day-11-stage-label">WEBGL CANVAS</div>
          <div class="day-11-coordinate-plane">
            <canvas ref="canvasRef" class="day-11-canvas" role="img"
            :aria-label="ready ? '頂端粉紅、底部藍紫的漸層三角形，座標範圍為負一到正一，中心為原點' : '空白畫布'"
            @webglcontextlost="contextLost" @webglcontextrestored="contextRestored">
            你的瀏覽器不支援 Canvas。
            </canvas>
            <svg class="day-11-axes" viewBox="0 0 400 400" aria-hidden="true">
              <path class="day-11-axis-line" d="M 0 200 H 400 M 200 0 V 400" />
              <path class="day-11-axis-arrow" d="m 392 196 7 4 -7 4 M 196 8 200 1 204 8" />
              <circle cx="200" cy="200" r="3" />
              <text x="8" y="190">−1</text>
              <text x="392" y="190" text-anchor="end">+1 / X</text>
              <text x="210" y="18">+1 / Y</text>
              <text x="210" y="390">−1</text>
              <text x="210" y="219">(0, 0)</text>
              <!-- NDC 轉 SVG：x = (x + 1) × 200，y = (1 − y) × 200。 -->
              <g v-if="ready" class="day-11-vertex-labels">
                <circle cx="200" cy="44" r="4" />
                <text x="188" y="36" text-anchor="end">(0, 0.78)</text>
                <circle cx="44" cy="344" r="4" />
                <text x="8" y="366">(−0.78, −0.72)</text>
                <circle cx="356" cy="344" r="4" />
                <text x="392" y="366" text-anchor="end">(0.78, −0.72)</text>
              </g>
            </svg>
          </div>
          <p class="day-11-coordinate-note">NDC 座標 · 中心 (0, 0) · X 向右 / Y 向上</p>
        </div>
        <p v-if="status" class="day-11-status" role="status" aria-live="polite">{{ status }}</p>
      </div>
    </section>
    <CubeDemo />
  </main>
</template>
