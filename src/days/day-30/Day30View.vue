<script setup>
import { onUnmounted, provide } from 'vue'
import { createGlassScene, glassSceneKey } from './glassScene.js'
import ControllerResonance from './ControllerResonance.vue'
import LiquidDemoMenu from './LiquidDemoMenu.vue'
import 'lenis/dist/lenis.css'
import './day-30.css'
const glassScene = createGlassScene()
provide(glassSceneKey, glassScene)
onUnmounted(() => glassScene.dispose())
</script>

<template>
  <main class="product-system day-30-page">
    <header class="day-30-header">
      <a href="#/day-25" class="day-30-brand" aria-label="返回 Day 25">DualSense DEMO</a>
      <LiquidDemoMenu />
    </header>
    <ControllerResonance />
  </main>
</template>
