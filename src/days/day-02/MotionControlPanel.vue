<script setup>
const model = defineModel({
  type: Object,
  required: true,
});

const fields = [
  {
    key: "x",
    label: "X",
    unit: "px",
    type: "number",
    min: -900,
    max: 900,
    step: 10,
  },
  {
    key: "rotation",
    label: "Rotation",
    unit: "deg",
    type: "number",
    min: -1440,
    max: 1440,
    step: 15,
  },
  {
    key: "duration",
    label: "Duration",
    unit: "s",
    type: "number",
    min: 0,
    max: 10,
    step: 0.1,
  },
  {
    key: "delay",
    label: "Delay",
    unit: "s",
    type: "number",
    min: 0,
    max: 5,
    step: 0.1,
  },
];
</script>

<template>
  <aside class="day-02-panel" aria-label="動畫參數">
    <header>
      <span>Animation options</span>
    </header>

    <div class="day-02-field-list">
      <label v-for="field in fields" :key="field.key" class="day-02-field">
        <span>{{ field.label }}</span>
        <span class="day-02-input-wrap">
          <input
            v-model.number="model[field.key]"
            :aria-label="field.label"
            :max="field.max"
            :min="field.min"
            :step="field.step"
            :type="field.type"
          />
          <small>{{ field.unit }}</small>
        </span>
      </label>

      <div class="day-02-field day-02-ease-field">
        <span>Ease</span>
        <select v-model="model.ease" aria-label="Ease">
          <option value="none">none</option>
          <option value="power3.out">power3.out</option>
          <option value="power2.inOut">power2.inOut</option>
          <option value="sine.inOut">sine.inOut</option>
          <option value="expo.out">expo.out</option>
          <option value="circ.out">circ.out</option>
          <option value="customBezier">自訂 cubic-bezier</option>
          <option value="back.out(1.7)">back.out(1.7)</option>
          <option value="elastic.out(1, 0.3)">elastic.out(1, 0.3)</option>
          <option value="bounce.out">bounce.out</option>
        </select>

        <div v-if="model.ease === 'customBezier'" class="day-02-bezier-fields">
          <label v-for="point in ['X1', 'Y1', 'X2', 'Y2']" :key="point">
            <span>{{ point.toLowerCase() }}</span>
            <input
              v-model.number="model[`bezier${point}`]"
              :aria-label="`Bezier ${point}`"
              max="2"
              min="-1"
              step="0.01"
              type="number"
            />
          </label>
        </div>
      </div>
    </div>
  </aside>
</template>
