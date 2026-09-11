const files = import.meta.glob(['../../../docs/textures/*/*_diff_1k.jpg', '../../../docs/textures/*/*_nor_gl_1k.exr', '../../../docs/textures/*/*_arm_1k.jpg'], { eager: true, query: '?url', import: 'default' })
export const presets = [
  { id: 'rusty_metal_04', label: '鏽蝕金屬', metalness: 1 },
  { id: 'rocky_terrain_02', label: '岩石地表', metalness: 0 },
  { id: 'marble_cliff_05', label: '大理石岩壁', metalness: 0 },
].map(preset => {
  const url = suffix => {
    const path = `../../../docs/textures/${preset.id}_1k/${preset.id}_${suffix}`
    if (!files[path]) throw new Error(`缺少貼圖：${path}`)
    return files[path]
  }
  return { ...preset, color: url('diff_1k.jpg'), normal: url('nor_gl_1k.exr'), arm: url('arm_1k.jpg'), source: `https://polyhaven.com/a/${preset.id}` }
})
