<script setup>
import LabNav from '@/components/LabNav.vue'
import './day-14.css'

const basicTypes = [
  { type: 'void', description: '無回傳值', example: 'void main()' },
  { type: 'bool', description: '布林值', example: 'bool enabled = true;' },
  { type: 'int', description: '有號整數', example: 'int count = 10;' },
  { type: 'uint', description: '無號整數', example: 'uint index = 0u;' },
  { type: 'float', description: '單精度浮點數', example: 'float x = 1.0;' },
  { type: 'double', description: '雙精度浮點數', example: 'double x = 1.0lf;' },
]

const vectorTypes = [
  ['bvec2', 'bool', 2, 'bvec2(true, false)'],
  ['bvec3', 'bool', 3, 'bvec3(true)'],
  ['bvec4', 'bool', 4, 'bvec4(true)'],
  ['ivec2', 'int', 2, 'ivec2(1, 2)'],
  ['ivec3', 'int', 3, 'ivec3(1, 2, 3)'],
  ['ivec4', 'int', 4, 'ivec4(1, 2, 3, 4)'],
  ['uvec2', 'uint', 2, 'uvec2(1u, 2u)'],
  ['uvec3', 'uint', 3, 'uvec3(1u, 2u, 3u)'],
  ['uvec4', 'uint', 4, 'uvec4(1u, 2u, 3u, 4u)'],
  ['vec2', 'float', 2, 'vec2(1.0, 2.0)'],
  ['vec3', 'float', 3, 'vec3(1.0, 2.0, 3.0)'],
  ['vec4', 'float', 4, 'vec4(1.0, 2.0, 3.0, 4.0)'],
  ['dvec2', 'double', 2, 'dvec2(1.0, 2.0)'],
  ['dvec3', 'double', 3, 'dvec3(1.0, 2.0, 3.0)'],
  ['dvec4', 'double', 4, 'dvec4(1.0, 2.0, 3.0, 4.0)'],
]

const matrixTypes = [
  ['mat2 / mat2x2', '2 × 2'], ['mat2x3', '2 × 3'], ['mat2x4', '2 × 4'],
  ['mat3x2', '3 × 2'], ['mat3 / mat3x3', '3 × 3'], ['mat3x4', '3 × 4'],
  ['mat4x2', '4 × 2'], ['mat4x3', '4 × 3'], ['mat4 / mat4x4', '4 × 4'],
]

const doubleMatrixTypes = matrixTypes.map(([type, size]) => [type.replaceAll('mat', 'dmat'), size])

const samplerTypes = [
  ['sampler1D', '1D 紋理'], ['sampler2D', '2D 紋理'], ['sampler3D', '3D 紋理'],
  ['samplerCube', '立方體貼圖'], ['sampler2DRect', '矩形紋理'],
  ['sampler1DArray', '1D 紋理陣列'], ['sampler2DArray', '2D 紋理陣列'],
  ['samplerCubeArray', '立方體貼圖陣列'], ['sampler2DMS', '多重採樣 2D 紋理'],
  ['sampler2DMSArray', '多重採樣 2D 紋理陣列'], ['samplerBuffer', '緩衝區紋理'],
  ['sampler2DShadow', '2D 陰影紋理'], ['samplerCubeShadow', '立方體陰影紋理'],
]
</script>

<template>
  <main class="day-page day-14-page">
    <LabNav />

    <section class="experiment day-14-reference">
      <header class="section-heading day-14-heading">
        <div>
          <p>GLSL / TYPE REFERENCE</p>
          <h2><span class="heading-english">GLSL</span> 型別表</h2>
        </div>
        <div class="day-14-edition" aria-label="OpenGL Shading Language 型別速查表">
          <span>REFERENCE SHEET</span>
          <strong>TYPE / 01</strong>
        </div>
      </header>

      <p class="day-14-intro">
        從純量、向量、矩陣到紋理取樣器，一頁查找 GLSL 常用型別與宣告方式。
      </p>

      <div class="day-14-sheet">
        <section class="day-14-type-section day-14-type-basic">
          <header class="day-14-section-title">
            <div><p>SCALAR</p><h3>基本型別</h3></div>
            <small>6 TYPES</small>
          </header>
          <div class="day-14-table-scroll" tabindex="0" aria-label="基本型別表，可水平捲動">
            <table>
              <thead><tr><th>型別</th><th>說明</th><th>範例</th></tr></thead>
              <tbody>
                <tr v-for="item in basicTypes" :key="item.type">
                  <td><code>{{ item.type }}</code></td><td>{{ item.description }}</td><td><code>{{ item.example }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="day-14-type-section day-14-type-vector">
          <header class="day-14-section-title">
            <div><p>VECTOR</p><h3>向量型別</h3></div>
            <small>15 TYPES</small>
          </header>
          <div class="day-14-table-scroll" tabindex="0" aria-label="向量型別表，可水平捲動">
            <table>
              <thead><tr><th>型別</th><th>元素型別</th><th class="day-14-number">維度</th><th>範例</th></tr></thead>
              <tbody>
                <tr v-for="item in vectorTypes" :key="item[0]">
                  <td><code>{{ item[0] }}</code></td><td><code>{{ item[1] }}</code></td><td class="day-14-number">{{ item[2] }}</td><td><code>{{ item[3] }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="day-14-type-section day-14-type-matrix">
          <header class="day-14-section-title">
            <div><p>MATRIX</p><h3>矩陣型別</h3></div>
            <small>18 TYPES</small>
          </header>
          <aside class="day-14-note">
            <strong>READING RULE</strong>
            <p>GLSL 矩陣預設使用 <code>float</code>；<code>matCxR</code> 表示 <b>C 欄 × R 列</b>。</p>
          </aside>
          <div class="day-14-matrix-grid">
            <div>
              <h4>單精度矩陣 <code>mat</code></h4>
              <div class="day-14-table-scroll" tabindex="0" aria-label="單精度矩陣型別表，可水平捲動">
                <table><thead><tr><th>型別</th><th>尺寸</th></tr></thead><tbody><tr v-for="item in matrixTypes" :key="item[0]"><td><code>{{ item[0] }}</code></td><td>{{ item[1] }}</td></tr></tbody></table>
              </div>
            </div>
            <div>
              <h4>雙精度矩陣 <code>dmat</code></h4>
              <div class="day-14-table-scroll" tabindex="0" aria-label="雙精度矩陣型別表，可水平捲動">
                <table><thead><tr><th>型別</th><th>尺寸</th></tr></thead><tbody><tr v-for="item in doubleMatrixTypes" :key="item[0]"><td><code>{{ item[0] }}</code></td><td>{{ item[1] }}</td></tr></tbody></table>
              </div>
            </div>
          </div>
        </section>

        <section class="day-14-type-section day-14-type-sampler">
          <header class="day-14-section-title">
            <div><p>SAMPLER</p><h3><span class="heading-english">Sampler</span> 型別</h3></div>
            <small>13 TYPES</small>
          </header>
          <div class="day-14-table-scroll" tabindex="0" aria-label="Sampler 型別表，可水平捲動">
            <table>
              <thead><tr><th>型別</th><th>用途</th></tr></thead>
              <tbody><tr v-for="item in samplerTypes" :key="item[0]"><td><code>{{ item[0] }}</code></td><td>{{ item[1] }}</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>
