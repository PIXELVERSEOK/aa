/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Motor modular de renderizado HD-2D con Viewport Culling para
 * «La Gran Isla de los 70: El Origen del Universo Arcade».
 */

import { PixelverseProgressState } from '../memories/progressionState';
import {
  BROKEN_RELAY_MECHANISM,
  FacingDirection,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  RPG_CHESTS,
  RPG_EXAMINABLES,
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

interface TreeProp {
  x: number;
  y: number;
  scale: number;
  hue: 'emerald' | 'cyan' | 'amber';
}

const CIRCUIT_TREES: TreeProp[] = [
  { x: 640, y: 1060, scale: 1.15, hue: 'emerald' },
  { x: 760, y: 1120, scale: 0.95, hue: 'cyan' },
  { x: 920, y: 1030, scale: 1.22, hue: 'emerald' },
  { x: 1110, y: 1090, scale: 1.05, hue: 'cyan' },
  { x: 1270, y: 1050, scale: 1.18, hue: 'emerald' },
  { x: 630, y: 1350, scale: 1.08, hue: 'cyan' },
  { x: 1020, y: 1390, scale: 1.12, hue: 'emerald' },
  { x: 1185, y: 1320, scale: 0.92, hue: 'amber' },
  { x: 810, y: 1480, scale: 1.0, hue: 'emerald' },
  { x: 2470, y: 1510, scale: 0.96, hue: 'amber' },
  { x: 3040, y: 1510, scale: 1.05, hue: 'amber' },
  { x: 1640, y: 235, scale: 0.92, hue: 'cyan' },
  { x: 2140, y: 220, scale: 0.92, hue: 'cyan' },
];

const CIRCUIT_CONDUIT_SEGMENTS: [{ x: number; y: number }, { x: number; y: number }][] = [
  [{ x: 470, y: 1830 }, { x: 840, y: 1520 }],
  [{ x: 840, y: 1520 }, { x: 980, y: 1260 }],
  [{ x: 980, y: 1260 }, { x: 1865, y: 1340 }],
  [{ x: 1865, y: 1340 }, { x: 2820, y: 1680 }],
  [{ x: 1865, y: 1340 }, { x: 1880, y: 740 }],
];

const NORTH_CONDUIT_SEGMENTS: [{ x: number; y: number }, { x: number; y: number }][] = [
  [{ x: 1880, y: 740 }, { x: 2910, y: 672 }],
  [{ x: 2910, y: 672 }, { x: 2340, y: 380 }],
  [{ x: 2340, y: 380 }, { x: 1940, y: 297 }],
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
    wy + wh >= camY - pad &&
    wy <= camY + vh + pad
  );
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
  const freq = sprinting ? 21 : 14;
  const bob = walking
    ? Math.abs(Math.sin(animT * freq)) * (sprinting ? 3.6 : 2.8)
    : Math.sin(animT * 3.8) * 1.1;
  const stride = walking && !reducedMotion ? Math.round(Math.sin(animT * freq) * 3) : 0;
  const armSwing = walking && !reducedMotion ? Math.round(Math.cos(animT * freq) * 2.5) : 0;
  const interactReach = (opts?.interactAnim ?? 0) > 0 ? 3 : 0;

  ctx.save();
  ctx.translate(Math.round(ax), Math.round(ay - bob));

  // Sombra elíptica de contacto sobre el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(0, 4 + bob, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halo de Lámpara de Fósforo si está activa
  if (opts?.lanternActive) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lGlow = ctx.createRadialGradient(0, -14, 4, 0, -14, 58);
    lGlow.addColorStop(0, 'rgba(250, 204, 21, 0.44)');
    lGlow.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
    lGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(0, -14, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Aura sutil reactiva al traje
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = sprinting ? 0.32 : 0.2;
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, -14, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Botas / piernas animadas en 4 direcciones
  ctx.fillStyle = '#1e293b';
  if (facingDir === 'down' || facingDir === 'up') {
    ctx.fillRect(-7, -5 + Math.max(0, stride), 6, 6 - Math.max(0, stride) * 0.4);
    ctx.fillRect(1, -5 + Math.max(0, -stride), 6, 6 - Math.max(0, -stride) * 0.4);
  } else {
    ctx.fillRect(-5 + stride, -5, 6, 6);
    ctx.fillRect(-1 - stride, -5, 6, 6);
  }

  // Torso pixel-art y cinturón dorado
  ctx.fillStyle = shirt;
  ctx.fillRect(-8, -16, 16, 11);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-8, -7, 16, 2);

  // Detalle dorsal de mochila cuando mira hacia arriba
  if (facingDir === 'up') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -15, 12, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -13, 6, 3);
  }

  // Brazos animados según dirección
  ctx.fillStyle = skin;
  if (facingDir === 'down') {
    ctx.fillRect(-11, -15 + armSwing, 3, 7 + interactReach);
    ctx.fillRect(8, -15 - armSwing, 3, 7 + interactReach);
  } else if (facingDir === 'up') {
    ctx.fillRect(-11, -15 - armSwing, 3, 7);
    ctx.fillRect(8, -15 + armSwing, 3, 7);
  } else if (facingDir === 'right') {
    ctx.fillRect(-2 + armSwing + interactReach, -14, 4, 7);
  } else {
    ctx.fillRect(-2 - armSwing - interactReach, -14, 4, 7);
  }

  // Cabeza y cabello con silueta diferenciada en 4 direcciones
  if (facingDir === 'up') {
    ctx.fillStyle = skin;
    ctx.fillRect(-7, -26, 14, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 13);
    ctx.fillRect(-7, -19, 14, 3);
  } else if (facingDir === 'down') {
    ctx.fillStyle = skin;
    ctx.fillRect(-7, -26, 14, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -32, 18, 7);
    ctx.fillRect(-9, -26, 2, 4);
    ctx.fillRect(7, -26, 2, 4);
    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(-6, -23, 12, 4);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(-5, -23, 5, 1);
    } else {
      ctx.fillStyle = '#05070f';
      ctx.fillRect(-5, -23, 3, 3);
      ctx.fillRect(2, -23, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 1, 1);
      ctx.fillRect(2, -23, 1, 1);
    }
  } else if (facingDir === 'right') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -26, 13, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-8, -32, 16, 7);
    ctx.fillRect(-8, -26, 5, 7);
    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(0, -23, 8, 4);
    } else {
      ctx.fillStyle = '#05070f';
      ctx.fillRect(3, -23, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -23, 1, 1);
    }
  } else {
    ctx.fillStyle = skin;
    ctx.fillRect(-7, -26, 13, 10);
    ctx.fillStyle = hair;
    ctx.fillRect(-8, -32, 16, 7);
    ctx.fillRect(3, -26, 5, 7);
    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(-8, -23, 8, 4);
    } else {
      ctx.fillStyle = '#05070f';
      ctx.fillRect(-6, -23, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -23, 1, 1);
    }
  }

  // Cosmético Corona Estelar del Descubridor
  if (opts?.equippedCosmetic === 'item-manto-arquitecto') {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-6, -36, 12, 4);
    ctx.fillRect(-6, -39, 2, 3);
    ctx.fillRect(-1, -40, 2, 4);
    ctx.fillRect(4, -39, 2, 3);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(-1, -35, 2, 2);
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-15, 6, 30, 6);

  if (!opened) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = reducedMotion ? 0.25 : 0.2 + 0.14 * Math.sin(elapsed * 4 + cx);
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, -4, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Base de madera reforzada y herrajes pixelados
  ctx.fillStyle = opened ? '#451a03' : '#78350f';
  ctx.fillRect(-14, -12, 28, 20);
  ctx.fillStyle = opened ? '#713f12' : '#b45309';
  ctx.fillRect(-12, -10, 24, 16);

  // Tapa del cofre
  if (opened) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-11, -10, 22, 6);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-14, -18, 28, 6);
  } else {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-14, -13, 28, 3);
    ctx.fillRect(-14, -4, 28, 2);
    ctx.fillStyle = accentHex;
    ctx.fillRect(-3, -6, 6, 6);
  }

  ctx.restore();
}

export function drawPixelAvatar(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  facing: 1 | -1,
  walking: boolean,
  t: number,
  skin: string,
  hair: string,
  shirt: string,
  reducedMotion = false
): void {
  drawPixelAvatar4Dir(
    ctx,
    ax,
    ay,
    facing >= 0 ? 'right' : 'left',
    walking,
    false,
    t,
    skin,
    hair,
    shirt,
    { reducedMotion }
  );
}

function drawPongHoverboard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  angle: number,
  riderPresent: boolean,
  t: number,
  skin: string,
  hair: string,
  shirt: string,
  reducedMotion: boolean
): void {
  const hoverY = reducedMotion ? 0 : Math.sin(t * 5.2) * 3;
  ctx.save();
  ctx.translate(Math.round(bx), Math.round(by + hoverY));
  ctx.rotate(angle);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 6, 2, 0, 6, 36);
  glow.addColorStop(0, 'rgba(0, 243, 255, 0.55)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 6, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 14;
  ctx.fillRect(-28, -5, 56, 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(-24, 3, 48, 2);

  if (riderPresent) {
    drawPixelAvatar(ctx, 0, -5, 1, false, t, skin, hair, shirt, reducedMotion);
  }
  ctx.restore();
}

function drawStarShuttle(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  tilt: number,
  canopyOpen: number,
  pilotInside: boolean,
  thrustersOn: boolean,
  skin: string,
  hair: string,
  shirt: string
): void {
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  if (thrustersOn) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 10, 4, 0, 10, 56);
    g.addColorStop(0, 'rgba(0, 243, 255, 0.65)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 10, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#64748b';
  ctx.fillRect(-24, 12, 5, 9);
  ctx.fillRect(19, 12, 5, 9);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-28, 20, 12, 3);
  ctx.fillRect(16, 20, 12, 3);

  if (canopyOpen > 0.05) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(20, 14, Math.round(22 * canopyOpen), 4);
  }

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-44, 3, 88, 11);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-34, -5, 68, 15);
  ctx.fillRect(-20, -13, 40, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-30, -5, 60, 3);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(-32, 3, 64, 3);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-44, 5, 8, 6);
  ctx.fillRect(36, 5, 8, 6);

  if (pilotInside) {
    ctx.fillStyle = hair;
    ctx.fillRect(-5, -20, 10, 3);
    ctx.fillStyle = skin;
    ctx.fillRect(-4, -17, 8, 5);
    ctx.fillStyle = shirt;
    ctx.fillRect(-5, -12, 10, 4);
  }

  const lift = Math.round(-canopyOpen * 9);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.44)';
  ctx.fillRect(-14, -21 + lift, 28, 10);
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-14, -21 + lift, 28, 10);
  ctx.restore();
}

function drawPong1972CabinetWorld(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  restored: boolean,
  t: number
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(0, 18, 64, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = restored ? '#facc15' : '#00f3ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 16, 54, 19, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, -18, 6, 0, -18, 78);
  g.addColorStop(0, restored ? 'rgba(250, 204, 21, 0.45)' : 'rgba(0, 243, 255, 0.35)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -18, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(-24, -56, 48, 70);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-20, -54, 40, 66);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-18, -52, 36, 9);
  ctx.fillStyle = '#111827';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PONG', 0, -45);

  ctx.fillStyle = '#030712';
  ctx.fillRect(-15, -40, 30, 22);
  ctx.fillStyle = '#ffffff';
  const pY = Math.sin(t * 3.8) * 5;
  ctx.fillRect(-12, -33 + pY, 2, 8);
  ctx.fillRect(10, -33 - pY, 2, 8);
  ctx.fillRect(Math.sin(t * 3.8) * 8 - 1, -30 + Math.cos(t * 3.8) * 4, 3, 3);

  ctx.fillStyle = '#334155';
  ctx.fillRect(-9, -10, 18, 16);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-5, -6, 3, 5);
  ctx.fillRect(2, -6, 3, 5);
  ctx.restore();
}

function drawSpaceInvaders1978CabinetWorld(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  restored: boolean,
  unlocked: boolean,
  t: number
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 20, 68, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = restored ? '#39ff14' : unlocked ? '#f97316' : '#64748b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 18, 56, 20, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, -22, 6, 0, -22, 82);
  g.addColorStop(
    0,
    restored
      ? 'rgba(57, 255, 20, 0.42)'
      : unlocked
      ? 'rgba(249, 115, 22, 0.35)'
      : 'rgba(148, 163, 184, 0.16)'
  );
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -22, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#09090b';
  ctx.fillRect(-26, -62, 52, 78);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(-24, -60, 4, 74);
  ctx.fillRect(20, -60, 4, 74);

  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-20, -60, 40, 11);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 6px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INVADERS', 0, -52);

  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(-19, -47, 38, 28);
  ctx.fillStyle = '#020617';
  ctx.fillRect(-14, -44, 28, 22);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-11, -42, 22, 2);
  ctx.fillStyle = '#ffffff';
  const shift = Math.sin(t * 3.2) * 4;
  for (let ix = -8; ix <= 8; ix += 8) {
    ctx.fillRect(ix + shift * 0.4, -36, 4, 3);
  }
  ctx.fillStyle = '#39ff14';
  ctx.fillRect(-10, -27, 4, 2);
  ctx.fillRect(-2, -27, 4, 2);
  ctx.fillRect(6, -27, 4, 2);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-20, -18, 40, 6);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(8, -17, 4, 3);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-10, -9, 20, 19);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-5, -4, 3, 5);
  ctx.fillRect(2, -4, 3, 5);
  ctx.restore();
}

function drawCircuitTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeProp,
  t: number,
  pulseBoost: boolean
): void {
  ctx.save();
  ctx.translate(tree.x, tree.y);
  ctx.scale(tree.scale, tree.scale);

  const leafMain =
    tree.hue === 'emerald'
      ? '#059669'
      : tree.hue === 'cyan'
      ? '#0891b2'
      : '#d97706';
  const leafGlow =
    tree.hue === 'emerald'
      ? '#34d399'
      : tree.hue === 'cyan'
      ? '#22d3ee'
      : '#fbbf24';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.fillRect(-7, -34, 14, 38);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-5, -34, 4, 36);
  ctx.fillStyle = leafGlow;
  ctx.globalAlpha = pulseBoost ? 0.9 : 0.55 + Math.sin(t * 3 + tree.x) * 0.25;
  ctx.fillRect(-1, -32, 2, 30);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(-28, -58, 56, 26);
  ctx.fillStyle = leafMain;
  ctx.fillRect(-24, -72, 48, 28);
  ctx.fillRect(-16, -84, 32, 16);

  ctx.fillStyle = leafGlow;
  ctx.fillRect(-18, -64, 5, 5);
  ctx.fillRect(12, -56, 5, 5);
  ctx.fillRect(-4, -78, 6, 5);
  ctx.restore();
}

function drawDistantLockedIsland(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  rx: number,
  ry: number,
  label: string,
  accent: string,
  motif: '80s' | '90s' | 'future',
  elapsed: number,
  reducedMotion: boolean
): void {
  const floatY = reducedMotion ? 0 : Math.sin(elapsed * 1.4 + ix * 0.01) * 7;
  ctx.save();
  ctx.translate(ix, iy + floatY);

  const mist = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx * 1.45);
  mist.addColorStop(0, 'rgba(15, 23, 42, 0.72)');
  mist.addColorStop(0.6, 'rgba(30, 41, 59, 0.28)');
  mist.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b1329';
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.lineTo(-rx * 0.55, ry * 1.45);
  ctx.lineTo(0, ry * 1.9);
  ctx.lineTo(rx * 0.62, ry * 1.35);
  ctx.lineTo(rx, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#16213e';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = 2;
  if (motif === '80s') {
    ctx.strokeRect(-42, -52, 26, 48);
    ctx.strokeRect(12, -64, 30, 60);
    ctx.beginPath();
    ctx.arc(-4, -22, 20, Math.PI, 0);
    ctx.stroke();
  } else if (motif === '90s') {
    ctx.beginPath();
    ctx.moveTo(-28, -4);
    ctx.lineTo(-10, -68);
    ctx.lineTo(8, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, -42, 16, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -38, 38, 12, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.fillText(label, 0, ry * 0.9);
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
    stars,
    ambientBits,
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

  // 1. Cielo nocturno azul profundo y turquesa cósmico (parallax 0)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
  skyGrad.addColorStop(0, '#020614');
  skyGrad.addColorStop(0.46, '#061a33');
  skyGrad.addColorStop(0.82, '#0b3149');
  skyGrad.addColorStop(1, '#041322');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, vw, vh);

  // Estrellas con parallax multicapa
  for (const s of stars) {
    const sx = (((s.nx * vw * 1.4 - camera.x * s.parallax) % vw) + vw) % vw;
    const sy = (((s.ny * vh * 1.4 - camera.y * s.parallax) % vh) + vh) % vh;
    const alpha = reducedMotion
      ? 0.65
      : 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 2.1 + s.twinkle));
    ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
    ctx.fillRect(Math.round(sx), Math.round(sy), s.size, s.size);
  }

  // Gran Luna Pálida Pixelada + Cordillera lejana en parallax lento
  const moonX = vw * 0.72 - (camera.x / ISLAND_WORLD_W - 0.5) * 140;
  const moonY = vh * 0.18 - (camera.y / ISLAND_WORLD_H - 0.3) * 85;
  ctx.save();
  const moonHalo = ctx.createRadialGradient(moonX, moonY, 24, moonX, moonY, 175);
  moonHalo.addColorStop(0, 'rgba(224, 242, 254, 0.30)');
  moonHalo.addColorStop(0.5, 'rgba(56, 189, 248, 0.10)');
  moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 175, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(Math.round(moonX - 22), Math.round(moonY - 16), 14, 10);
  ctx.fillRect(Math.round(moonX + 10), Math.round(moonY + 8), 16, 12);
  ctx.fillRect(Math.round(moonX - 8), Math.round(moonY + 20), 10, 8);
  ctx.restore();

  // Silueta de cordillera pixelada lejana en el horizonte norte (parallax 0.22)
  const ridgeBaseY = Math.round(vh * 0.42 - camera.y * 0.12);
  if (ridgeBaseY > -40 && ridgeBaseY < vh + 120) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 25, 48, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, vh);
    for (let rx = 0; rx <= vw + 80; rx += 80) {
      const worldSample = rx + camera.x * 0.22;
      const peak =
        Math.sin(worldSample * 0.0045) * 44 + Math.cos(worldSample * 0.011) * 22;
      ctx.lineTo(rx, ridgeBaseY - peak);
    }
    ctx.lineTo(vw, vh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Reflejos oceánicos sutiles en el mar cósmico
  ctx.save();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
  for (let i = 0; i < 18; i++) {
    const wy = ((i * 118 - camera.y * 0.35) % vh + vh) % vh;
    const wx = ((i * 211 - camera.x * 0.25 + (reducedMotion ? 0 : Math.sin(elapsed + i) * 18)) % vw + vw) % vw;
    ctx.fillRect(Math.round(wx), Math.round(wy), 38 + (i % 3) * 18, 2);
  }
  ctx.restore();

  // ================================================================
  // CAPA MUNDO CONTINUO (-camera.x, -camera.y) CON VIEWPORT CULLING
  // ================================================================
  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  // Islas lejanas bloqueadas en el mar de nubes del este
  if (isWorldBoxVisible(3380, 800, 320, 760, camera.x, camera.y, vw, vh, 240)) {
    drawDistantLockedIsland(
      ctx,
      3535,
      920,
      95,
      58,
      invadersRestored || allUnlocked
        ? 'ISLA 1980s · RUTA ACTIVA'
        : 'ISLA 1980s · EN NIEBLA',
      '#f43f5e',
      '80s',
      elapsed,
      reducedMotion
    );
    drawDistantLockedIsland(
      ctx,
      3565,
      1185,
      86,
      52,
      'ISLA 1990s · SELLADA',
      '#a855f7',
      '90s',
      elapsed,
      reducedMotion
    );
    drawDistantLockedIsland(
      ctx,
      3525,
      1445,
      78,
      46,
      'ERAS FUTURAS',
      '#38bdf8',
      'future',
      elapsed,
      reducedMotion
    );
  }

  // Cascadas luminiscentes al vacío cósmico
  const drawCosmicWaterfall = (wx: number, wy: number, wWidth: number, wHeight: number) => {
    if (!isWorldBoxVisible(wx, wy, wWidth, wHeight, camera.x, camera.y, vw, vh)) return;
    const wfGrad = ctx.createLinearGradient(wx, wy, wx, wy + wHeight);
    wfGrad.addColorStop(0, 'rgba(56, 189, 248, 0.78)');
    wfGrad.addColorStop(0.55, 'rgba(0, 243, 255, 0.42)');
    wfGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
    ctx.fillStyle = wfGrad;
    ctx.fillRect(wx, wy, wWidth, wHeight);

    ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
    for (let s = 0; s < 7; s++) {
      const dropY = reducedMotion ? (s * 42) % wHeight : (elapsed * 140 + s * 47) % wHeight;
      ctx.fillRect(wx + ((s * 17) % (wWidth - 4)), wy + dropY, 4, 16);
    }
  };

  drawCosmicWaterfall(2145, 735, 84, 340);
  drawCosmicWaterfall(2285, 735, 62, 310);
  drawCosmicWaterfall(2740, 1915, 96, 280);

  // PASADA 1 DEL TERRENO: Acantilados estratificados inferiores (2.5D)
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (r.surface === 'bridge') continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h + 52, camera.x, camera.y, vw, vh)) continue;

    const cliffDepth = r.zoneId === 'cavernas-codigo' ? 28 : 48;
    ctx.fillStyle = r.zoneId === 'cavernas-codigo' ? '#1e1b4b' : '#2b1608';
    ctx.fillRect(r.x, r.y + r.h - 4, r.w, cliffDepth);
    ctx.fillStyle = r.zoneId === 'cavernas-codigo' ? '#312e81' : '#4a2610';
    ctx.fillRect(r.x + 8, r.y + r.h - 4, r.w - 16, Math.round(cliffDepth * 0.55));
  }

  // PASADA 2 DEL TERRENO: Superficies caminables texturizadas por bioma
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camera.x, camera.y, vw, vh)) continue;

    if (r.surface === 'sand') {
      ctx.fillStyle = '#0f3d3e';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(r.x, r.y + r.h - 42, r.w, 42);
      ctx.fillRect(r.x, r.y, 34, r.h);
      const waveShift = reducedMotion ? 0 : Math.sin(elapsed * 2.8) * 5;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.74)';
      ctx.fillRect(r.x, Math.round(r.y + r.h - 10 + waveShift * 0.4), r.w, 6);
    } else if (r.surface === 'grass' || r.surface === 'circuit') {
      ctx.fillStyle = r.surface === 'circuit' ? '#093028' : '#0f3f30';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Trazas internas de placa madre en suelo de circuito
      if (r.surface === 'circuit') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.09)';
        for (let gx = r.x + 36; gx < r.x + r.w - 24; gx += 72) {
          ctx.fillRect(gx, r.y + 12, 2, r.h - 24);
        }
      }
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else if (r.surface === 'stone') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Peldaños tallados en escalinatas de transición
      if (r.id === 'cumbre-stairway' || r.id === 'ruinas-to-pong' || r.id === 'ruinas-to-garganta') {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.10)';
        for (let sy = r.y + 18; sy < r.y + r.h - 14; sy += 24) {
          ctx.fillRect(r.x + 14, sy, r.w - 28, 4);
        }
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else if (r.surface === 'crystal') {
      ctx.fillStyle = '#171238';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else if (r.surface === 'fortress') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = invadersRestored
        ? 'rgba(57, 255, 20, 0.45)'
        : 'rgba(249, 115, 22, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else if (r.surface === 'pier') {
      ctx.fillStyle = '#1e1b38';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.16)';
      for (let px = r.x + 16; px < r.x + r.w - 12; px += 28) {
        ctx.fillRect(px, r.y + 8, 4, r.h - 16);
      }
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else if (r.surface === 'bridge') {
      const bGrad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y);
      bGrad.addColorStop(0, 'rgba(0, 243, 255, 0.82)');
      bGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.86)');
      bGrad.addColorStop(1, 'rgba(57, 255, 20, 0.82)');
      ctx.fillStyle = bGrad;
      ctx.fillRect(r.x, r.y + 12, r.w, r.h - 24);
      ctx.fillStyle = '#ffffff';
      for (let sx = r.x + 14; sx < r.x + r.w - 10; sx += 26) {
        ctx.fillRect(sx, r.y + 16, 12, r.h - 32);
      }
    }
  }

  // Puente Astral fracturado antes de completar El Sendero del Glitch Perdido
  if (
    !glitchTrailCleared &&
    isWorldBoxVisible(2060, 620, 400, 130, camera.x, camera.y, vw, vh)
  ) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const fx = 2085 + i * 58;
      const fy = 670 + (reducedMotion ? 0 : Math.sin(elapsed * 3.2 + i * 1.4) * 14);
      ctx.strokeStyle = i % 2 === 0 ? '#00f3ff' : '#9d00ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fy, 36, 22);
    }
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#67e8f9';
    ctx.textAlign = 'center';
    ctx.fillText('PUENTE FRACTURADO · ENTRA AL SENDERO DEL GLITCH', 2255, 646);
    ctx.restore();
  }

  if (
    !southShortcutActive &&
    isWorldBoxVisible(860, 1640, 720, 110, camera.x, camera.y, vw, vh)
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3;
    ctx.strokeRect(865, 1665, 710, 60);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Venas de circuito luminoso + paquetes de energía viajando entre santuarios
  const activeSegments = glitchTrailCleared
    ? [...CIRCUIT_CONDUIT_SEGMENTS, ...NORTH_CONDUIT_SEGMENTS]
    : CIRCUIT_CONDUIT_SEGMENTS;

  ctx.save();
  ctx.strokeStyle = pongRestored
    ? 'rgba(0, 243, 255, 0.62)'
    : 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const [a, b] of activeSegments) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  if (!reducedMotion) {
    const pulseProgress = (elapsed * 0.42) % 1;
    ctx.fillStyle = pongRestored ? '#fef08a' : '#00f3ff';
    for (const [a, b] of activeSegments) {
      const px = a.x + (b.x - a.x) * pulseProgress;
      const py = a.y + (b.y - a.y) * pulseProgress;
      if (isWorldBoxVisible(px - 6, py - 6, 12, 12, camera.x, camera.y, vw, vh, 40)) {
        ctx.fillRect(Math.round(px - 3), Math.round(py - 3), 6, 6);
      }
    }
  }
  ctx.restore();

  // Zona 1: Monolitos del Despertar en la playa
  if (isWorldBoxVisible(380, 1700, 170, 110, camera.x, camera.y, vw, vh)) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(390, 1740, 24, 54);
    ctx.fillRect(520, 1715, 18, 42);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(398, 1752, 8, 22);
  }

  // Zona 3: Columnas y Mosaico de las Ruinas del Primer Arcade
  if (isWorldBoxVisible(1580, 1090, 560, 420, camera.x, camera.y, vw, vh)) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1865, 1340, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1865, 1340, 54, 0, Math.PI * 2);
    ctx.stroke();

    const pillarCoords = [
      [1610, 1150],
      [2110, 1150],
      [1610, 1480],
      [2110, 1480],
    ];
    for (const [px, py] of pillarCoords) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(px - 14, py - 46, 28, 52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px - 18, py - 52, 36, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px - 4, py - 34, 8, 22);
    }
    ctx.restore();
  }

  // Zona 7: Cristales gigantes de cuarzo cian y violeta en Las Cavernas del Código
  const crystalSpots = [
    [310, 410, '#a855f7'],
    [450, 395, '#00f3ff'],
    [690, 405, '#c084fc'],
    [890, 520, '#00f3ff'],
    [330, 710, '#a855f7'],
  ] as const;
  for (const [cx, cy, col] of crystalSpots) {
    if (!isWorldBoxVisible(cx - 24, cy - 44, 48, 60, camera.x, camera.y, vw, vh)) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(14, -8);
    ctx.lineTo(8, 12);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-15, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(-3, -28, 4, 22);
    ctx.restore();
  }

  const cavernOpen =
    allUnlocked ||
    progressState.island70s.activatedIslandSwitches.includes('sw-caverna-cristal');
  if (!cavernOpen && isWorldBoxVisible(775, 405, 98, 82, camera.x, camera.y, vw, vh)) {
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.strokeRect(775, 405, 98, 82);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
    ctx.fillRect(775, 405, 98, 82);
    ctx.restore();
  }

  // Zona 2: Criaturas benignas digitales («Pulsos de Fósforo»)
  for (const crit of digitalCritters) {
    const cx = crit.homeX + (reducedMotion ? 0 : Math.sin(elapsed * 1.7 + crit.phase) * 34);
    const cy =
      crit.homeY +
      (reducedMotion
        ? 0
        : Math.cos(elapsed * 1.3 + crit.phase) * 18 -
          Math.abs(Math.sin(elapsed * 5.2 + crit.phase)) * 7);
    if (!isWorldBoxVisible(cx - 10, cy - 10, 20, 20, camera.x, camera.y, vw, vh)) continue;
    ctx.fillStyle = crit.color;
    ctx.fillRect(Math.round(cx - 5), Math.round(cy - 5), 10, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(cx - 3), Math.round(cy - 3), 2, 2);
    ctx.fillRect(Math.round(cx + 1), Math.round(cy - 3), 2, 2);
  }

  // Árboles de circuito con culling
  for (const tree of CIRCUIT_TREES) {
    if (!isWorldBoxVisible(tree.x - 42, tree.y - 96, 84, 110, camera.x, camera.y, vw, vh)) {
      continue;
    }
    drawCircuitTree(ctx, tree, elapsed, pongRestored);
  }

  // Zona 5: Portal espiral a «El Sendero del Glitch Perdido»
  {
    const gp = ISLAND_KEY_COORDS.glitchTrailPortal;
    if (isWorldBoxVisible(gp.x - 54, gp.y - 80, 108, 100, camera.x, camera.y, vw, vh)) {
      ctx.save();
      ctx.translate(gp.x, gp.y);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-42, -64, 14, 72);
      ctx.fillRect(28, -64, 14, 72);
      ctx.fillRect(-46, -72, 92, 12);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = r % 2 === 0 ? '#00f3ff' : '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(
          0,
          -28,
          18 + r * 6,
          28 + r * 4,
          reducedMotion ? 0 : Math.sin(elapsed * 2 + r) * 0.25,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }
  }

  // Zona 6: Plataforma Estelar de Aterrizaje y Nave Estelar
  {
    const pad = ISLAND_KEY_COORDS.starShuttlePad;
    if (isWorldBoxVisible(pad.x - 220, pad.y - 340, 340, 400, camera.x, camera.y, vw, vh)) {
      ctx.save();
      ctx.translate(pad.x, pad.y + 16);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = invadersRestored ? '#00f3ff' : '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 62, 21, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (flight.type === 'shuttle-landing') {
        const p = Math.min(1, flight.elapsed / flight.duration);
        const lp = Math.min(1, p / 0.72);
        const easeOut = 1 - Math.pow(1 - lp, 3);
        const sx = pad.x - 190 * (1 - easeOut);
        const sy = pad.y - 310 * (1 - easeOut);
        const canopy = p > 0.72 ? Math.min(1, (p - 0.72) / 0.16) : 0;
        drawStarShuttle(
          ctx,
          sx,
          sy,
          0.75 + 0.35 * easeOut,
          (1 - easeOut) * 0.16,
          canopy,
          p < 0.78,
          p < 0.7,
          skinColor,
          hairColor,
          shirtColor
        );
      } else if (invadersRestored) {
        drawStarShuttle(
          ctx,
          pad.x,
          pad.y,
          1.1,
          0,
          1,
          false,
          false,
          skinColor,
          hairColor,
          shirtColor
        );
      }
    }
  }

  // Zona 8: Astrolabio de las Eras en La Cumbre del Arquitecto
  {
    const ast = ISLAND_KEY_COORDS.architectAstrolabe;
    if (isWorldBoxVisible(ast.x - 70, ast.y - 70, 140, 110, camera.x, camera.y, vw, vh)) {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 20, 62, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      const rings = [
        { r: 34, on: pongRestored, color: '#facc15', speed: 1.1 },
        { r: 25, on: glitchTrailCleared, color: '#00f3ff', speed: -1.6 },
        { r: 16, on: invadersRestored, color: '#39ff14', speed: 2.2 },
      ];
      for (const ring of rings) {
        ctx.save();
        ctx.translate(0, -24);
        ctx.rotate(reducedMotion ? 0.35 : elapsed * ring.speed);
        ctx.strokeStyle = ring.on ? ring.color : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = ring.on ? 3 : 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.r, ring.r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(-5, -29, 10, 10);
      ctx.restore();
    }
  }

  // Zona 9: Telescopios Astrales
  for (const vista of DISTANT_DECADE_VISTAS) {
    if (!isWorldBoxVisible(vista.x - 20, vista.y - 30, 40, 40, camera.x, camera.y, vw, vh)) {
      continue;
    }
    ctx.save();
    ctx.translate(vista.x, vista.y);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-5, -18, 10, 22);
    ctx.fillStyle = vista.accentHex;
    ctx.fillRect(-8, -24, 22, 7);
    ctx.restore();
  }

  // Pedestales / Interruptores de resonancia
  for (const sw of ISLAND_SWITCHES) {
    if (!isWorldBoxVisible(sw.x - 24, sw.y - 32, 48, 48, camera.x, camera.y, vw, vh)) continue;
    const active = progressState.island70s.activatedIslandSwitches.includes(sw.id);
    ctx.save();
    ctx.translate(sw.x, sw.y);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-12, -16, 24, 22);
    ctx.fillStyle = active ? sw.accentHex : '#64748b';
    ctx.shadowColor = sw.accentHex;
    ctx.shadowBlur = active ? 16 : 4;
    ctx.fillRect(-7, -26, 14, 12);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Sombras del Pasado (Ecos holográficos 1958, 1962, 1971)
  for (const echo of ISLAND_ECHOES) {
    if (!isWorldBoxVisible(echo.x - 26, echo.y - 36, 52, 52, camera.x, camera.y, vw, vh)) continue;
    const discovered = progressState.island70s.discoveredEchoIds.includes(echo.id);
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3.5 + echo.x) * 4;
    ctx.save();
    ctx.translate(echo.x, echo.y + pulse);
    ctx.globalAlpha = discovered ? 0.92 : 0.72;
    ctx.strokeStyle = echo.accentHex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -14, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = echo.accentHex;
    ctx.textAlign = 'center';
    ctx.fillText(String(echo.year), 0, -11);
    ctx.restore();
  }

  // Diamantes de Memoria Cian en el mundo (solo los aún no recolectados)
  for (const dia of ISLAND_DIAMONDS) {
    if (progressState.island70s.collectedDiamondIds.includes(dia.id)) continue;
    if (dia.requiresShortcut && !southShortcutActive) continue;
    if (!isWorldBoxVisible(dia.x - 24, dia.y - 32, 48, 48, camera.x, camera.y, vw, vh)) continue;
    const bob = reducedMotion ? 0 : Math.sin(elapsed * 4.2 + dia.x) * 5;
    ctx.save();
    ctx.translate(dia.x, dia.y + bob);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(0, 243, 255, 0.32)';
    ctx.beginPath();
    ctx.arc(0, -10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(12, -10);
    ctx.lineTo(0, 4);
    ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-3, -18, 5, 7);
    ctx.restore();
  }

  // Gabinetes históricos físicos en la Gran Isla de los 70
  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.pongCabinet.x - 75,
      ISLAND_KEY_COORDS.pongCabinet.y - 80,
      150,
      120,
      camera.x,
      camera.y,
      vw,
      vh
    )
  ) {
    drawPong1972CabinetWorld(
      ctx,
      ISLAND_KEY_COORDS.pongCabinet.x,
      ISLAND_KEY_COORDS.pongCabinet.y,
      pongRestored,
      elapsed
    );
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.invadersCabinet.x - 80,
      ISLAND_KEY_COORDS.invadersCabinet.y - 85,
      160,
      125,
      camera.x,
      camera.y,
      vw,
      vh
    )
  ) {
    drawSpaceInvaders1978CabinetWorld(
      ctx,
      ISLAND_KEY_COORDS.invadersCabinet.x,
      ISLAND_KEY_COORDS.invadersCabinet.y,
      invadersRestored,
      invadersCabinetUnlocked,
      elapsed
    );
  }

  // Tablas voladoras estacionadas dentro de la misma isla de los 70
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

  // Edificios accesibles con arquitectura pixel-art nítida, tejados y puertas
  for (const bldg of ISLAND_70S_BUILDINGS) {
    if (
      !isWorldBoxVisible(
        bldg.x - 24,
        bldg.y - 44,
        bldg.w + 48,
        bldg.h + 70,
        camera.x,
        camera.y,
        vw,
        vh
      )
    ) {
      continue;
    }
    ctx.save();
    // Sombra proyectada del edificio
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fillRect(bldg.x - 6, bldg.y + bldg.h - 4, bldg.w + 12, 16);

    // Muros de piedra/ladrillo pixelados
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bldg.x, bldg.y + 24, bldg.w, bldg.h - 24);
    ctx.strokeStyle = bldg.trimHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(bldg.x + 1, bldg.y + 24, bldg.w - 2, bldg.h - 25);

    // Tejado escalonado estilo RPG clásico GBA
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bldg.x - 8, bldg.y + 8, bldg.w + 16, 22);
    ctx.fillRect(bldg.x + 6, bldg.y - 4, bldg.w - 12, 14);
    ctx.fillStyle = bldg.trimHex;
    ctx.fillRect(bldg.x - 8, bldg.y + 28, bldg.w + 16, 3);

    // Ventanas iluminadas cálidas
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(bldg.x + 18, bldg.y + 44, 22, 18);
    ctx.fillRect(bldg.x + bldg.w - 40, bldg.y + 44, 22, 18);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bldg.x + 28, bldg.y + 44, 2, 18);
    ctx.fillRect(bldg.x + bldg.w - 30, bldg.y + 44, 2, 18);

    // Puerta accesible central + felpudo de piedra
    const dLeft = bldg.doorX - 15;
    ctx.fillStyle = '#475569';
    ctx.fillRect(dLeft - 4, bldg.y + bldg.h, 38, 8);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(dLeft, bldg.y + bldg.h - 34, 30, 34);
    ctx.strokeStyle = bldg.trimHex;
    ctx.strokeRect(dLeft, bldg.y + bldg.h - 34, 30, 34);

    // Rótulo pixelado superior
    ctx.fillStyle = '#090d16';
    ctx.fillRect(bldg.doorX - 38, bldg.y + 12, 76, 13);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bldg.signText, bldg.doorX, bldg.y + 21);
    ctx.restore();
  }

  // Entrada oculta tras la cascada en La Garganta del Invasor
  if (
    isWorldBoxVisible(
      WATERFALL_SECRET_ENTRANCE.x - 32,
      WATERFALL_SECRET_ENTRANCE.y - 32,
      64,
      64,
      camera.x,
      camera.y,
      vw,
      vh
    )
  ) {
    const discoveredWf =
      progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
    ctx.save();
    ctx.translate(WATERFALL_SECRET_ENTRANCE.x, WATERFALL_SECRET_ENTRANCE.y);
    ctx.fillStyle = discoveredWf ? 'rgba(8, 12, 28, 0.88)' : 'rgba(14, 165, 233, 0.24)';
    ctx.fillRect(-16, -24, 32, 28);
    ctx.strokeStyle = discoveredWf ? '#c084fc' : 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -24, 32, 28);
    ctx.restore();
  }

  // Navío Astral en El Puerto de las Islas Perdidas (Rumbo Isla Neón 1980s)
  if (
    isWorldBoxVisible(
      HARBOR_80S_FERRY.x - 60,
      HARBOR_80S_FERRY.y - 45,
      120,
      90,
      camera.x,
      camera.y,
      vw,
      vh
    )
  ) {
    const ferryReady =
      invadersRestored ||
      allUnlocked ||
      progressState.rpg.unlockedIslands.includes('island-80s');
    const bobFerry = reducedMotion ? 0 : Math.sin(elapsed * 2.4) * 3;
    ctx.save();
    ctx.translate(HARBOR_80S_FERRY.x, Math.round(HARBOR_80S_FERRY.y + bobFerry));
    ctx.fillStyle = ferryReady ? '#881337' : '#1e293b';
    ctx.fillRect(-42, -12, 84, 24);
    ctx.fillStyle = ferryReady ? '#f43f5e' : '#475569';
    ctx.fillRect(-34, -22, 68, 12);
    ctx.fillStyle = ferryReady ? '#00f3ff' : '#64748b';
    ctx.fillRect(-26, -18, 52, 4);
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(ferryReady ? 'NAVÍO 1980s' : 'MUELLE SELLADO', 0, 5);
    ctx.restore();
  }

  // Relé Auxiliar averiado / reparado en las Ruinas Sur
  if (
    isWorldBoxVisible(
      BROKEN_RELAY_MECHANISM.x - 24,
      BROKEN_RELAY_MECHANISM.y - 28,
      48,
      48,
      camera.x,
      camera.y,
      vw,
      vh
    )
  ) {
    const repaired = progressState.rpg.repairedMechanismIds.includes(
      BROKEN_RELAY_MECHANISM.id
    );
    ctx.save();
    ctx.translate(BROKEN_RELAY_MECHANISM.x, BROKEN_RELAY_MECHANISM.y);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-14, -22, 28, 28);
    ctx.strokeStyle = repaired ? '#10b981' : '#f97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -22, 28, 28);
    ctx.fillStyle = repaired ? '#34d399' : Math.sin(elapsed * 10) > 0 ? '#fb923c' : '#7c2d12';
    ctx.fillRect(-8, -16, 16, 10);
    ctx.restore();
  }

  // Cofres del tesoro en el exterior de la Isla 70s
  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(chest.x - 24, chest.y - 24, 48, 48, camera.x, camera.y, vw, vh)) {
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

  // NPCs expresivos de la isla
  for (const npc of ISLAND_NPCS) {
    if (!isWorldBoxVisible(npc.x - 20, npc.y - 36, 40, 48, camera.x, camera.y, vw, vh)) continue;
    const nbob = reducedMotion ? 0 : Math.sin(elapsed * 3.4 + npc.x) * 2;
    ctx.save();
    ctx.translate(npc.x, Math.round(npc.y + nbob));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-8, -28, 16, 6);
    ctx.fillStyle = '#fde2c8';
    ctx.fillRect(-6, -22, 12, 8);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-4, -20, 2, 2);
    ctx.fillRect(2, -20, 2, 2);
    ctx.fillStyle = npc.palette.primary;
    ctx.fillRect(-8, -14, 16, 13);
    ctx.restore();
  }

  // Jugador Pixel con animaciones en 4 direcciones (o montado sobre la Tabla de Pong)
  if (flight.type === 'pong-to-garganta' || flight.type === 'garganta-to-pong') {
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
  } else if (
    flight.type !== 'shuttle-landing' ||
    flight.elapsed / flight.duration >= 0.72
  ) {
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
    );
  }

  // Onda de pulso del Escáner de Secretos TTL [R]
  if (scannerPulse && scannerPulse.active) {
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = 24 + pRatio * 480;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 243, 255, ${(1 - pRatio) * 0.85})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 10, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Marcar cofres cerrados, entrada tras cascada y grabados cercanos dentro del radio
    const secretTargets: { x: number; y: number; tag: string }[] = [
      {
        x: WATERFALL_SECRET_ENTRANCE.x,
        y: WATERFALL_SECRET_ENTRANCE.y,
        tag: '¡SECRETO TRAS CASCADA!',
      },
      ...RPG_CHESTS.filter(
        (c) =>
          c.areaId === 'exterior-70s' &&
          !progressState.rpg.openedChestIds.includes(c.id)
      ).map((c) => ({ x: c.x, y: c.y, tag: 'COFRE DETECTADO' })),
      ...RPG_EXAMINABLES.filter((ex) => ex.areaId === 'exterior-70s').map((ex) => ({
        x: ex.x,
        y: ex.y,
        tag: 'PISTA ANTIGUA',
      })),
    ];

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const st of secretTargets) {
      if (Math.hypot(st.x - player.x, st.y - player.y) <= radius + 30) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillText(`◆ ${st.tag}`, st.x, st.y - 34);
      }
    }
    ctx.restore();
  }

  // Indicador flotante sobre el elemento interactivo cercano
  if (prompt && flight.type === 'none') {
    const py = prompt.y - 54 + (reducedMotion ? 0 : Math.sin(elapsed * 5) * 3);
    ctx.save();
    ctx.font = '700 11px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = ctx.measureText(badgeText).width + 18;
    ctx.fillStyle = 'rgba(4, 9, 24, 0.88)';
    ctx.fillRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.strokeStyle = prompt.accentHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, prompt.x, py + 1);
    ctx.restore();
  }

  // Partículas ambientales (con culling de cámara) y estallidos de recolección
  for (const b of ambientBits) {
    const by =
      (((b.y + (reducedMotion ? 0 : elapsed * b.vy)) % ISLAND_WORLD_H) + ISLAND_WORLD_H) %
      ISLAND_WORLD_H;
    const bx = b.x + (reducedMotion ? 0 : Math.sin(elapsed * 1.4 + b.phase) * 18);
    if (!isWorldBoxVisible(bx, by, 4, 4, camera.x, camera.y, vw, vh, 24)) continue;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(Math.round(bx), Math.round(by), 3, 3);
  }
  ctx.globalAlpha = 1;

  for (const pb of pickupBursts) {
    ctx.globalAlpha = Math.max(0, pb.life / 0.55);
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 5, 5);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Tinte atmosférico regional según la zona activa
  if (activeZoneId) {
    ctx.fillStyle = ISLAND_ZONES[activeZoneId].ambientTint;
    ctx.fillRect(0, 0, vw, vh);
  }
}
