/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR DE RENDERIZADO PIXEL-ART ESTILO GAME BOY COLOR (CUADRÍCULA LÓGICA 16×16 ESCALADA 2×)
 * ISLA 01 — ISLA DEL ORIGEN:
 *   - Zona 1: El Pueblo del Origen (casas GBC, empedrado, vallas, Terminal de Guardado, carteles)
 *   - Zona 2: Las Praderas del Pixel (hierba verde, flores animadas, arroyo con puente, Pong)
 *   - Zona 3: El Bosque de los Secretos (árboles GBC densos, pasadizo oculto entre copas, Taller)
 *   - Zona 4: La Fortaleza Volcánica (roca basáltica, lava pixel-art animada, murallas, Space Invaders)
 *   - Zona 5: La Costa y las Ruinas del Tiempo (arena, muelle, túneles en rocas, Secreto del Origen)
 */

import { PixelverseProgressState } from '../memories/progressionState';
import {
  AnomalyPortalSpec,
  BROKEN_RELAY_MECHANISM,
  COASTAL_SUBTERRANEAN_TUNNELS,
  evaluateTimeMachineStatus,
  ExteriorBuildingSpec,
  FacingDirection,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  ISLAND_ANOMALY_PORTALS,
  ISLAND_WOODEN_SIGNS,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  VILLAGE_SAVE_TERMINAL,
  WATERFALL_SECRET_ENTRANCE,
} from '../rpg/rpgContent';
import {
  DISTANT_DECADE_VISTAS,
  ISLAND_DIAMONDS,
  ISLAND_ECHOES,
  ISLAND_KEY_COORDS,
  ISLAND_NPCS,
  ISLAND_SWITCHES,
  ISLAND_WALKABLE_RECTS,
  ISLAND_WORLD_H,
  ISLAND_WORLD_W,
  ISLAND_ZONES,
  IslandZoneId,
  WalkableRect,
} from './island70sData';

export interface IslandStar {
  nx: number;
  ny: number;
  size: number;
  twinkle: number;
  parallax: number;
}

export interface IslandAmbientBit {
  x: number;
  y: number;
  vy: number;
  phase: number;
  color: string;
}

export interface IslandDigitalCritter {
  homeX: number;
  homeY: number;
  phase: number;
  color: string;
}

export interface IslandPickupBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface IslandPromptRenderSpec {
  x: number;
  y: number;
  actionLabel: string;
  accentHex: string;
}

/** Celda base de mundo 32×32 px con detalle artesanal de píxel nítido */
const CELL = 32;
const PX = 2;

interface HandcraftedTreeSpec {
  x: number;
  y: number;
  variant: 'forest' | 'meadow' | 'pine';
}

const ISLAND_TREES: HandcraftedTreeSpec[] = [
  // La Aldea de los Orígenes — arboleda variada y línea que disimula el callejón secreto norte
  { x: 260, y: 1740, variant: 'meadow' },
  { x: 304, y: 1968, variant: 'pine' },
  { x: 520, y: 1612, variant: 'meadow' },
  { x: 734, y: 1612, variant: 'meadow' },
  { x: 516, y: 1554, variant: 'forest' },
  { x: 742, y: 1554, variant: 'forest' },
  { x: 856, y: 1765, variant: 'pine' },
  { x: 1028, y: 1812, variant: 'meadow' },

  // El Bosque de las Señales Perdidas — dosel frondoso con paso secreto entre x=608 y x=692
  { x: 576, y: 1004, variant: 'forest' },
  { x: 608, y: 1004, variant: 'pine' },
  // Hueco secreto entre x=608 y x=692 hacia el Claro Oculto
  { x: 692, y: 1004, variant: 'pine' },
  { x: 728, y: 1004, variant: 'forest' },
  { x: 556, y: 928, variant: 'forest' },
  { x: 556, y: 868, variant: 'pine' },
  { x: 756, y: 882, variant: 'forest' },
  { x: 640, y: 1120, variant: 'forest' },
  { x: 760, y: 1156, variant: 'pine' },
  { x: 896, y: 1084, variant: 'forest' },
  { x: 1140, y: 1068, variant: 'pine' },
  { x: 1280, y: 1052, variant: 'forest' },
  { x: 620, y: 1360, variant: 'pine' },
  { x: 1036, y: 1412, variant: 'forest' },
  { x: 1188, y: 1336, variant: 'pine' },
  { x: 816, y: 1468, variant: 'forest' },

  // Las Ruinas del Primer Pulso
  { x: 1548, y: 1124, variant: 'pine' },
  { x: 2248, y: 1236, variant: 'meadow' },
  { x: 1556, y: 1540, variant: 'meadow' },

  // Terrazas y Claro de Pong
  { x: 2452, y: 1476, variant: 'meadow' },
  { x: 2496, y: 1316, variant: 'pine' },
  { x: 2880, y: 1320, variant: 'meadow' },
  { x: 3052, y: 1492, variant: 'pine' },
  { x: 2468, y: 1856, variant: 'meadow' },
  { x: 2948, y: 1884, variant: 'pine' },
];

/** Farolas de fósforo ámbar y antenas eólicas de señal que dan identidad retrofuturista propia */
const PHOSPHOR_LAMPS: { x: number; y: number; color: string }[] = [
  { x: 468, y: 1796, color: '#fbbf24' },
  { x: 748, y: 1796, color: '#fbbf24' },
  { x: 888, y: 1852, color: '#00f3ff' },
  { x: 1624, y: 1268, color: '#fbbf24' },
  { x: 2042, y: 1218, color: '#00f3ff' },
  { x: 2668, y: 1564, color: '#fbbf24' },
  { x: 3212, y: 1244, color: '#38bdf8' },
];

const SIGNAL_WINDMILLS: { x: number; y: number }[] = [
  { x: 842, y: 1712 },
  { x: 1084, y: 1168 },
  { x: 2236, y: 1098 },
];

interface LavaPoolRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fosos y canales magmáticos del Bastión de las Oleadas (fuera del paso caminable) */
const VOLCANIC_LAVA_POOLS: LavaPoolRect[] = [
  { x: 2336, y: 368, w: 64, h: 224 },
  { x: 2432, y: 960, w: 480, h: 64 },
  { x: 3216, y: 480, w: 96, h: 384 },
  { x: 2880, y: 352, w: 288, h: 64 },
  { x: 2080, y: 512, w: 288, h: 96 },
  { x: 2080, y: 768, w: 288, h: 96 },
  { x: 1424, y: 576, w: 80, h: 256 },
];

export function isWorldBoxVisible(
  wx: number,
  wy: number,
  ww: number,
  wh: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  pad = 160
): boolean {
  return (
    wx + ww >= camX - pad &&
    wx <= camX + vw + pad &&
    wy + bhPad(wh) >= camY - pad &&
    wy <= camY + vh + pad
  );
}

function bhPad(wh: number): number {
  return wh;
}

function hashTile(tx: number, ty: number): number {
  const n = Math.imul(tx * 374761393 + ty * 668265263, 1274126177);
  return (n ^ (n >>> 13)) >>> 0;
}

/** Tres especies orgánicas de árboles artesanales de PIXELVERSE (sin bloques clónicos) */
function drawHandcraftedTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  variant: 'forest' | 'meadow' | 'pine'
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const dark = '#070c14';

  ctx.save();
  ctx.translate(x, y);

  // Sombra elíptica escalonada en el suelo
  ctx.fillStyle = 'rgba(6, 12, 20, 0.42)';
  ctx.fillRect(-18, 2, 36, 8);
  ctx.fillRect(-12, 8, 24, 3);

  // Raíces y tronco nudoso con vetas de corteza
  ctx.fillStyle = dark;
  ctx.fillRect(-9, -8, 18, 15);
  ctx.fillStyle = '#5c381c';
  ctx.fillRect(-7, -8, 14, 13);
  ctx.fillStyle = '#8b572a';
  ctx.fillRect(-5, -8, 5, 11);
  ctx.fillRect(-10, 2, 4, 4);
  ctx.fillRect(6, 2, 4, 4);

  if (variant === 'pine') {
    // Pino de aguja azul-esmeralda con tres niveles cónicos escalonados
    const pDark = '#123834';
    const pMid = '#1f6357';
    const pLight = '#46a088';
    ctx.fillStyle = dark;
    ctx.fillRect(-22, -22, 44, 16);
    ctx.fillRect(-17, -36, 34, 16);
    ctx.fillRect(-11, -48, 22, 14);
    ctx.fillRect(-5, -54, 10, 8);

    ctx.fillStyle = pDark;
    ctx.fillRect(-20, -20, 40, 12);
    ctx.fillStyle = pMid;
    ctx.fillRect(-18, -22, 36, 8);
    ctx.fillRect(-15, -34, 30, 12);
    ctx.fillRect(-9, -46, 18, 12);
    ctx.fillStyle = pLight;
    ctx.fillRect(-12, -22, 10, 4);
    ctx.fillRect(-10, -34, 10, 5);
    ctx.fillRect(-5, -52, 8, 8);
  } else {
    // Roble antiguo del bosque o árbol dorado-esmeralda de pradera con follaje asimétrico
    const leafDeep = variant === 'forest' ? '#143d29' : '#24582a';
    const leafMid = variant === 'forest' ? '#246b43' : '#438a3e';
    const leafHi = variant === 'forest' ? '#4ca86b' : '#7ec850';
    const leafAccent = variant === 'forest' ? '#5eead4' : '#d9f99d';

    ctx.fillStyle = dark;
    ctx.fillRect(-24, -30, 48, 22);
    ctx.fillRect(-20, -42, 40, 16);
    ctx.fillRect(-12, -48, 24, 10);

    ctx.fillStyle = leafDeep;
    ctx.fillRect(-22, -28, 44, 18);
    ctx.fillStyle = leafMid;
    ctx.fillRect(-20, -38, 38, 20);
    ctx.fillRect(-10, -46, 20, 10);

    ctx.fillStyle = leafHi;
    ctx.fillRect(-16, -40, 16, 10);
    ctx.fillRect(2, -36, 12, 8);
    ctx.fillRect(-8, -46, 12, 6);

    // Destellos de hojas / esporas de señal en el bosque
    ctx.fillStyle = leafAccent;
    ctx.fillRect(-12, -38, 4, 3);
    ctx.fillRect(6, -34, 4, 3);
  }

  ctx.restore();
}

/** Farola retrofuturista de hierro forjado y bulbo de fósforo */
function drawPhosphorStreetlamp(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  glowHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(lx);
  const y = Math.round(ly);
  const pulse = reducedMotion ? 0.22 : 0.18 + Math.sin(elapsed * 3.1 + lx * 0.05) * 0.05;

  ctx.save();
  ctx.translate(x, y);

  // Halo cálido de iluminación sutil sobre el camino
  ctx.fillStyle = glowHex;
  ctx.globalAlpha = pulse * 0.45;
  ctx.beginPath();
  ctx.ellipse(0, -4, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.arc(0, -34, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Base y mástil de hierro oscuro con remate de latón
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-6, -4, 12, 8);
  ctx.fillRect(-3, -36, 6, 34);
  ctx.fillRect(-8, -42, 16, 10);

  ctx.fillStyle = '#334155';
  ctx.fillRect(-4, -2, 8, 4);
  ctx.fillRect(-1, -34, 2, 32);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-6, -41, 12, 2);
  ctx.fillStyle = glowHex;
  ctx.fillRect(-5, -39, 10, 5);

  ctx.restore();
}

/** Molino-antena acústica que capta frecuencias antiguas de la isla */
function drawSignalWindmill(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  const angle = reducedMotion ? 0.4 : elapsed * 1.35 + wx * 0.01;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(7,11,20,0.42)';
  ctx.fillRect(-12, 2, 24, 6);

  // Torre celosía de cobre y pizarra
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-8, -48, 16, 52);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-6, -46, 12, 48);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-6, -30, 12, 3);
  ctx.fillRect(-6, -16, 12, 3);

  // Aspas/antena rotatoria en la cúspide
  ctx.save();
  ctx.translate(0, -46);
  ctx.rotate(angle);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, -3, 36, 6);
  ctx.fillRect(-3, -18, 6, 36);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-16, -1, 32, 2);
  ctx.fillRect(-1, -16, 2, 32);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  ctx.restore();
}

/** Cartel indicador tallado en madera y latón arqueológico */
function drawGbcWoodenSign(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-12, 2, 24, 6);

  ctx.fillStyle = '#081018';
  ctx.fillRect(-4, -8, 8, 14);
  ctx.fillStyle = '#784820';
  ctx.fillRect(-2, -8, 4, 12);

  ctx.fillStyle = '#081018';
  ctx.fillRect(-15, -27, 30, 21);
  ctx.fillStyle = '#b47b38';
  ctx.fillRect(-13, -25, 26, 17);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-13, -25, 26, 3);
  ctx.fillStyle = '#3b210e';
  ctx.fillRect(-9, -18, 18, 2);
  ctx.fillRect(-9, -13, 13, 2);

  ctx.restore();
}

/** Terminal / Punto de Guardado estilo Game Boy Color en el Pueblo del Origen */
function drawGbcSaveTerminal(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  elapsed: number,
  hasSaved: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const blink = Math.floor(elapsed * 3) % 2 === 0;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-16, 4, 32, 6);

  // Pedestal GBC crema y azul con contorno negro
  ctx.fillStyle = '#081018';
  ctx.fillRect(-14, -32, 28, 38);
  ctx.fillStyle = '#d8e0e8';
  ctx.fillRect(-12, -30, 24, 34);
  ctx.fillStyle = '#90a4b8';
  ctx.fillRect(-12, -8, 24, 12);

  // Pantalla CRT verde/cian de guardado
  ctx.fillStyle = '#081018';
  ctx.fillRect(-10, -26, 20, 14);
  ctx.fillStyle = hasSaved ? '#38b868' : '#2878b0';
  ctx.fillRect(-8, -24, 16, 10);
  ctx.fillStyle = blink ? '#f8f8d8' : '#8ce068';
  ctx.fillRect(-4, -21, 8, 4);

  // Etiqueta SAVE
  ctx.fillStyle = '#081018';
  ctx.font = '700 8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SAVE', 0, 2);

  ctx.restore();
}

/** Entrada a túnel subterráneo disimulada entre rocas costeras/cavernosas */
function drawGbcRockTunnelEntrance(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = Math.round(tx);
  const y = Math.round(ty);
  ctx.save();
  ctx.translate(x, y);

  // Arco rocoso escalonado GBC
  ctx.fillStyle = '#081018';
  ctx.fillRect(-20, -28, 40, 32);
  ctx.fillRect(-14, -34, 28, 8);

  ctx.fillStyle = '#685848';
  ctx.fillRect(-18, -26, 36, 28);
  ctx.fillStyle = '#907860';
  ctx.fillRect(-12, -32, 24, 8);

  // Boca oscura con peldaños descendentes
  ctx.fillStyle = '#080c14';
  ctx.fillRect(-10, -18, 20, 20);
  ctx.fillStyle = '#383028';
  ctx.fillRect(-8, -6, 16, 3);
  ctx.fillRect(-8, -1, 16, 3);

  ctx.restore();
}

export function drawPixelAvatar4Dir(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  facingDir: FacingDirection,
  walking: boolean,
  sprinting: boolean,
  t: number,
  skin: string,
  hair: string,
  shirt: string,
  opts?: {
    reducedMotion?: boolean;
    equippedCosmetic?: string | null;
    lanternActive?: boolean;
    interactAnim?: number;
  }
): void {
  const reducedMotion = Boolean(opts?.reducedMotion);
  const animT = reducedMotion ? 0 : t;
  const stepPhase = walking ? Math.floor(animT * (sprinting ? 10 : 7)) % 4 : 0;
  const bob = walking && (stepPhase === 1 || stepPhase === 3) ? 2 : 0;
  const stride =
    !walking || reducedMotion ? 0 : stepPhase === 1 ? 3 : stepPhase === 3 ? -3 : 0;
  const interactReach = (opts?.interactAnim ?? 0) > 0 ? 3 : 0;

  ctx.save();
  ctx.translate(Math.round(ax), Math.round(ay - bob));

  // Sombra pixelada nítida estilo GBC
  ctx.fillStyle = 'rgba(8, 12, 20, 0.5)';
  ctx.fillRect(-9, 3 + bob, 18, 5);

  // Halo discreto de Lámpara de Fósforo si está activa
  if (opts?.lanternActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -14, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.beginPath();
    ctx.arc(0, -14, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const outline = '#070b14';

  // Botas con contorno negro GBC
  ctx.fillStyle = outline;
  if (facingDir === 'down' || facingDir === 'up') {
    ctx.fillRect(-8, -6 + Math.max(0, stride), 7, 8);
    ctx.fillRect(1, -6 + Math.max(0, -stride), 7, 8);
    ctx.fillStyle = '#243447';
    ctx.fillRect(-7, -5 + Math.max(0, stride), 5, 6);
    ctx.fillRect(2, -5 + Math.max(0, -stride), 5, 6);
  } else {
    ctx.fillRect(-6 + stride, -6, 7, 8);
    ctx.fillRect(-1 - stride, -6, 7, 8);
    ctx.fillStyle = '#243447';
    ctx.fillRect(-5 + stride, -5, 5, 6);
    ctx.fillRect(-stride, -5, 5, 6);
  }

  // Torso con contorno negro nítido
  ctx.fillStyle = outline;
  ctx.fillRect(-9, -17, 18, 13);
  ctx.fillStyle = shirt;
  ctx.fillRect(-8, -16, 16, 11);
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(-8, -8, 16, 2);

  if (facingDir === 'up') {
    ctx.fillStyle = outline;
    ctx.fillRect(-7, -16, 14, 9);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-6, -15, 12, 7);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(-2, -13, 4, 3);
  }

  // Brazos en 4 direcciones
  ctx.fillStyle = outline;
  if (facingDir === 'down') {
    ctx.fillRect(-12, -16 + stride, 4, 8 + interactReach);
    ctx.fillRect(8, -16 - stride, 4, 8 + interactReach);
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -15 + stride, 2, 6 + interactReach);
    ctx.fillRect(9, -15 - stride, 2, 6 + interactReach);
  } else if (facingDir === 'up') {
    ctx.fillRect(-12, -16 - stride, 4, 8);
    ctx.fillRect(8, -16 + stride, 4, 8);
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -15 - stride, 2, 6);
    ctx.fillRect(9, -15 + stride, 2, 6);
  } else if (facingDir === 'right') {
    ctx.fillRect(-2 + stride + interactReach, -15, 5, 8);
    ctx.fillStyle = skin;
    ctx.fillRect(-1 + stride + interactReach, -14, 3, 6);
  } else {
    ctx.fillRect(-3 - stride - interactReach, -15, 5, 8);
    ctx.fillStyle = skin;
    ctx.fillRect(-2 - stride - interactReach, -14, 3, 6);
  }

  // Cabeza y cabello con contorno oscuro GBC
  ctx.fillStyle = outline;
  ctx.fillRect(-10, -33, 20, 17);

  if (facingDir === 'up') {
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 15);
  } else if (facingDir === 'down') {
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 16, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 7);
    ctx.fillRect(-9, -26, 2, 5);
    ctx.fillRect(7, -26, 2, 5);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-7, -24, 14, 5);
      ctx.fillStyle = '#5cc8ff';
      ctx.fillRect(-6, -23, 12, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 4, 1);
    } else {
      ctx.fillStyle = outline;
      ctx.fillRect(-5, -23, 3, 4);
      ctx.fillRect(2, -23, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 1, 2);
      ctx.fillRect(2, -23, 1, 2);
    }
  } else if (facingDir === 'right') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -27, 14, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 7);
    ctx.fillRect(-9, -26, 6, 8);
    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#5cc8ff';
      ctx.fillRect(0, -23, 8, 4);
    } else {
      ctx.fillStyle = outline;
      ctx.fillRect(3, -23, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -23, 1, 2);
    }
  } else {
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 14, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 7);
    ctx.fillRect(3, -26, 6, 8);
    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#5cc8ff';
      ctx.fillRect(-8, -23, 8, 4);
    } else {
      ctx.fillStyle = outline;
      ctx.fillRect(-6, -23, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -23, 1, 2);
    }
  }

  // Corona Dorada del Origen
  if (opts?.equippedCosmetic === 'item-manto-arquitecto') {
    ctx.fillStyle = outline;
    ctx.fillRect(-7, -39, 14, 7);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-6, -37, 12, 4);
    ctx.fillRect(-6, -39, 2, 2);
    ctx.fillRect(-1, -40, 2, 3);
    ctx.fillRect(4, -39, 2, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1, -36, 2, 2);
  }

  ctx.restore();
}

export function drawRpgTreasureChest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opened: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-14, 4, 28, 5);

  // Contorno negro GBC
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-14, -18, 28, 22);

  // Cuerpo de madera ocre/castaña GBC
  ctx.fillStyle = opened ? '#4a3520' : '#9c5a25';
  ctx.fillRect(-12, -10, 24, 12);

  // Tapa del cofre
  ctx.fillStyle = opened ? '#1e1610' : '#c87830';
  ctx.fillRect(-12, -16, 24, 6);

  // Herrajes dorados GBC y cerradura
  ctx.fillStyle = opened ? '#78716c' : '#f2c94c';
  ctx.fillRect(-12, -11, 24, 2);
  ctx.fillRect(-3, -13, 6, 6);

  if (!opened && !reducedMotion && Math.floor(elapsed * 3) % 2 === 0) {
    ctx.fillStyle = accentHex;
    ctx.fillRect(-1, -12, 2, 3);
  }

  ctx.restore();
}

function drawPong1972CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Alfombra ceremonial de piedra sobre la pradera
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-44, -8, 88, 32);
  ctx.fillStyle = '#d9b878';
  ctx.fillRect(-40, -4, 80, 24);
  ctx.fillStyle = '#a88850';
  ctx.fillRect(-36, 0, 72, 16);

  // Gabinete amarillo clásico Atari 1972 en pixel-art GBC
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-22, -62, 44, 64);
  ctx.fillStyle = '#e8b828';
  ctx.fillRect(-20, -60, 40, 60);
  ctx.fillStyle = '#b88010';
  ctx.fillRect(14, -60, 6, 60);

  // Marquesina superior PONG
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, -56, 36, 10);
  ctx.fillStyle = '#f8f0c8';
  ctx.fillRect(-16, -54, 32, 6);

  // Pantalla CRT con partido en vivo pixelado
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-16, -42, 32, 22);
  ctx.fillStyle = restored ? '#102820' : '#141820';
  ctx.fillRect(-14, -40, 28, 18);

  const bx = Math.round(Math.sin(elapsed * 4.5) * 8);
  const by = Math.round(Math.cos(elapsed * 3.1) * 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-11, -35, 2, 8);
  ctx.fillRect(9, -35 + (by > 0 ? 2 : -2), 2, 8);
  ctx.fillRect(bx - 1, -32 + by, 3, 3);

  ctx.restore();
}

function drawSpaceInvaders1978CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  unlocked: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Pedestal de basalto volcánico
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-46, -8, 92, 32);
  ctx.fillStyle = '#48343c';
  ctx.fillRect(-42, -4, 84, 24);
  ctx.fillStyle = restored ? '#38b868' : unlocked ? '#f26419' : '#685860';
  ctx.fillRect(-38, 14, 76, 4);

  // Gabinete upright crema/naranja 1978
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-24, -66, 48, 68);
  ctx.fillStyle = '#ebe4d4';
  ctx.fillRect(-22, -64, 44, 64);
  ctx.fillStyle = '#181c28';
  ctx.fillRect(-18, -50, 36, 48);

  // Marquesina naranja volcánica
  ctx.fillStyle = '#e85818';
  ctx.fillRect(-18, -62, 36, 10);
  ctx.fillStyle = '#f8d858';
  ctx.fillRect(-12, -59, 24, 4);

  // Pantalla CRT con marcianitos pixelados
  ctx.fillStyle = '#06120a';
  ctx.fillRect(-14, -44, 28, 22);
  const shift = Math.floor(elapsed * 2) % 2 === 0 ? -2 : 2;
  ctx.fillStyle = unlocked ? '#58e848' : '#64748b';
  for (let ix = -8; ix <= 6; ix += 7) {
    ctx.fillRect(ix + shift, -40, 4, 3);
    ctx.fillRect(ix - shift, -34, 4, 3);
  }
  ctx.fillStyle = '#5cc8ff';
  ctx.fillRect(-3, -26, 6, 2);

  ctx.restore();
}

function drawPongHoverboard(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  tilt: number,
  mounted: boolean,
  elapsed: number,
  skinColor: string,
  hairColor: string,
  shirtColor: string,
  reducedMotion: boolean
): void {
  const hover = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5) * 2);
  ctx.save();
  ctx.translate(Math.round(hx), Math.round(hy + hover));
  if (tilt !== 0) ctx.rotate(tilt);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-22, 8, 44, 5);

  ctx.fillStyle = '#070b14';
  ctx.fillRect(-24, -4, 48, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-22, -2, 44, 6);
  ctx.fillStyle = '#5cc8ff';
  ctx.fillRect(-16, 0, 32, 2);

  if (mounted) {
    drawPixelAvatar4Dir(
      ctx,
      0,
      -4,
      tilt < 0 ? 'up' : 'down',
      false,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      { reducedMotion }
    );
  }
  ctx.restore();
}

function drawStarShuttle(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  tilt: number,
  thrustersOn: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(scale, scale);
  if (tilt !== 0) ctx.rotate(tilt);

  ctx.fillStyle = '#070b14';
  ctx.fillRect(-28, -16, 56, 26);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-24, -14, 48, 22);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-20, -4, 40, 6);
  ctx.fillStyle = '#5cc8ff';
  ctx.fillRect(-8, -12, 16, 8);

  if (thrustersOn) {
    ctx.fillStyle = '#f89820';
    ctx.fillRect(-18, 10, 10, 8);
    ctx.fillRect(8, 10, 10, 8);
  }

  ctx.restore();
}

/** Renderiza cada celda de 32×32 con riqueza artesanal de texturas orgánicas y arqueología retro */
function drawGbcWalkableSurfaceTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  wx: number,
  wy: number,
  surface: WalkableRect['surface'],
  zoneId: IslandZoneId,
  animFrame4: number
): void {
  const h = hashTile(tx, ty);

  if (surface === 'sand') {
    const shade = (h & 3) === 0 ? '#e3c57c' : '#ebd08c';
    ctx.fillStyle = shade;
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#c59f56';
    if (h % 3 === 0) ctx.fillRect(wx + 6, wy + 10, PX * 3, PX);
    if (h % 5 === 0) ctx.fillRect(wx + 18, wy + 22, PX * 2, PX);
    if (h % 13 === 0) {
      // Charco mareal costero cristalino
      ctx.fillStyle = '#1f6f8b';
      ctx.fillRect(wx + 8, wy + 10, 14, 10);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(wx + 10, wy + 12, 8, 4);
    } else if (h % 11 === 0) {
      // Juncos costeros y madera de deriva
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(wx + 10, wy + 18, 12, 3);
      ctx.fillStyle = '#3f7d44';
      ctx.fillRect(wx + 22, wy + 10, 2, 10);
      ctx.fillRect(wx + 25, wy + 12, 2, 8);
    }
    return;
  }

  if (surface === 'cobble') {
    // Losas artesanales de piedra caliza y bronce envejecido (Aldea y Ruinas del Primer Pulso)
    const isRuins = zoneId === 'ruinas-primer-arcade';
    ctx.fillStyle = isRuins ? '#9aa5b4' : '#d6bc88';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = isRuins ? '#687488' : '#ad8d56';
    ctx.fillRect(wx, wy + 15, CELL, PX);
    ctx.fillRect(wx + 15, wy, PX, 15);
    ctx.fillRect(wx + 27, wy + 16, PX, 16);
    ctx.fillStyle = isRuins ? '#cbd5e1' : '#ede0bc';
    ctx.fillRect(wx + 3, wy + 3, 9, PX);
    ctx.fillRect(wx + 18, wy + 19, 8, PX);
    // Musgo sutil o traza de cobre arqueológico entre losas
    if (isRuins && h % 7 === 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + 6, wy + 15, 10, PX);
    } else if (!isRuins && h % 9 === 0) {
      ctx.fillStyle = '#4d8b46';
      ctx.fillRect(wx + 13, wy + 13, 4, 4);
    }
    return;
  }

  if (surface === 'grass' || surface === 'circuit' || surface === 'secret-grass') {
    const isForest = zoneId === 'bosque-circuitos';
    const isSecret = surface === 'secret-grass';
    const isCircuit = surface === 'circuit';

    // Variación orgánica por parches naturales para evitar una sábana verde plana
    const patch = (tx * 3 + ty * 5 + (h & 3)) % 5;
    ctx.fillStyle = isSecret
      ? '#2d6e4e'
      : isForest
      ? patch === 0
        ? '#235336'
        : '#2b633e'
      : patch === 0
      ? '#3f8c45'
      : patch === 1
      ? '#4b9b49'
      : '#459347';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Matas de hierba asimétricas y tréboles
    ctx.fillStyle = isForest ? '#173c26' : '#2d6d34';
    if ((h & 3) === 0) {
      ctx.fillRect(wx + 5, wy + 9, PX, PX * 2);
      ctx.fillRect(wx + 9, wy + 6, PX, PX * 3);
      ctx.fillRect(wx + 13, wy + 10, PX, PX * 2);
    }
    if ((h & 7) === 2) {
      ctx.fillRect(wx + 19, wy + 19, PX, PX * 2);
      ctx.fillRect(wx + 23, wy + 16, PX, PX * 3);
    }

    // Trazas arqueológicas enterradas bajo el musgo del Bosque de las Señales
    if (isCircuit && h % 6 === 0) {
      ctx.fillStyle = '#1e4638';
      ctx.fillRect(wx + 4, wy + 24, 24, 4);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#2dd4bf' : '#0d9488';
      ctx.fillRect(wx + 8, wy + 25, 12, 2);
    }

    // Setas luminiscentes en el bosque y flores silvestres asimétricas en claros
    if (isForest && h % 11 === 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(wx + 14, wy + 16, 2, 4);
      ctx.fillStyle = h % 2 === 0 ? '#38bdf8' : '#fbbf24';
      ctx.fillRect(wx + 12, wy + 13, 6, 3);
    } else if (!isForest && h % 10 === 0) {
      const shift = animFrame4 % 2 === 0 ? 0 : 1;
      ctx.fillStyle = '#2d6d34';
      ctx.fillRect(wx + 13, wy + 15, 2, 5);
      ctx.fillStyle = h % 3 === 0 ? '#fbbf24' : h % 2 === 0 ? '#fb7185' : '#e0f2fe';
      ctx.fillRect(wx + 12 + shift, wy + 12, 4, 4);
    } else if (isSecret && h % 4 === 0) {
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(wx + 14, wy + 14, 3, 3);
    }
    return;
  }

  if (surface === 'fortress') {
    ctx.fillStyle = (h & 1) === 0 ? '#382932' : '#402f39';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#21161d';
    ctx.fillRect(wx, wy + CELL - PX, CELL, PX);
    ctx.fillRect(wx + CELL - PX, wy, PX, CELL);
    ctx.fillStyle = '#5a434e';
    ctx.fillRect(wx + PX, wy + PX, 12, PX);
    if (h % 13 === 0) {
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#f26419' : '#ffba08';
      ctx.fillRect(wx + 10, wy + 16, 8, PX);
    }
    return;
  }

  if (surface === 'crystal') {
    ctx.fillStyle = (h & 1) === 0 ? '#241f38' : '#2a2440';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#151125';
    if (h % 3 === 0) ctx.fillRect(wx + 8, wy + 8, 6, 4);
    if (h % 9 === 0) {
      ctx.fillStyle = h % 2 === 0 ? '#38bdf8' : '#c084fc';
      ctx.fillRect(wx + 16, wy + 11, 4, 7);
    }
    return;
  }

  if (surface === 'pier') {
    ctx.fillStyle = '#9c6834';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#523216';
    for (let py = 0; py < CELL; py += 8) {
      ctx.fillRect(wx, wy + py, CELL, PX);
    }
    ctx.fillStyle = '#c48c4e';
    ctx.fillRect(wx + 4, wy + 2, 10, PX);
    return;
  }

  if (surface === 'bridge') {
    ctx.fillStyle = '#b47e40';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#482c14';
    for (let bx = 0; bx < CELL; bx += 8) {
      ctx.fillRect(wx + bx, wy, PX, CELL);
    }
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(wx, wy, CELL, PX * 2);
    ctx.fillRect(wx, wy + CELL - PX * 2, CELL, PX * 2);
    return;
  }

  // 'stone' — Terrazas y miradores tallados en roca antigua
  ctx.fillStyle = (h & 1) === 0 ? '#7e8999' : '#8793a3';
  ctx.fillRect(wx, wy, CELL, CELL);
  ctx.fillStyle = '#596575';
  ctx.fillRect(wx, wy + 16, CELL, PX);
  ctx.fillRect(wx + 16, wy, PX, CELL);
  ctx.fillStyle = '#aeb9c7';
  ctx.fillRect(wx + 4, wy + 4, 9, PX);
}

/** Senderos orgánicos de tierra apisonada, losas y escalinatas de desnivel hechos a mano */
function drawHandcraftedPathsAndStairs(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const drawSteppingPath = (
    pts: [number, number][],
    width: number,
    fillHex: string,
    borderHex: string
  ) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const minX = Math.min(x0, x1) - width;
      const minY = Math.min(y0, y1) - width;
      const boxW = Math.abs(x1 - x0) + width * 2;
      const boxH = Math.abs(y1 - y0) + width * 2;
      if (!isWorldBoxVisible(minX, minY, boxW, boxH, camX, camY, vw, vh)) continue;

      const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 18));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = Math.round(x0 + (x1 - x0) * t);
        const py = Math.round(y0 + (y1 - y0) * t);
        ctx.fillStyle = borderHex;
        ctx.fillRect(px - width / 2 - 2, py - width / 2 - 2, width + 4, width * 0.72 + 4);
        ctx.fillStyle = fillHex;
        ctx.fillRect(px - width / 2, py - width / 2, width, width * 0.72);
      }
    }
  };

  // Camino orgánico de la Aldea hacia el Mirador Anómalo Este y la Cala Sur
  drawSteppingPath(
    [
      [416, 1764],
      [560, 1810],
      [626, 1762],
      [696, 1816],
      [840, 1878],
      [948, 1884],
    ],
    28,
    '#c8ab76',
    '#7d633c'
  );
  drawSteppingPath(
    [
      [560, 1810],
      [540, 1936],
      [680, 1960],
      [818, 1952],
    ],
    24,
    '#c8ab76',
    '#7d633c'
  );

  // Sendero forestal sinuoso por El Bosque de las Señales Perdidas
  drawSteppingPath(
    [
      [632, 1600],
      [672, 1460],
      [820, 1360],
      [928, 1280],
      [964, 1108],
    ],
    26,
    '#9c7a4c',
    '#574124'
  );
  drawSteppingPath(
    [
      [928, 1280],
      [1180, 1288],
      [1480, 1296],
      [1620, 1296],
    ],
    28,
    '#b59463',
    '#664e2e'
  );

  // Calzada arqueológica en Las Ruinas del Primer Pulso (une Santuario, Cronoscopio y Portal Sur)
  drawSteppingPath(
    [
      [1620, 1296],
      [1880, 1280],
      [1936, 1200],
      [2150, 1202],
      [2140, 1420],
      [2580, 1596],
      [2816, 1612],
    ],
    30,
    '#b8c2cc',
    '#526071'
  );
  drawSteppingPath(
    [
      [1880, 1280],
      [1760, 1430],
      [1664, 1536],
    ],
    24,
    '#b8c2cc',
    '#526071'
  );

  // Escalinatas talladas en piedra para salvar desniveles entre terrazas
  const stairConnectors = [
    { x: 576, y: 1528, w: 112, steps: 5 },
    { x: 1832, y: 964, w: 120, steps: 6 },
    { x: 2292, y: 652, w: 88, steps: 5 },
    { x: 2548, y: 368, w: 120, steps: 5 },
  ];
  for (const st of stairConnectors) {
    if (!isWorldBoxVisible(st.x, st.y, st.w, st.steps * 14, camX, camY, vw, vh)) continue;
    for (let i = 0; i < st.steps; i++) {
      const sy = st.y + i * 13;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(st.x - 2, sy, st.w + 4, 11);
      ctx.fillStyle = i % 2 === 0 ? '#cbd5e1' : '#94a3b8';
      ctx.fillRect(st.x, sy + 2, st.w, 7);
    }
  }
}

/** Dibuja un Portal Anómalo con distinción visual clara entre estado latente y activo */
function drawAnomalyPortalWorld(
  ctx: CanvasRenderingContext2D,
  portal: AnomalyPortalSpec,
  unlocked: boolean,
  syncedGlyphsCount: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(portal.x);
  const y = Math.round(portal.y);
  const t = reducedMotion ? 0 : elapsed;

  ctx.save();
  ctx.translate(x, y);

  // Zócalo hexagonal/escalonado de roca basáltica grabada
  ctx.fillStyle = '#050811';
  ctx.fillRect(-34, -10, 68, 24);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-30, -8, 60, 20);
  ctx.fillStyle = unlocked ? portal.accentHex : '#475569';
  ctx.fillRect(-24, 6, 48, 3);

  // Pilares gemelos de obsidiana y bronce que enmarcan la anomalía
  ctx.fillStyle = '#050811';
  ctx.fillRect(-28, -58, 14, 52);
  ctx.fillRect(14, -58, 14, 52);
  ctx.fillRect(-30, -64, 60, 10);

  ctx.fillStyle = '#273449';
  ctx.fillRect(-26, -56, 10, 48);
  ctx.fillRect(16, -56, 10, 48);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-28, -62, 56, 6);

  // 3 Engastes superiores para mostrar progreso de los 3 Símbolos de Pulso si aplica
  if (portal.requiredSecretIds && portal.requiredSecretIds.length === 3) {
    for (let i = 0; i < 3; i++) {
      const lit = i < syncedGlyphsCount;
      const gx = -14 + i * 14;
      ctx.fillStyle = '#050811';
      ctx.fillRect(gx - 4, -71, 8, 8);
      ctx.fillStyle = lit ? '#00f3ff' : '#334155';
      ctx.fillRect(gx - 2, -69, 4, 4);
    }
  }

  if (unlocked) {
    // Núcleo energético dimensional sincronizado + fragmentos digitales orbitando
    const pulse = reducedMotion ? 0.85 : 0.72 + Math.sin(t * 4.5) * 0.2;
    ctx.fillStyle = '#071326';
    ctx.fillRect(-16, -54, 32, 46);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = portal.style === 'abyssal-chamber' ? '#7e22ce' : '#0284c7';
    ctx.fillRect(-14, -50, 28, 38);
    ctx.fillStyle = portal.accentHex;
    ctx.fillRect(-9, -43, 18, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -35, 8, 10);
    ctx.globalAlpha = 1;

    // Fragmentos digitales suspendidos alrededor del umbral
    for (let k = 0; k < 4; k++) {
      const ang = t * 2.2 + (k * Math.PI) / 2;
      const fx = Math.round(Math.cos(ang) * 20);
      const fy = Math.round(-32 + Math.sin(ang * 1.3) * 14);
      ctx.fillStyle = k % 2 === 0 ? '#00f3ff' : '#fde047';
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
    }
  } else {
    // Estado inactivo/latente: fisura estática tenue esperando resonancia arqueológica
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(-16, -54, 32, 46);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -50);
    ctx.lineTo(3, -36);
    ctx.lineTo(-3, -24);
    ctx.lineTo(2, -12);
    ctx.stroke();
  }

  ctx.restore();
}

/** Estela arqueológica tallada con los glifos de pulso [ ◈ ], [ ◈◈ ], [ ◈◈◈ ] */
function drawPulseGlyphStele(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  glyphIndex: 1 | 2 | 3,
  discovered: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const glow = discovered
    ? 0.95
    : reducedMotion
    ? 0.45
    : 0.35 + Math.sin(elapsed * 3 + glyphIndex) * 0.2;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(5, 8, 17, 0.45)';
  ctx.fillRect(-16, 3, 32, 6);

  ctx.fillStyle = '#070b14';
  ctx.fillRect(-14, -36, 28, 40);
  ctx.fillRect(-10, -42, 20, 8);

  ctx.fillStyle = discovered ? '#334155' : '#475569';
  ctx.fillRect(-12, -34, 24, 36);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-8, -40, 16, 6);

  // Rombos de pulso grabados en la piedra
  ctx.globalAlpha = glow;
  ctx.fillStyle = discovered ? accentHex : '#cbd5e1';
  for (let i = 0; i < glyphIndex; i++) {
    const gy = -30 + i * 9;
    ctx.fillRect(-4, gy, 8, 5);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/** Chasis de máquina recreativa olvidada semienterrada en la arena de la costa */
function drawForgottenCoastalCabinet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inspected: boolean,
  elapsed: number
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.save();
  ctx.translate(x, y);

  // Duna de arena que cubre la base inclinada
  ctx.fillStyle = '#cca862';
  ctx.fillRect(-24, -4, 48, 12);

  ctx.rotate(-0.12);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, -44, 36, 44);
  ctx.fillStyle = '#6b4c35';
  ctx.fillRect(-16, -42, 32, 40);
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(-13, -38, 26, 7);

  // Monitor CRT apagado con un destello fantasma ocasional
  ctx.fillStyle = '#090d16';
  ctx.fillRect(-12, -28, 24, 16);
  if (inspected || Math.floor(elapsed * 2) % 5 === 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-6, -21, 12, 2);
  }

  // Musgo costero sobre el mueble
  ctx.fillStyle = '#3f7d44';
  ctx.fillRect(-16, -42, 10, 4);
  ctx.fillRect(6, -14, 10, 6);

  ctx.restore();
}

/** Renderiza cada edificio con arquitectura propia de PIXELVERSE (cero tejados clónicos de Pokémon) */
function drawPixelverseBuilding(
  ctx: CanvasRenderingContext2D,
  bldg: ExteriorBuildingSpec,
  elapsed: number,
  reducedMotion: boolean,
  tmReadyFor80s: boolean
): void {
  const bx = Math.round(bldg.x);
  const by = Math.round(bldg.y);
  const style = bldg.archStyle ?? 'cottage-archive';

  ctx.save();

  // Sombra proyectada en el suelo
  ctx.fillStyle = 'rgba(5, 9, 18, 0.45)';
  ctx.fillRect(bx - 6, by + bldg.h - 2, bldg.w + 12, 12);

  if (style === 'chrono-dome') {
    // OBSERVATORIO DEL CRONOSCOPIO: Cúpula octogonal de obsidiana, bronce y lente temporal cian
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);

    // Contrafuertes de bronce en las esquinas
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx, by + 24, 10, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 10, by + 24, 10, bldg.h - 24);
    ctx.fillRect(bx, by + bldg.h - 8, bldg.w, 8);

    // Cúpula astronómica escalonada (sin franjas horizontales clónicas)
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx + 8, by + 4, bldg.w - 16, 22);
    ctx.fillRect(bx + 26, by - 10, bldg.w - 52, 16);
    ctx.fillRect(bx + 52, by - 18, bldg.w - 104, 10);

    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx + 10, by + 6, bldg.w - 20, 18);
    ctx.fillRect(bx + 28, by - 8, bldg.w - 56, 14);
    ctx.fillStyle = bldg.roofShadeHex;
    ctx.fillRect(bx + 10, by + 18, bldg.w - 20, 6);

    // Meridiano de latón y lente ocular del Cronoscopio en la cúpula
    const cx = Math.round(bx + bldg.w / 2);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(cx - 3, by - 16, 6, 38);
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.arc(cx, by + 6, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tmReadyFor80s
      ? '#00f3ff'
      : reducedMotion
      ? '#38bdf8'
      : Math.floor(elapsed * 2) % 2 === 0
      ? '#38bdf8'
      : '#0284c7';
    ctx.beginPath();
    ctx.arc(cx, by + 6, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'forest-workshop') {
    // TALLER ANALÓGICO DE KERTZ: Madera artesanal, cubierta de cobre oxidado, chimenea y bobina exterior
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx + bldg.w - 28, by - 16, 14, 24);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(bx + bldg.w - 26, by - 14, 10, 20);

    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 2, by + 24, bldg.w + 4, bldg.h - 22);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 26, bldg.w, bldg.h - 26);

    // Entramado de vigas de madera vista
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(bx, by + 26, 6, bldg.h - 26);
    ctx.fillRect(bx + bldg.w - 6, by + 26, 6, bldg.h - 26);
    ctx.fillRect(bx, by + 54, bldg.w, 4);

    // Cubierta inclinada de placas de cobre verde-azulado con tragaluz de taller
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 6, by + 4, bldg.w + 12, 24);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 4, by + 6, bldg.w + 8, 20);
    ctx.fillStyle = bldg.roofShadeHex;
    for (let px = bx + 12; px < bx + bldg.w - 8; px += 22) {
      ctx.fillRect(px, by + 6, 2, 20);
    }
    // Tragaluz ámbar
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx + 22, by + 10, 28, 12);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bx + 24, by + 12, 24, 8);
  } else if (style === 'ruins-sanctuary') {
    // SANTUARIO DEL ARCHIVO PIONERO: Arquitectura pétrea monumental con friso de circuitos dorados
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 4, by + 18, bldg.w + 8, bldg.h - 16);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);

    // Columnas frontales labradas
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(bx + 8, by + 28, 12, bldg.h - 32);
    ctx.fillRect(bx + bldg.w - 20, by + 28, 12, bldg.h - 32);

    // Frontón escalonado del templo con emblema cian
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 8, by + 4, bldg.w + 16, 18);
    ctx.fillRect(bx + 18, by - 6, bldg.w - 36, 12);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 6, bldg.w + 12, 14);
    ctx.fillRect(bx + 20, by - 4, bldg.w - 40, 10);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx + 4, by + 16, bldg.w - 8, 3);
  } else {
    // CENTRO DE HISTORIA EN LA ALDEA: Mampostería cálida, teja artesanal con hastial triangular y antena
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx + 18, by - 18, 4, 18);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(bx + 16, by - 20, 8, 4);

    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 2, by + 24, bldg.w + 4, bldg.h - 22);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 26, bldg.w, bldg.h - 26);
    ctx.fillStyle = '#a89984';
    ctx.fillRect(bx, by + bldg.h - 10, bldg.w, 10);

    // Tejado de pizarra terracota con tejas imbricadas y hastial central de madera
    ctx.fillStyle = '#070b14';
    ctx.fillRect(bx - 8, by + 6, bldg.w + 16, 22);
    ctx.fillRect(bx + 24, by - 4, bldg.w - 48, 12);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 8, bldg.w + 12, 18);
    ctx.fillRect(bx + 26, by - 2, bldg.w - 52, 10);
    ctx.fillStyle = bldg.roofShadeHex;
    for (let tx = bx; tx < bx + bldg.w; tx += 14) {
      ctx.fillRect(tx, by + 14, 8, 3);
    }
  }

  // Ventanas artesanales cálidas en fachada
  const drawArchWindow = (wx: number, wy: number, glowHex: string) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(wx, wy, 22, 20);
    ctx.fillStyle = glowHex;
    ctx.fillRect(wx + 2, wy + 2, 18, 16);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(wx + 10, wy + 2, 2, 16);
    ctx.fillRect(wx + 2, wy + 10, 18, 2);
  };
  const winGlow = style === 'chrono-dome' ? '#67e8f9' : '#fef08a';
  drawArchWindow(bx + 18, by + 42, winGlow);
  drawArchWindow(bx + bldg.w - 40, by + 42, winGlow);

  // Puerta accesible con dintel de latón y umbral de piedra
  const dLeft = Math.round(bldg.doorX - 15);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(dLeft - 3, by + bldg.h + 1, 36, 5);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(dLeft, by + bldg.h - 34, 30, 34);
  ctx.fillStyle = style === 'chrono-dome' ? '#1e293b' : '#5c3818';
  ctx.fillRect(dLeft + 2, by + bldg.h - 32, 26, 32);
  ctx.fillStyle = bldg.trimHex;
  ctx.fillRect(dLeft + 2, by + bldg.h - 32, 26, 3);
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(dLeft + 21, by + bldg.h - 16, 4, 4);

  // Rótulo arquitectónico limpio sobre el dintel
  ctx.fillStyle = '#070b14';
  ctx.fillRect(bldg.doorX - 42, by + 10, 84, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bldg.doorX - 40, by + 12, 80, 10);
  ctx.fillStyle = '#f8f5e6';
  ctx.font = '700 8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(bldg.signText, bldg.doorX, by + 20);

  ctx.restore();
}

export interface IslandRenderFrameParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  stars: IslandStar[];
  ambientBits: IslandAmbientBit[];
  digitalCritters: IslandDigitalCritter[];
  pickupBursts: IslandPickupBurst[];
  player: {
    x: number;
    y: number;
    facing: 1 | -1;
    facingDir?: FacingDirection;
    walking: boolean;
    sprinting?: boolean;
    interactAnim?: number;
  };
  flight: {
    type: 'none' | 'pong-to-garganta' | 'garganta-to-pong' | 'shuttle-landing';
    elapsed: number;
    duration: number;
  };
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  pongRestored: boolean;
  glitchTrailCleared: boolean;
  invadersRestored: boolean;
  invadersCabinetUnlocked: boolean;
  southShortcutActive: boolean;
  allUnlocked: boolean;
  progressState: PixelverseProgressState;
  activeZoneId: IslandZoneId | null;
  prompt: IslandPromptRenderSpec | null;
  scannerPulse?: { active: boolean; elapsed: number };
}

export function renderIsland70sFrame(params: IslandRenderFrameParams): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    elapsed,
    reducedMotion,
    digitalCritters,
    pickupBursts,
    player,
    flight,
    skinColor,
    hairColor,
    shirtColor,
    pongRestored,
    glitchTrailCleared,
    invadersRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    allUnlocked,
    progressState,
    activeZoneId,
    prompt,
    scannerPulse,
  } = params;

  ctx.imageSmoothingEnabled = false;

  const animFrame4 = reducedMotion ? 0 : Math.floor(elapsed * 3.2) % 4;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);
  const tmStatus = evaluateTimeMachineStatus(progressState, allUnlocked);

  // 1. MAR PROFUNDO DEL ARCHIPIÉLAGO CON CORRIENTES Y CRESTAS DE ESPUMA ARTESANALES
  ctx.fillStyle = '#0e3b5e';
  ctx.fillRect(0, 0, vw, vh);

  const startTileX = Math.floor(camX / CELL) - 1;
  const endTileX = Math.ceil((camX + vw) / CELL) + 1;
  const startTileY = Math.floor(camY / CELL) - 1;
  const endTileY = Math.ceil((camY + vh) / CELL) + 1;

  ctx.save();
  ctx.translate(-camX, -camY);

  for (let ty = startTileY; ty <= endTileY; ty++) {
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const wx = tx * CELL;
      const wy = ty * CELL;
      const th = hashTile(tx, ty);
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = '#134973';
        ctx.fillRect(wx, wy, CELL, CELL);
      }
      const waveOffset = ((animFrame4 + (tx % 3)) % 4) * 4;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + 4 + waveOffset, wy + 10, 10, PX);
      if (th % 5 === 0) {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(wx + 8 + waveOffset, wy + 22, 6, PX);
      }
    }
  }

  // 2. ACANTILADOS ROCOSOS ESTRATIFICADOS CON RELIEVE Y ROMPIENTE DE OLAS
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x - 20, r.y - 20, r.w + 40, r.h + 52, camX, camY, vw, vh)) {
      continue;
    }

    if (r.surface !== 'bridge' && r.surface !== 'pier') {
      // Espuma de marea animada alrededor de los acantilados
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#e0f2fe' : '#7dd3fc';
      ctx.fillRect(r.x - 8, r.y - 6, r.w + 16, r.h + 28);

      // Pared de roca estratificada de dos niveles bajo cada meseta
      ctx.fillStyle = '#070b14';
      ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 24);
      ctx.fillStyle =
        r.surface === 'fortress'
          ? '#24161e'
          : r.surface === 'crystal'
          ? '#17132b'
          : '#5c4228';
      ctx.fillRect(r.x - 2, r.y + r.h, r.w + 4, 18);
      ctx.fillStyle =
        r.surface === 'fortress'
          ? '#3b2531'
          : r.surface === 'crystal'
          ? '#282147'
          : '#7d5a38';
      for (let rx = r.x + 6; rx < r.x + r.w - 14; rx += 28) {
        ctx.fillRect(rx, r.y + r.h + 3, 16, 6);
      }
    }
  }

  // 3. SUPERFICIES NATURALES Y ARQUEOLÓGICAS DE LOS 9 SECTORES
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;

    const rTx0 = Math.max(startTileX, Math.floor(r.x / CELL));
    const rTx1 = Math.min(endTileX, Math.ceil((r.x + r.w) / CELL) - 1);
    const rTy0 = Math.max(startTileY, Math.floor(r.y / CELL));
    const rTy1 = Math.min(endTileY, Math.ceil((r.y + r.h) / CELL) - 1);

    for (let ty = rTy0; ty <= rTy1; ty++) {
      for (let tx = rTx0; tx <= rTx1; tx++) {
        drawGbcWalkableSurfaceTile(
          ctx,
          tx,
          ty,
          tx * CELL,
          ty * CELL,
          r.surface,
          r.zoneId,
          animFrame4
        );
      }
    }

    ctx.strokeStyle = 'rgba(7, 11, 20, 0.72)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  // 3B. SENDEROS ORGÁNICOS Y ESCALINATAS TALLADAS ENTRE DESNIVELES
  drawHandcraftedPathsAndStairs(ctx, camX, camY, vw, vh);

  // 4. COMPOSICIÓN AMBIENTAL ARTESANAL POR SECTOR
  // 4A. Arroyo cristalino y puente de madera hacia el Claro de Pong (1972)
  if (isWorldBoxVisible(2592, 1440, 64, 480, camX, camY, vw, vh)) {
    for (let cy = 1440; cy < 1920; cy += CELL) {
      ctx.fillStyle = '#1d6f96';
      ctx.fillRect(2600, cy, 40, CELL);
      ctx.fillStyle = '#7dd3fc';
      const wyShift = (animFrame4 * 6) % 24;
      ctx.fillRect(2608, cy + wyShift, 12, PX * 2);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(2598, cy, PX, CELL);
      ctx.fillRect(2640, cy, PX, CELL);
    }
    ctx.fillStyle = '#070b14';
    ctx.fillRect(2590, 1580, 60, 72);
    ctx.fillStyle = '#c89048';
    ctx.fillRect(2592, 1584, 56, 64);
    ctx.fillStyle = '#684018';
    for (let px = 2596; px < 2648; px += 10) {
      ctx.fillRect(px, 1584, PX, 64);
    }
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(2592, 1584, 56, 4);
    ctx.fillRect(2592, 1644, 56, 4);
  }

  // 4B. Fosos magmáticos y murallas del Bastión de las Oleadas (1978)
  for (const lava of VOLCANIC_LAVA_POOLS) {
    if (!isWorldBoxVisible(lava.x, lava.y, lava.w, lava.h, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(lava.x - 4, lava.y - 4, lava.w + 8, lava.h + 8);
    ctx.fillStyle = '#381c20';
    ctx.fillRect(lava.x - 2, lava.y - 2, lava.w + 4, lava.h + 4);

    for (let ly = lava.y; ly < lava.y + lava.h; ly += CELL) {
      for (let lx = lava.x; lx < lava.x + lava.w; lx += CELL) {
        const cw = Math.min(CELL, lava.x + lava.w - lx);
        const ch = Math.min(CELL, lava.y + lava.h - ly);
        ctx.fillStyle = '#b82018';
        ctx.fillRect(lx, ly, cw, ch);
        const shift = ((animFrame4 + Math.floor(lx / CELL)) % 4) * 4;
        ctx.fillStyle = '#f26419';
        ctx.fillRect(lx + 4, ly + 4 + (shift % 12), Math.max(4, cw - 8), 8);
        ctx.fillStyle = '#ffba08';
        ctx.fillRect(lx + 8, ly + 8 + (shift % 10), Math.max(2, cw - 18), 4);
      }
    }
  }

  if (isWorldBoxVisible(2400, 400, 816, 48, camX, camY, vw, vh)) {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(2868, 412, 348, 24);
    ctx.fillStyle = '#56404a';
    ctx.fillRect(2870, 414, 344, 20);
    for (let mx = 2874; mx < 3210; mx += 24) {
      ctx.fillStyle = '#241820';
      ctx.fillRect(mx, 406, 12, 10);
    }
  }

  // 4C. Cascada animada con pasadizo secreto a la Gruta Subterránea
  if (
    isWorldBoxVisible(
      WATERFALL_SECRET_ENTRANCE.x - 48,
      WATERFALL_SECRET_ENTRANCE.y - 64,
      96,
      96,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const wx = WATERFALL_SECRET_ENTRANCE.x - 24;
    const wy = WATERFALL_SECRET_ENTRANCE.y - 44;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(wx - 2, wy - 2, 52, 56);
    ctx.fillStyle = '#1d6f96';
    ctx.fillRect(wx, wy, 48, 52);

    const discoveredWf =
      progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
    if (discoveredWf) {
      ctx.fillStyle = '#090d18';
      ctx.fillRect(wx + 12, wy + 18, 24, 34);
    }
    ctx.fillStyle = '#7dd3fc';
    for (let sy = 0; sy < 48; sy += 12) {
      const dropY = wy + ((sy + animFrame4 * 4) % 48);
      ctx.fillRect(wx + 4, dropY, 6, 8);
      ctx.fillRect(wx + 38, dropY, 6, 8);
      if (!discoveredWf) {
        ctx.fillRect(wx + 20, dropY, 8, 8);
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx - 2, wy + 48, 52, 6);
  }

  // 4D. La Aldea de los Orígenes: Fuente de las Primeras Señales, bancos de madera y cercas rústicas
  if (isWorldBoxVisible(340, 1700, 520, 220, camX, camY, vw, vh)) {
    const drawRusticFence = (fx: number, fy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = fx + i * 16;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(x, fy, 16, 13);
        ctx.fillStyle = '#b07d48';
        ctx.fillRect(x + 2, fy + 2, 4, 9);
        ctx.fillRect(x + 10, fy + 2, 4, 9);
        ctx.fillStyle = '#d8be88';
        ctx.fillRect(x, fy + 5, 16, 3);
      }
    };
    drawRusticFence(352, 1712, 7);
    drawRusticFence(724, 1712, 5);

    // Fuente/Pozo circular de piedra en la plazuela de la Aldea (x=592, y=1848)
    const fx = 592;
    const fy = 1848;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(fx - 20, fy - 14, 40, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(fx - 18, fy - 12, 36, 22);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(fx - 14, fy - 8, 28, 14);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#7dd3fc' : '#e0f2fe';
    ctx.fillRect(fx - 4, fy - 5, 8, 8);

    // Bancos de descanso artesanales junto a la fuente
    const drawBench = (bx: number, by: number) => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(bx - 14, by - 6, 28, 12);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(bx - 12, by - 4, 24, 8);
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(bx - 12, by - 4, 24, 2);
    };
    drawBench(544, 1848);
    drawBench(640, 1848);
  }

  // 4E. Mosaico Astral en la Plaza de Las Ruinas del Primer Pulso (frente al Cronoscopio)
  if (isWorldBoxVisible(1860, 1220, 260, 140, camX, camY, vw, vh)) {
    const mx = 1996;
    const my = 1284;
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(216, 190, 136, 0.5)';
    ctx.strokeRect(mx - 28, my - 28, 56, 56);
    ctx.restore();
  }

  // 4F. La Costa de las Máquinas Olvidadas: Columnas antiguas, Altar del Origen y Recreativa semienterrada
  if (isWorldBoxVisible(3080, 1390, 260, 190, camX, camY, vw, vh)) {
    const drawRuinPillar = (px: number, py: number, broken: boolean) => {
      const h = broken ? 24 : 38;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(px - 10, py - h, 20, h + 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(px - 8, py - h + 2, 16, h);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px + 2, py - h + 2, 6, h);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(px - 10, py - 4, 20, 6);
    };
    drawRuinPillar(3196, 1488, false);
    drawRuinPillar(3300, 1488, true);
    drawRuinPillar(3196, 1548, true);
    drawRuinPillar(3300, 1548, false);

    ctx.fillStyle = '#070b14';
    ctx.fillRect(3230, 1484, 36, 28);
    ctx.fillStyle = '#d9b878';
    ctx.fillRect(3232, 1486, 32, 24);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#5cc8ff' : '#fde047';
    ctx.fillRect(3242, 1492, 12, 12);

    drawForgottenCoastalCabinet(
      ctx,
      3128,
      1428,
      progressState.rpg.discoveredSecretIds.includes('secret-costa-recreativa'),
      elapsed
    );
  }

  // 4G. Las 3 Estelas Arqueológicas de Símbolos de Pulso ([ ◈ ], [ ◈◈ ], [ ◈◈◈ ])
  const glyphSteles: { x: number; y: number; idx: 1 | 2 | 3; sec: string; hex: string }[] = [
    { x: 828, y: 1948, idx: 1, sec: 'secret-glyph-1', hex: '#38bdf8' },
    { x: 1192, y: 956, idx: 2, sec: 'secret-glyph-2', hex: '#34d399' },
    { x: 3064, y: 1764, idx: 3, sec: 'secret-glyph-3', hex: '#fde047' },
  ];
  for (const gs of glyphSteles) {
    if (isWorldBoxVisible(gs.x - 24, gs.y - 48, 48, 56, camX, camY, vw, vh)) {
      drawPulseGlyphStele(
        ctx,
        gs.x,
        gs.y,
        gs.idx,
        allUnlocked || progressState.rpg.discoveredSecretIds.includes(gs.sec),
        gs.hex,
        elapsed,
        reducedMotion
      );
    }
  }

  // 5. TÚNELES SUBTERRÁNEOS EN ROCAS, CARTELES Y TERMINAL DE GUARDADO
  for (const tunnel of COASTAL_SUBTERRANEAN_TUNNELS) {
    if (isWorldBoxVisible(tunnel.x - 28, tunnel.y - 38, 56, 48, camX, camY, vw, vh)) {
      drawGbcRockTunnelEntrance(ctx, tunnel.x, tunnel.y);
    }
  }

  for (const sign of ISLAND_WOODEN_SIGNS) {
    if (isWorldBoxVisible(sign.x - 20, sign.y - 30, 40, 40, camX, camY, vw, vh)) {
      drawGbcWoodenSign(ctx, sign.x, sign.y);
    }
  }

  if (
    isWorldBoxVisible(
      VILLAGE_SAVE_TERMINAL.x - 24,
      VILLAGE_SAVE_TERMINAL.y - 36,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    drawGbcSaveTerminal(
      ctx,
      VILLAGE_SAVE_TERMINAL.x,
      VILLAGE_SAVE_TERMINAL.y,
      elapsed,
      Boolean(progressState.rpg.lastManualSaveIso)
    );
  }

  // 5B. PORTALES ANÓMALOS DE PIXELVERSE (Inactivos vs Sincronizados)
  const syncedGlyphsCount = ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'].filter(
    (id) => allUnlocked || progressState.rpg.discoveredSecretIds.includes(id)
  ).length;

  for (const portal of ISLAND_ANOMALY_PORTALS) {
    if (!isWorldBoxVisible(portal.x - 40, portal.y - 76, 80, 96, camX, camY, vw, vh)) {
      continue;
    }
    const unlocked =
      allUnlocked ||
      !portal.requiredSecretIds ||
      portal.requiredSecretIds.every((req) =>
        progressState.rpg.discoveredSecretIds.includes(req)
      );
    drawAnomalyPortalWorld(
      ctx,
      portal,
      unlocked,
      syncedGlyphsCount,
      elapsed,
      reducedMotion
    );
  }

  // Criaturas ambientales amistosas (luciérnagas de señal en Bosque y Praderas)
  for (const critter of digitalCritters) {
    const cx = Math.round(
      critter.homeX + (reducedMotion ? 0 : Math.sin(elapsed * 1.6 + critter.phase) * 24)
    );
    const cy = Math.round(
      critter.homeY + (reducedMotion ? 0 : Math.cos(elapsed * 2.1 + critter.phase) * 14)
    );
    if (!isWorldBoxVisible(cx - 8, cy - 8, 16, 16, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(cx - 4, cy - 4, 8, 6);
    ctx.fillStyle = critter.color;
    ctx.fillRect(cx - 2, cy - 2, 4, 3);
  }

  // 6. PORTAL DEL SENDERO DEL GLITCH, PLATAFORMA ESTELAR, MONOLITOS Y OBJETOS DE SUELO
  {
    const gp = ISLAND_KEY_COORDS.glitchTrailPortal;
    if (isWorldBoxVisible(gp.x - 54, gp.y - 80, 108, 100, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(gp.x), Math.round(gp.y));
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-42, -68, 84, 74);
      ctx.fillStyle = '#56404a';
      ctx.fillRect(-40, -66, 14, 70);
      ctx.fillRect(26, -66, 14, 70);
      ctx.fillRect(-44, -72, 88, 12);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#1d669c' : '#7b2cbf';
      ctx.fillRect(-26, -60, 52, 62);
      ctx.fillStyle = '#5cc8ff';
      ctx.fillRect(-16, -48 + (animFrame4 % 3) * 4, 32, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -34, 12, 12);
      ctx.restore();
    }
  }

  {
    const pad = ISLAND_KEY_COORDS.starShuttlePad;
    if (isWorldBoxVisible(pad.x - 220, pad.y - 340, 340, 400, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(pad.x), Math.round(pad.y + 12));
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-56, -20, 112, 40);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-52, -16, 104, 32);
      ctx.strokeStyle = invadersRestored ? '#5cc8ff' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(-44, -10, 88, 20);
      ctx.restore();

      if (flight.type === 'shuttle-landing') {
        const p = Math.min(1, flight.elapsed / flight.duration);
        const lp = Math.min(1, p / 0.72);
        const easeOut = 1 - Math.pow(1 - lp, 3);
        const sx = pad.x - 190 * (1 - easeOut);
        const sy = pad.y - 310 * (1 - easeOut);
        drawStarShuttle(ctx, sx, sy, 0.8 + 0.25 * easeOut, (1 - easeOut) * 0.14, p < 0.74);
      } else if (invadersRestored) {
        drawStarShuttle(ctx, pad.x, pad.y, 1.05, 0, false);
      }
    }
  }

  {
    const ast = ISLAND_KEY_COORDS.architectAstrolabe;
    if (isWorldBoxVisible(ast.x - 70, ast.y - 70, 140, 110, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(ast.x), Math.round(ast.y));
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-48, 0, 96, 28);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-44, 4, 88, 20);

      ctx.fillStyle = '#070b14';
      ctx.fillRect(-20, -44, 40, 46);
      ctx.fillStyle = '#d9b878';
      ctx.fillRect(-16, -40, 32, 40);
      ctx.fillStyle = pongRestored ? '#8cd96c' : '#475569';
      ctx.fillRect(-12, -34, 8, 8);
      ctx.fillStyle = glitchTrailCleared ? '#5cc8ff' : '#475569';
      ctx.fillRect(-4, -22, 8, 8);
      ctx.fillStyle = invadersRestored ? '#f26419' : '#475569';
      ctx.fillRect(4, -34, 8, 8);
      ctx.restore();
    }
  }

  for (const vista of DISTANT_DECADE_VISTAS) {
    if (!isWorldBoxVisible(vista.x - 20, vista.y - 30, 40, 40, camX, camY, vw, vh)) {
      continue;
    }
    ctx.save();
    ctx.translate(Math.round(vista.x), Math.round(vista.y));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -20, 12, 24);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -18, 8, 20);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -26, 24, 10);
    ctx.fillStyle = vista.accentHex;
    ctx.fillRect(-8, -24, 20, 6);
    ctx.restore();
  }

  for (const sw of ISLAND_SWITCHES) {
    if (!isWorldBoxVisible(sw.x - 24, sw.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const active = progressState.island70s.activatedIslandSwitches.includes(sw.id);
    ctx.save();
    ctx.translate(Math.round(sw.x), Math.round(sw.y));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-14, -24, 28, 30);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-12, -16, 24, 20);
    ctx.fillStyle = active ? sw.accentHex : '#334155';
    ctx.fillRect(-8, -22, 16, 10);
    ctx.restore();
  }

  for (const echo of ISLAND_ECHOES) {
    if (!isWorldBoxVisible(echo.x - 26, echo.y - 36, 52, 52, camX, camY, vw, vh)) continue;
    const discovered = progressState.island70s.discoveredEchoIds.includes(echo.id);
    ctx.save();
    ctx.translate(Math.round(echo.x), Math.round(echo.y));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-16, -32, 32, 36);
    ctx.fillStyle = discovered ? '#334155' : '#1e293b';
    ctx.fillRect(-14, -30, 28, 32);
    ctx.fillStyle = echo.accentHex;
    ctx.fillRect(-10, -26, 20, 14);
    ctx.fillStyle = '#070b14';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(echo.year), 0, -16);
    ctx.restore();
  }

  for (const dia of ISLAND_DIAMONDS) {
    if (progressState.island70s.collectedDiamondIds.includes(dia.id)) continue;
    if (dia.requiresShortcut && !southShortcutActive) continue;
    if (!isWorldBoxVisible(dia.x - 24, dia.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const bob = reducedMotion ? 0 : animFrame4 % 2 === 0 ? -2 : 0;
    ctx.save();
    ctx.translate(Math.round(dia.x), Math.round(dia.y + bob));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -22, 20, 20);
    ctx.fillStyle = '#5cc8ff';
    ctx.fillRect(-8, -20, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -18, 6, 6);
    ctx.restore();
  }

  if (
    pongRestored &&
    flight.type !== 'pong-to-garganta' &&
    flight.type !== 'garganta-to-pong'
  ) {
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLaunch.x,
      ISLAND_KEY_COORDS.pongBoardLaunch.y,
      0,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion
    );
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLanding.x - 42,
      ISLAND_KEY_COORDS.pongBoardLanding.y + 16,
      0,
      false,
      elapsed + 1.2,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion
    );
  }

  if (
    isWorldBoxVisible(
      HARBOR_80S_FERRY.x - 60,
      HARBOR_80S_FERRY.y - 45,
      120,
      90,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const ferryReady =
      invadersRestored ||
      allUnlocked ||
      progressState.rpg.unlockedIslands.includes('island-80s');
    const bobFerry = reducedMotion ? 0 : animFrame4 % 2 === 0 ? 0 : 2;
    ctx.save();
    ctx.translate(Math.round(HARBOR_80S_FERRY.x), Math.round(HARBOR_80S_FERRY.y + bobFerry));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-44, -24, 88, 38);
    ctx.fillStyle = ferryReady ? '#b91c1c' : '#475569';
    ctx.fillRect(-42, -10, 84, 22);
    ctx.fillStyle = '#f8f5e6';
    ctx.fillRect(-34, -22, 68, 12);
    ctx.fillStyle = '#070b14';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ferryReady ? 'NAVÍO 80s' : 'MUELLE', 0, -13);
    ctx.restore();
  }

  if (
    isWorldBoxVisible(
      BROKEN_RELAY_MECHANISM.x - 24,
      BROKEN_RELAY_MECHANISM.y - 28,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const repaired = progressState.rpg.repairedMechanismIds.includes(
      BROKEN_RELAY_MECHANISM.id
    );
    ctx.save();
    ctx.translate(Math.round(BROKEN_RELAY_MECHANISM.x), Math.round(BROKEN_RELAY_MECHANISM.y));
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-16, -24, 32, 32);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-14, -22, 28, 28);
    ctx.fillStyle = repaired ? '#4ca64c' : animFrame4 % 2 === 0 ? '#f26419' : '#7c2d12';
    ctx.fillRect(-8, -16, 16, 12);
    ctx.restore();
  }

  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(chest.x - 24, chest.y - 24, 48, 48, camX, camY, vw, vh)) {
      continue;
    }
    const opened = progressState.rpg.openedChestIds.includes(chest.id);
    drawRpgTreasureChest(
      ctx,
      chest.x,
      chest.y,
      opened,
      chest.accentHex,
      elapsed,
      reducedMotion
    );
  }

  // 7. CAPAS DE PROFUNDIDAD CON ORDENAMIENTO Y (Y-SORTING)
  // Permite que Pixel pase detrás de copas de árboles, farolas, tejados y arcos cuando está al norte,
  // y delante cuando camina al sur de su base.
  const ySortedDrawables: { sortY: number; draw: () => void }[] = [];

  for (const tree of ISLAND_TREES) {
    if (isWorldBoxVisible(tree.x - 32, tree.y - 58, 64, 72, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: tree.y,
        draw: () => drawHandcraftedTree(ctx, tree.x, tree.y, tree.variant),
      });
    }
  }

  for (const lamp of PHOSPHOR_LAMPS) {
    if (isWorldBoxVisible(lamp.x - 34, lamp.y - 54, 68, 68, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: lamp.y,
        draw: () =>
          drawPhosphorStreetlamp(ctx, lamp.x, lamp.y, lamp.color, elapsed, reducedMotion),
      });
    }
  }

  for (const mill of SIGNAL_WINDMILLS) {
    if (isWorldBoxVisible(mill.x - 28, mill.y - 68, 56, 76, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: mill.y,
        draw: () => drawSignalWindmill(ctx, mill.x, mill.y, elapsed, reducedMotion),
      });
    }
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.pongCabinet.x - 75,
      ISLAND_KEY_COORDS.pongCabinet.y - 80,
      150,
      120,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.pongCabinet.y,
      draw: () =>
        drawPong1972CabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.pongCabinet.x,
          ISLAND_KEY_COORDS.pongCabinet.y,
          pongRestored,
          elapsed
        ),
    });
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.invadersCabinet.x - 80,
      ISLAND_KEY_COORDS.invadersCabinet.y - 85,
      160,
      125,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.invadersCabinet.y,
      draw: () =>
        drawSpaceInvaders1978CabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.invadersCabinet.x,
          ISLAND_KEY_COORDS.invadersCabinet.y,
          invadersRestored,
          invadersCabinetUnlocked,
          elapsed
        ),
    });
  }

  for (const bldg of ISLAND_70S_BUILDINGS) {
    if (
      isWorldBoxVisible(
        bldg.x - 28,
        bldg.y - 48,
        bldg.w + 56,
        bldg.h + 76,
        camX,
        camY,
        vw,
        vh
      )
    ) {
      ySortedDrawables.push({
        sortY: bldg.y + bldg.h,
        draw: () =>
          drawPixelverseBuilding(
            ctx,
            bldg,
            elapsed,
            reducedMotion,
            tmStatus.canTravelTo80s
          ),
      });
    }
  }

  for (const npc of ISLAND_NPCS) {
    if (!isWorldBoxVisible(npc.x - 20, npc.y - 36, 40, 48, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: npc.y,
      draw: () => {
        const nbob = reducedMotion ? 0 : (animFrame4 + Math.floor(npc.x)) % 2 === 0 ? 0 : -2;
        ctx.save();
        ctx.translate(Math.round(npc.x), Math.round(npc.y + nbob));
        ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
        ctx.fillRect(-8, 3, 16, 4);

        ctx.fillStyle = '#070b14';
        ctx.fillRect(-9, -30, 18, 32);
        ctx.fillStyle = npc.palette.secondary;
        ctx.fillRect(-8, -29, 16, 7);
        ctx.fillStyle = '#fde2c8';
        ctx.fillRect(-7, -22, 14, 8);
        ctx.fillStyle = '#070b14';
        ctx.fillRect(-4, -20, 2, 3);
        ctx.fillRect(2, -20, 2, 3);
        ctx.fillStyle = npc.palette.primary;
        ctx.fillRect(-8, -14, 16, 14);
        ctx.restore();
      },
    });
  }

  // Jugador Pixel integrado en el ordenamiento de profundidad cuando camina en tierra
  const playerFlyingHover =
    flight.type === 'pong-to-garganta' || flight.type === 'garganta-to-pong';
  if (
    !playerFlyingHover &&
    (flight.type !== 'shuttle-landing' || flight.elapsed / flight.duration >= 0.72)
  ) {
    ySortedDrawables.push({
      sortY: player.y,
      draw: () =>
        drawPixelAvatar4Dir(
          ctx,
          player.x,
          player.y,
          player.facingDir ?? (player.facing >= 0 ? 'right' : 'left'),
          player.walking,
          Boolean(player.sprinting),
          elapsed,
          skinColor,
          hairColor,
          shirtColor,
          {
            reducedMotion,
            equippedCosmetic: progressState.rpg.equippedCosmetic,
            lanternActive: progressState.rpg.lanternActive,
            interactAnim: player.interactAnim,
          }
        ),
    });
  }

  ySortedDrawables.sort((a, b) => a.sortY - b.sortY);
  for (const item of ySortedDrawables) {
    item.draw();
  }

  // Si Pixel vuela por el aire sobre la Tabla de Pong, se dibuja por encima del dosel
  if (playerFlyingHover) {
    drawPongHoverboard(
      ctx,
      player.x,
      player.y,
      flight.type === 'pong-to-garganta' ? -0.18 : 0.18,
      true,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion
    );
  }

  // 8. ONDA DE PULSO DEL SONAR DE FRECUENCIAS TTL [R]
  if (scannerPulse && scannerPulse.active) {
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = Math.round(24 + pRatio * 480);
    ctx.save();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.round(player.x), Math.round(player.y - 10), radius, 0, Math.PI * 2);
    ctx.stroke();

    const secretTargets: { x: number; y: number; tag: string }[] = [
      {
        x: WATERFALL_SECRET_ENTRANCE.x,
        y: WATERFALL_SECRET_ENTRANCE.y,
        tag: '¡GRUTA TRAS CASCADA!',
      },
      ...ISLAND_ANOMALY_PORTALS.map((ap) => ({
        x: ap.x,
        y: ap.y,
        tag: 'PORTAL ANÓMALO',
      })),
      ...COASTAL_SUBTERRANEAN_TUNNELS.map((t) => ({
        x: t.x,
        y: t.y,
        tag: 'TÚNEL EN ROCA',
      })),
      ...RPG_CHESTS.filter(
        (c) =>
          c.areaId === 'exterior-70s' &&
          !progressState.rpg.openedChestIds.includes(c.id)
      ).map((c) => ({ x: c.x, y: c.y, tag: 'COFRE OCULTO' })),
      ...RPG_EXAMINABLES.filter((ex) => ex.areaId === 'exterior-70s').map((ex) => ({
        x: ex.x,
        y: ex.y,
        tag: ex.id.startsWith('exam-simbolo-pulso') ? 'GLIFO DE PULSO' : 'HALLAZGO ARQUEOLÓGICO',
      })),
    ];

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const st of secretTargets) {
      if (Math.hypot(st.x - player.x, st.y - player.y) <= radius + 30) {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(st.x - 66, st.y - 46, 132, 16);
        ctx.fillStyle = '#f8f5e6';
        ctx.fillText(`▶ ${st.tag}`, st.x, st.y - 35);
      }
    }
    ctx.restore();
  }

  // Etiqueta flotante de interacción [E] con marco propio de PIXELVERSE (obsidiana + bronce)
  if (prompt && flight.type === 'none') {
    const py = Math.round(prompt.y - 54 + (animFrame4 % 2 === 0 ? 0 : -2));
    const px = Math.round(prompt.x);
    ctx.save();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = Math.ceil(ctx.measureText(badgeText).width) + 20;
    const left = Math.round(px - tw / 2);

    ctx.fillStyle = '#050811';
    ctx.fillRect(left - 2, py - 16, tw + 4, 24);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(left, py - 14, tw, 20);
    ctx.fillStyle = '#0b1324';
    ctx.fillRect(left + 2, py - 12, tw - 4, 16);
    ctx.fillStyle = '#f8f5e6';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, px, py);
    ctx.restore();
  }

  for (const pb of pickupBursts) {
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 6, 6);
  }

  ctx.restore();

  if (activeZoneId) {
    ctx.fillStyle = ISLAND_ZONES[activeZoneId].ambientTint;
    ctx.fillRect(0, 0, vw, vh);
  }
}
