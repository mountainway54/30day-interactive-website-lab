<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { clamp, direction, makeGrid, makeLightArrow, makeObjects, projectionMatrix, viewMatrix } from './scene-model.js'

const props = defineProps({ parameters: { type: Object, required: true } })
const emit = defineEmits(['camera-change', 'status'])
const canvas = ref(null)
const ready = ref(false)
let gl, program, observer, frame = null, drag = null, disposed = false
let locations, objects, grid, arrow
const shaders = [], buffers = []

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_view;
uniform mat4 u_projection;
varying vec3 v_normal;
void main() {
  v_normal = a_normal;
  gl_Position = u_projection * u_view * vec4(a_position, 1.0);
}`
const fragmentSource = `
precision mediump float;
varying vec3 v_normal;
uniform vec3 u_light;
uniform vec3 u_color;
uniform float u_intensity;
uniform bool u_unlit;
void main() {
  float brightness = u_unlit ? 1.0 : 0.2 + u_intensity * max(dot(normalize(v_normal), u_light), 0.0);
  gl_FragColor = vec4(u_color * brightness, 1.0);
}`

function compile(type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('無法建立著色器')
  shaders.push(shader)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('場景著色器編譯失敗')
  return shader
}

function mesh(data, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('無法建立場景頂點資料')
  buffers.push(buffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, usage)
  return { buffer, count: data.length / 6 }
}

function release() {
  if (gl) {
    buffers.forEach(buffer => gl.deleteBuffer(buffer))
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
  }
  buffers.length = shaders.length = 0
  program = locations = objects = grid = arrow = null
}

function drawMesh(item, mode, color, unlit) {
  gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer)
  gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 24, 0)
  gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 24, 12)
  gl.uniform3fv(locations.color, color)
  gl.uniform1i(locations.unlit, unlit ? 1 : 0)
  gl.drawArrays(mode, 0, item.count)
}

function draw() {
  frame = null
  if (disposed || !ready.value || !gl || gl.isContextLost()) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(canvas.value.clientWidth*dpr))
  const height = Math.max(1, Math.round(canvas.value.clientHeight*dpr))
  if (canvas.value.width !== width || canvas.value.height !== height) {
    canvas.value.width = width
    canvas.value.height = height
  }
  const state = props.parameters
  gl.viewport(0, 0, width, height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.useProgram(program)
  gl.uniformMatrix4fv(locations.view, false, viewMatrix(state))
  gl.uniformMatrix4fv(locations.projection, false, projectionMatrix(state, width/height))
  gl.uniform3fv(locations.light, direction(state.lightAzimuth, state.lightElevation))
  gl.uniform1f(locations.intensity, state.intensity)
  drawMesh(grid, gl.LINES, [0.69,0.74,0.76], true)
  drawMesh(objects, gl.TRIANGLES, [111/255,146/255,148/255], false)
  gl.bindBuffer(gl.ARRAY_BUFFER, arrow.buffer)
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, makeLightArrow(state))
  drawMesh(arrow, gl.TRIANGLES, [198/255,61/255,47/255], true)
}

function schedule() {
  if (!disposed && ready.value && frame === null) frame = requestAnimationFrame(draw)
}

function initialize() {
  try {
    gl = canvas.value.getContext('webgl', { alpha: true, antialias: true, depth: true })
    if (!gl) throw new Error('無法啟用 WebGL，請確認瀏覽器硬體加速設定或更換瀏覽器。')
    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    program = gl.createProgram()
    if (!program) throw new Error('無法建立場景程式')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('場景著色器連結失敗')
    gl.useProgram(program)
    locations = {
      position: gl.getAttribLocation(program, 'a_position'), normal: gl.getAttribLocation(program, 'a_normal'),
      ...Object.fromEntries(['view','projection','light','color','intensity','unlit'].map(key =>
        [key, gl.getUniformLocation(program, `u_${key}`)])),
    }
    gl.enableVertexAttribArray(locations.position)
    gl.enableVertexAttribArray(locations.normal)
    objects = mesh(makeObjects())
    grid = mesh(makeGrid())
    arrow = mesh(makeLightArrow(props.parameters), gl.DYNAMIC_DRAW)
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor(0,0,0,0)
    ready.value = true
    emit('status', { ready: true, message: '場景已就緒' })
    schedule()
  } catch (error) {
    ready.value = false
    emit('status', { ready: false, message: error.message })
    release()
  }
}

function endDrag() {
  const id = drag?.id
  drag = null
  if (id !== undefined && canvas.value?.hasPointerCapture(id)) canvas.value.releasePointerCapture(id)
}
function pointerDown(event) {
  if (!ready.value || drag || event.button !== 0) return
  canvas.value.setPointerCapture(event.pointerId)
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
    azimuth: props.parameters.azimuth, elevation: props.parameters.elevation }
}
function pointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return
  const scale = 180 / Math.max(1, canvas.value.clientWidth)
  const angle = drag.azimuth - (event.clientX - drag.x)*scale
  emit('camera-change', {
    azimuth: ((angle + 180) % 360 + 360) % 360 - 180,
    elevation: clamp(drag.elevation + (event.clientY - drag.y)*scale, 5, 80),
  })
}
function pointerEnd(event) { if (drag?.id === event.pointerId) endDrag() }
function contextLost(event) {
  event.preventDefault()
  ready.value = false
  endDrag()
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  emit('status', { ready: false, message: 'WebGL 連線中斷，等待恢復；目前參數會保留。' })
}
function contextRestored() { release(); initialize() }

watch(() => props.parameters, schedule, { deep: true })
onMounted(() => {
  initialize()
  observer = new ResizeObserver(schedule)
  observer.observe(canvas.value)
  window.addEventListener('resize', schedule)
})
onBeforeUnmount(() => {
  disposed = true
  ready.value = false
  endDrag()
  observer?.disconnect()
  window.removeEventListener('resize', schedule)
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  release()
})
</script>

<template>
  <canvas ref="canvas" class="day-00-canvas" role="img"
    :aria-label="ready ? '相同青綠色材質的立方體與球體，置於參考網格上；紅色箭頭表示光線行進方向' : '3D 場景尚未就緒'"
    aria-describedby="day-00-drag-help"
    @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd"
    @pointercancel="pointerEnd" @lostpointercapture="pointerEnd"
    @webglcontextlost="contextLost" @webglcontextrestored="contextRestored">
    你的瀏覽器不支援 Canvas，請更換瀏覽器。
  </canvas>
</template>
