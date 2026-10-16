// 손님 자리에서 바라본 바: 원목 카운터, 빛나는 백바 선반, 아르데코 장식, 네온 간판, 펜던트 조명.

import * as THREE from 'three';
import { INGREDIENTS } from '../data';
import { fxTime } from './glassware';
import { goldMaterial, makeBottle, makeStar } from './models';
import { onQuality } from './quality';
import { backlightTexture, neonTexture, sparkleTexture, wallTexture, woodTexture } from './textures';

export interface Bar {
  group: THREE.Group;
  update: (time: number) => void;
}

const BACK_Z = -3.7;

export function buildBar(): Bar {
  const group = new THREE.Group();
  const gold = goldMaterial;

  // 카운터 상판
  const wood = woodTexture();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.16, 2.4),
    new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.7 }),
  );
  counter.position.set(0, -0.08, -0.1);
  group.add(counter);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 0.05), gold);
  trim.position.set(0, -0.005, 1.1);
  group.add(trim);
  const trimBack = trim.clone();
  trimBack.position.z = -1.3;
  group.add(trimBack);

  // 뒤쪽 벽
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 9),
    new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.85, color: 0x9a86c8 }),
  );
  wall.position.set(0, 2.5, BACK_Z - 0.3);
  group.add(wall);

  // 백바 아래 수납장
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 1.4, 0.7),
    new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.4, clearcoat: 0.6 }),
  );
  cabinet.position.set(0, -0.5, BACK_Z + 0.2);
  group.add(cabinet);
  const cabTrim = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.03, 0.03), gold);
  cabTrim.position.set(0, 0.2, BACK_Z + 0.56);
  group.add(cabTrim);

  // 수납장 위 소품: 셰이커와 지거
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3ee, metalness: 1, roughness: 0.18 });
  for (const [x, kind] of [
    [-2.6, 'shaker'],
    [-2.25, 'jigger'],
    [2.4, 'shaker'],
  ] as const) {
    const m =
      kind === 'shaker'
        ? new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.14, 0.42), new THREE.Vector2(0.1, 0.5), new THREE.Vector2(0.05, 0.62), new THREE.Vector2(0.001, 0.64)], 32), steel)
        : new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.09, 0), new THREE.Vector2(0.02, 0.14), new THREE.Vector2(0.09, 0.3)], 24), gold);
    m.position.set(x, 0.2, BACK_Z + 0.25);
    group.add(m);
  }

  // 백라이트 패널과 아르데코 틀
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 2.6),
    new THREE.MeshBasicMaterial({ map: backlightTexture(), toneMapped: false, color: new THREE.Color(0.62, 0.58, 0.62) }),
  );
  glow.position.set(0, 1.55, BACK_Z - 0.05);
  group.add(glow);
  for (const x of [-3.95, 3.95]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 0.3), new THREE.MeshPhysicalMaterial({ color: 0x2a1840, roughness: 0.3, clearcoat: 1 }));
    pillar.position.set(x, 1.6, BACK_Z + 0.05);
    group.add(pillar);
    for (const dx of [-0.16, 0.16]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.025, 4.2, 0.03), gold);
      line.position.set(x + dx, 1.6, BACK_Z + 0.2);
      group.add(line);
    }
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.12, 0.3), gold);
  lintel.position.set(0, 2.9, BACK_Z + 0.05);
  group.add(lintel);

  // 상단 부채꼴 장식
  const fan = new THREE.Group();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.5, 0.02), gold);
    ray.position.set(Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0);
    ray.rotation.z = a - Math.PI / 2;
    fan.add(ray);
  }
  for (const r of [0.55, 1.1, 1.5]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 64, Math.PI), gold);
    fan.add(arc);
  }
  fan.position.set(0, 2.96, BACK_Z + 0.02);
  group.add(fan);

  // 선반과 병
  const shelfMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.6 });
  // 낮은 품질에서는 유리 선반도 굴절을 끄고 반투명으로만 그린다(화면 복사 패스가 통째로 빠진다).
  onQuality((q) => {
    shelfMat.transmission = q === 'high' ? 0.9 : 0;
    shelfMat.opacity = q === 'high' ? 0.6 : 0.35;
    shelfMat.needsUpdate = true;
  });
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.1), toneMapped: false });
  const palette = [...INGREDIENTS.map((i) => i.color), '#3fbfa0', '#e8a23a', '#5aa0ff', '#d64a7a'];
  const kinds = ['tall', 'wine', 'decanter', 'flask', 'jug', 'soda', 'cream', 'dasher'] as const;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shelfYs = [0.62, 1.32, 2.02];
  shelfYs.forEach((y, row) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.035, 0.5), shelfMat);
    shelf.position.set(0, y, BACK_Z + 0.15);
    group.add(shelf);
    const led = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.012, 0.012), ledMat);
    led.position.set(0, y - 0.025, BACK_Z + 0.4);
    group.add(led);
    let x = -3.45;
    while (x < 3.4) {
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      const color = palette[Math.floor(rnd() * palette.length)];
      const b = makeBottle(kind, color, { glow: 0.35, accent: palette[(row * 3 + Math.floor(x * 10)) % palette.length] });
      const s = 0.58 + rnd() * 0.18;
      b.scale.setScalar(s);
      b.position.set(x + 0.2 * s, y + 0.018, BACK_Z + 0.12 + (rnd() - 0.5) * 0.12);
      b.rotation.y = (rnd() - 0.5) * 0.6;
      group.add(b);
      x += 0.32 + rnd() * 0.22;
    }
  });

  // 네온 간판
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.6),
    new THREE.MeshBasicMaterial({ map: neonTexture('Starlight Bar'), transparent: true, toneMapped: false, color: new THREE.Color(2.2, 2.2, 2.2), depthWrite: false }),
  );
  neon.position.set(0, 2.5, BACK_Z + 0.25);
  group.add(neon);
  for (const x of [-1.85, 1.85]) {
    const s = makeStar(0.12, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 0.9), toneMapped: false }));
    s.position.set(x, 2.5, BACK_Z + 0.26);
    group.add(s);
  }

  // 펜던트 조명
  const shafts: THREE.Mesh[] = [];
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xd8a94e, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.8), toneMapped: false });
  const lamps: THREE.PointLight[] = [];
  for (const x of [-2.6, 2.6]) {
    const lamp = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    cord.position.y = 1.0;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 32, 1, true), shadeMat);
    shade.position.y = -0.05;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), bulbMat);
    bulb.position.y = -0.2;
    const light = new THREE.PointLight(0xffc98a, 6, 6, 1.6);
    light.position.y = -0.3;
    lamps.push(light);
    lamp.add(cord, shade, bulb, light);
    lamp.position.set(x, 2.75, -0.9);
    group.add(lamp);
    // 전등 아래로 떨어지는 옅은 빛줄기
    const beam = lightBeam(0.95, 2.6, new THREE.Color(1.0, 0.78, 0.5), 0.085);
    beam.position.set(x, 2.75 - 0.2 - 1.3, -0.9);
    shafts.push(beam);
    group.add(beam);
  }
  // 왼쪽 위 높은 창에서 비스듬히 들어오는 넓은 빛줄기(손님 쪽)
  const skyBeam = lightBeam(1.5, 5.5, new THREE.Color(0.75, 0.62, 1.0), 0.05, 0.25);
  skyBeam.position.set(-2.4, 2.3, -2.6);
  skyBeam.rotation.z = -0.42;
  shafts.push(skyBeam);
  group.add(skyBeam);
  onQuality((q) => shafts.forEach((b) => (b.visible = q === 'high')));

  // 공중에 떠다니는 별가루
  const count = 260;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rnd() - 0.5) * 12;
    positions[i * 3 + 1] = rnd() * 4.2 - 0.3;
    positions[i * 3 + 2] = BACK_Z + 0.6 + rnd() * 4.4;
    speeds[i] = 0.04 + rnd() * 0.1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sprite = sparkleTexture();
  const dustA = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ map: sprite, size: 0.07, color: 0xffe2b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const dustB = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ map: sprite, size: 0.045, color: 0xc9b2ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  dustB.rotation.y = Math.PI;
  dustB.position.z = 2 * (BACK_Z + 2.8);
  group.add(dustA, dustB);

  const update = (time: number) => {
    const t = time / 1000;
    for (let i = 0; i < count; i++) {
      let y = positions[i * 3 + 1] + speeds[i] * 0.016;
      if (y > 4) y = -0.3;
      positions[i * 3 + 1] = y;
    }
    dustGeo.attributes.position.needsUpdate = true;
    (dustA.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 1.3);
    (dustB.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 1.3 + Math.PI);
    neon.material.color.setScalar(2.1 + 0.15 * Math.sin(t * 7) * Math.sin(t * 2.3));
    fan.rotation.z = Math.sin(t * 0.2) * 0.01;
    lamps.forEach((l, i) => (l.intensity = 6 + 0.4 * Math.sin(t * 2 + i)));
  };

  return { group, update };
}

/** 반사광을 위한 환경: 따뜻한 백라이트와 보랏빛 벽을 가진 상자 */
export function buildEnvScene(): THREE.Scene {
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0x1a1030, side: THREE.BackSide }));
  env.add(box);
  const panel = (w: number, h: number, color: THREE.Color, pos: [number, number, number], rotY = 0, rotX = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(rotX, rotY, 0);
    env.add(m);
  };
  panel(10, 3, new THREE.Color(1.6, 1.1, 0.7), [0, 1, -9.5]);
  panel(6, 6, new THREE.Color(1.3, 1.25, 1.2), [0, 4.9, 0], 0, Math.PI / 2);
  panel(4, 6, new THREE.Color(0.9, 0.5, 1.8), [-9.5, 1, 0], Math.PI / 2);
  panel(4, 6, new THREE.Color(1.8, 0.6, 1.1), [9.5, 1, 0], -Math.PI / 2);
  panel(8, 2, new THREE.Color(0.8, 0.7, 1.2), [0, 0, 9.5], Math.PI);
  // 앞쪽 양옆의 길쭉한 조명판: 유리와 금테에 세로로 긴 하이라이트가 또렷하게 맺힌다.
  panel(0.7, 7, new THREE.Color(2.4, 2.2, 2.0), [-6.5, 1.5, 6.5], -Math.PI * 0.75);
  panel(0.7, 7, new THREE.Color(2.2, 2.0, 2.3), [6.5, 1.5, 6.5], Math.PI * 0.75);
  // 뒤쪽 네온 띠(분홍·하늘빛): 가장자리 반사에 은은한 색을 얹는다.
  panel(12, 0.25, new THREE.Color(2.2, 0.6, 1.6), [0, 3.2, -9.4]);
  panel(0.25, 6, new THREE.Color(0.5, 1.4, 2.2), [-9.4, 1.5, -5], Math.PI / 2);
  return env;
}

const BEAM_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uTop;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  // 위(전등)에서 밝고 아래로 옅어지며, 시선과 나란한 가장자리는 사라져 부피감이 난다.
  float along = vUv.y;
  float fall = smoothstep(0.0, 0.75, along) * (1.0 - smoothstep(1.0 - uTop, 1.0, along) * 0.85);
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float drift = 0.9 + 0.1 * sin(uTime * 0.7 + along * 6.0);
  gl_FragColor = vec4(uColor * uOpacity * fall * edge * drift, 1.0);
}
`;

/**
 * 가짜 빛줄기(갓 레이): 끝이 열린 원뿔에 덧셈 혼합으로 옅은 빛을 칠한다.
 * 화면을 더 그리지 않는 값싼 방법이라 낮은 품질에서만 끈다.
 */
function lightBeam(radius: number, height: number, color: THREE.Color, opacity: number, top = 0.08) {
  const geo = new THREE.CylinderGeometry(radius * 0.12, radius, height, 32, 1, true);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: opacity },
      uTime: fxTime,
      uTop: { value: top },
    },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 6;
  return mesh;
}
