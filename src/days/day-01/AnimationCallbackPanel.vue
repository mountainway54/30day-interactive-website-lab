<script setup>
defineProps({
  callbackCount: {
    type: Number,
    required: true,
  },
  isMounted: {
    type: Boolean,
    required: true,
  },
  orphanFrameCount: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <section class="callback-panel" aria-live="polite" aria-label="動畫 callback 狀態">
    <header>
      <span>Animation callback</span>
      <span>{{ callbackCount.toString().padStart(2, '0') }}</span>
    </header>

    <div class="callback-content">
      <span class="status-light" :data-active="callbackCount > 0"></span>
      <div>
        <strong>{{ callbackCount ? `${callbackCount} 個 callback 執行中` : '目前沒有 callback' }}</strong>
        <p v-if="callbackCount > 1 && orphanFrameCount">
          目前有 {{ callbackCount }} 個動畫 callback 同時執行，方塊移除後又執行了
          {{ orphanFrameCount }} 次。
        </p>
        <p v-else-if="callbackCount > 1">目前有 {{ callbackCount }} 個動畫 callback 同時執行。</p>
        <p v-else-if="isMounted">方塊仍在畫面上，等待下一幀移動。</p>
        <p v-else-if="orphanFrameCount">
          方塊已移除，callback 又執行了 {{ orphanFrameCount }} 次。
        </p>
        <p v-else>掛載方塊後，這裡會顯示動畫狀態。</p>

        <div v-if="orphanFrameCount" class="leak-detail">
          <p>
            重新掛載後，舊動畫會和新動畫一起控制方塊。每個 callback 原本每幀向右移動
            2px，疊加後就會變成 4px、6px、8px……
          </p>
          <p>未清理的 callback 不會自動停止，重新整理頁面後才會全部清除。</p>
        </div>
      </div>
    </div>
  </section>
</template>

