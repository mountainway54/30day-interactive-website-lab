<script setup>
import LabNav from '@/components/LabNav.vue'
import ThreeLightDemo from '@/components/ThreeLightDemo.vue'
import './day-19.css'

const replacements = [
  ['頂點與法向量', '手寫六個面、三角形頂點與叉積', 'BoxGeometry'],
  ['平行光照', 'GLSL 的 dot 與光照 uniform', 'MeshLambertMaterial'],
  ['座標轉換', 'rotationX/Y、矩陣乘法、lookAt、perspective', 'mesh.rotation / PerspectiveCamera'],
  ['GPU 繪製', '編譯與連結 Shader、綁定 Buffer、設定 attribute、drawArrays', 'WebGLRenderer.render(scene, camera)'],
  ['相機操作', '拖曳角度換算與相機座標', 'OrbitControls'],
]
</script>

<template>
  <main class="day-page day-19-page">
    <LabNav />
    <ThreeLightDemo kind="cube" />
    <section class="experiment" aria-labelledby="day-19-comparison">
      <header class="section-heading">
        <div><p>WEBGL → THREE.JS</p><h2 id="day-19-comparison">省下的程式，交給誰處理？</h2></div>
      </header>
      <div class="day-19-table-wrap">
        <table class="day-19-table">
          <caption>Day 15 與 Day 19 的實作對照</caption>
          <thead><tr><th scope="col">工作</th><th scope="col">原生 WebGL</th><th scope="col">Three.js</th></tr></thead>
          <tbody><tr v-for="row in replacements" :key="row[0]"><th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td><td><code>{{ row[2] }}</code></td></tr></tbody>
        </table>
      </div>
      <p class="day-19-description">底層計算仍然存在，只是不必在 Demo 裡手寫。你仍要決定場景、材質、光源與互動，並處理尺寸變化和資源釋放；這裡只在操作時重繪，不需要持續執行動畫迴圈。</p>
      <p class="day-19-description">這次使用內建 Lambert 材質重現平行光。內建光照與色彩管理和原版略有差異，相同參數不保證得到相同顏色。</p>
      <div class="day-19-originals"><RouterLink to="/day-15">回看 Day 15 原版 ↗</RouterLink></div>
    </section>
  </main>
</template>
