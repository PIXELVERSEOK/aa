/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renderizador pixel-art cenital para Interiores Accesibles, Salas tras Paredes Falsas,
 * Grutas Subterráneas con Iluminación Dinámica (Lámpara de Fósforo) y la
 * Isla Neón 1980s (Muelle de las Vigas Rojas).
 */

import {
  drawGuardianCreatureSprite,
  drawPixelAvatar4Dir,
  drawRpgTreasureChest,
  IslandPickupBurst,
  IslandPromptRenderSpec,
} from '../island/island70sRenderer';
import { MUSEUM_1970S_EXHIBITS } from '../memories/historicalCatalog';
import { PixelverseProgressState } from '../memories/progressionState';
import {
  evaluateTimeMachineStatus,
  FacingDirection,
  GUARDIAN_CREATURES,
  LABYRINTH_RGB_PILLARS,
  LABYRINTH_SECRET_DOOR,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  RPG_SUBAREA_NPCS,
  SubAreaSpec,
} from './rpgContent';

export interface SubAreaRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  area: SubAreaSpec;
  elapsed: number;
  reducedMotion: boolean;
  player: {
    x: number;
    y: number;
    facingDir: FacingDirection;
    walking: boolean;
    sprinting: boolean;
    interactAnim: number;
  };
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  steppedTileOrder: number[];
  activeRgbPillars?: number[];
  pickupBursts: IslandPickupBurst[];
  prompt: IslandPromptRenderSpec | null;
  scannerPulse: { active: boolean; elapsed: number };
}

export function renderSubAreaFrame(params: SubAreaRenderParams): void {
  const {
    ctx,
    vw,
    vh,
    area,
    elapsed,
    reducedMotion,
    player,
    skinColor,
    hairColor,
    shirtColor,
    progressState,
    allUnlocked,
    steppedTileOrder,
    activeRgbPillars = [],
    pickupBursts,
    prompt,
    scannerPulse,
  } = params;

  ctx.imageSmoothingEnabled = false;

  // Fondo exterior de la sala o mar estelar 80s
  if (area.id === 'island-80s') {
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, '#090318');
    grad.addColorStop(0.5, '#1e0b36');
    grad.addColorStop(1, '#09051a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // Sol retrowave pixelado en el horizonte de los 80
    const sunX = vw * 0.76;
    const sunY = Math.max(92, vh * 0.16);
    ctx.save();
    const sunGrad = ctx.createLinearGradient(sunX, sunY - 48, sunX, sunY + 48);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.55, '#f97316');
    sunGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e0b36';
    for (let sy = sunY + 6; sy < sunY + 46; sy += 9) {
      ctx.fillRect(sunX - 50, sy, 100, 3);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#030612';
    ctx.fillRect(0, 0, vw, vh);
  }

  // Cámara centrada o desplazable suavemente según tamaño del recinto
  const camX =
    area.width <= vw
      ? -(vw - area.width) * 0.5
      : Math.max(-40, Math.min(area.width - vw + 40, player.x - vw * 0.5));
  const camY =
    area.height <= vh
      ? -(vh - area.height) * 0.5
      : Math.max(-40, Math.min(area.height - vh + 40, player.y - vh * 0.5));

  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  const wb = area.walkableBounds;

  // Muros perimetrales o plataforma de isla 80s
  ctx.fillStyle = area.wallHex;
  ctx.fillRect(0, 0, area.width, area.height);
  ctx.strokeStyle = area.borderHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, area.width - 8, area.height - 8);

  // Suelo cuadriculado nítido estilo GBA
  ctx.fillStyle = area.floorHex;
  ctx.fillRect(wb.x, wb.y, wb.w, wb.h);

  ctx.strokeStyle = area.floorGridHex;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = wb.x; gx <= wb.x + wb.w; gx += 32) {
    ctx.moveTo(gx, wb.y);
    ctx.lineTo(gx, wb.y + wb.h);
  }
  for (let gy = wb.y; gy <= wb.y + wb.h; gy += 32) {
    ctx.moveTo(wb.x, gy);
    ctx.lineTo(wb.x + wb.w, gy);
  }
  ctx.stroke();

  ctx.strokeStyle = area.borderHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

  // Muro Falso en el Taller Analógico (grieta sutil o puerta secreta abierta)
  if (area.id === 'interior-taller-alcorn') {
    const wallOpened =
      allUnlocked ||
      progressState.rpg.discoveredSecretIds.includes('secret-muro-taller');
    ctx.save();
    if (wallOpened) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(360, wb.y - 34, 40, 36);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(360, wb.y - 34, 40, 36);
      ctx.fillStyle = '#22d3ee';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('1958 ↑', 380, wb.y - 14);
    } else {
      // Grieta sutil en mampostería para observadores atentos
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(374, wb.y - 24);
      ctx.lineTo(381, wb.y - 14);
      ctx.lineTo(376, wb.y - 6);
      ctx.lineTo(384, wb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cortina de agua luminiscente en la salida sur de la Gruta tras la Cascada
  if (area.id === 'cave-gruta-cascada') {
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.fillRect(348, wb.y + wb.h - 8, 84, 26);
    ctx.fillStyle = '#e0f2fe';
    for (let i = 0; i < 5; i++) {
      const drop = reducedMotion ? i * 4 : ((elapsed * 45 + i * 9) % 20);
      ctx.fillRect(356 + i * 16, wb.y + wb.h - 6 + drop, 4, 6);
    }
    ctx.restore();
  }

  // Compuerta Norte hacia la Sala Secreta de Breakout (1976) en el Laberinto de Señales
  if (area.id === 'dungeon-laberinto-origen') {
    const rgbSolved =
      allUnlocked ||
      progressState.rpg.solvedPuzzleIds.includes(LABYRINTH_SECRET_DOOR.puzzleId);
    const dx = LABYRINTH_SECRET_DOOR.x;
    const dy = wb.y - 34;
    ctx.save();
    ctx.fillStyle = rgbSolved ? '#04121f' : '#1e1324';
    ctx.fillRect(dx - 26, dy, 52, 36);
    ctx.strokeStyle = rgbSolved ? '#22d3ee' : '#f97316';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(dx - 26, dy, 52, 36);
    ctx.fillStyle = rgbSolved ? '#22d3ee' : '#fb923c';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rgbSolved ? '1976 ↑' : 'SELLADO', dx, dy + 21);
    ctx.restore();
  }

  // Alfombras / portales de salida
  for (const ex of area.exits) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(ex.x - 24, ex.y - 10, 48, 18);
    ctx.strokeStyle = ex.accentHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x - 24, ex.y - 10, 48, 18);
    ctx.restore();
  }

  // Losetas de presión reactivas (Acertijo del Templo Pionero)
  if (area.pressurePuzzle) {
    const puzzleSolved =
      allUnlocked ||
      progressState.rpg.solvedPuzzleIds.includes(area.pressurePuzzle.puzzleId);
    for (const tile of area.pressurePuzzle.tiles) {
      const active =
        puzzleSolved || steppedTileOrder.includes(tile.orderIndex);
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.fillStyle = active ? tile.accentHex : '#1e293b';
      ctx.fillRect(-18, -18, 36, 36);
      ctx.strokeStyle = active ? '#ffffff' : tile.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.fillStyle = active ? '#020617' : '#e2e8f0';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tile.label, 0, 4);
      ctx.restore();
    }
  }

  // Mobiliario, cristales, estanques y el gabinete Donkey Kong 1981 en Isla 80s
  for (const prop of area.decorProps) {
    ctx.save();
    if (prop.kind === 'workbench' || prop.kind === 'archive-shelf') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(prop.x + 8, prop.y + 8, prop.w - 16, 6);
      if (prop.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y + prop.h - 10);
      }
    } else if (prop.kind === 'crt-rack' || prop.kind === 'oscilloscope-altar') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(prop.x + prop.w / 2, prop.y + prop.h / 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#39ff14';
      ctx.beginPath();
      ctx.moveTo(prop.x + prop.w / 2 - 9, prop.y + prop.h / 2 + 2);
      ctx.quadraticCurveTo(
        prop.x + prop.w / 2,
        prop.y + prop.h / 2 - 9 * Math.sin(elapsed * 3),
        prop.x + prop.w / 2 + 9,
        prop.y + prop.h / 2 + 2
      );
      ctx.stroke();
    } else if (prop.kind === 'underground-pool') {
      ctx.fillStyle = '#083344';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
      const rip = reducedMotion ? 8 : 8 + Math.sin(elapsed * 3) * 6;
      ctx.fillRect(prop.x + 18, prop.y + rip, prop.w - 36, 4);
    } else if (prop.kind === 'cave-crystal') {
      ctx.translate(prop.x + prop.w / 2, prop.y + prop.h);
      ctx.fillStyle = prop.accentHex;
      ctx.beginPath();
      ctx.moveTo(0, -prop.h);
      ctx.lineTo(prop.w / 2, -prop.h * 0.35);
      ctx.lineTo(prop.w * 0.3, 0);
      ctx.lineTo(-prop.w * 0.3, 0);
      ctx.lineTo(-prop.w / 2, -prop.h * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (prop.kind === 'astral-ferry') {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NAVÍO 70s', prop.x + prop.w / 2, prop.y + prop.h / 2 + 3);
    } else if (prop.kind === 'neon-arch') {
      ctx.fillStyle = '#311042';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PASEO NEÓN 80s', prop.x + prop.w / 2, prop.y + 23);
    } else if (prop.kind === 'dk-cabinet-1981') {
      const dkDone =
        allUnlocked || Boolean(progressState.games['donkey-kong']?.memoryUnlocked);
      const cx = prop.x;
      const cy = prop.y;
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 52, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dkDone ? '#39ff14' : '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Gabinete azul celeste clásico de 1981 con vigas rojas en pantalla
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(cx - 24, cy - 64, 48, 70);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx - 20, cy - 60, 40, 11);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 6px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('1981 KONG', cx, cy - 52);

      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - 16, cy - 45, 32, 24);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(cx - 13, cy - 40, 26, 3);
      ctx.fillRect(cx - 13, cy - 32, 26, 3);
      ctx.fillRect(cx - 13, cy - 25, 26, 3);
    } else if (prop.kind === 'temporal-conduit') {
      const pulse = reducedMotion ? 0.75 : 0.55 + Math.sin(elapsed * 3.6 + prop.x * 0.02) * 0.35;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1b263b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#d8be88';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Núcleo conductor vertical con anillos de latón y pulso cian/violeta
      ctx.fillStyle = '#09111f';
      ctx.fillRect(prop.x + 10, prop.y + 8, prop.w - 20, prop.h - 16);
      ctx.globalAlpha = Math.max(0.25, pulse);
      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(prop.x + 14, prop.y + 12, prop.w - 28, prop.h - 24);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#d8be88';
      for (let ry = prop.y + 14; ry < prop.y + prop.h - 12; ry += 14) {
        ctx.fillRect(prop.x + 6, ry, prop.w - 12, 3);
      }
      if (prop.label) {
        ctx.fillStyle = '#f8f5e6';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 6);
      }
    } else if (prop.kind === 'time-machine-core') {
      const tm = evaluateTimeMachineStatus(progressState, allUnlocked);
      const cx = Math.round(prop.x + prop.w / 2);
      const cy = Math.round(prop.y + prop.h / 2);
      const spinSpeed =
        tm.stageNumber === 4 ? 2.1 : tm.stageNumber === 3 ? 1.15 : tm.stageNumber === 2 ? 0.45 : 0.12;
      const rot = reducedMotion ? 0.35 : elapsed * spinSpeed;

      // Plataforma circular escalonada de obsidiana y bronce arqueológico
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 28, 86, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#d8be88';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#131d31';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, 72, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bastidor principal de El Cronoscopio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 4, prop.y - 4, prop.w + 8, prop.h + 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#d8be88';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Columnas laterales de bobinas de cobre
      ctx.fillStyle = '#784820';
      ctx.fillRect(prop.x + 8, prop.y + 10, 16, prop.h - 20);
      ctx.fillRect(prop.x + prop.w - 24, prop.y + 10, 16, prop.h - 20);
      ctx.fillStyle = '#eab308';
      for (let by = prop.y + 16; by < prop.y + prop.h - 16; by += 12) {
        ctx.fillRect(prop.x + 6, by, 20, 3);
        ctx.fillRect(prop.x + prop.w - 26, by, 20, 3);
      }

      // Cámara central de apertura temporal
      ctx.fillStyle = '#040814';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Anillos astrolábicos contrarrotatorios según etapa (1..4)
      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(rot);
      ctx.strokeStyle = tm.stageNumber >= 2 ? '#d8be88' : '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -22, 44, 44);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(-rot * 1.35);
      ctx.strokeStyle = tm.canTravelTo80s
        ? '#00f3ff'
        : tm.stageNumber >= 3
        ? '#38bdf8'
        : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(-15, -15, 30, 30);
      ctx.restore();

      // Vórtice luminoso cuando la Etapa 4 está lista para viajar a 1980s
      if (tm.canTravelTo80s) {
        const glowR = reducedMotion ? 13 : 11 + Math.sin(elapsed * 5) * 3;
        const vGrad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy - 4, glowR + 10);
        vGrad.addColorStop(0, '#ffffff');
        vGrad.addColorStop(0.45, '#00f3ff');
        vGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = vGrad;
        ctx.beginPath();
        ctx.arc(cx, cy - 4, glowR + 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = tm.syncedCount > 0 ? '#38bdf8' : '#334155';
        ctx.fillRect(cx - 4, cy - 8, 8, 8);
      }

      // 4 Indicadores reales de subsistemas en el frontal inferior del Cronoscopio
      const modules = [
        { ok: tm.pongReady, hex: '#facc15', tag: '72' },
        { ok: tm.glitchReady, hex: '#00f3ff', tag: 'GL' },
        { ok: tm.invadersReady, hex: '#39ff14', tag: '78' },
        { ok: tm.archaeologyReady, hex: '#c084fc', tag: 'ARQ' },
      ];
      modules.forEach((mod, idx) => {
        const mx = prop.x + 28 + idx * 28;
        const my = prop.y + prop.h - 20;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(mx - 1, my - 1, 22, 14);
        ctx.fillStyle = mod.ok ? mod.hex : '#1e293b';
        ctx.fillRect(mx, my, 20, 12);
        ctx.fillStyle = mod.ok ? '#050811' : '#94a3b8';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(mod.tag, mx + 10, my + 9);
      });

      // Placa superior con etapa del Cronoscopio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(cx - 64, prop.y - 16, 128, 15);
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#d8be88';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 64, prop.y - 16, 128, 15);
      ctx.fillStyle = tm.canTravelTo80s ? '#fde047' : '#f8f5e6';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        tm.canTravelTo80s
          ? 'CRONOSCOPIO · SALTO 1980s LISTO'
          : `CRONOSCOPIO · ETAPA ${tm.stageNumber}/4`,
        cx,
        prop.y - 6
      );
    } else if (prop.kind === 'labyrinth-wall') {
      // Muro biselado basáltico-cobre con traza luminosa en el Laberinto de Señales
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(prop.x + 4, prop.y + 6, prop.w, prop.h);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#334155';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 8);
      ctx.fillStyle = prop.accentHex;
      ctx.globalAlpha = 0.65;
      if (prop.h > prop.w) {
        ctx.fillRect(prop.x + Math.floor(prop.w / 2) - 1, prop.y + 12, 2, prop.h - 24);
      } else {
        ctx.fillRect(prop.x + 12, prop.y + Math.floor(prop.h / 2) - 1, prop.w - 24, 2);
      }
      ctx.globalAlpha = 1;
    } else if (prop.kind === 'rgb-frequency-pillar') {
      const rgbSolved =
        allUnlocked ||
        progressState.rpg.solvedPuzzleIds.includes('puzzle-laberinto-rgb-1976');
      const matchingSpec = LABYRINTH_RGB_PILLARS.find(
        (p) => Math.abs(p.x - (prop.x + prop.w / 2)) < 24 && Math.abs(p.y - (prop.y + prop.h / 2)) < 24
      );
      const isLit =
        rgbSolved ||
        (matchingSpec ? activeRgbPillars.includes(matchingSpec.stepOrder) : false);
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(prop.x - 4, prop.y + prop.h - 4, prop.w + 8, 8);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = isLit ? '#ffffff' : prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      ctx.fillStyle = isLit ? prop.accentHex : '#0f172a';
      ctx.fillRect(prop.x + 7, prop.y + 7, prop.w - 14, prop.h - 14);
      if (isLit) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }
    } else if (prop.kind === 'breakout-cabinet-1976') {
      const brkDone =
        allUnlocked || Boolean(progressState.games['breakout']?.memoryUnlocked);
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h;
      ctx.fillStyle = '#17122b';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4, 48, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = brkDone ? '#39ff14' : '#f97316';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gabinete upright Atari Breakout (1976) con bisel blanco/madera y 4 franjas CRT
      ctx.fillStyle = '#070b14';
      ctx.fillRect(cx - 24, cy - 68, 48, 66);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cx - 22, cy - 66, 44, 62);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 18, cy - 52, 36, 46);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 18, cy - 64, 36, 9);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 6px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT', cx, cy - 57);

      const bands = ['#ef4444', '#f97316', '#22c55e', '#facc15'];
      bands.forEach((bHex, idx) => {
        ctx.fillStyle = bHex;
        ctx.fillRect(cx - 14, cy - 46 + idx * 4, 28, 3);
      });
      const bx = Math.round(Math.sin(elapsed * 4.2) * 9);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(cx - 6 + Math.round(bx * 0.5), cy - 22, 12, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + bx - 1, cy - 28, 3, 3);
    } else if (prop.kind === 'vector-projector') {
      const vecSolved =
        allUnlocked ||
        progressState.rpg.solvedPuzzleIds.includes('puzzle-museo-vector-79');
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = vecSolved ? '#39ff14' : '#a78bfa';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      // Pantalla vectorial XY
      ctx.strokeStyle = vecSolved ? '#22d3ee' : '#a78bfa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const rot = reducedMotion ? 0.4 : elapsed * (vecSolved ? 1.8 : 0.6);
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        const px = cx + Math.cos(a) * 14;
        const py = cy + Math.sin(a) * 11;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      if (prop.label) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    } else if (prop.kind === 'museum-pedestal') {
      const exhibit = MUSEUM_1970S_EXHIBITS.find((e) => e.id === prop.exhibitId);
      const isPlayable = exhibit?.mode === 'playable';
      const gameId = exhibit?.linkedGameId;
      const isEncryptedBreakout =
        gameId === 'breakout' &&
        !allUnlocked &&
        !progressState.games['breakout']?.memoryUnlocked &&
        !progressState.rpg.discoveredSecretIds.includes('secret-sala-breakout-1976');
      const isRestored =
        allUnlocked ||
        (gameId
          ? Boolean(progressState.games[gameId]?.memoryUnlocked)
          : progressState.rpg.inspectedExhibitIds.includes(prop.exhibitId || ''));

      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;

      // Sombra y zócalo de museo
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(prop.x - 4, prop.y + prop.h - 2, prop.w + 8, 8);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = isEncryptedBreakout ? '#1e1b2e' : '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = isEncryptedBreakout
        ? '#64748b'
        : isRestored
        ? prop.accentHex
        : 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = isPlayable ? 2.5 : 1.5;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      // Vitrina / Holograma específico de cada hito de los años 70
      ctx.fillStyle = '#050a14';
      ctx.fillRect(prop.x + 8, prop.y + 6, prop.w - 16, 24);
      if (isEncryptedBreakout) {
        ctx.fillStyle = '#f97316';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('? 1976', cx, prop.y + 22);
      } else if (prop.exhibitId === 'exhibit-pong-1972') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 14, prop.y + 12, 2, 10);
        ctx.fillRect(cx + 12, prop.y + 12, 2, 10);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(cx - 2, prop.y + 16, 4, 4);
      } else if (prop.exhibitId === 'exhibit-breakout-1976') {
        const cols = ['#ef4444', '#f97316', '#22c55e', '#facc15'];
        cols.forEach((cHex, i) => {
          ctx.fillStyle = cHex;
          ctx.fillRect(cx - 16, prop.y + 9 + i * 3, 32, 2);
        });
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(cx - 6, prop.y + 25, 12, 2);
      } else if (prop.exhibitId === 'exhibit-space-invaders-1978') {
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(cx - 7, prop.y + 12, 14, 6);
        ctx.fillRect(cx - 9, prop.y + 18, 3, 3);
        ctx.fillRect(cx + 6, prop.y + 18, 3, 3);
      } else if (
        prop.exhibitId === 'exhibit-lunar-lander-1979' ||
        prop.exhibitId === 'exhibit-asteroids-1979'
      ) {
        ctx.strokeStyle = prop.accentHex;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, prop.y + 10);
        ctx.lineTo(cx + 9, prop.y + 25);
        ctx.lineTo(cx, prop.y + 21);
        ctx.lineTo(cx - 9, prop.y + 25);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.fillStyle = prop.accentHex;
        ctx.fillRect(cx - 10, prop.y + 13, 20, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, prop.y + 16, 6, 4);
      }

      // Indicador frontal: JUGABLE vs EXHIBICIÓN
      ctx.fillStyle = isPlayable ? prop.accentHex : '#94a3b8';
      ctx.fillRect(prop.x + 10, prop.y + prop.h - 9, prop.w - 20, 4);

      if (prop.label) {
        ctx.fillStyle = isRestored ? '#ffffff' : '#cbd5e1';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    }
    ctx.restore();
  }

  // Cofres dentro de la sub-área
  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== area.id) continue;
    const opened = progressState.rpg.openedChestIds.includes(chest.id);
    const lockedByPuzzle =
      chest.requiresPuzzleId &&
      !allUnlocked &&
      !progressState.rpg.solvedPuzzleIds.includes(chest.requiresPuzzleId);

    drawRpgTreasureChest(
      ctx,
      chest.x,
      chest.y,
      opened,
      lockedByPuzzle ? '#64748b' : chest.accentHex,
      elapsed,
      reducedMotion
    );

    if (lockedByPuzzle && !opened) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(chest.x - 19, chest.y - 18, 38, 30);
      ctx.restore();
    }
  }

  // NPCs originales dentro de la sub-área
  for (const npc of RPG_SUBAREA_NPCS) {
    if (npc.areaId !== area.id) continue;
    drawPixelAvatar4Dir(
      ctx,
      npc.x,
      npc.y,
      npc.facing,
      false,
      false,
      elapsed + npc.x * 0.01,
      '#fde2c8',
      npc.palette.secondary,
      npc.palette.primary,
      { reducedMotion }
    );
  }

  // Criaturas guardianas dentro de sub-áreas (ej. Sincro-76 en el Laberinto de Señales)
  for (const creature of GUARDIAN_CREATURES) {
    if (creature.areaId !== area.id) continue;
    const calmed =
      allUnlocked || progressState.rpg.calmedCreatureIds.includes(creature.id);
    drawGuardianCreatureSprite(ctx, creature, calmed, elapsed, reducedMotion);
  }

  // Jugador Pixel con sprite en 4 direcciones
  drawPixelAvatar4Dir(
    ctx,
    player.x,
    player.y,
    player.facingDir,
    player.walking,
    player.sprinting,
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

  // Halos HD-2D RGB sutiles en interiores luminosos y Museo Viviente
  if (!area.isDarkCave) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const prop of area.decorProps) {
      if (
        prop.kind === 'museum-pedestal' ||
        prop.kind === 'breakout-cabinet-1976' ||
        prop.kind === 'vector-projector' ||
        prop.kind === 'time-machine-core'
      ) {
        const lx = prop.x + prop.w / 2;
        const ly = prop.y + prop.h / 2;
        const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 68);
        g.addColorStop(0, 'rgba(34, 211, 238, 0.11)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, 68, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Penumbra de caverna subterránea perforada dinámicamente por la Lámpara de Fósforo
  if (area.isDarkCave) {
    const lanternLit = progressState.rpg.lanternActive || allUnlocked;
    const lightRadius = lanternLit ? 215 : 82;
    ctx.save();
    const darkGrad = ctx.createRadialGradient(
      player.x,
      player.y - 12,
      lightRadius * 0.28,
      player.x,
      player.y - 12,
      lightRadius
    );
    darkGrad.addColorStop(0, 'rgba(5, 4, 15, 0)');
    darkGrad.addColorStop(0.65, lanternLit ? 'rgba(5, 4, 15, 0.42)' : 'rgba(5, 4, 15, 0.78)');
    darkGrad.addColorStop(1, 'rgba(3, 2, 10, 0.94)');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, area.width, area.height);
    ctx.restore();
  }

  // Onda de pulso del Escáner de Secretos TTL [R] dentro de interiores
  if (scannerPulse.active) {
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = 20 + pRatio * 380;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 243, 255, ${(1 - pRatio) * 0.9})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 10, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const ex of RPG_EXAMINABLES) {
      if (ex.areaId !== area.id) continue;
      if (Math.hypot(ex.x - player.x, ex.y - player.y) <= radius + 24) {
        ctx.fillStyle = ex.isFalseWall ? '#fde047' : '#00f3ff';
        ctx.fillText(
          ex.isFalseWall ? '★ ¡PARED FALSA DETECTADA!' : '◆ PISTA',
          ex.x,
          ex.y + 24
        );
      }
    }
    for (const ch of RPG_CHESTS) {
      if (ch.areaId !== area.id || progressState.rpg.openedChestIds.includes(ch.id)) {
        continue;
      }
      if (Math.hypot(ch.x - player.x, ch.y - player.y) <= radius + 24) {
        ctx.fillStyle = '#39ff14';
        ctx.fillText('◆ COFRE OCULTO', ch.x, ch.y - 26);
      }
    }
    ctx.restore();
  }

  // Partículas de recolección / apertura de cofre
  for (const pb of pickupBursts) {
    ctx.globalAlpha = Math.max(0, pb.life / 0.55);
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 5, 5);
  }
  ctx.globalAlpha = 1;

  // Etiqueta contextual de acción [E]
  if (prompt) {
    const py = prompt.y - 48 + (reducedMotion ? 0 : Math.sin(elapsed * 5) * 3);
    ctx.save();
    ctx.font = '700 11px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = ctx.measureText(badgeText).width + 18;
    ctx.fillStyle = 'rgba(4, 9, 24, 0.92)';
    ctx.fillRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.strokeStyle = prompt.accentHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, prompt.x, py + 1);
    ctx.restore();
  }

  ctx.restore();
}
