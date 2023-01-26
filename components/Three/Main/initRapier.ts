import { RigidBodyType } from '@dimforge/rapier3d'
import * as THREE from 'three'

const initRapier = async (scene) => {
  const RAPIER = await import('@dimforge/rapier3d')
  const gravity = { x: 0.0, y: -9.81, z: 0.0 }
  const world = new RAPIER.World(gravity)

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.25, 5),
    new THREE.MeshStandardMaterial({color: 0xdddddd})
  )
  floor.position.set(2.5, 0, 2.5)
  const sampleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1), 
    new THREE.MeshNormalMaterial()
  )
  sampleMesh.position.set(2, 4, 2)
  scene.add(floor)
  scene.add(sampleMesh)

  const floorBodyDesc = new RAPIER.RigidBodyDesc(RigidBodyType.Fixed)
  const floorBody = world.createRigidBody(floorBodyDesc)
  floorBody.setTranslation({ x: 2.5, y: 0, z: 2.5 }, false)
  const floorColliderDesc = RAPIER.ColliderDesc.cuboid(2.5, 0.125, 2.5)
  world.createCollider(floorColliderDesc, floorBody)

  const rigidBodyDesc = new RAPIER.RigidBodyDesc(RigidBodyType.Dynamic)
    .setTranslation(2, 4, 2)
  const rigidBody = world.createRigidBody(rigidBodyDesc)
  const rigidBodyColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
  const rigidBodyCollider = world.createCollider(rigidBodyColliderDesc, rigidBody)
  rigidBodyCollider.setRestitution(1)
  return {
    world,
    rigidBody,
    sampleMesh,
  }
}
export default initRapier
