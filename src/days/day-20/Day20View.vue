<script setup>
import LabNav from '@/components/LabNav.vue'
import ThreeLightDemo from '@/components/ThreeLightDemo.vue'
import './day-20.css'

const materials = [
  ['金屬', '1', '0.20', '反射帶有材質顏色，可觀察環境的明暗輪廓。'],
  ['塑膠', '0', '0.15', '預設表面光滑；提高粗糙度可呈現霧面效果。'],
]
</script>

<template>
  <main class="day-page day-20-page">
    <LabNav />
    <ThreeLightDemo kind="sphere" />
    <section class="experiment" aria-labelledby="day-20-comparison">
      <header class="section-heading">
        <div><p>MATERIAL SETTINGS</p><h2 id="day-20-comparison">同一顆球，兩種材質設定</h2></div>
      </header>
      <p class="day-20-description">使用 MeshStandardMaterial，透過 color 設定基礎色、metalness 設定金屬度、roughness 設定粗糙度。這裡兩種預設都使用相同的青綠色，只改變金屬度與粗糙度。</p>
      <div class="day-20-table-wrap">
        <table class="day-20-table">
          <caption>Demo 材質預設值（示範用，並非所有實際材質的固定數值）</caption>
          <thead><tr><th scope="col">材質</th><th scope="col">metalness</th><th scope="col">roughness</th><th scope="col">觀察重點</th></tr></thead>
          <tbody><tr v-for="row in materials" :key="row[0]"><th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td></tr></tbody>
        </table>
      </div>
      <p class="day-20-description">粗糙度越低，反射越清楚；越高，反射越模糊，高光通常也越寬。這個參數影響表面的光照反應，不會改變球體形狀，也不會替表面增加凹凸幾何。金屬也能有粗糙表面，試著選擇金屬再拉高粗糙度。</p>
      <p class="day-20-description">高光與反射也受到光源、環境及觀看角度影響。Demo 使用固定平行光，並以 RoomEnvironment 產生環境貼圖，提供周圍的反射內容；環境貼圖不會顯示成背景。</p>
      <div class="day-20-originals">
        <a href="https://threejs.org/docs/pages/MeshStandardMaterial.html" target="_blank" rel="noreferrer">材質官方文件 ↗</a>
        <RouterLink to="/day-16">回看 Day 16 高光原理 ↗</RouterLink>
      </div>
    </section>
  </main>
</template>
