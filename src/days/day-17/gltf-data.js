export function validateGltf(text) {
  if (!text.trim()) throw new Error('請先貼上完整的 .gltf JSON。')
  if (text.length > 12 * 1024 * 1024) throw new Error('資料超過 12 MB，請先簡化模型。')
  let data
  try { data = JSON.parse(text) } catch { throw new Error('JSON 格式不正確，請確認已複製完整內容，包含最外層大括號。') }
  if (data?.asset?.version !== '2.0') throw new Error('請使用 glTF 2.0 格式。')
  for (const item of [...(data.buffers ?? []), ...(data.images ?? [])]) {
    if (item.uri !== undefined && !/^data:[^,]*;base64,/i.test(item.uri)) {
      throw new Error('內容引用外部 .bin 或圖片。請改用內嵌 Base64 的 glTF；只貼 JSON 無法取得外部檔案。')
    }
  }
  if (data.buffers?.some(buffer => !buffer.uri)) throw new Error('缺少內嵌 buffer，請貼上 .gltf 文字，不能使用 .glb 的 JSON 片段。')
  if (data.extensionsRequired?.some(name => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(name))) {
    throw new Error('此 Demo 不支援壓縮模型或 KTX2 貼圖，請關閉壓縮後重新匯出。')
  }
  const count = (data.accessors ?? []).reduce((sum, item) => sum + (Number(item.count) || 0), 0)
  if (count > 3000000) throw new Error('模型資料量過大，請減少頂點或面數後再貼上。')
  return data
}

export function createSample() {
  const positions = new Float32Array([0, 1.4, 0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, -1, 0, -1.4, 0])
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 1, 4, 5, 1, 2, 5, 2, 3, 5, 3, 4, 5, 4, 1])
  const bytes = new Uint8Array(positions.byteLength + indices.byteLength)
  bytes.set(new Uint8Array(positions.buffer))
  bytes.set(new Uint8Array(indices.buffer), positions.byteLength)
  return JSON.stringify({
    asset: { version: '2.0', generator: 'Day 17 · Octahedron sample' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: '八面體' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.25, 0.36, 0.31, 1], metallicFactor: 0.15, roughnessFactor: 0.55 }, doubleSided: true }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 6, type: 'VEC3', min: [-1, -1.4, -1], max: [1, 1.4, 1] },
      { bufferView: 1, componentType: 5123, count: 24, type: 'SCALAR' },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }, { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength }],
    buffers: [{ byteLength: bytes.length, uri: `data:application/octet-stream;base64,${btoa(String.fromCharCode(...bytes))}` }],
  }, null, 2)
}
