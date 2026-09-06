import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const RESIDENTS = [
  {role: 'cook', root: 'CookResident', clip: 'CookStir', hotspot: 'kitchen'},
  {role: 'hatter', root: 'HatterResident', clip: 'HatterTea', hotspot: 'tea'},
  {role: 'queen', root: 'QueenResident', clip: 'QueenCommand', hotspot: 'trial'},
];

/** Replace only resident bodies. Clocks, hats, labels and puzzle roots stay put. */
export async function installResidents(world) {
  for (const {model, mixer} of world.residentActors || []) {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    model.traverse(object => { if (object.isMesh) object.material.dispose(); });
  }
  world.residentActors = [];
  if (!world.overworld) return;
  const worldRoot = world.root;
  const asset = world.residentAsset ??= await new GLTFLoader().loadAsync(
    `${import.meta.env?.BASE_URL || './'}models/wonderland-residents.glb`,
  );
  // A level change while loading must not attach actors to the new level.
  if (world.root !== worldRoot) return;
  for (const {role, root, clip, hotspot} of RESIDENTS) {
    const parent = world.hotspots[hotspot];
    const original = parent?.getObjectByName(`actor_${role}`);
    const source = asset.scene.getObjectByName(root);
    const animation = asset.animations.find(action => action.name === clip);
    if (!original || !source || !animation) continue;
    const model = source.clone(true);
    model.name = `${root}_instance`;
    model.position.copy(original.position);
    model.quaternion.copy(original.quaternion);
    model.scale.copy(original.scale);
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = object.material.clone();
      object.material.envMapIntensity = .3;
    });
    parent.add(model);
    original.visible = false;
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(animation).play();
    mixer.setTime(role === 'queen' ? 1.3 : role === 'hatter' ? .4 : 0);
    world.residentActors.push({role, model, mixer, position: new THREE.Vector3()});
  }
  // Remove the hidden body joints from the old procedural motion loop.
  world.actorParts = (world.actorParts || []).filter(({role}) =>
    !world.residentActors.some(actor => actor.role === role));
  worldRoot.updateMatrixWorld(true);
  for (const {hotspot} of RESIDENTS) {
    const parent = world.hotspots[hotspot];
    if (parent) world.boxes[hotspot] = new THREE.Box3().setFromObject(parent);
  }
}

export function updateResidents(world, dt) {
  if (!world.overworld || world.suspended) return;
  for (const actor of world.residentActors || []) {
    actor.model.getWorldPosition(actor.position);
    // Nearby residents keep moving during conversation. Distant joints do not
    // spend a phone's animation budget while the player is across the valley.
    if (actor.position.distanceToSquared(world.camera.position) < 45 * 45) {
      actor.mixer.update(dt);
    }
  }
}
