import * as THREE from "three";

export function createCrownObject(): THREE.Group {
  const group = new THREE.Group();
  group.name = "omega_crown";

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf5b81b,
    roughness: 0.35,
    metalness: 0.65,
  });

  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xdf1638,
    roughness: 0.2,
    metalness: 0.4,
  });

  const rimFront = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.3, 0.4), goldMat);
  rimFront.position.set(0, 7.6, 4.5);
  group.add(rimFront);

  const rimBack = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.3, 0.4), goldMat);
  rimBack.position.set(0, 7.6, -4.5);
  group.add(rimBack);

  const rimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 8.6), goldMat);
  rimLeft.position.set(-4.5, 7.6, 0);
  group.add(rimLeft);

  const rimRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 8.6), goldMat);
  rimRight.position.set(4.5, 7.6, 0);
  group.add(rimRight);

  const corners: [number, number, number][] = [
    [-4.5, 8.6, -4.5],
    [4.5, 8.6, -4.5],
    [-4.5, 8.6, 4.5],
    [4.5, 8.6, 4.5],
  ];
  corners.forEach(([x, y, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), goldMat);
    p.position.set(x, y, z);
    group.add(p);
  });

  const frontPeak = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 0.5), goldMat);
  frontPeak.position.set(0, 8.9, 4.5);
  group.add(frontPeak);

  const backPeak = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 0.5), goldMat);
  backPeak.position.set(0, 8.8, -4.5);
  group.add(backPeak);

  const leftPeak = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 1.6), goldMat);
  leftPeak.position.set(-4.5, 8.8, 0);
  group.add(leftPeak);

  const rightPeak = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 1.6), goldMat);
  rightPeak.position.set(4.5, 8.8, 0);
  group.add(rightPeak);

  const frontRuby = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), rubyMat);
  frontRuby.position.set(0, 8.65, 4.6);
  group.add(frontRuby);

  const backRuby = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), rubyMat);
  backRuby.position.set(0, 8.65, -4.6);
  group.add(backRuby);

  const leftRuby = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), rubyMat);
  leftRuby.position.set(-4.6, 8.65, 0);
  group.add(leftRuby);

  const rightRuby = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), rubyMat);
  rightRuby.position.set(4.6, 8.65, 0);
  group.add(rightRuby);

  return group;
}

export function disposeThreeHierarchy(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}
