// Mirror the CSS wave's current geometry and opacity into the refracted copy.
// Reading the running CSS animation keeps pause/restart/reduced-motion in sync.
export function drawRippleGlassLayer(element, context, rect, width, height) {
  if (!element) return false
  const bounds = element.getBoundingClientRect()
  const opacity = Number(getComputedStyle(element).opacity)
  const x = bounds.left + bounds.width / 2 - rect.left
  const y = bounds.top + bounds.height / 2 - rect.top
  const radius = Math.hypot(bounds.width, bounds.height) / 2
  context.save()
  context.scale(width / rect.width, height / rect.height)
  context.globalAlpha = opacity
  const wave = context.createRadialGradient(x, y, 0, x, y, Math.max(1, radius))
  for (const [stop, color] of [
    [0, 'rgba(24,65,115,0)'], [.35, 'rgba(24,65,115,0)'], [.43, 'rgba(24,65,115,.08)'],
    [.51, 'rgba(45,107,195,.25)'], [.6, 'rgba(83,165,255,.55)'],
    [.65, 'rgba(170,223,255,.7)'], [.71, 'rgba(75,137,242,.36)'], [.83, 'rgba(75,137,242,0)'], [1, 'rgba(75,137,242,0)'],
  ]) wave.addColorStop(stop, color)
  context.fillStyle = wave
  // Match the rounded element's clipping, not just its gradient.
  context.beginPath()
  context.arc(x, y, bounds.width / 2, 0, Math.PI * 2)
  context.fill()
  context.restore()
  return element.getAnimations().some((animation) => animation.playState === 'running')
}
