// 캔버스로 그려 만드는 텍스처들. 외부 이미지 없이 모두 코드로 생성한다.

import * as THREE from 'three';

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 결을 살린 짙은 원목 카운터 */
export function woodTexture() {
  const tex = canvasTexture(1024, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#3a1a2c');
    g.addColorStop(1, '#24101d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      const y = rnd() * 512;
      const amp = 2 + rnd() * 8;
      const freq = 0.004 + rnd() * 0.01;
      ctx.strokeStyle = rnd() > 0.5 ? `rgba(90,40,64,${0.15 + rnd() * 0.25})` : `rgba(15,5,12,${0.2 + rnd() * 0.3})`;
      ctx.lineWidth = 0.6 + rnd() * 2.2;
      ctx.beginPath();
      for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, y + Math.sin(x * freq + i) * amp);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

/** 백바 뒤에서 은은하게 빛나는 패널 */
export function backlightTexture() {
  return canvasTexture(512, 256, (ctx) => {
    const g = ctx.createRadialGradient(256, 200, 10, 256, 170, 300);
    g.addColorStop(0, '#ffd9a0');
    g.addColorStop(0.4, '#d97aae');
    g.addColorStop(0.8, '#4a2470');
    g.addColorStop(1, '#24113f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    // 아르데코 세로 결
    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = 'rgba(40,15,60,0.18)';
      ctx.fillRect(x, 0, 3, 256);
    }
  });
}

/** 벽면의 아르데코 패턴 */
export function wallTexture() {
  const tex = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#1c1033';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(214,170,90,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const cx = 128 + (i % 2) * 256;
      const cy = 128 + Math.floor(i / 2) * 256;
      for (let r = 30; r <= 120; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy + 120, r, Math.PI, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - 120);
      ctx.lineTo(cx, cy + 120);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 2.5);
  return tex;
}

/** 네온 간판 */
export function neonTexture(text: string) {
  return canvasTexture(1024, 192, (ctx) => {
    ctx.clearRect(0, 0, 1024, 192);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 96px "Georgia", "Times New Roman", serif';
    // 밝은 백라이트 위에서도 읽히도록 어두운 테두리를 먼저 깐다.
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(30,8,40,0.85)';
    ctx.strokeText(text, 512, 100);
    for (const [blur, color] of [
      [40, 'rgba(255,90,200,0.9)'],
      [18, 'rgba(255,140,220,1)'],
      [4, 'rgba(255,230,250,1)'],
    ] as const) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillText(text, 512, 100);
    }
  });
}

/** 레몬 단면 */
export function lemonTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3bf';
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * Math.PI * 2 + 0.05;
      const a1 = ((i + 1) / 9) * Math.PI * 2 - 0.05;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos((a0 + a1) / 2) * 12, 128 + Math.sin((a0 + a1) / 2) * 12);
      ctx.arc(128, 128, 102, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fff8d8';
    ctx.beginPath();
    ctx.arc(128, 128, 12, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** 병 라벨: 금색 테두리와 별 문양 */
export function labelTexture(accent: string) {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#f5ead2';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#c99a3e';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 10, 240, 108);
    ctx.fillStyle = accent;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 34 : 14;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(128 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** 바닥에 드리우는 부드러운 그림자 */
export function shadowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }, false);
}

/** 별빛 입자 스프라이트 */
export function sparkleTexture() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,240,220,0.6)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(31, 4, 2, 56);
    ctx.fillRect(4, 31, 56, 2);
  });
}

/** 셀 셰이딩용 3단 그라데이션 */
export function toonGradient() {
  const data = new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
