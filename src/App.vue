<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
:root {
  color: #17212b;
  background: #c2c7cb;
  font-family: "Aptos", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  min-height: 100%;
  background: #c2c7cb;
}

body,
#app {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background-color: #c2c7cb;
}

button,
input,
textarea,
select {
  font: inherit;
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid #c63d2f;
  outline-offset: 3px;
}

::selection {
  color: #fff;
  background: #c63d2f;
}
</style>
