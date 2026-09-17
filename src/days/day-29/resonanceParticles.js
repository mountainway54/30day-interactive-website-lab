import * as THREE from 'three'

// A separate, single-draw background keeps Day 28's expensive product cache idle.
// Two bounded batches retain the opening particles when the final wave fires.
export function createResonanceParticles(container, waves) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const batchSize = matchMedia('(max-width: 760px)').matches ? 360 : 700
  const capacity = batchSize * 2
  const positions = new Float32Array(capacity * 3)
  const velocities = new Float32Array(capacity * 2)
  const seeds = new Float32Array(capacity)
  const ages = new Float32Array(capacity)
  const sizes = new Float32Array(capacity)
  const geometry = new THREE.BufferGeometry()
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setDrawRange(0, 0)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: 1 },
      uWaves: { value: waves },
      uTime: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      uniform float uPixelRatio;
      uniform vec4 uWaves[8];
      uniform float uTime;
      uniform float uAspect;
      varying float vDepth;
      varying float vShimmer;
      void main() {
        vDepth = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0);
        vec2 uv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
        vec2 displacement = vec2(0.0);
        for (int i = 0; i < 8; i++) {
          float age = uTime - uWaves[i].z;
          if (age >= 0.0 && age < 0.9) {
            vec2 delta = (uv - uWaves[i].xy) * vec2(uAspect, 1.0);
            float distanceToWave = length(delta);
            float radius = 0.02 + age * 0.128;
            float envelope = exp(-pow((distanceToWave - radius) / 0.06, 2.0));
            float decay = pow(1.0 - age / 0.9, 2.0);
            float ripple = sin(distanceToWave * 65.0 - age * 9.0);
            displacement += delta / max(distanceToWave, 0.001) * envelope * decay * ripple * uWaves[i].w * 0.012;
          }
        }
        displacement = clamp(displacement, vec2(-0.035), vec2(0.035));
        // Inverse of the product's texture sampling displacement, in clip space.
        gl_Position.xy -= displacement / vec2(uAspect, 1.0) * 2.0 * gl_Position.w;
        vShimmer = min(length(displacement) * 65.0, 0.55);
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: `
      varying float vDepth;
      varying float vShimmer;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float radius = length(p);
        float ring = smoothstep(0.58, 0.68, radius) * (1.0 - smoothstep(0.72, 0.82, radius));
        float halo = smoothstep(0.48, 0.68, radius) * (1.0 - smoothstep(0.76, 1.0, radius)) * 0.12;
        float alpha = (ring * 0.68 + halo) * mix(0.28, 0.8, vDepth);
        vec3 color = mix(vec3(0.18, 0.39, 0.62), vec3(0.43, 0.73, 0.98), ring);
        gl_FragColor = vec4(mix(color, vec3(0.7, 0.88, 1.0), vShimmer), alpha * (1.0 + vShimmer));
      }
    `,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(points)
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, depth: false, stencil: false })
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)
  let count = 0, cursor = 0, frame = 0, previous = 0, time = 0, aspect = 1, disposed = false

  function draw() {
    if (disposed) return
    material.uniforms.uTime.value = performance.now() / 1000
    renderer.render(scene, camera)
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect()
    const nextAspect = width / Math.max(height, 1)
    const scale = Math.min(nextAspect, 1) / Math.min(aspect, 1)
    for (let i = 0; i < count; i++) {
      positions[i * 3] *= scale
      positions[i * 3 + 1] *= scale
      velocities[i * 2] *= scale
      velocities[i * 2 + 1] *= scale
    }
    position.needsUpdate = true
    aspect = nextAspect
    material.uniforms.uAspect.value = aspect
    camera.left = -aspect
    camera.right = aspect
    camera.updateProjectionMatrix()
    const ratio = Math.min(devicePixelRatio, 1.5)
    renderer.setPixelRatio(ratio)
    renderer.setSize(Math.max(1, width), Math.max(1, height), false)
    material.uniforms.uPixelRatio.value = ratio
    draw()
  }
  function tick(now) {
    frame = 0
    if (disposed || document.hidden || reduced.matches) return
    const dt = Math.min((now - previous) / 1000, 0.04)
    previous = now
    time += dt
    const drag = Math.exp(-2.1 * dt)
    for (let i = 0; i < count; i++) {
      const p = i * 3, v = i * 2
      ages[i] += dt
      velocities[v] *= drag
      velocities[v + 1] *= drag
      positions[p] += velocities[v] * dt
      positions[p + 1] += velocities[v + 1] * dt
      // Positive rotation is counterclockwise in this camera's y-up coordinates.
      // Exact rotation avoids the outward spiral introduced by Euler integration.
      const flow = Math.min(ages[i] * 0.4, 1)
      const angularSpeed = 0.028 + Math.sin(seeds[i]) * 0.006
      const turn = angularSpeed * flow * dt
      const cos = Math.cos(turn), sin = Math.sin(turn)
      const x = positions[p], y = positions[p + 1]
      const radialDrift = 1 + Math.sin(time * 0.35 + seeds[i]) * 0.004 * flow * dt
      positions[p] = (x * cos - y * sin) * radialDrift
      positions[p + 1] = (x * sin + y * cos) * radialDrift
      // A broad soft limit allows irregular drifting without rebuilding a ring.
      const distance = Math.hypot(positions[p], positions[p + 1])
      const outerRadius = Math.min(aspect, 1) * (1.4 + Math.sin(seeds[i]) * 0.15)
      if (ages[i] > 3 && distance > 0.001) {
        const correction = distance > outerRadius ? -0.012 : 0
        positions[p] += positions[p] / distance * correction * dt
        positions[p + 1] += positions[p + 1] / distance * correction * dt
      }
    }
    position.needsUpdate = true
    draw()
    frame = requestAnimationFrame(tick)
  }
  function wake() {
    if (!frame && count && !disposed && !document.hidden && !reduced.matches) {
      previous = performance.now()
      frame = requestAnimationFrame(tick)
    }
  }
  function syncMotion() {
    cancelAnimationFrame(frame)
    frame = 0
    if (!document.hidden) draw()
    wake()
  }
  function contextLost(event) { event.preventDefault(); dispose() }
  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
    document.removeEventListener('visibilitychange', syncMotion)
    reduced.removeEventListener('change', syncMotion)
    renderer.domElement.removeEventListener('webglcontextlost', contextLost)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  document.addEventListener('visibilitychange', syncMotion)
  reduced.addEventListener('change', syncMotion)
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  resize()
  return {
    burst() {
      if (disposed) return
      // Broken, asymmetric arcs on either side, with small clouds along each arc.
      const clouds = Array.from({ length: 8 }, (_, index) => ({
        angle: (index < 4 ? Math.PI : 0) + (index % 4 - 1.5) * 0.43 + (Math.random() - 0.5) * 0.22,
        width: 0.08 + Math.random() * 0.16,
        radius: 0.96 + Math.random() * 0.2,
      }))
      for (let j = 0; j < batchSize; j++) {
        const i = (cursor + j) % capacity, p = i * 3, v = i * 2
        const cloud = clouds[Math.floor(Math.random() * clouds.length)]
        const clustered = Math.random() < 0.88
        const angle = clustered
          ? cloud.angle + (Math.random() + Math.random() + Math.random() - 1.5) * cloud.width * 2
          : Math.random() * Math.PI * 2
        // Density falls gradually toward the center without a hard inner boundary.
        const dx = Math.cos(angle), dy = Math.sin(angle)
        const spread = Math.random()
        const irregularity = 1 + Math.sin(angle * 3 + 0.7) * 0.1 + Math.cos(angle * 5) * 0.06
        const radius = (clustered
          ? cloud.radius + (spread - 0.5) * 0.25
          : 0.2 + Math.pow(spread, 0.3) * 1.25) * irregularity * Math.min(aspect, 1)
        const x = dx * radius
        const y = dy * radius
        positions[p] = x * (reduced.matches ? 1 : 0.1)
        positions[p + 1] = y * (reduced.matches ? 1 : 0.1)
        positions[p + 2] = Math.random()
        velocities[v] = x * 1.9
        velocities[v + 1] = y * 1.9
        ages[i] = 0
        seeds[i] = Math.random() * Math.PI * 2
        sizes[i] = 3.0 + Math.random() * 5.0
      }
      cursor = (cursor + batchSize) % capacity
      count = Math.min(capacity, count + batchSize)
      geometry.setDrawRange(0, count)
      position.needsUpdate = true
      geometry.attributes.aSize.needsUpdate = true
      draw()
      wake()
    },
    dispose,
  }
}
