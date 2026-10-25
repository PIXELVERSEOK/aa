/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renderizador pixel-art cenital para Interiores Accesibles, Salas tras Paredes Falsas,
 * Grutas Subterráneas con Iluminación Dinámica (Lámpara de Fósforo) y la
 * Isla Neón 1980s (Muelle de las Vigas Rojas).
 */

import {
  drawPixelAvatar4Dir,
  drawRpgTreasureChest,
  IslandPickupBurst,
  IslandPromptRenderSpec,
} from '../island/island70sRenderer';
import { PixelverseProgressState } from '../memories/progressionState';
import {
  FacingDirection,
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
