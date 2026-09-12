import ammoUrl from 'ammojs-typed/ammo/ammo.js?url'

let pending
// Keep the generated asm.js runtime intact. Bundler minification can change
// its numeric semantics, producing different collisions in production.
export function loadAmmo() {
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timer = setTimeout(() => finish(new Error('Ammo 載入逾時')), 30000)
    function finish(error) {
      clearTimeout(timer)
      script.onload = script.onerror = null
      script.remove()
      if (error) { pending = undefined; reject(error) }
    }
    script.src = ammoUrl
    script.onload = async () => {
      try {
        const instance = await window.Ammo.call({})
        finish()
        resolve(instance)
      } catch (error) { finish(error) }
    }
    script.onerror = () => finish(new Error('Ammo 載入失敗'))
    document.head.appendChild(script)
  })
  return pending
}
