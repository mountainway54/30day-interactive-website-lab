// Keep geometry only: OBJ material libraries and texture coordinates are never loaded.
export function prepareObj(text) {
  if (!text.trim()) throw new Error('請先貼上完整的 OBJ 文字。')
  if (text.length > 12 * 1024 * 1024) throw new Error('資料超過 12 MB，請先簡化模型。')
  let vertices = 0, triangles = 0
  const output = []
  const lines = text.replace(/\\\r?\n/g, '').split(/\r?\n/)
  const totalVertices = lines.filter(line => /^v\s/.test(line.trim())).length
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].split('#')[0].trim()
    if (!line) continue
    const [kind, ...values] = line.split(/\s+/)
    const fail = message => { throw new Error(`第 ${i + 1} 行：${message}`) }
    if (kind === 'v') {
      if (values.length < 3 || !values.slice(0, 3).every(value => Number.isFinite(Number(value)))) fail('頂點需要三個有效座標。')
      vertices++
      output.push(`v ${values.slice(0, 3).join(' ')}`)
    } else if (kind === 'f') {
      if (values.length < 3) fail('每個面至少需要三個頂點。')
      const indices = values.map(value => {
        const index = Number(value.split('/')[0])
        if (!Number.isInteger(index) || index === 0 || index > totalVertices || index < -vertices) fail('面索引超出頂點範圍。')
        return index
      })
      triangles += indices.length - 2
      if (triangles > 1000000) fail('超過 100 萬個三角面，請先簡化模型。')
      // Normals are recalculated from geometry; UV and material references are omitted.
      output.push(`f ${indices.join(' ')}`)
    } else if (['o', 'g', 's'].includes(kind)) output.push(line)
  }
  if (!vertices || !triangles) throw new Error('找不到頂點 v 與面 f，請貼上 OBJ 模型全文。')
  return { text: output.join('\n'), vertices }
}
