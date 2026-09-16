import * as THREE from 'three'

export function createPointerFloat(canvas, model, offset, camera, redraw) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const target = new THREE.Vector3()
  const velocity = new THREE.Vector3()
  const center = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const projectedRest = new THREE.Vector3()
  const hitPointer = new THREE.Vector2()
  const force = new THREE.Vector3()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const meshes = []
  model.updateMatrixWorld(true)
  model.traverse((object) => {
    if (object.isMesh) {
      object.geometry.computeBoundingBox()
      meshes.push(object)
    }
  })
  const restCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
  let frame = 0, previous = 0, lastHitTest = 0
  let present = false, dirty = false, disposed = false
  let clientX = 0, clientY = 0

  function refreshTarget(now) {
    if (!dirty || now - lastHitTest < 80) return
    dirty = false
    lastHitTest = now
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) { target.set(0, 0, 0); return }
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (clientY - bounds.top) / bounds.height * 2)
    camera.updateMatrixWorld()
    center.copy(restCenter).add(offset).project(camera)
    projectedRest.copy(restCenter).project(camera)
    // Undo the shader translation when testing the stationary geometry.
    hitPointer.set(pointer.x - center.x + projectedRest.x, pointer.y - center.y + projectedRest.y)
    raycaster.setFromCamera(hitPointer, camera)
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1 ||
      raycaster.intersectObjects(meshes, false).length) {
      target.set(0, 0, 0)
      return
    }
    // Screen-space repulsion follows the camera at every scroll chapter.
    const dx = (center.x - pointer.x) * bounds.width / bounds.height
    const dy = center.y - pointer.y
    const distance = Math.hypot(dx, dy)
    const strength = 0.18 * Math.max(0, 1 - distance / 2.2)
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    target.copy(right).multiplyScalar(dx / Math.max(distance, 0.001) * strength)
      .addScaledVector(up, dy / Math.max(distance, 0.001) * strength)
  }

  function tick(now) {
    frame = 0
    if (disposed || document.hidden || reduced.matches) return
    const dt = Math.min((now - previous) / 1000 || 1 / 60, 1 / 30)
    previous = now
    if (present) refreshTarget(now)
    // Damped spring: a gentle push followed by a small floating rebound.
    velocity.addScaledVector(force.copy(target).sub(offset), 16 * dt)
    velocity.multiplyScalar(Math.exp(-6 * dt))
    const moving = velocity.lengthSq() > 1e-8 || offset.distanceToSquared(target) > 1e-8
    offset.addScaledVector(velocity, dt)
    if (!moving) { offset.copy(target); velocity.set(0, 0, 0) }
    redraw()
    if (moving || dirty) frame = requestAnimationFrame(tick)
  }
  function wake() {
    if (!frame && !disposed && !document.hidden && !reduced.matches) {
      previous = performance.now()
      frame = requestAnimationFrame(tick)
    }
  }
  function move(event) {
    if (event.pointerType === 'touch' || reduced.matches || document.hidden) return
    clientX = event.clientX; clientY = event.clientY
    present = true; dirty = true
    wake()
  }
  function leave() { present = false; dirty = false; target.set(0, 0, 0); wake() }
  function reset() {
    cancelAnimationFrame(frame); frame = 0
    present = false; dirty = false
    target.set(0, 0, 0); velocity.set(0, 0, 0); offset.set(0, 0, 0)
    if (!disposed && !document.hidden) redraw()
  }
  window.addEventListener('pointermove', move, { passive: true })
  document.documentElement.addEventListener('pointerleave', leave)
  window.addEventListener('blur', reset)
  document.addEventListener('visibilitychange', reset)
  reduced.addEventListener('change', reset)
  return {
    refresh() { if (present) { dirty = true; wake() } },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      reduced.removeEventListener('change', reset)
    },
  }
}
