// A 是已完成初始化的 Ammo.js 實例
// 以下摘錄 softWorld.js 的地面設定

// 半尺寸：實際寬 60、高 0.5、深 60
const half = new A.btVector3(30, 0.25, 30);
const shape = new A.btBoxShape(half);

// 設定位置，讓箱體頂面位於 y = 0
const transform = new A.btTransform();
transform.setIdentity();
const origin = new A.btVector3(0, -0.25, 0);
transform.setOrigin(origin);

const motion = new A.btDefaultMotionState(transform);
const zero = new A.btVector3(0, 0, 0);

// 質量為 0：建立固定不動的地面剛體
const info = new A.btRigidBodyConstructionInfo(
  0, motion, shape, zero,
);
const ground = new A.btRigidBody(info);

// 設定摩擦與碰撞恢復係數
ground.setFriction(0.8);
ground.setRestitution(0.8);

// 加入物理世界，開始參與碰撞
world.addRigidBody(ground);
