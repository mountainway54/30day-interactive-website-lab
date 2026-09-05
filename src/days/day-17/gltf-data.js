import defaultModel from './default-model.gltf?raw'

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
  return defaultModel
}
