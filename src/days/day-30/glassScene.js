export const glassSceneKey = Symbol('day-30-glass-scene')

// Capture immediately after WebGL render, before its drawing buffer is cleared.
// Each page owns its sources; no DOM screenshot or preserveDrawingBuffer needed.
export function createGlassScene() {
  const sources = new Map()
  const listeners = new Set()
  const overlays = new Map()
  return {
    sources,
    overlays,
    invalidate() { listeners.forEach((listener) => listener()) },
    addOverlay(name, draw) { overlays.set(name, draw); return () => overlays.delete(name) },
    publish(name, canvas) {
      let source = sources.get(name)
      if (!source) {
        const copy = document.createElement('canvas')
        source = { canvas: copy, context: copy.getContext('2d'), version: 0 }
        sources.set(name, source)
      }
      const scale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height))
      const width = Math.max(1, Math.round(canvas.width * scale))
      const height = Math.max(1, Math.round(canvas.height * scale))
      if (source.canvas.width !== width || source.canvas.height !== height) {
        source.canvas.width = width
        source.canvas.height = height
      }
      source.context.clearRect(0, 0, width, height)
      source.context.drawImage(canvas, 0, 0, width, height)
      source.version++
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    dispose() {
      listeners.clear()
      sources.forEach(({ canvas }) => { canvas.width = 1; canvas.height = 1 })
      sources.clear()
      overlays.clear()
    },
  }
}
