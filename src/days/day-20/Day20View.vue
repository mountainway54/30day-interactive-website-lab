<script setup>
import LabNav from '@/components/LabNav.vue'
import ThreeLightDemo from '@/components/ThreeLightDemo.vue'
import './day-20.css'

const replacements = [
  ['頂點與法向量', '手寫球體經緯度、法向量與索引', 'SphereGeometry'],
  ['光照與高光', 'GLSL 的 dot、reflect、pow 與 uniform', 'MeshPhongMaterial'],
  ['座標轉換', 'lookAt、perspective 與相機位置', 'PerspectiveCamera'],
  ['GPU 繪製', '編譯與連結 Shader、綁定 Buffer、設定 attribute、drawElements', 'WebGLRenderer.render(scene, camera)'],
  ['相機與地面', '拖曳角度換算、相機座標、網格線頂點', 'OrbitControls / GridHelper'],
]
</script>

<template>
  <main class="day-page day-20-page">
    <LabNav />
    <ThreeLightDemo kind="sphere" />
    <section class="experiment" aria-labelledby="day-20-comparison">
      <header class="section-heading">
        <div><p>WEBGL → THREE.JS</p><h2 id="day-20-comparison">省下的程式，交給誰處理？</h2></div>
      </header>
      <div class="day-20-table-wrap">
        <table class="day-20-table">
          <caption>Day 16 與 Day 20 的實作對照</caption>
          <thead><tr><th scope="col">工作</th><th scope="col">原生 WebGL</th><th scope="col">Three.js</th></tr></thead>
          <tbody><tr v-for="row in replacements" :key="row[0]"><th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td><td><code>{{ row[2] }}</code></td></tr></tbody>
        </table>
      </div>
      <p class="day-20-description">底層計算仍然存在，只是不必在 Demo 裡手寫。你仍要決定場景、材質、光源與互動，並處理尺寸變化和資源釋放；這裡只在操作時重繪，不需要持續執行動畫迴圈。</p>
      <p class="day-20-description">這次重現相同的互動概念，並非逐像素複製：Day 16 原版使用 reflect 的 Phong 高光與自訂 smoothstep 漫反射；Three.js 的 <a href="https://threejs.org/docs/pages/MeshPhongMaterial.html" target="_blank" rel="noreferrer">MeshPhongMaterial</a> 使用 Blinn–Phong。內建光照與色彩管理也會影響明暗，因此相同參數不保證得到相同顏色。</p>
      <div class="day-20-originals"><RouterLink to="/day-16">回看 Day 16 原版 ↗</RouterLink></div>
    </section>
  </main>
</template>
