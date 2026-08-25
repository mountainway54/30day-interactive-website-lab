<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const DEFAULT_PARTICLE_COUNT = 100;
const MIN_PARTICLE_COUNT = 10;
const MAX_PARTICLE_COUNT = 150;
const INFLUENCE_RADIUS = 100;

const canvasRef = ref(null);
const shellRef = ref(null);
const isDisturbed = ref(false);
const particleCount = ref(DEFAULT_PARTICLE_COUNT);

const particles = [];
const pointer = { x: 0, y: 0, active: false };

let context = null;
let animationFrame = null;
let resizeFrame = null;
let resizeObserver = null;
let intersectionObserver = null;
let lastTime = 0;
let stageWidth = 0;
let stageHeight = 0;
let isVisible = true;

function createParticle(index, total = particleCount.value) {
  const angle = (index / total) * Math.PI * 2 + Math.random() * 0.8;
  const speed = 5 + Math.random() * 8;

  return {
    x: Math.random() * stageWidth,
    y: Math.random() * stageHeight,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    driftX: Math.cos(angle) * speed,
    driftY: Math.sin(angle) * speed,
    size: 42 + Math.random() * 22,
    phase: Math.random() * Math.PI * 2,
  };
}

function resetParticles() {
  particles.length = 0;
  for (let index = 0; index < particleCount.value; index += 1) {
    particles.push(createParticle(index, particleCount.value));
  }
}

function syncParticleCount(count) {
  while (particles.length < count) {
    particles.push(createParticle(particles.length, count));
  }

  if (particles.length > count) particles.splice(count);
}

function resizeCanvas() {
  const canvas = canvasRef.value;
  const shell = shellRef.value;
  if (!canvas || !shell) return;

  const previousWidth = stageWidth || shell.clientWidth;
  const previousHeight =
    stageHeight || Math.min(Math.max(shell.clientWidth * 0.48, 320), 480);
  stageWidth = shell.clientWidth;
  stageHeight = Math.min(Math.max(stageWidth * 0.48, 320), 480);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${stageWidth}px`;
  canvas.style.height = `${stageHeight}px`;
  canvas.width = Math.round(stageWidth * pixelRatio);
  canvas.height = Math.round(stageHeight * pixelRatio);
  context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (particles.length === 0) {
    resetParticles();
    return;
  }

  const scaleX = stageWidth / previousWidth;
  const scaleY = stageHeight / previousHeight;
  particles.forEach((particle) => {
    particle.x *= scaleX;
    particle.y *= scaleY;
  });
}

function drawMiniSnorlax(ctx, particle, time) {
  const scale = particle.size / 240;
  const bob = Math.sin(time * 0.0012 + particle.phase) * 2;

  ctx.save();
  ctx.translate(particle.x, particle.y + bob);
  ctx.scale(scale, scale);
  ctx.translate(-200, -150);

  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.ellipse(200, 160, 120, 108, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(96, 108);
  ctx.lineTo(118, 48);
  ctx.lineTo(154, 76);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(246, 76);
  ctx.lineTo(282, 48);
  ctx.lineTo(304, 108);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f1dfb6";
  ctx.beginPath();
  ctx.ellipse(200, 178, 100, 78, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#365f64";
  ctx.beginPath();
  ctx.moveTo(140, 94);
  ctx.lineTo(260, 94);
  ctx.lineTo(200, 134);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#17212b";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(145, 163);
  ctx.lineTo(171, 163);
  ctx.moveTo(229, 163);
  ctx.lineTo(255, 163);
  ctx.moveTo(174, 198);
  ctx.lineTo(226, 198);
  ctx.stroke();
  ctx.restore();
}

function updateParticle(particle, delta) {
  if (pointer.active) {
    const dx = particle.x - pointer.x;
    const dy = particle.y - pointer.y;
    const distance = Math.hypot(dx, dy) || 1;

    if (distance < INFLUENCE_RADIUS) {
      const force = (1 - distance / INFLUENCE_RADIUS) * 180;
      particle.vx += (dx / distance) * force * delta;
      particle.vy += (dy / distance) * force * delta;
    }
  }

  particle.vx += (particle.driftX - particle.vx) * Math.min(delta * 0.9, 1);
  particle.vy += (particle.driftY - particle.vy) * Math.min(delta * 0.9, 1);
  particle.x += particle.vx * delta;
  particle.y += particle.vy * delta;

  const radius = particle.size * 0.54;
  if (particle.x < radius) {
    particle.x = radius;
    particle.vx = Math.abs(particle.vx);
    particle.driftX = Math.abs(particle.driftX);
  } else if (particle.x > stageWidth - radius) {
    particle.x = stageWidth - radius;
    particle.vx = -Math.abs(particle.vx);
    particle.driftX = -Math.abs(particle.driftX);
  }

  if (particle.y < radius) {
    particle.y = radius;
    particle.vy = Math.abs(particle.vy);
    particle.driftY = Math.abs(particle.driftY);
  } else if (particle.y > stageHeight - radius) {
    particle.y = stageHeight - radius;
    particle.vy = -Math.abs(particle.vy);
    particle.driftY = -Math.abs(particle.driftY);
  }
}

function animate(time) {
  animationFrame = null;
  if (!context || !isVisible) return;

  const delta = Math.min((time - lastTime) / 1000 || 0, 0.034);
  lastTime = time;
  context.clearRect(0, 0, stageWidth, stageHeight);

  particles.forEach((particle) => {
    updateParticle(particle, delta);
    drawMiniSnorlax(context, particle, time);
  });

  animationFrame = window.requestAnimationFrame(animate);
}

function startAnimation() {
  if (animationFrame !== null || !isVisible) return;
  lastTime = performance.now();
  animationFrame = window.requestAnimationFrame(animate);
}

function updateParticlePointer(event) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * stageWidth;
  pointer.y = ((event.clientY - bounds.top) / bounds.height) * stageHeight;
  pointer.active = true;
  isDisturbed.value = true;
}

function clearParticlePointer() {
  pointer.active = false;
  isDisturbed.value = false;
}

watch(particleCount, (count) => {
  const safeCount = Math.min(
    Math.max(Number(count) || MIN_PARTICLE_COUNT, MIN_PARTICLE_COUNT),
    MAX_PARTICLE_COUNT,
  );
  if (safeCount !== count) {
    particleCount.value = safeCount;
    return;
  }
  syncParticleCount(safeCount);
});

onMounted(() => {
  resizeCanvas();
  startAnimation();

  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
    });
  });
  resizeObserver.observe(shellRef.value);

  intersectionObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) startAnimation();
    else if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  });
  intersectionObserver.observe(canvasRef.value);
});

onBeforeUnmount(() => {
  if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
});
</script>

<template>
  <section class="experiment day-10-particle-experiment">
    <header class="section-heading">
      <div>
        <p>PARTICLE SYSTEM / POINTER FORCE</p>
        <h2>粒子系統</h2>
      </div>
      <div class="status" :data-active="isDisturbed" aria-live="polite">
        <span aria-hidden="true"></span>
        {{ isDisturbed ? "DISTURBED" : "DRIFTING" }}
      </div>
    </header>

    <p class="day-10-description">
      每個卡比獸都是一顆擁有位置、速度與漂移方向的粒子。將游標移入
      Canvas，近距離粒子會被力場推開。
    </p>

    <div class="day-10-particle-layout">
      <section
        class="day-10-particle-stage"
        aria-labelledby="day-10-particle-title"
      >
        <header>
          <span id="day-10-particle-title"
            >SNORLAX FIELD / {{ particleCount }} PARTICLES</span
          >
          <strong>{{ isDisturbed ? "FORCE ACTIVE" : "SLOW DRIFT" }}</strong>
        </header>
        <div
          ref="shellRef"
          class="day-10-particle-shell"
          :data-active="isDisturbed"
        >
          <canvas
            ref="canvasRef"
            role="img"
            :aria-label="`${particleCount} 個縮小卡比獸頭像緩慢漂浮，游標進入時會擾動附近粒子的 Canvas 動畫`"
            @pointerenter="updateParticlePointer"
            @pointermove="updateParticlePointer"
            @pointerleave="clearParticlePointer"
            @pointercancel="clearParticlePointer"
          >
            你的瀏覽器不支援 Canvas。
          </canvas>
        </div>
        <footer>
          <span>INFLUENCE 100 PX</span>
          <span>{{ isDisturbed ? "POINTER FORCE" : "AMBIENT FLOW" }}</span>
        </footer>
      </section>

      <aside class="day-10-particle-monitor" aria-label="粒子數量與系統說明">
        <header>
          <span>PARTICLE CONTROL</span>
          <strong>{{ String(particleCount).padStart(3, "0") }} ACTIVE</strong>
        </header>
        <div class="day-10-particle-count-control">
          <label for="day-10-particle-count">
            <span>PARTICLE COUNT</span>
            <output :for="'day-10-particle-count'">{{ particleCount }}</output>
          </label>
          <input
            id="day-10-particle-count"
            v-model.number="particleCount"
            type="range"
            :min="MIN_PARTICLE_COUNT"
            :max="MAX_PARTICLE_COUNT"
            step="1"
          />
          <div aria-hidden="true">
            <span>{{ MIN_PARTICLE_COUNT }}</span>
            <span>{{ MAX_PARTICLE_COUNT }}</span>
          </div>
        </div>
        <dl>
          <div>
            <dt>POSITION</dt>
            <dd>x / y</dd>
          </div>
          <div>
            <dt>VELOCITY</dt>
            <dd>vx / vy</dd>
          </div>
          <div>
            <dt>POINTER FORCE</dt>
            <dd>100 px</dd>
          </div>
          <div>
            <dt>BOUNDARY</dt>
            <dd>BOUNCE</dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
</template>
