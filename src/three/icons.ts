// 버튼에 쓸 아이콘을 실제 3D 모델로 한 번 렌더해 이미지로 만든다.

import * as THREE from 'three';
import { GARNISHES, GLASSES, ICES, INGREDIENTS } from '../data';
import { buildEnvScene } from './bar';
import { makeGlass } from './glassware';
import { GLASS_SHAPES, iceMaterial, makeBottle, makeGarnish, makeIce } from './models';

export type IconMap = Record<string, string>;

export function renderIcons(): IconMap {
  const size = 160;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildEnvScene(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x302040, 1.2));
  const key = new THREE.DirectionalLight(0xffe8c8, 2.5);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0xb9a0ff, 2);
  rim.position.set(-3, 1, -2);
  scene.add(key, rim);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);

  const icons: IconMap = {};
  const shoot = (name: string, obj: THREE.Object3D, tilt = 0.25) => {
    scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const radius = Math.max(extent.y, extent.x, extent.z) * 0.62;
    const dist = radius / Math.tan(THREE.MathUtils.degToRad(14));
    camera.position.set(center.x, center.y + dist * tilt, center.z + dist);
    camera.lookAt(center);
    renderer.render(scene, camera);
    icons[name] = renderer.domElement.toDataURL('image/png');
    scene.remove(obj);
  };

  for (const ing of INGREDIENTS) {
    const b = makeBottle(ing.id, ing.color, { glow: 0.2 });
    b.rotation.y = -0.4;
    shoot(`ing:${ing.id}`, b, 0.12);
  }
  for (const g of GLASSES) {
    const glass = makeGlass(g.id, true);
    shoot(`glass:${g.id}`, glass, 0.3);
  }
  const iceMat = iceMaterial();
  iceMat.opacity = 0.85;
  for (const ice of ICES) {
    const group = new THREE.Group();
    const s = GLASS_SHAPES.rocks;
    const glass = makeGlass('rocks', true);
    group.add(glass);
    const spots = [
      [-0.18, 0.2, 0.05],
      [0.17, 0.2, -0.05],
      [0, 0.42, 0.1],
      [0.05, 0.42, -0.15],
    ];
    for (let i = 0; i < ice.cubes; i++) {
      const cube = makeIce(0.24, iceMat);
      const [x, y, z] = spots[i];
      cube.position.set(x, s.floor + y, z);
      cube.rotation.set(i * 0.4, i * 0.9, i * 0.3);
      group.add(cube);
    }
    shoot(`ice:${ice.id}`, group, 0.45);
  }
  for (const g of GARNISHES) {
    if (g.id === 'none') continue;
    const m = makeGarnish(g.id);
    m.rotation.y = g.id === 'lemon' ? -0.5 : 0.3;
    shoot(`garnish:${g.id}`, m, 0.2);
  }

  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return icons;
}
