/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Motor Cinematográfico 2D Pixel-Art de 64 Bits (Estilo SEGA Saturn VDP2 / System-32 + HD-2D RGB)
 * para el prólogo «CUANDO EL MUNDO OLVIDÓ JUGAR» (00:00–02:30 / 150s).
 *
 * Características técnicas:
 * - Framebuffer interno nítido de 480×270 píxeles escalado sin suavizado (nearest-neighbor).
 * - Planos de perspectiva por líneas de barrido (estilo VDP2), paralaje multicapa y tramado Bayer.
 * - Iluminación dinámica RGB y ámbar, partículas de memoria y sprites detallados de 64 bits.
 * - Cero geometría 3D poligonal; 100% arte pixelado profesional sincronizado a los 8 capítulos.
 */

export interface CinematicWorldController {
  resize: (width: number, height: number) => void;
  renderAtTime: (tSec: number, dtSec: number) => void;
  dispose: () => void;
}

const FB_W = 480;
const FB_H = 270;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface StarParticle {
  x: number;
  y: number;
  z: number;
  color: string;
  phase: number;
}

/** Dibuja un degradado vertical por bandas pixeladas con tramado sutil estilo 64-bit SEGA */
function drawBandedSky(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: string[]
): void {
  const bands = stops.length;
  const bandH = Math.ceil(h / bands);
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = stops[i];
    const by = y + i * bandH;
    const bh = Math.min(bandH, y + h - by);
    if (bh <= 0) break;
    ctx.fillRect(x, by, w, bh);
    // Costura tramada estilo VDP2 entre bandas contiguas
    if (i > 0) {
      ctx.fillStyle = stops[i - 1];
      for (let dx = x + ((i % 2) * 2); dx < x + w; dx += 4) {
        ctx.fillRect(dx, by, 2, 1);
      }
      for (let dx = x + (((i + 1) % 2) * 4); dx < x + w; dx += 8) {
        ctx.fillRect(dx, by + 1, 2, 1);
      }
    }
  }
}

/** Suelo en perspectiva por scanlines estilo SEGA Saturn VDP2 */
function drawVdp2PerspectiveGrid(
  ctx: CanvasRenderingContext2D,
  horizonY: number,
  bottomY: number,
  scrollZ: number,
  scrollX: number,
  bgNear: string,
  bgFar: string,
  lineHex: string,
  lineAlpha: number
): void {
  const totalH = bottomY - horizonY;
  if (totalH <= 2) return;

  for (let sy = horizonY; sy < bottomY; sy += 2) {
    const p = (sy - horizonY) / totalH; // 0 en horizonte, 1 abajo
    const depth = 1 / Math.max(0.06, p);
    const zPhase = (depth * 4.5 + scrollZ) % 1;

    ctx.fillStyle = p < 0.35 ? bgFar : bgNear;
    ctx.fillRect(0, sy, FB_W, 2);

    if (zPhase < 0.16 * (0.4 + p * 0.8)) {
      ctx.globalAlpha = clamp01(lineAlpha * p);
      ctx.fillStyle = lineHex;
      ctx.fillRect(0, sy, FB_W, 1);
      ctx.globalAlpha = 1;
    }
  }

  // Líneas radiales convergentes en el punto de fuga
  const vpX = Math.round(FB_W * 0.5 - scrollX * 0.25);
  ctx.save();
  ctx.globalAlpha = clamp01(lineAlpha * 0.75);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 1;
  for (let i = -8; i <= 8; i++) {
    const bx = vpX + i * 54;
    ctx.beginPath();
    ctx.moveTo(vpX + i * 5, horizonY);
    ctx.lineTo(bx, bottomY);
    ctx.stroke();
  }
  ctx.restore();
}

/** Halo de luz aditiva suave pero anclado a coordenadas enteras */
function drawPixelGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  hex: string,
  alpha: number
): void {
  if (alpha <= 0.005 || radius <= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const steps = 4;
  for (let i = steps; i >= 1; i--) {
    const r = Math.round((radius * i) / steps);
    ctx.globalAlpha = (alpha / steps) * (1.25 - (i / steps) * 0.5);
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Sprite detallado de 64 bits de PIXEL (protagonista de PIXELVERSE) */
function drawPixelHero64Bit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  t: number,
  opts?: {
    backView?: boolean;
    running?: boolean;
    auraStrength?: number;
  }
): void {
  const s = Math.max(1, Math.round(scale));
  const bob = opts?.running
    ? Math.round(Math.abs(Math.sin(t * 11)) * -3)
    : Math.round(Math.sin(t * 2.6) * 2);
  const aura = opts?.auraStrength ?? 0.5;

  if (aura > 0) {
    drawPixelGlow(ctx, cx, cy - 8 * s + bob, 24 * s, '#00f3ff', aura * 0.36);
    drawPixelGlow(ctx, cx, cy - 8 * s + bob, 12 * s, '#fde047', aura * 0.22);
  }

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + bob));
  ctx.scale(s, s);

  const out = '#050812';
  const hairDark = '#1c1228';
  const hairMid = '#2c2246';
  const hairHi = '#00f3ff';
  const skin = '#ffd6b8';
  const skinShade = '#d99b78';
  const suitDark = '#0b4f6c';
  const suitBright = '#00f3ff';
  const scarf = '#fbbf24';
  const scarfShade = '#d97706';

  // Bufanda / estela energética ondeando al viento estilo 64-bit SEGA
  const wave = Math.round(Math.sin(t * 6.5) * 2);
  ctx.fillStyle = out;
  ctx.fillRect(-13, -13 + wave, 8, 5);
  ctx.fillStyle = scarfShade;
  ctx.fillRect(-12, -12 + wave, 7, 3);
  ctx.fillStyle = scarf;
  ctx.fillRect(-10, -12 + wave, 5, 2);

  // Piernas / botas
  const stride = opts?.running ? Math.round(Math.sin(t * 11) * 3) : 0;
  ctx.fillStyle = out;
  ctx.fillRect(-5 + stride, -4, 4, 6);
  ctx.fillRect(1 - stride, -4, 4, 6);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4 + stride, -3, 2, 4);
  ctx.fillRect(2 - stride, -3, 2, 4);
  ctx.fillStyle = suitBright;
  ctx.fillRect(-4 + stride, 0, 2, 1);
  ctx.fillRect(2 - stride, 0, 2, 1);

  // Torso retrofuturista
  ctx.fillStyle = out;
  ctx.fillRect(-6, -13, 12, 10);
  ctx.fillStyle = suitDark;
  ctx.fillRect(-5, -12, 10, 8);
  ctx.fillStyle = suitBright;
  ctx.fillRect(-3, -11, 6, 4);
  ctx.fillStyle = scarf;
  ctx.fillRect(-5, -13, 10, 2);
  ctx.fillRect(-5, -6, 10, 1);

  // Brazos
  ctx.fillStyle = out;
  ctx.fillRect(-8, -12 - stride * 0.5, 3, 6);
  ctx.fillRect(5, -12 + stride * 0.5, 3, 6);
  ctx.fillStyle = skin;
  ctx.fillRect(-7, -8 - stride * 0.5, 1, 2);
  ctx.fillRect(6, -8 + stride * 0.5, 1, 2);

  // Cabeza y cabello con iluminación de borde (rim-light cian)
  ctx.fillStyle = out;
  ctx.fillRect(-7, -24, 14, 12);
  if (opts?.backView) {
    ctx.fillStyle = hairDark;
    ctx.fillRect(-6, -23, 12, 10);
    ctx.fillStyle = hairMid;
    ctx.fillRect(-5, -22, 9, 7);
    ctx.fillStyle = hairHi;
    ctx.fillRect(-6, -23, 3, 5);
  } else {
    ctx.fillStyle = skinShade;
    ctx.fillRect(-5, -19, 10, 6);
    ctx.fillStyle = skin;
    ctx.fillRect(-4, -19, 8, 5);
    ctx.fillStyle = hairDark;
    ctx.fillRect(-6, -23, 12, 5);
    ctx.fillRect(-6, -19, 2, 4);
    ctx.fillRect(4, -19, 2, 4);
    ctx.fillStyle = hairMid;
    ctx.fillRect(-5, -22, 8, 3);
    ctx.fillStyle = hairHi;
    ctx.fillRect(-5, -23, 4, 1);
    // Ojos expresivos luminosos
    ctx.fillStyle = out;
    ctx.fillRect(-3, -17, 2, 3);
    ctx.fillRect(1, -17, 2, 3);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(-3, -16, 2, 2);
    ctx.fillRect(1, -16, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -17, 1, 1);
    ctx.fillRect(1, -17, 1, 1);
  }

  ctx.restore();
}

export function createCinematicWorld64Bit(mountEl: HTMLElement): CinematicWorldController {
  const displayCanvas = document.createElement('canvas');
  displayCanvas.style.width = '100%';
  displayCanvas.style.height = '100%';
  displayCanvas.style.display = 'block';
  displayCanvas.style.imageRendering = 'pixelated';
  mountEl.innerHTML = '';
  mountEl.appendChild(displayCanvas);

  const fbCanvas = document.createElement('canvas');
  fbCanvas.width = FB_W;
  fbCanvas.height = FB_H;

  const dispCtx = displayCanvas.getContext('2d');
  const ctx = fbCanvas.getContext('2d');

  let viewW = mountEl.clientWidth || window.innerWidth;
  let viewH = mountEl.clientHeight || window.innerHeight;

  const resize = (w: number, h: number) => {
    viewW = Math.max(1, w);
    viewH = Math.max(1, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    displayCanvas.width = Math.floor(viewW * dpr);
    displayCanvas.height = Math.floor(viewH * dpr);
    if (dispCtx) {
      dispCtx.imageSmoothingEnabled = false;
    }
  };
  resize(viewW, viewH);

  // Estrellas y partículas deterministas
  const stars: StarParticle[] = Array.from({ length: 140 }, (_, i) => ({
    x: ((i * 173 + 29) % FB_W),
    y: ((i * 97 + 13) % FB_H),
    z: 0.3 + (i % 5) * 0.22,
    color:
      i % 7 === 0
        ? '#00f3ff'
        : i % 5 === 0
        ? '#fde047'
        : i % 6 === 0
        ? '#c084fc'
        : '#cbd5e1',
    phase: i * 0.63,
  }));

  // =========================================================================
  // ESCENA 1 (00:00–00:18): LA ÚLTIMA HABITACIÓN Y EL PÍXEL QUE SE APAGA
  // =========================================================================
  const renderScene1 = (c: CanvasRenderingContext2D, t: number) => {
    drawBandedSky(c, 0, 0, FB_W, FB_H, [
      '#03050c',
      '#060a17',
      '#091022',
      '#0c152c',
      '#080d1a',
    ]);

    // Ventana nocturna a la izquierda con luz de luna azulada y lluvia de polvo
    const winX = 46;
    const winY = 34;
    c.fillStyle = '#040711';
    c.fillRect(winX - 4, winY - 4, 88, 108);
    drawBandedSky(c, winX, winY, 80, 100, ['#0c1c38', '#142c54', '#1d3b6c', '#0f203c']);

    // Silueta de ciudad dormida tras el cristal
    c.fillStyle = '#070d1c';
    c.fillRect(winX + 4, winY + 58, 18, 42);
    c.fillRect(winX + 25, winY + 44, 22, 56);
    c.fillRect(winX + 51, winY + 52, 24, 48);
    c.fillStyle = '#1e293b';
    c.fillRect(winX + 38, winY, 4, 100);
    c.fillRect(winX, winY + 48, 80, 4);

    // Haz diagonal de luna en pixel-art
    c.save();
    c.globalAlpha = 0.08;
    c.fillStyle = '#7dd3fc';
    c.beginPath();
    c.moveTo(winX + 80, winY + 10);
    c.lineTo(290, 215);
    c.lineTo(140, 235);
    c.lineTo(winX, winY + 100);
    c.closePath();
    c.fill();
    c.restore();

    // Estantería con cartuchos y consolas silenciosas al fondo
    c.fillStyle = '#0b1120';
    c.fillRect(354, 42, 92, 128);
    c.fillStyle = '#172036';
    for (let sy = 64; sy <= 144; sy += 26) {
      c.fillRect(358, sy, 84, 4);
      for (let cx = 364; cx < 432; cx += 9) {
        c.fillStyle = (cx + sy) % 2 === 0 ? '#1e293b' : '#334155';
        c.fillRect(cx, sy - 14, 6, 14);
      }
      c.fillStyle = '#172036';
    }

    // Escritorio de madera en primer plano
    c.fillStyle = '#060911';
    c.fillRect(0, 186, FB_W, 84);
    c.fillStyle = '#231712';
    c.fillRect(24, 188, FB_W - 48, 14);
    c.fillStyle = '#382419';
    c.fillRect(28, 188, FB_W - 56, 4);
    c.fillStyle = '#160f0c';
    c.fillRect(34, 202, FB_W - 68, 68);

    // Monitor CRT de 64-bit en el centro-derecha (zoom progresivo sutil al final)
    const crtX = 204;
    const crtY = 66;
    const crtW = 128;
    const crtH = 104;

    // Sombra y peana del CRT
    c.fillStyle = '#04060d';
    c.fillRect(crtX + 22, crtY + crtH, 84, 18);
    c.fillStyle = '#1e2638';
    c.fillRect(crtX + 28, crtY + crtH, 72, 12);

    // Carcasa beige oscura nocturna estilo monitor 70s/80s
    c.fillStyle = '#050811';
    c.fillRect(crtX - 3, crtY - 3, crtW + 6, crtH + 6);
    c.fillStyle = '#283246';
    c.fillRect(crtX, crtY, crtW, crtH);
    c.fillStyle = '#3b4963';
    c.fillRect(crtX + 2, crtY + 2, crtW - 4, 5);
    c.fillStyle = '#192030';
    c.fillRect(crtX + crtW - 18, crtY + 12, 12, crtH - 24);

    // Tubo de vidrio oscuro
    const scrX = crtX + 10;
    const scrY = crtY + 11;
    const scrW = 94;
    const scrH = 78;
    c.fillStyle = '#04070f';
    c.fillRect(scrX - 2, scrY - 2, scrW + 4, scrH + 4);
    c.fillStyle = '#070c16';
    c.fillRect(scrX, scrY, scrW, scrH);

    // El último píxel vivo temblando y extinguiéndose en 15.5s
    const pixelAlive = t < 16.2;
    if (pixelAlive) {
      const dying = smoothstep(13.8, 16.1, t);
      const jitterX = t > 11.5 ? Math.round(Math.sin(t * 37) * (1 + dying * 2)) : 0;
      const jitterY = t > 11.5 ? Math.round(Math.cos(t * 29) * dying * 1.5) : 0;
      const pxX = scrX + Math.floor(scrW / 2) + jitterX;
      const pxY = scrY + Math.floor(scrH / 2) + jitterY;
      const glowAlpha = (1 - dying) * (0.55 + Math.sin(t * 7) * 0.12);

      drawPixelGlow(c, pxX + 2, pxY + 2, 34 * (1 - dying * 0.6), '#67e8f9', glowAlpha);

      // Colapso horizontal estilo tubo CRT al apagarse (15.1–16.1s)
      if (t >= 15.1) {
        const lineCollapse = 1 - smoothstep(15.1, 16.1, t);
        const lw = Math.max(2, Math.round(36 * lineCollapse));
        c.fillStyle = '#e0f2fe';
        c.fillRect(pxX - Math.floor(lw / 2), pxY + 1, lw, 2);
      } else {
        const size = Math.max(2, Math.round(5 * (1 - dying * 0.5)));
        c.fillStyle = '#bae6fd';
        c.fillRect(pxX - 1, pxY - 1, size + 2, size + 2);
        c.fillStyle = '#ffffff';
        c.fillRect(pxX, pxY, size, size);
      }
    }

    // LED de encendido del monitor (pasa de ámbar tenue a apagado)
    c.fillStyle = t < 15.6 ? '#f59e0b' : '#1e293b';
    c.fillRect(crtX + crtW - 13, crtY + crtH - 18, 4, 3);

    // Joystick Arcade desconectado en primer plano + mano presionando el botón en 11.8–13.4s
    const stickX = 112;
    const stickY = 194;
    c.fillStyle = '#050811';
    c.fillRect(stickX, stickY - 16, 68, 22);
    c.fillStyle = '#1e293b';
    c.fillRect(stickX + 2, stickY - 14, 64, 18);
    // Palanca de bola roja oscura
    c.fillStyle = '#94a3b8';
    c.fillRect(stickX + 18, stickY - 28, 3, 14);
    c.fillStyle = '#991b1b';
    c.fillRect(stickX + 15, stickY - 35, 9, 9);
    c.fillStyle = '#ef4444';
    c.fillRect(stickX + 16, stickY - 34, 4, 4);

    // Botón microswitch siendo pulsado en t = 12.1s
    const pressed = t >= 12.05 && t <= 13.1;
    c.fillStyle = '#b45309';
    c.fillRect(stickX + 42, stickY - (pressed ? 15 : 18), 12, pressed ? 3 : 6);
    c.fillStyle = '#fbbf24';
    c.fillRect(stickX + 43, stickY - (pressed ? 15 : 18), 10, 2);

    // Silueta de dedos entrando brevemente a pulsar el botón (10.8–14.2s)
    if (t >= 10.6 && t <= 14.5) {
      const enter = smoothstep(10.6, 11.8, t) * (1 - smoothstep(13.5, 14.5, t));
      const handX = Math.round(lerp(stickX + 86, stickX + 45, enter));
      const handY = Math.round(lerp(stickY - 32, pressed ? stickY - 21 : stickY - 25, enter));
      c.fillStyle = '#050811';
      c.fillRect(handX - 2, handY - 4, 34, 11);
      c.fillStyle = '#9a6b56';
      c.fillRect(handX, handY - 2, 30, 7);
      c.fillStyle = '#c68f76';
      c.fillRect(handX, handY - 2, 16, 3);
    }

    // Motas de polvo flotando en la penumbra
    for (let i = 0; i < 22; i++) {
      const px = Math.round((70 + i * 13 + Math.sin(t * 0.6 + i) * 12) % 300);
      const py = Math.round((45 + i * 9 + t * 4) % 175);
      c.fillStyle = i % 2 === 0 ? 'rgba(186,230,253,0.32)' : 'rgba(148,163,184,0.22)';
      c.fillRect(px, py, 1, 1);
    }
  };

  // =========================================================================
  // ESCENA 2 (00:18–00:42): EL MUNDO QUE PERDIÓ EL JUEGO + SILENCIO ABSOLUTO
  // =========================================================================
  const renderScene2 = (c: CanvasRenderingContext2D, t: number) => {
    // Ventana de silencio y oscuridad total (38.6–42.0s)
    if (t >= 38.6) {
      const residual = 1 - smoothstep(38.6, 39.8, t);
      c.fillStyle = '#010206';
      c.fillRect(0, 0, FB_W, FB_H);
      if (residual > 0.01) {
        drawPixelGlow(c, FB_W / 2, FB_H / 2, 18, '#38bdf8', residual * 0.25);
      }
      return;
    }

    if (t < 27.5) {
      // 18.0–27.5s: Salón recreativo clásico apagándose máquina por máquina en perspectiva 64-bit
      const fadeProgress = smoothstep(18.5, 26.8, t);
      drawBandedSky(c, 0, 0, FB_W, 148, ['#040611', '#080d1f', '#0d1530', '#090e20']);
      drawVdp2PerspectiveGrid(
        c,
        148,
        FB_H,
        t * 0.35,
        0,
        '#090d1b',
        '#050812',
        '#38bdf8',
        0.28 * (1 - fadeProgress)
      );

      // Fila de 7 gabinetes recreativos clásicos a ambos lados del pasillo
      for (let i = 0; i < 7; i++) {
        const cabX = 34 + i * 60;
        const cabY = 66 + (i % 2) * 4;
        const shutOffTime = 19.2 + i * 0.95;
        const isLit = t < shutOffTime;
        const accent =
          i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#00f3ff' : '#f43f5e';

        // Sombra en suelo
        c.fillStyle = 'rgba(2,4,10,0.75)';
        c.fillRect(cabX - 4, cabY + 84, 48, 8);

        // Chasis del gabinete
        c.fillStyle = '#040710';
        c.fillRect(cabX, cabY, 42, 86);
        c.fillStyle = '#1b2438';
        c.fillRect(cabX + 2, cabY + 2, 38, 82);

        // Marquesina superior
        c.fillStyle = isLit ? accent : '#273248';
        c.fillRect(cabX + 4, cabY + 5, 34, 9);

        // Pantalla CRT
        c.fillStyle = '#050811';
        c.fillRect(cabX + 6, cabY + 19, 30, 26);
        if (isLit) {
          c.fillStyle = '#0c1f2e';
          c.fillRect(cabX + 8, cabY + 21, 26, 22);
          c.fillStyle = accent;
          c.fillRect(cabX + 12 + ((Math.floor(t * 4) + i) % 10), cabY + 28, 6, 4);
          drawPixelGlow(c, cabX + 21, cabY + 30, 28, accent, 0.28);
        }
      }
    } else {
      // 27.5–38.6s: Metrópolis nocturna en plano cenital/oblicuo SEGA perdiendo sus últimas luces
      const cityDark = smoothstep(28.0, 38.2, t);
      drawBandedSky(c, 0, 0, FB_W, 126, [
        '#02040a',
        '#050914',
        '#0a1226',
        '#101b36',
      ]);

      const panX = (t - 27.5) * 14;
      // Rascacielos en 3 planos de paralaje
      for (let layer = 0; layer < 3; layer++) {
        const speed = 0.25 + layer * 0.35;
        const baseY = 126 + layer * 44;
        const count = 14;
        for (let b = 0; b < count; b++) {
          const bw = 28 + ((b * 17 + layer * 11) % 24);
          const bh = 46 + ((b * 29 + layer * 19) % 58);
          const bx = Math.round(((b * 42 - panX * speed) % (FB_W + 60)) - 30);
          const by = baseY - bh;

          c.fillStyle = layer === 0 ? '#070c1a' : layer === 1 ? '#0a1122' : '#050811';
          c.fillRect(bx, by, bw, bh + 60);
          c.fillStyle = '#16213a';
          c.fillRect(bx, by, bw, 2);

          // Ventanas que se van apagando progresivamente
          for (let wy = by + 6; wy < baseY + 18; wy += 7) {
            for (let wx = bx + 4; wx < bx + bw - 5; wx += 6) {
              const seed = ((b * 31 + wy * 7 + wx * 3) % 100) / 100;
              if (seed > cityDark + 0.15) {
                c.fillStyle = seed > 0.82 ? '#38bdf8' : '#fde68a';
                c.fillRect(wx, wy, 3, 3);
              } else {
                c.fillStyle = '#0c1324';
                c.fillRect(wx, wy, 3, 3);
              }
            }
          }
        }
      }

      // Fundido gradual hacia el silencio negro
      if (cityDark > 0.55) {
        c.fillStyle = `rgba(1, 2, 6, ${smoothstep(0.55, 1.0, cityDark)})`;
        c.fillRect(0, 0, FB_W, FB_H);
      }
    }
  };

  // =========================================================================
  // ESCENA 3 (00:42–01:05): EL DESPERTAR DE PIXEL EN EL COSMOS DE MEMORIA
  // =========================================================================
  const renderScene3 = (c: CanvasRenderingContext2D, t: number) => {
    const ignite = smoothstep(43.5, 49.5, t);
    const heroForm = smoothstep(51.5, 57.5, t);
    const islandsReveal = smoothstep(56.0, 63.5, t);

    drawBandedSky(c, 0, 0, FB_W, FB_H, [
      '#02030a',
      '#050819',
      '#09122c',
      '#0e1c40',
      '#070e24',
    ]);

    // Estrellas y píxeles dormidos despertando
    for (const st of stars) {
      const sx = Math.round((st.x - t * 6 * st.z + FB_W * 4) % FB_W);
      const sy = Math.round(st.y);
      const tw = 0.35 + 0.65 * Math.sin(t * 3 + st.phase);
      c.globalAlpha = clamp01(ignite * tw);
      c.fillStyle = st.color;
      const sz = st.z > 0.8 ? 2 : 1;
      c.fillRect(sx, sy, sz, sz);
    }
    c.globalAlpha = 1;

    // Archipiélago fragmentado emergiendo en el horizonte cósmico (56–65s)
    if (islandsReveal > 0.02) {
      c.save();
      c.globalAlpha = islandsReveal;
      drawVdp2PerspectiveGrid(
        c,
        178,
        FB_H,
        t * 0.6,
        Math.sin(t * 0.4) * 30,
        '#07142b',
        '#040b1a',
        '#00f3ff',
        0.32 * islandsReveal
      );

      const floatingIslands = [
        { x: 78, y: 152, w: 68, h: 18, glow: '#34d399' },
        { x: 196, y: 164, w: 92, h: 22, glow: '#fbbf24' },
        { x: 336, y: 146, w: 74, h: 18, glow: '#c084fc' },
      ];
      floatingIslands.forEach((isl, idx) => {
        const fy = Math.round(isl.y + Math.sin(t * 1.8 + idx) * 3);
        drawPixelGlow(c, isl.x + isl.w / 2, fy + 6, 32, isl.glow, 0.25);
        c.fillStyle = '#050811';
        c.fillRect(isl.x - 2, fy - 2, isl.w + 4, isl.h + 8);
        c.fillStyle = '#1e293b';
        c.fillRect(isl.x, fy + 4, isl.w, isl.h);
        c.fillStyle = isl.glow;
        c.fillRect(isl.x + 2, fy, isl.w - 4, 4);
      });
      c.restore();
    }

    // La primera chispa (43–53s) transformándose en PIXEL (52–65s)
    const cx = FB_W / 2;
    const cy = Math.round(lerp(135, 128, heroForm));

    if (ignite > 0) {
      const flareR = lerp(8, 52, ignite) * (1 - heroForm * 0.35);
      drawPixelGlow(c, cx, cy - 10, flareR, '#00f3ff', 0.65 * ignite);
      drawPixelGlow(c, cx, cy - 10, flareR * 0.55, '#fde047', 0.55 * ignite);

      // Destello cruciforme estilo anime/SEGA Saturn
      if (t >= 47.0 && t <= 54.0) {
        const crossLen = Math.round(68 * Math.sin(clamp01((t - 47) / 7) * Math.PI));
        c.fillStyle = '#e0f2fe';
        c.fillRect(cx - crossLen, cy - 11, crossLen * 2, 2);
        c.fillRect(cx - 1, cy - 10 - Math.floor(crossLen * 0.6), 2, Math.floor(crossLen * 1.2));
      }
    }

    if (heroForm > 0.08) {
      c.save();
      c.globalAlpha = heroForm;
      drawPixelHero64Bit(c, cx, cy + 16, 3, t, {
        backView: t > 59.5,
        auraStrength: 0.85,
      });
      c.restore();
    } else if (ignite > 0.05) {
      const s = Math.max(2, Math.round(6 * ignite));
      c.fillStyle = '#ffffff';
      c.fillRect(cx - Math.floor(s / 2), cy - 10 - Math.floor(s / 2), s, s);
    }
  };

  // =========================================================================
  // ESCENA 4 (01:05–01:30): ECOS DE LAS ERAS (HOLOGRAMAS 64-BIT DE LA HISTORIA)
  // =========================================================================
  const renderScene4 = (c: CanvasRenderingContext2D, t: number) => {
    drawBandedSky(c, 0, 0, FB_W, FB_H, [
      '#040414',
      '#0b0a26',
      '#15113d',
      '#1d164c',
      '#0b0922',
    ]);

    for (const st of stars) {
      const sx = Math.round((st.x - t * 14 * st.z + FB_W * 8) % FB_W);
      c.fillStyle = st.color;
      c.fillRect(sx, Math.round(st.y), 1, 1);
    }

    drawVdp2PerspectiveGrid(
      c,
      192,
      FB_H,
      t * 1.25,
      0,
      '#100d29',
      '#08061a',
      '#c084fc',
      0.38
    );

    const dissolve = smoothstep(84.5, 89.6, t);

    // Paneles holográficos monumentales de los grandes hitos reales
    if (t < 73.5) {
      // 65–73.5s: PONG (1972) y MAGNAVOX ODYSSEY (1972)
      const alpha = smoothstep(65.0, 66.5, t) * (1 - smoothstep(72.0, 73.5, t));
      c.save();
      c.globalAlpha = alpha * 0.9;
      c.strokeStyle = '#00f3ff';
      c.lineWidth = 2;
      c.strokeRect(88, 34, 304, 132);
      c.fillStyle = 'rgba(6, 18, 38, 0.72)';
      c.fillRect(90, 36, 300, 128);

      // Red central segmentada y paletas de 1972
      c.fillStyle = '#e0f2fe';
      for (let ny = 44; ny < 156; ny += 10) {
        c.fillRect(239, ny, 2, 6);
      }
      const p1y = Math.round(88 + Math.sin(t * 3.4) * 28);
      const p2y = Math.round(88 + Math.cos(t * 3.1) * 28);
      c.fillStyle = '#ffffff';
      c.fillRect(114, p1y, 6, 28);
      c.fillRect(360, p2y, 6, 28);
      const bx = Math.round(240 + Math.sin(t * 3.4) * 110);
      const by = Math.round(98 + Math.cos(t * 5.1) * 34);
      drawPixelGlow(c, bx, by, 18, '#fde047', 0.65);
      c.fillStyle = '#fde047';
      c.fillRect(bx - 3, by - 3, 6, 6);

      c.fillStyle = '#fde047';
      c.font = '700 9px "JetBrains Mono", monospace';
      c.fillText('1972 · EL PRIMER PULSO LUMINOSO', 104, 52);
      c.restore();
    } else if (t < 81.5) {
      // 73.5–81.5s: BREAKOUT (1976) + SPACE INVADERS (1978)
      const alpha = smoothstep(73.5, 74.8, t) * (1 - smoothstep(80.2, 81.5, t));
      c.save();
      c.globalAlpha = alpha * 0.92;

      // Muro cromático de Breakout a la izquierda
      c.strokeStyle = '#fbbf24';
      c.strokeRect(52, 34, 172, 128);
      const rowCols = ['#ef4444', '#f97316', '#22c55e', '#eab308'];
      for (let r = 0; r < 4; r++) {
        c.fillStyle = rowCols[r];
        for (let col = 0; col < 8; col++) {
          if ((r === 3 && col === 4) || (r === 2 && col === 5)) continue;
          c.fillRect(62 + col * 19, 48 + r * 8, 16, 5);
        }
      }
      c.fillStyle = '#38bdf8';
      c.fillRect(116 + Math.round(Math.sin(t * 4) * 26), 144, 30, 5);
      c.fillStyle = '#ffffff';
      c.fillRect(132 + Math.round(Math.cos(t * 6) * 20), 106, 4, 4);

      // Formación de Space Invaders a la derecha
      c.strokeStyle = '#39ff14';
      c.strokeRect(254, 34, 172, 128);
      const stepX = Math.floor(t * 3) % 2 === 0 ? -3 : 3;
      c.fillStyle = '#39ff14';
      for (let r = 0; r < 3; r++) {
        for (let col = 0; col < 5; col++) {
          const ix = 276 + col * 26 + stepX;
          const iy = 52 + r * 18;
          c.fillRect(ix + 2, iy, 8, 2);
          c.fillRect(ix, iy + 2, 12, 4);
          c.fillRect(ix, iy + 6, 3, 2);
          c.fillRect(ix + 9, iy + 6, 3, 2);
        }
      }
      c.fillStyle = '#00f3ff';
      c.fillRect(334, 144, 14, 5);
      c.fillRect(340, 114 - ((Math.floor(t * 60)) % 36), 2, 8);
      c.restore();
    } else {
      // 81.5–90.0s: ASTEROIDS (1979) + VIGAS ROJAS (1981) disolviéndose en polvo dorado
      const alpha = smoothstep(81.5, 82.8, t) * (1 - dissolve);
      c.save();
      c.globalAlpha = alpha * 0.9;
      c.strokeStyle = '#f43f5e';
      c.lineWidth = 1.5;
      // Vigas inclinadas 1981
      c.fillStyle = '#e11d48';
      c.fillRect(92, 66, 130, 5);
      c.fillRect(112, 102, 130, 5);
      c.fillRect(92, 138, 130, 5);
      // Vectores 1979 a la derecha
      c.strokeStyle = '#67e8f9';
      c.beginPath();
      c.moveTo(336, 62);
      c.lineTo(366, 78);
      c.lineTo(356, 112);
      c.lineTo(318, 118);
      c.lineTo(304, 84);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(334, 136);
      c.lineTo(342, 152);
      c.lineTo(334, 148);
      c.lineTo(326, 152);
      c.closePath();
      c.stroke();
      c.restore();

      // Polvo de píxeles dorados elevándose al desvanecerse las memorias
      if (dissolve > 0.02) {
        for (let p = 0; p < 55; p++) {
          const px = Math.round(80 + ((p * 61) % 320) + Math.sin(t * 2 + p) * 14);
          const py = Math.round(150 - dissolve * 95 - ((p * 19) % 70));
          c.fillStyle = p % 2 === 0 ? '#fde047' : '#00f3ff';
          c.fillRect(px, py, 2, 2);
        }
      }
    }

    // Pixel contemplando los recuerdos desde el primer plano
    drawPixelHero64Bit(c, FB_W / 2, 224, 2, t, { backView: true, auraStrength: 0.65 });
  };

  // =========================================================================
  // ESCENA 5 (01:30–01:52): DESCENSO A LA ISLA DEL ORIGEN (HD-2D RGB PANORÁMICO)
  // =========================================================================
  const renderScene5 = (c: CanvasRenderingContext2D, t: number) => {
    const pan = (t - 90) * 9;

    // Cielo crepuscular retrofuturista estilo Sea of Stars / Saturn
    drawBandedSky(c, 0, 0, FB_W, 118, [
      '#061026',
      '#0d234a',
      '#184373',
      '#286694',
      '#468faf',
      '#94d2bd',
    ]);

    // Sol/Luna de fósforo reflejándose en el Mar del Tiempo
    drawPixelGlow(c, 376, 68, 44, '#fde047', 0.48);
    c.fillStyle = '#fef08a';
    c.beginPath();
    c.arc(376, 68, 16, 0, Math.PI * 2);
    c.fill();

    // Océano turquesa multicapa con ondas brillantes
    drawBandedSky(c, 0, 118, FB_W, FB_H - 118, [
      '#0e4d78',
      '#12618f',
      '#0d466b',
      '#082e4a',
    ]);
    for (let wy = 122; wy < FB_H; wy += 6) {
      const shift = Math.round(Math.sin(t * 2.5 + wy * 0.2) * 8 - pan * (0.2 + (wy - 118) * 0.005));
      c.fillStyle = wy < 142 ? '#7dd3fc' : '#38bdf8';
      for (let wx = ((shift % 48) + 48) % 48; wx < FB_W; wx += 48) {
        c.fillRect(wx, wy, 12, 1);
      }
    }

    // Silueta detallada en 64-bit de LA ISLA DEL ORIGEN
    const islX = Math.round(52 - pan * 0.18);

    // Montaña y Bastión Volcánico al norte-derecha
    c.fillStyle = '#241829';
    c.beginPath();
    c.moveTo(islX + 220, 156);
    c.lineTo(islX + 292, 62);
    c.lineTo(islX + 332, 62);
    c.lineTo(islX + 398, 156);
    c.closePath();
    c.fill();
    // Fisuras de magma volcánico
    drawPixelGlow(c, islX + 312, 64, 28, '#f97316', 0.55);
    c.fillStyle = '#f97316';
    c.fillRect(islX + 306, 62, 12, 4);
    c.fillRect(islX + 310, 66, 4, 24);

    // Acantilados estratificados y mesetas esmeralda
    c.fillStyle = '#4a3525';
    c.fillRect(islX + 24, 154, 376, 26);
    c.fillStyle = '#e0f2fe';
    c.fillRect(islX + 18, 178, 388, 3); // espuma costera
    c.fillStyle = '#2d7a47';
    c.fillRect(islX + 20, 138, 380, 18);
    c.fillStyle = '#4ca86b';
    c.fillRect(islX + 26, 136, 240, 6);

    // Aldea de los Orígenes + Museo Viviente + Cúpula del Cronoscopio
    // Casa azul (Aldea)
    c.fillStyle = '#e8dcc4';
    c.fillRect(islX + 54, 122, 26, 16);
    c.fillStyle = '#2563eb';
    c.fillRect(islX + 51, 115, 32, 8);
    c.fillStyle = '#fef08a';
    c.fillRect(islX + 60, 127, 5, 5);
    drawPixelGlow(c, islX + 46, 132, 14, '#fbbf24', 0.55);

    // Bosque de las Señales (copas frondosas)
    for (let tx = 102; tx <= 162; tx += 18) {
      c.fillStyle = '#143d29';
      c.fillRect(islX + tx, 116, 16, 20);
      c.fillStyle = '#34d399';
      c.fillRect(islX + tx + 3, 114, 10, 6);
    }

    // Museo Viviente y Cúpula del Cronoscopio en las Ruinas
    c.fillStyle = '#cbd5e1';
    c.fillRect(islX + 188, 118, 32, 20);
    c.fillStyle = '#b45309';
    c.fillRect(islX + 185, 111, 38, 8);

    c.fillStyle = '#cbd5e1';
    c.fillRect(islX + 234, 116, 30, 22);
    c.fillStyle = '#0e7490';
    c.fillRect(islX + 237, 106, 24, 10);
    drawPixelGlow(c, islX + 249, 108, 22, '#00f3ff', 0.65);

    // Cascada del Cañón
    c.fillStyle = '#7dd3fc';
    c.fillRect(islX + 278, 108, 8, 32);

    // Pixel descendiendo hacia la costa en estela luminosa
    const descP = clamp01((t - 90) / 22);
    const px = Math.round(lerp(90, islX + 72, descP));
    const py = Math.round(lerp(56, 140, descP));
    drawPixelHero64Bit(c, px, py, 2, t, { auraStrength: 0.75 });
  };

  // =========================================================================
  // ESCENA 6 (01:52–02:12): CAVERNAS, SALA SECRETA Y EL CRONOSCOPIO
  // =========================================================================
  const renderScene6 = (c: CanvasRenderingContext2D, t: number) => {
    if (t < 121.5) {
      // 112–121.5s: Caverna de Memoria y Muro Secreto abriéndose hacia Breakout (1976)
      drawBandedSky(c, 0, 0, FB_W, FB_H, [
        '#05030f',
        '#0c0720',
        '#140c30',
        '#0b071c',
      ]);

      // Suelo cristalino subterráneo
      c.fillStyle = '#16112b';
      c.fillRect(0, 184, FB_W, 86);
      for (let gx = 0; gx < FB_W; gx += 24) {
        c.fillStyle = '#251d47';
        c.fillRect(gx, 184, 1, 86);
      }

      // Muro antiguo con compuerta secreta deslizándose
      const openRatio = smoothstep(114.0, 118.5, t);
      c.fillStyle = '#1e1b38';
      c.fillRect(60, 40, 360, 146);

      // Hueco secreto central revelando el gabinete oculto de Breakout (1976)
      const doorW = Math.round(96 * openRatio);
      if (doorW > 2) {
        c.fillStyle = '#040814';
        c.fillRect(240 - Math.floor(doorW / 2), 68, doorW, 118);
        drawPixelGlow(c, 240, 128, 56 * openRatio, '#fbbf24', 0.45 * openRatio);

        if (openRatio > 0.45) {
          // Silueta luminosa del gabinete secreto 1976
          c.fillStyle = '#d97706';
          c.fillRect(222, 96, 36, 78);
          c.fillStyle = '#090d16';
          c.fillRect(226, 110, 28, 22);
          c.fillStyle = '#ef4444';
          c.fillRect(228, 113, 24, 3);
          c.fillStyle = '#eab308';
          c.fillRect(228, 117, 24, 3);
          c.fillStyle = '#38bdf8';
          c.fillRect(234, 128, 12, 2);
        }
      }

      // Cristales resonantes violetas y cian + Criatura Guardiana original (Sincro-76)
      const crystals = [
        { x: 96, y: 184, h: 36, hex: '#c084fc' },
        { x: 124, y: 184, h: 24, hex: '#00f3ff' },
        { x: 364, y: 184, h: 40, hex: '#c084fc' },
      ];
      for (const cr of crystals) {
        drawPixelGlow(c, cr.x, cr.y - cr.h / 2, 24, cr.hex, 0.35);
        c.fillStyle = cr.hex;
        c.beginPath();
        c.moveTo(cr.x, cr.y - cr.h);
        c.lineTo(cr.x + 10, cr.y - 8);
        c.lineTo(cr.x - 10, cr.y - 8);
        c.closePath();
        c.fill();
      }

      // Pixel sosteniendo la Lámpara de Fósforo Ámbar frente al pasadizo
      drawPixelGlow(c, 176, 182, 58, '#fbbf24', 0.38);
      drawPixelHero64Bit(c, 176, 206, 2, t, { auraStrength: 0.4 });
    } else {
      // 121.5–132.0s: El Cronoscopio (Máquina del Tiempo) despertando sus anillos
      drawBandedSky(c, 0, 0, FB_W, FB_H, [
        '#030712',
        '#071226',
        '#0c1f3d',
        '#071021',
      ]);

      const cx = FB_W / 2;
      const cy = 118;
      const spin = (t - 121.5) * 1.4;
      const wake = smoothstep(122.0, 130.5, t);

      drawPixelGlow(c, cx, cy, 85 * wake + 24, '#00f3ff', 0.48 * wake + 0.15);
      drawPixelGlow(c, cx, cy, 45 * wake + 12, '#fde047', 0.38 * wake);

      // Columnas de bobinas de bronce del Observatorio
      c.fillStyle = '#1e293b';
      c.fillRect(84, 30, 28, 178);
      c.fillRect(368, 30, 28, 178);
      c.fillStyle = '#d8be88';
      for (let by = 42; by < 196; by += 18) {
        c.fillRect(82, by, 32, 4);
        c.fillRect(366, by, 32, 4);
      }

      // Anillos astrolábicos pixel-art contrarrotatorios
      c.save();
      c.translate(cx, cy);
      c.rotate(spin);
      c.strokeStyle = '#d8be88';
      c.lineWidth = 3;
      c.strokeRect(-54, -54, 108, 108);
      c.restore();

      c.save();
      c.translate(cx, cy);
      c.rotate(-spin * 1.4);
      c.strokeStyle = '#00f3ff';
      c.lineWidth = 2.5;
      c.strokeRect(-36, -36, 72, 72);
      c.restore();

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(cx, cy, 8 + wake * 8, 0, Math.PI * 2);
      c.fill();

      // Suelo reflectante del Observatorio y Pixel mirando hacia arriba
      c.fillStyle = '#081121';
      c.fillRect(0, 204, FB_W, 66);
      drawPixelHero64Bit(c, cx, 226, 2, t, { backView: true, auraStrength: 0.7 });
    }
  };

  // =========================================================================
  // ESCENA 7 (02:12–02:24): CLÍMAX DE ACCIÓN EN EL SENDERO GLITCH Y ARCADES
  // =========================================================================
  const renderScene7 = (c: CanvasRenderingContext2D, t: number) => {
    drawBandedSky(c, 0, 0, FB_W, FB_H, [
      '#050316',
      '#110934',
      '#1c1252',
      '#0c1b3d',
    ]);

    // Líneas de velocidad horizontales estilo SEGA 64-bit
    for (let i = 0; i < 24; i++) {
      const sy = (i * 11 + 8) % FB_H;
      const sx = FB_W - (((t * 520 + i * 83) % (FB_W + 140)) - 70);
      c.fillStyle = i % 3 === 0 ? '#00f3ff' : i % 3 === 1 ? '#c084fc' : '#fde047';
      c.globalAlpha = 0.45;
      c.fillRect(sx, sy, 36 + (i % 3) * 18, 1);
    }
    c.globalAlpha = 1;

    if (t < 138.0) {
      // 132–138s: El Sendero Glitch — plataformas armándose al vuelo + Prismas RGB disparando haces
      const camScroll = (t - 132) * 145;
      for (let p = 0; p < 7; p++) {
        const px = Math.round(70 + p * 92 - (camScroll % 92));
        const assemble = clamp01(1.3 - p * 0.16);
        const py = Math.round(176 - (p % 3) * 18 + (1 - assemble) * 32);
        c.fillStyle = '#050811';
        c.fillRect(px - 2, py - 2, 64, 14);
        c.fillStyle = p % 2 === 0 ? '#00f3ff' : '#34d399';
        c.fillRect(px, py, 60, 4);
        c.fillStyle = '#1e293b';
        c.fillRect(px, py + 4, 60, 6);
      }

      // Haces láser de los Prismas Armónicos cruzando el cielo
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = '#00f3ff';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(40, 62);
      c.lineTo(440, 142);
      c.stroke();
      c.strokeStyle = '#f43f5e';
      c.beginPath();
      c.moveTo(60, 152);
      c.lineTo(430, 58);
      c.stroke();
      c.restore();

      // Pixel corriendo y haciendo Dash de Fase
      const jumpY = Math.round(154 - Math.abs(Math.sin((t - 132) * 4.2)) * 34);
      drawPixelHero64Bit(c, 168, jumpY, 3, t, { running: true, auraStrength: 1.0 });
    } else {
      // 138–144s: Cut-in dramático estilo SEGA + columna de energía del Cronoscopio abriendo las décadas
      const surge = smoothstep(138.0, 143.8, t);
      drawVdp2PerspectiveGrid(
        c,
        156,
        FB_H,
        t * 3.8,
        0,
        '#140b36',
        '#07051a',
        '#00f3ff',
        0.65
      );

      // Columna vertical de luz inter-décadas
      const beamW = Math.round(18 + surge * 96);
      drawPixelGlow(c, FB_W / 2, FB_H / 2, 64 + surge * 90, '#00f3ff', 0.65);
      c.fillStyle = 'rgba(0, 243, 255, 0.45)';
      c.fillRect(FB_W / 2 - Math.floor(beamW / 2), 0, beamW, FB_H);
      c.fillStyle = '#ffffff';
      c.fillRect(FB_W / 2 - Math.floor(beamW * 0.22), 0, Math.floor(beamW * 0.44), FB_H);

      // Banda cut-in de ojos decididos de Pixel (138.2–141.2s)
      if (t >= 138.2 && t <= 141.4) {
        c.fillStyle = '#040712';
        c.fillRect(0, 44, FB_W, 54);
        c.fillStyle = '#fde047';
        c.fillRect(0, 44, FB_W, 2);
        c.fillRect(0, 96, FB_W, 2);
        // Mirada pixel-art primerísimo plano
        c.fillStyle = '#ffd6b8';
        c.fillRect(140, 52, 200, 38);
        c.fillStyle = '#1c1228';
        c.fillRect(130, 46, 220, 14);
        // Dos ojos cian resplandecientes
        c.fillStyle = '#050812';
        c.fillRect(178, 64, 34, 18);
        c.fillRect(268, 64, 34, 18);
        c.fillStyle = '#00f3ff';
        c.fillRect(184, 66, 22, 14);
        c.fillRect(274, 66, 22, 14);
        c.fillStyle = '#ffffff';
        c.fillRect(186, 67, 8, 6);
        c.fillRect(276, 67, 8, 6);
      }

      drawPixelHero64Bit(c, FB_W / 2, 214, 3, t, { backView: true, auraStrength: 1.0 });
    }
  };

  // =========================================================================
  // ESCENA 8 (02:24–02:30): EMBLEMA FINAL DE PIXELVERSE EN 64 BITS
  // =========================================================================
  const renderScene8 = (c: CanvasRenderingContext2D, t: number) => {
    drawBandedSky(c, 0, 0, FB_W, FB_H, [
      '#010207',
      '#04091a',
      '#081330',
      '#040818',
      '#010207',
    ]);

    for (const st of stars) {
      const tw = 0.4 + 0.6 * Math.sin(t * 2.5 + st.phase);
      c.globalAlpha = tw * 0.85;
      c.fillStyle = st.color;
      c.fillRect(Math.round(st.x), Math.round(st.y), 1, 1);
    }
    c.globalAlpha = 1;

    // Cristal octogonal de memoria girando detrás del logotipo PIXELVERSE
    const cx = FB_W / 2;
    const cy = Math.round(FB_H * 0.46);
    drawPixelGlow(c, cx, cy, 78, '#00f3ff', 0.34);
    drawPixelGlow(c, cx, cy, 42, '#fde047', 0.25);

    c.save();
    c.translate(cx, cy);
    c.rotate((t - 144) * 0.35);
    c.strokeStyle = 'rgba(0, 243, 255, 0.45)';
    c.lineWidth = 1.5;
    c.strokeRect(-38, -38, 76, 76);
    c.rotate(Math.PI / 4);
    c.strokeStyle = 'rgba(253, 224, 71, 0.4)';
    c.strokeRect(-32, -32, 64, 64);
    c.restore();
  };

  const renderAtTime = (tSec: number) => {
    if (!ctx || !dispCtx) return;
    ctx.imageSmoothingEnabled = false;

    const t = Math.max(0, tSec);
    if (t < 18.0) {
      renderScene1(ctx, t);
    } else if (t < 42.0) {
      renderScene2(ctx, t);
    } else if (t < 65.0) {
      renderScene3(ctx, t);
    } else if (t < 90.0) {
      renderScene4(ctx, t);
    } else if (t < 112.0) {
      renderScene5(ctx, t);
    } else if (t < 132.0) {
      renderScene6(ctx, t);
    } else if (t < 144.0) {
      renderScene7(ctx, t);
    } else {
      renderScene8(ctx, t);
    }

    // Viñeta pixelada suave y scanlines sutiles de monitor profesional SEGA PVM
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = 0; y < FB_H; y += 2) {
      ctx.fillRect(0, y, FB_W, 1);
    }

    // Volcado limpio con escalado panorámico sin deformar aspecto 16:9
    const dw = displayCanvas.width;
    const dh = displayCanvas.height;
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.fillStyle = '#010206';
    dispCtx.fillRect(0, 0, dw, dh);

    const scale = Math.max(dw / FB_W, dh / FB_H);
    const drawW = Math.round(FB_W * scale);
    const drawH = Math.round(FB_H * scale);
    const ox = Math.round((dw - drawW) / 2);
    const oy = Math.round((dh - drawH) / 2);
    dispCtx.drawImage(fbCanvas, ox, oy, drawW, drawH);
  };

  const dispose = () => {
    if (displayCanvas.parentNode === mountEl) {
      mountEl.removeChild(displayCanvas);
    }
  };

  return {
    resize,
    renderAtTime,
    dispose,
  };
}
