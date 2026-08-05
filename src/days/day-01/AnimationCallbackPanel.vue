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

<style scoped>
.callback-panel {
  min-height: 188px;
  border: 1px solid #17212b;
  color: #d9e2e8;
  background: #17212b;
}

.callback-panel header {
  display: flex;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid #52616f;
  color: #91a2b0;
  font: 600 0.68rem/1 "Cascadia Code", Consolas, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.callback-content {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 12px;
  padding: 22px 16px;
}

.status-light {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  background: #657582;
}

.status-light[data-active="true"] {
  background: #e66b5e;
  box-shadow: 0 0 0 5px rgba(230, 107, 94, 0.14);
}

.callback-content strong {
  font: 700 0.82rem/1.4 "Cascadia Code", Consolas, monospace;
}

.callback-content p {
  margin: 10px 0 0;
  color: #91a2b0;
  font-size: 0.78rem;
  line-height: 1.6;
}

.leak-detail {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px solid #52616f;
}

</style>
