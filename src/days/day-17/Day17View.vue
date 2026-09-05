<script setup>
import { computed, ref } from 'vue'
import LabNav from '@/components/LabNav.vue'
import ModelViewport from './ModelViewport.vue'
import defaultModel from '../../../docs/3d/8660/143. Snorlax/snorlax.obj?raw'
const createSample = () => defaultModel
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
        <div><p>OBJ / Vertex data → Model</p><h2>從頂點資料，長出一個模型</h2></div>
        <span class="day-17-tag">DAY 17 · WEBGL</span>
      </header>
      <p class="day-17-intro">貼上 Blender 匯出的 OBJ 文字，將頂點與面索引還原成左側的 3D 模型。</p>
      <div class="day-17-workbench">
        <section class="day-17-preview" aria-label="模型渲染預覽">
          <div class="day-17-panel-heading"><span>結果 / 3D 模型</span><span>{{ wireframe ? 'WIREFRAME' : 'SOLID' }}</span></div>
          <ModelViewport ref="viewport" :initial-source="source" :wireframe="wireframe" @status="report" @busy="busy = $event" />
          <div class="day-17-stats"><span>頂點 <b>{{ String(stats.vertices).padStart(2, '0') }}</b></span><span>三角面 <b>{{ String(stats.triangles).padStart(2, '0') }}</b></span><span>網格 <b>{{ String(stats.meshes).padStart(2, '0') }}</b></span></div>
        </section>
        <section class="day-17-editor" aria-labelledby="day-17-input-label">
          <div class="day-17-panel-heading"><label id="day-17-input-label" for="day-17-source">來源 / .obj</label><span>{{ size }}</span></div>
          <textarea id="day-17-source" v-model="source" spellcheck="false" aria-describedby="day-17-help" placeholder="在這裡貼上完整的 OBJ 文字…" @keydown.ctrl.enter.prevent="viewport?.load(source)" @keydown.meta.enter.prevent="viewport?.load(source)" />
          <div class="day-17-editor-footer">VERTICES / FACES <span>Ctrl / ⌘ + Enter 渲染</span></div>
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
          <li>在 Blender 選擇 File → Export → Wavefront (.obj)，建議勾選 Triangulated Mesh，將面轉成三角形。</li>
          <li>用文字編輯器開啟 .obj，複製全文，貼到右側，再按「渲染模型」。不需要轉換 Base64。</li>
          <li>v 是頂點座標，f 是組成面的頂點索引；vn 是法線。頂點數顯示來源中的 v 數量，三角面數顯示渲染時的面數。</li>
        </ol>
        <p>只呈現靜態模型形狀，統一使用單色光照。忽略材質、貼圖與 UV，不需提供 .mtl 或圖片。支援正負面索引；資料上限 12 MB、100 萬個三角面。</p>
      </details>
    </section>
  </main>
</template>
