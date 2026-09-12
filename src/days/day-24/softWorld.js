import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// Rendering and physics share welded vertices, so the sphere has no UV seam.
export function createSoftWorld(A) {
  const owned = []
  const own = (value) => (owned.push(value), value)
  const config = own(new A.btSoftBodyRigidBodyCollisionConfiguration())
  const dispatcher = own(new A.btCollisionDispatcher(config))
  const broadphase = own(new A.btDbvtBroadphase())
  const solver = own(new A.btSequentialImpulseConstraintSolver())
  const softSolver = own(new A.btDefaultSoftBodySolver())
  const world = own(new A.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, config, softSolver))
  const gravity = own(new A.btVector3(0, -9.81, 0))
  world.setGravity(gravity)
  world.getWorldInfo().set_m_gravity(gravity)
  const half = own(new A.btVector3(30, 0.25, 30))
  const shape = own(new A.btBoxShape(half))
  const transform = own(new A.btTransform())
  transform.setIdentity()
  const origin = own(new A.btVector3(0, -0.25, 0))
  transform.setOrigin(origin)
  const motion = own(new A.btDefaultMotionState(transform))
  const zero = own(new A.btVector3(0, 0, 0))
  const info = own(new A.btRigidBodyConstructionInfo(0, motion, shape, zero))
  const ground = own(new A.btRigidBody(info))
  ground.setFriction(0.8)
  ground.setRestitution(0.8)
  world.addRigidBody(ground)
  const helper = own(new A.btSoftBodyHelpers())
  const force = own(new A.btVector3(0, 0, 0))
  const source = new THREE.IcosahedronGeometry(1.5, 5)
  source.deleteAttribute('normal')
  source.deleteAttribute('uv')
  const geometry = mergeVertices(source)
  source.dispose()
  const rest = geometry.attributes.position.array.slice()
  const indices = Array.from(geometry.index.array)
  let body, time = 0
  function reset(height = 5.5) {
    time = 0
    if (body) { world.removeSoftBody(body); A.destroy(body) }
    const vertices = Array.from(rest)
    for (let i = 1; i < vertices.length; i += 3) vertices[i] += height
    body = helper.CreateFromTriMesh(world.getWorldInfo(), vertices, indices, indices.length / 3, true)
    const cfg = body.get_m_cfg()
    cfg.set_viterations(12)
    cfg.set_piterations(12)
    cfg.set_kDP(0.003)
    cfg.set_kDF(0.8)
    cfg.set_kPR(180)
    cfg.set_collisions(0x11)
    body.get_m_materials().at(0).set_m_kLST(0.55)
    body.get_m_materials().at(0).set_m_kAST(0.55)
    body.setTotalMass(2, false)
    A.castObject(body, A.btCollisionObject).getCollisionShape().setMargin(0.035)
    body.setRestitution(0.75)
    body.setActivationState(4)
    world.addSoftBody(body, 1, -1)
    sync()
  }
  function sync() {
    const nodes = body.get_m_nodes(), positions = geometry.attributes.position
    for (let i = 0; i < nodes.size(); i++) {
      const p = nodes.at(i).get_m_x()
      positions.setXYZ(i, p.x(), p.y(), p.z())
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
  }
  // Select a local patch once, then apply forces to its physics nodes.
  function select(point) {
    const selected = [], p = new THREE.Vector3()
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(geometry.attributes.position, i)
      const d = p.distanceTo(point)
      if (d < 1.05) selected.push({ index: i, weight: (1 - d / 1.05) ** 2 })
    }
    return selected
  }
  function press(nodes, direction, strength) {
    const total = nodes.reduce((sum, n) => sum + n.weight, 0)
    if (!total) return
    for (const n of nodes) {
      const f = strength * n.weight / total
      force.setValue(direction.x * f, direction.y * f, direction.z * f)
      body.addForce(force, n.index)
    }
    // Spread the supporting reaction over the body: a poke deforms the patch
    // without launching the whole sphere out of the fixed camera's view.
    const count = body.get_m_nodes().size()
    force.setValue(-direction.x * strength / count, -direction.y * strength / count, -direction.z * strength / count)
    for (let i = 0; i < count; i++) body.addForce(force, i)
  }
  return {
    geometry, reset, select, press,
    step(dt) {
      time += dt
      body.get_m_cfg().set_kDP(time > 3 ? 0.015 : 0.003)
      world.stepSimulation(dt, 1, dt)
      const nodes = body.get_m_nodes(), count = nodes.size()
      let x = 0, z = 0, vx = 0, vz = 0, mass = 0
      for (let i = 0; i < count; i++) {
        const node = nodes.at(i), p = node.get_m_x(), v = node.get_m_v()
        const m = 1 / node.get_m_im()
        mass += m
        x += p.x() * m; z += p.z() * m; vx += v.x() * m; vz += v.z() * m
      }
      // Demo constraint: remove only horizontal bulk translation and momentum.
      // The same offset on every node preserves dents and relative velocities.
      // Shift the previous positions too, so the solver cannot reintroduce drift.
      x /= mass; z /= mass; vx /= mass; vz /= mass
      for (let i = 0; i < count; i++) {
        const node = nodes.at(i), p = node.get_m_x(), q = node.get_m_q(), v = node.get_m_v()
        p.setValue(p.x() - x, p.y(), p.z() - z)
        q.setValue(q.x() - x, q.y(), q.z() - z)
        v.setValue(v.x() - vx, v.y(), v.z() - vz)
      }
      sync()
    },
    dispose() {
      if (body) { world.removeSoftBody(body); A.destroy(body); body = null }
      world.removeRigidBody(ground)
      owned.reverse().forEach(value => A.destroy(value))
      geometry.dispose()
    },
  }
}
