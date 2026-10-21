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

/** 병 라벨: 라벤더 흰 종이에 남보라 테두리, 시안 줄과 강조색 별 (2D 가게의 네온 팔레트) */
export function labelTexture(accent: string) {
  // 병 둘레를 한 바퀴 감는 띠라서 위아래 줄만 긋고(이음매가 보이지 않게), 가운데에 별 하나와 글줄 두 개.
  return canvasTexture(256, 128, (ctx) => {
    const bg = ctx.createLinearGradient(0, 0, 0, 128);
    bg.addColorStop(0, '#fbf6ff');
    bg.addColorStop(1, '#e9ddff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#24104f';
    ctx.fillRect(0, 0, 256, 9);
    ctx.fillRect(0, 119, 256, 9);
    ctx.fillStyle = '#3fe8ff';
    ctx.fillRect(0, 12, 256, 4);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 106, 256, 8);
    ctx.fillStyle = '#24104f';
    ctx.fillRect(150, 40, 70, 7);
    ctx.fillRect(150, 58, 48, 7);
    ctx.fillStyle = accent;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 30 : 12;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(108 + Math.cos(a) * r, 56 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** 바닥에 드리우는 부드러운 그림자 */
export function shadowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(20,6,52,0.75)');
    g.addColorStop(0.6, 'rgba(20,6,52,0.25)');
    g.addColorStop(1, 'rgba(20,6,52,0)');
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

/**
 * 카운터 윗면: 짙은 보라 바탕에 아주 옅은 격자(베이퍼웨이브 바닥 격자).
 * 선과 바탕의 밝기 차이를 작게 둬서 후처리가 격자를 외곽선으로 오해하지 않게 한다.
 */
export function counterTexture() {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#3b2178';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#5a2f9c';
    ctx.fillRect(0, 0, 256, 3);
    ctx.fillRect(0, 0, 3, 256);
    ctx.fillStyle = 'rgba(255, 120, 220, 0.35)';
    ctx.fillRect(0, 0, 256, 1);
    ctx.fillRect(0, 0, 1, 256);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 셀 셰이딩용 3단 그라데이션 (모든 툰 재질이 함께 쓴다) */
let toonTex: THREE.DataTexture | null = null;
export function toonGradient() {
  if (toonTex) return toonTex;
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  toonTex = tex;
  return tex;
}

/**
 * 유리 겉면에 새긴 무늬(에칭) 한 칸. 흰 곳이 서리처럼 깎인 곳이다.
 * 잔을 한 바퀴 도는 동안 이 칸을 여러 번 되풀이해 붙인다(가로 반복).
 */
export function etchTexture(kind: 'deco' | 'fan' | 'garland' | 'sparkle') {
  const [w, h] = kind === 'sparkle' ? [256, 160] : [512, 128];
  const tex = canvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#fff';
      ctx.lineCap = 'round';
      const line = (y: number, width: number) => {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      };
      const star = (x: number, y: number, outer: number, inner: number, points = 5) => {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      };
      switch (kind) {
        case 'deco': {
          // 위아래 두 줄 사이에 마름모와 점을 번갈아 새긴 아르데코 띠
          line(12, 6);
          line(26, 3);
          line(h - 26, 3);
          line(h - 12, 6);
          ctx.lineWidth = 5;
          for (let i = 0; i < 4; i++) {
            const x = 64 + i * 128;
            ctx.beginPath();
            ctx.moveTo(x, 38);
            ctx.lineTo(x + 30, 64);
            ctx.lineTo(x, 90);
            ctx.lineTo(x - 30, 64);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, 64, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 64, 64, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'fan': {
          // 부채꼴 햇살 무늬 두 개
          line(10, 5);
          ctx.lineWidth = 5;
          for (const cx of [128, 384]) {
            for (const r of [34, 66, 98]) {
              ctx.beginPath();
              ctx.arc(cx, h - 6, r, Math.PI, 0);
              ctx.stroke();
            }
            for (let k = 1; k < 8; k++) {
              const a = Math.PI + (k / 8) * Math.PI;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(a) * 34, h - 6 + Math.sin(a) * 34);
              ctx.lineTo(cx + Math.cos(a) * 98, h - 6 + Math.sin(a) * 98);
              ctx.stroke();
            }
            star(cx, h - 10, 16, 7, 4);
          }
          star(256, 40, 12, 5, 4);
          star(0, 40, 12, 5, 4);
          star(512, 40, 12, 5, 4);
          break;
        }
        case 'garland': {
          // 늘어진 꽃줄과 별
          line(10, 4);
          ctx.lineWidth = 5;
          for (const x0 of [0, 256]) {
            ctx.beginPath();
            ctx.moveTo(x0, 26);
            ctx.quadraticCurveTo(x0 + 128, 128, x0 + 256, 26);
            ctx.stroke();
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x0 + 24, 26);
            ctx.quadraticCurveTo(x0 + 128, 100, x0 + 232, 26);
            ctx.stroke();
            ctx.lineWidth = 5;
            star(x0 + 128, 100, 17, 7);
            for (const dx of [70, 186]) {
              ctx.beginPath();
              ctx.arc(x0 + dx, 92, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          for (const x of [0, 256, 512]) star(x, 26, 14, 6);
          break;
        }
        case 'sparkle': {
          // 네 갈래 반짝임과 세로줄
          line(8, 5);
          line(h - 8, 5);
          ctx.lineWidth = 4;
          for (const x of [6, w - 6]) {
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, h - 20);
            ctx.stroke();
          }
          star(128, 80, 40, 9, 4);
          star(128, 80, 16, 6, 4);
          for (const [x, y, r] of [
            [64, 36, 4],
            [192, 36, 4],
            [64, 124, 4],
            [192, 124, 4],
            [128, 22, 3],
            [128, 138, 3],
          ])
            star(x, y, r * 2.4, r, 4);
          break;
        }
      }
    },
    false,
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
