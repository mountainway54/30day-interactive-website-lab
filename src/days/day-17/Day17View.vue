<script setup>
import { computed, ref } from 'vue'
import LabNav from '@/components/LabNav.vue'
import ModelViewport from './ModelViewport.vue'
import { createSample } from './gltf-data.js'
import './day-17.css'

const source = ref(createSample())
const viewport = ref(null)
const busy = ref(false)
const status = ref('正在準備範例模型…')
const error = ref(false)
const stats = ref({ vertices: 0, triangles: 0, meshes: 0 })
const wireframe = ref(false)
const size = computed(() => `${(new TextEncoder().encode(source.value).length / 1024).toFixed(1)} KB`)
function report(result) {
  status.value = result.message
  error.value = !!result.error
  if (result.stats) stats.value = result.stats
}
function sample() { source.value = createSample(); viewport.value?.load(source.value) }
</script>

<template>
  <main class="day-page day-17-page">
    <LabNav />
    <section class="experiment">
      <header class="section-heading">
        <div><p>glTF / Vertex data → Model</p><h2>從頂點資料，長出一個模型</h2></div>
        <span class="day-17-tag">DAY 17 · WEBGL</span>
      </header>
      <p class="day-17-intro">貼上 Blender 匯出的 glTF JSON，將頂點與面索引還原成右側的 3D 模型。</p>
      <div class="day-17-workbench">
        <section class="day-17-editor" aria-labelledby="day-17-input-label">
          <div class="day-17-panel-heading"><label id="day-17-input-label" for="day-17-source">來源 / .gltf</label><span>{{ size }}</span></div>
          <textarea id="day-17-source" v-model="source" spellcheck="false" aria-describedby="day-17-help" placeholder="在這裡貼上完整的 glTF 2.0 JSON…" @keydown.ctrl.enter.prevent="viewport?.load(source)" @keydown.meta.enter.prevent="viewport?.load(source)" />
          <div class="day-17-editor-footer">JSON + EMBEDDED BUFFER <span>Ctrl / ⌘ + Enter 渲染</span></div>
        </section>
        <section class="day-17-preview" aria-label="模型渲染預覽">
          <div class="day-17-panel-heading"><span>結果 / 3D 模型</span><span>{{ wireframe ? 'WIREFRAME' : 'SOLID' }}</span></div>
          <ModelViewport ref="viewport" :initial-source="source" :wireframe="wireframe" @status="report" @busy="busy = $event" />
          <div class="day-17-stats"><span>頂點 <b>{{ String(stats.vertices).padStart(2, '0') }}</b></span><span>三角面 <b>{{ String(stats.triangles).padStart(2, '0') }}</b></span><span>網格 <b>{{ String(stats.meshes).padStart(2, '0') }}</b></span></div>
        </section>
      </div>
      <div class="controls day-17-controls">
        <button class="primary-action" :disabled="busy" @click="viewport?.load(source)">渲染模型</button>
        <button class="secondary-action" :disabled="busy" @click="sample">載入範例</button>
        <button class="secondary-action" :aria-pressed="wireframe" @click="wireframe = !wireframe">線框模式：{{ wireframe ? '開' : '關' }}</button>
        <button class="secondary-action" @click="viewport?.resetView()">重設視角</button>
      </div>
      <p class="day-17-status" :data-error="error" role="status" aria-live="polite">{{ busy ? '正在解析模型…' : status }}</p>
      <details id="day-17-help" class="day-17-help">
        <summary>如何從 Blender 準備可貼上的資料？</summary>
        <ol>
          <li>選擇 File → Export → glTF 2.0，輸出包含內嵌資料的 .gltf（若版本提供，可選 glTF Embedded）。</li>
          <li>用文字編輯器開啟 .gltf，複製全部 JSON，貼到左側，再按「渲染模型」。</li>
          <li>確認 buffers 的 uri 以 data: 開頭。若匯出的是 .gltf + .bin，必須先將 buffer 與圖片轉成內嵌 Base64；單靠 JSON 中的檔名無法還原頂點。</li>
        </ol>
        <p>支援未壓縮 glTF 2.0、節點變換、材質與內嵌貼圖；顯示靜態姿態，不播放動畫。資料上限 12 MB。外部檔案與 Draco／Meshopt／KTX2 壓縮不支援。</p>
      </details>
    </section>
  </main>
</template>
