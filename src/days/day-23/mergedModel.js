import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// 合併繪製物件，保留 UV 與法線；不焊接接縫，也不重新計算法線。
export function createMergedModel(source, material) {
  const root = new OBJLoader().parse(source)
  const geometries = [], originals = new Set()
  let merged
  try {
    root.updateMatrixWorld(true)
    root.traverse(object => {
      if (!object.isMesh) return
      const geometry = object.geometry
      geometries.push(geometry)
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(item => originals.add(item))
      if (!geometry.getAttribute('uv')) throw new Error('模型缺少 UV')
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
      geometry.applyMatrix4(object.matrixWorld)
    })
    if (!geometries.length) throw new Error('模型沒有網格')
    // 不建立 material groups，整個模型以單一材質繪製。
    merged = mergeGeometries(geometries, false)
    if (!merged) throw new Error('模型幾何屬性不相容，無法合併')
    merged.computeBoundingBox()
    const center = merged.boundingBox.getCenter(new THREE.Vector3())
    const size = merged.boundingBox.getSize(new THREE.Vector3())
    const diameter = Math.max(size.x, size.y, size.z)
    if (!Number.isFinite(diameter) || diameter <= 0) throw new Error('模型尺寸無效')
    merged.translate(-center.x, -center.y, -center.z)
    merged.scale(2.8 / diameter, 2.8 / diameter, 2.8 / diameter)
    merged.computeBoundingSphere()
    const model = new THREE.Mesh(merged, material)
    model.name = 'Snorlax_Merged'
    return model
  } catch (error) {
    merged?.dispose()
    throw error
  } finally {
    geometries.forEach(geometry => geometry.dispose())
    originals.forEach(item => item?.dispose())
  }
}
