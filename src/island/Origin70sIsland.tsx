/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LA GRAN ISLA DE LOS 70: EL ORIGEN DEL UNIVERSO ARCADE (ARCHIPIÉLAGO CERO)
 * Controlador de exploración continua, interacciones, movilidad intra-isla
 * (Tabla de Pong y Nave Estelar), Códice del Arquitecto y HUD limpio.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Compass, Diamond, Map as MapIcon, Sparkles, X } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { ArchitectCodexModal } from '../memories/ArchitectCodexModal';
import { PixelverseProgressState } from '../memories/progressionState';
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
  isPointWalkableOnIsland,
  isSouthShortcutUnlocked,
} from './island70sData';
import {
  IslandPickupBurst,
  renderIsland70sFrame,
} from './island70sRenderer';

export type Island70sArrivalMode =
  | 'awakening'
  | 'standard'
  | 'pong-board'
  | 'glitch-trail-cleared'
  | 'invaders-ship';

export interface Origin70sIslandProps {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  allUnlocked: boolean;
  arrivalMode: Island70sArrivalMode;
  progressState: PixelverseProgressState;
  onEnterPong: () => void;
  onEnterGlitchTrail: () => void;
  onEnterSpaceInvaders: () => void;
  onCollectDiamond: (diamondId: string) => void;
  onVisitZone: (zoneId: IslandZoneId) => void;
  onDiscoverEcho: (echoId: string) => void;
  onActivateSwitch: (switchId: string) => void;
  onTalkNpc: (npcId: string) => void;
  onSavePosition: (x: number, y: number) => void;
  onArrivalSequenceFinished?: () => void;
}

interface InteractivePromptTarget {
  kind:
    | 'pong-cabinet'
    | 'pong-hoverboard-ride'
    | 'glitch-portal'
    | 'invaders-cabinet'
    | 'astrolabe'
    | 'npc'
    | 'echo'
    | 'switch'
    | 'vista';
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  accentHex: string;
}

interface ActiveDialogModal {
  category: string;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  hint?: string;
  accentHex: string;
}

const TOTAL_70S_DIAMONDS = 9; // 5 en la Gran Isla + 4 en El Sendero del Glitch Perdido

export function Origin70sIsland({
  skinColor,
  hairColor,
  shirtColor,
  allUnlocked,
  arrivalMode,
  progressState,
  onEnterPong,
  onEnterGlitchTrail,
  onEnterSpaceInvaders,
  onCollectDiamond,
  onVisitZone,
  onDiscoverEcho,
  onActivateSwitch,
  onTalkNpc,
  onSavePosition,
  onArrivalSequenceFinished,
}: Origin70sIslandProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pongRestored = Boolean(progressState.games['pong']?.memoryUnlocked) || allUnlocked;
  const glitchTrailCleared =
    Boolean(progressState.island70s.glitchTrailCompleted) ||
    Boolean(progressState.games['glitch-trail']?.completed) ||
    allUnlocked;
  const invadersRestored =
    Boolean(progressState.games['space-invaders']?.memoryUnlocked) || allUnlocked;
  const invadersCabinetUnlocked =
    glitchTrailCleared ||
    progressState.island70s.unlockedCabinets.includes('space-invaders') ||
    allUnlocked;

  const southShortcutActive = isSouthShortcutUnlocked(
    progressState.island70s.activatedIslandSwitches,
    allUnlocked
  );

  const getInitialSpawn = (): { x: number; y: number } => {
    if (arrivalMode === 'pong-board') {
      return { ...ISLAND_KEY_COORDS.pongBoardLanding };
    }
    if (arrivalMode === 'glitch-trail-cleared') {
      return { ...ISLAND_KEY_COORDS.glitchTrailReturn };
    }
    if (arrivalMode === 'invaders-ship') {
      return { ...ISLAND_KEY_COORDS.starShuttleDisembark };
    }
    if (arrivalMode === 'standard' && progressState.island70s.lastIslandPos) {
      const saved = progressState.island70s.lastIslandPos;
      const valid = isPointWalkableOnIsland(saved.x, saved.y, {
        southShortcut: southShortcutActive,
        gargantaBridge: glitchTrailCleared,
      });
      if (valid) return { ...saved };
    }
    return { ...ISLAND_KEY_COORDS.awakeningSpawn };
  };

  const initialPosRef = useRef<{ x: number; y: number }>(getInitialSpawn());

  const [currentZoneId, setCurrentZoneId] = useState<IslandZoneId>('costa-despertar');
  const [zoneBanner, setZoneBanner] = useState<{
    numberLabel: string;
    name: string;
    subtitle: string;
    accentHex: string;
  } | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<InteractivePromptTarget | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogModal | null>(null);
  const [codexOpen, setCodexOpen] = useState<boolean>(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [minimapOpen, setMinimapOpen] = useState<boolean>(true);
  const [flightStatusText, setFlightStatusText] = useState<string | null>(null);
  const [playerMiniPos, setPlayerMiniPos] = useState<{ x: number; y: number }>(
    initialPosRef.current
  );

  const latestStateRef = useRef({
    skinColor,
    hairColor,
    shirtColor,
    allUnlocked,
    pongRestored,
    glitchTrailCleared,
    invadersRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: Boolean(activeDialog) || codexOpen,
  });
  latestStateRef.current = {
    skinColor,
    hairColor,
    shirtColor,
    allUnlocked,
    pongRestored,
    glitchTrailCleared,
    invadersRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: Boolean(activeDialog) || codexOpen,
  };

  const callbacksRef = useRef({
    onEnterPong,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onArrivalSequenceFinished,
  });
  callbacksRef.current = {
    onEnterPong,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onArrivalSequenceFinished,
  };

  const nearbyPromptRef = useRef<InteractivePromptTarget | null>(null);
  nearbyPromptRef.current = nearbyPrompt;

  // Vuelos exclusivamente internos dentro de la misma Isla de los 70
  const vehicleFlightRef = useRef<{
    type: 'none' | 'pong-to-garganta' | 'garganta-to-pong' | 'shuttle-landing';
    elapsed: number;
    duration: number;
  }>({
    type:
      arrivalMode === 'pong-board'
        ? 'pong-to-garganta'
        : arrivalMode === 'invaders-ship'
        ? 'shuttle-landing'
        : 'none',
    elapsed: 0,
    duration: arrivalMode === 'invaders-ship' ? 4.5 : 4.1,
  });

  const virtualInputRef = useRef<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    sprint: boolean;
    clickTarget: { x: number; y: number } | null;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    clickTarget: null,
  });

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
    window.setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const triggerInteraction = useCallback(
    (targetOverride?: InteractivePromptTarget | null) => {
      const target = targetOverride ?? nearbyPromptRef.current;
      if (!target) return;
      if (vehicleFlightRef.current.type !== 'none') return;

      const st = latestStateRef.current;

      if (target.kind === 'pong-cabinet') {
        retroAudio.uiClick();
        callbacksRef.current.onEnterPong();
        return;
      }

      if (target.kind === 'pong-hoverboard-ride') {
        retroAudio.hoverboardLaunch();
        const goingNorth = target.id === 'board-at-pong';
        vehicleFlightRef.current = {
          type: goingNorth ? 'pong-to-garganta' : 'garganta-to-pong',
          elapsed: 0,
          duration: 3.8,
        };
        setFlightStatusText(
          goingNorth
            ? 'Tabla de Pong activada · Planeando dentro de la Isla de los 70 hacia La Garganta del Invasor...'
            : 'Tabla de Pong activada · Planeando de regreso al Santuario de Pong (1972)...'
        );
        return;
      }

      if (target.kind === 'glitch-portal') {
        if (!st.pongRestored && !st.allUnlocked) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'UMBRAL TEMPORAL · REQUIERE PULSO 1972',
            title: 'Portal a «El Sendero del Glitch Perdido»',
            subtitle: 'Estabilización previa necesaria',
            paragraphs: [
              'Las coordenadas de este portal vibran sin ancla. Antes de adentrarte en el desafío del Cartógrafo del Caos, visita el Santuario de Pong al sureste y restaura el pulso fundacional de 1972 alcanzando 3 puntos.',
            ],
            hint: 'Camina hacia el sureste desde las Ruinas del Primer Arcade para encender el gabinete amarillo de Pong.',
            accentHex: '#facc15',
          });
          return;
        }
        retroAudio.bridgeActivate();
        callbacksRef.current.onEnterGlitchTrail();
        return;
      }

      if (target.kind === 'invaders-cabinet') {
        if (!st.invadersCabinetUnlocked) {
          retroAudio.npcBlip(0.78);
          setActiveDialog({
            category: 'BASTIÓN DEFENSIVO 1978 · ACCESO BLOQUEADO',
            title: 'Gabinete Space Invaders (1978)',
            subtitle: 'Requiere reconstruir el Puente Astral',
            paragraphs: [
              'Los circuitos defensivos del bastión aguardan la señal del Puente Astral de La Garganta. Completa «El Sendero del Glitch Perdido» para sincronizar la energía de este gabinete.',
            ],
            hint: 'Cruza el portal espiral en La Garganta del Invasor para reunir las llaves del puente.',
            accentHex: '#f97316',
          });
          return;
        }
        retroAudio.uiClick();
        callbacksRef.current.onEnterSpaceInvaders();
        return;
      }

      if (target.kind === 'astrolabe') {
        retroAudio.echoDiscover();
        const diamondsCount = st.progressState.island70s.collectedDiamondIds.length;
        const echoesCount = st.progressState.island70s.discoveredEchoIds.length;
        setActiveDialog({
          category: 'MONUMENTO CENTRAL · CUMBRE DEL ARQUITECTO',
          title: 'El Astrolabio de las Eras (Década de 1970)',
          subtitle: `Memorias 70s: ${
            (st.pongRestored ? 1 : 0) +
            (st.glitchTrailCleared ? 1 : 0) +
            (st.invadersRestored ? 1 : 0)
          } / 3 · Diamantes Cian: ${diamondsCount} / ${TOTAL_70S_DIAMONDS} · Sombras: ${echoesCount}`,
          paragraphs: [
            st.pongRestored && st.invadersRestored
              ? 'Los anillos de latón y fósforo giran en resonancia bajo la luna pálida. Tanto Pong (1972) como Space Invaders (1978, con más de 1000 puntos reales) han sido devueltos a la memoria colectiva.'
              : 'Este astrolabio sincroniza los recuerdos fundacionales del Archipiélago Cero. Cada videojuego restaurado y cada Diamante de Memoria cian fortalece el faro hacia las siguientes décadas.',
            'Al este, desde el Puerto de las Islas Perdidas, los telescopios astrales enfocan las siluetas lejanas y selladas de la Isla de los 80 y la Ciudadela de los 90.',
          ],
          hint:
            diamondsCount < TOTAL_70S_DIAMONDS
              ? `Quedan ${
                  TOTAL_70S_DIAMONDS - diamondsCount
                } Diamantes de Memoria ocultos entre esta isla y las rutas alternas de El Sendero del Glitch Perdido.`
              : 'Has reunido los 9 Diamantes de Memoria del Origen de los 70. Revisa el Códice [C] para inspeccionar todas tus crónicas.',
          accentHex: '#00f3ff',
        });
        return;
      }

      if (target.kind === 'npc') {
        const npc = ISLAND_NPCS.find((n) => n.id === target.id);
        if (!npc) return;
        retroAudio.npcBlip(npc.pitch);
        callbacksRef.current.onTalkNpc(npc.id);
        const paragraphs =
          st.invadersRestored && npc.linesAfterInvaders
            ? npc.linesAfterInvaders
            : st.pongRestored && npc.linesAfterPong
            ? npc.linesAfterPong
            : npc.linesInitial;
        setActiveDialog({
          category: npc.role.toUpperCase(),
          title: npc.name,
          paragraphs,
          accentHex: npc.palette.glow,
        });
        return;
      }

      if (target.kind === 'echo') {
        const echo = ISLAND_ECHOES.find((e) => e.id === target.id);
        if (!echo) return;
        retroAudio.echoDiscover();
        callbacksRef.current.onDiscoverEcho(echo.id);
        setActiveDialog({
          category: `ARCHIVO DE ECO HOLOGRÁFICO · AÑO ${echo.year}`,
          title: echo.title,
          subtitle: echo.pioneer,
          paragraphs: [echo.loreText],
          hint: echo.gameplayHint,
          accentHex: echo.accentHex,
        });
        return;
      }

      if (target.kind === 'switch') {
        const sw = ISLAND_SWITCHES.find((s) => s.id === target.id);
        if (!sw) return;
        const alreadyActive =
          st.progressState.island70s.activatedIslandSwitches.includes(sw.id);
        retroAudio.shardCollect(alreadyActive ? 2 : 3);
        if (!alreadyActive) {
          callbacksRef.current.onActivateSwitch(sw.id);
        }
        showToast(sw.descriptionOnActivate);
        return;
      }

      if (target.kind === 'vista') {
        const vista = DISTANT_DECADE_VISTAS.find((v) => v.id === target.id);
        if (!vista) return;
        retroAudio.echoDiscover();
        setActiveDialog({
          category: vista.decadeLabel,
          title: vista.title,
          subtitle: vista.statusText,
          paragraphs: [vista.lorePreview],
          hint: vista.unlockRequirement,
          accentHex: vista.accentHex,
        });
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (arrivalMode === 'glitch-trail-cleared') {
      retroAudio.bridgeActivate();
      showToast(
        '¡Puente Astral reconstruido! Cruza hacia el este para alcanzar La Fortaleza de las Oleadas (1978).'
      );
      onArrivalSequenceFinished?.();
    }
  }, [arrivalMode, onArrivalSequenceFinished, showToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = (ev: MediaQueryListEvent) => {
      reducedMotion = ev.matches;
    };
    reducedMotionQuery.addEventListener('change', onMotionChange);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const player = {
      x: initialPosRef.current.x,
      y: initialPosRef.current.y,
      facing: 1 as 1 | -1,
      walking: false,
      sprinting: false,
    };

    const camera = {
      x: Math.max(0, Math.min(ISLAND_WORLD_W - vw, player.x - vw * 0.5)),
      y: Math.max(0, Math.min(ISLAND_WORLD_H - vh, player.y - vh * 0.5)),
    };

    const keys: Record<string, boolean> = {};
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const code = e.code;
      keys[code] = true;

      if (code === 'Escape') {
        if (latestStateRef.current.modalOpen) {
          e.preventDefault();
          setActiveDialog(null);
          setCodexOpen(false);
          return;
        }
      }

      if (code === 'KeyC') {
        e.preventDefault();
        retroAudio.uiClick();
        setCodexOpen((prev) => !prev);
        return;
      }

      if (code === 'Tab') {
        e.preventDefault();
        setMinimapOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyE' || code === 'Enter') {
        if (latestStateRef.current.modalOpen) {
          e.preventDefault();
          setActiveDialog(null);
          setCodexOpen(false);
        } else if (nearbyPromptRef.current) {
          e.preventDefault();
          triggerInteraction(nearbyPromptRef.current);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (latestStateRef.current.modalOpen || vehicleFlightRef.current.type !== 'none') {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wx = sx + camera.x;
      const wy = sy + camera.y;

      const prompt = nearbyPromptRef.current;
      if (prompt && Math.hypot(wx - prompt.x, wy - prompt.y) < 76) {
        triggerInteraction(prompt);
        return;
      }

      const st = latestStateRef.current;
      const walkable = isPointWalkableOnIsland(wx, wy, {
        southShortcut: st.southShortcutActive,
        gargantaBridge: st.glitchTrailCleared,
      });
      if (walkable) {
        virtualInputRef.current.clickTarget = { x: wx, y: wy };
      }
    };
    canvas.addEventListener('pointerdown', onCanvasPointerDown);

    const stars = Array.from({ length: 165 }, (_, i) => ({
      nx: ((i * 97) % 1000) / 1000,
      ny: ((i * 53) % 1000) / 1000,
      size: 1 + (i % 3) * 0.85,
      twinkle: i * 0.7,
      parallax: 0.12 + (i % 4) * 0.06,
    }));

    const ambientBits = Array.from({ length: 85 }, (_, i) => ({
      x: 240 + ((i * 173) % (ISLAND_WORLD_W - 420)),
      y: 220 + ((i * 131) % (ISLAND_WORLD_H - 360)),
      vy: -12 - (i % 4) * 7,
      phase: i * 0.9,
      color: i % 3 === 0 ? '#00f3ff' : i % 3 === 1 ? '#34d399' : '#facc15',
    }));

    const digitalCritters = Array.from({ length: 9 }, (_, i) => ({
      homeX: 680 + (i % 3) * 240,
      homeY: 1090 + Math.floor(i / 3) * 145,
      phase: i * 1.3,
      color: i % 2 === 0 ? '#34d399' : '#38bdf8',
    }));

    const pickupBursts: IslandPickupBurst[] = [];

    const spawnBurst = (bx: number, by: number, color: string, count = 18) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.25;
        const sp = 45 + Math.random() * 110;
        pickupBursts.push({
          x: bx,
          y: by,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.55,
          color,
        });
      }
    };

    let lastZoneNotified: IslandZoneId | null = null;
    let lastPosSaveTimer = 0;
    let miniMapSyncTimer = 0;
    let prevPromptId = '';

    if (vehicleFlightRef.current.type === 'pong-to-garganta') {
      setFlightStatusText(
        'Vuelo en Tabla de Pong · Surcando la Gran Isla de los 70 hacia La Garganta del Invasor...'
      );
    } else if (vehicleFlightRef.current.type === 'shuttle-landing') {
      setFlightStatusText(
        'Nave Estelar PIXELVERSE · Descendiendo hacia La Fortaleza de las Oleadas (1978)...'
      );
    }

    let rafId = 0;
    let prevTime = performance.now();
    let elapsed = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;
      elapsed += dt;

      const st = latestStateRef.current;
      const flight = vehicleFlightRef.current;

      if (flight.type !== 'none') {
        flight.elapsed += dt;
        const p = Math.min(1, flight.elapsed / flight.duration);
        const smooth = p * p * (3 - 2 * p);

        if (flight.type === 'pong-to-garganta' || flight.type === 'garganta-to-pong') {
          const start =
            flight.type === 'pong-to-garganta'
              ? ISLAND_KEY_COORDS.pongBoardLaunch
              : ISLAND_KEY_COORDS.pongBoardLanding;
          const end =
            flight.type === 'pong-to-garganta'
              ? ISLAND_KEY_COORDS.pongBoardLanding
              : ISLAND_KEY_COORDS.pongBoardLaunch;
          const ctrlX = 2320;
          const ctrlY = 1040;
          const inv = 1 - smooth;
          player.x =
            inv * inv * start.x + 2 * inv * smooth * ctrlX + smooth * smooth * end.x;
          player.y =
            inv * inv * start.y + 2 * inv * smooth * ctrlY + smooth * smooth * end.y;
          player.walking = false;

          if (p >= 1) {
            flight.type = 'none';
            player.x = end.x;
            player.y = end.y;
            setFlightStatusText(null);
            retroAudio.zoneChime();
            callbacksRef.current.onSavePosition(player.x, player.y);
            callbacksRef.current.onArrivalSequenceFinished?.();
          }
        } else if (flight.type === 'shuttle-landing') {
          const pad = ISLAND_KEY_COORDS.starShuttlePad;
          const disembark = ISLAND_KEY_COORDS.starShuttleDisembark;
          if (p < 0.72) {
            const lp = p / 0.72;
            const easeOut = 1 - Math.pow(1 - lp, 3);
            player.x = pad.x - 190 * (1 - easeOut);
            player.y = pad.y - 310 * (1 - easeOut);
          } else {
            const wp = (p - 0.72) / 0.28;
            player.x = pad.x + 18 + (disembark.x - (pad.x + 18)) * wp;
            player.y = pad.y + 14 + (disembark.y - (pad.y + 14)) * wp;
            player.walking = true;
            player.facing = 1;
          }

          if (p >= 1) {
            flight.type = 'none';
            player.x = disembark.x;
            player.y = disembark.y;
            player.walking = false;
            setFlightStatusText(null);
            retroAudio.portalVictory();
            showToast(
              '¡Aterrizaje completado en la Isla de los 70! Explora la Cumbre del Arquitecto y el Puerto del Este.'
            );
            callbacksRef.current.onSavePosition(player.x, player.y);
            callbacksRef.current.onArrivalSequenceFinished?.();
          }
        }
      } else if (!st.modalOpen) {
        let dx = 0;
        let dy = 0;
        const vIn = virtualInputRef.current;

        if (keys['KeyW'] || keys['ArrowUp'] || vIn.up) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown'] || vIn.down) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft'] || vIn.left) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight'] || vIn.right) dx += 1;

        if (dx !== 0 || dy !== 0) {
          vIn.clickTarget = null;
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
        } else if (vIn.clickTarget) {
          const tx = vIn.clickTarget.x - player.x;
          const ty = vIn.clickTarget.y - player.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 10) {
            vIn.clickTarget = null;
          } else {
            dx = tx / dist;
            dy = ty / dist;
          }
        }

        const sprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || vIn.sprint);
        const speed = sprinting ? 315 : 215;
        player.sprinting = sprinting && (dx !== 0 || dy !== 0);
        player.walking = dx !== 0 || dy !== 0;
        if (dx > 0.08) player.facing = 1;
        else if (dx < -0.08) player.facing = -1;

        if (player.walking) {
          const walkOpts = {
            southShortcut: st.southShortcutActive,
            gargantaBridge: st.glitchTrailCleared,
          };
          const nextX = player.x + dx * speed * dt;
          const nextY = player.y + dy * speed * dt;

          if (isPointWalkableOnIsland(nextX, nextY, walkOpts)) {
            player.x = nextX;
            player.y = nextY;
          } else if (isPointWalkableOnIsland(nextX, player.y, walkOpts)) {
            player.x = nextX;
          } else if (isPointWalkableOnIsland(player.x, nextY, walkOpts)) {
            player.y = nextY;
          } else {
            vIn.clickTarget = null;
          }
        }
      } else {
        player.walking = false;
      }

      const activeRect = isPointWalkableOnIsland(player.x, player.y, {
        southShortcut: st.southShortcutActive,
        gargantaBridge: st.glitchTrailCleared,
      });

      if (activeRect && activeRect.zoneId !== lastZoneNotified) {
        const previousZone = lastZoneNotified;
        lastZoneNotified = activeRect.zoneId;
        const zMeta = ISLAND_ZONES[activeRect.zoneId];
        setCurrentZoneId(activeRect.zoneId);
        setZoneBanner({
          numberLabel: zMeta.numberLabel,
          name: zMeta.name,
          subtitle: zMeta.subtitle,
          accentHex: zMeta.accentHex,
        });
        if (previousZone !== null) {
          retroAudio.zoneMotif(activeRect.zoneId);
        }
        if (!st.progressState.island70s.visitedZones.includes(activeRect.zoneId)) {
          callbacksRef.current.onVisitZone(activeRect.zoneId);
        }
      }

      if (flight.type === 'none') {
        const collectedIds = st.progressState.island70s.collectedDiamondIds;
        const activeSwitches = st.progressState.island70s.activatedIslandSwitches;
        for (const dia of ISLAND_DIAMONDS) {
          if (collectedIds.includes(dia.id)) continue;
          if (dia.requiresShortcut && !st.southShortcutActive) continue;
          if (
            dia.requiresSwitchId &&
            !activeSwitches.includes(dia.requiresSwitchId) &&
            !st.allUnlocked
          ) {
            continue;
          }
          if (Math.hypot(player.x - dia.x, player.y - dia.y) < 38) {
            callbacksRef.current.onCollectDiamond(dia.id);
            retroAudio.collectDiamond(collectedIds.length + 1);
            spawnBurst(dia.x, dia.y, '#00f3ff', 22);
            showToast(`¡Diamante de Memoria recuperado! · ${dia.label}`);
          }
        }
      }

      const targetHolder: { current: InteractivePromptTarget | null } = { current: null };
      let bestDist = 92;

      const consider = (candidate: InteractivePromptTarget, maxDist = 92) => {
        const d = Math.hypot(player.x - candidate.x, player.y - candidate.y);
        if (d < maxDist && d < bestDist) {
          bestDist = d;
          targetHolder.current = candidate;
        }
      };

      if (flight.type === 'none') {
        consider(
          {
            kind: 'pong-cabinet',
            id: 'cabinet-pong-1972',
            label: st.pongRestored
              ? 'Gabinete Pong (1972) · Memoria Restaurada'
              : 'Gabinete Arcade Pong (1972) · Atari',
            actionLabel: st.pongRestored ? 'Rejugar Pong (1972)' : 'Encender Pong (1972)',
            x: ISLAND_KEY_COORDS.pongCabinet.x,
            y: ISLAND_KEY_COORDS.pongCabinet.y + 18,
            accentHex: '#facc15',
          },
          104
        );

        if (st.pongRestored) {
          consider({
            kind: 'pong-hoverboard-ride',
            id: 'board-at-pong',
            label: 'Tabla Voladora de Pong · Vuelo interno hacia La Garganta',
            actionLabel: 'Volar al Norte en Tabla',
            x: ISLAND_KEY_COORDS.pongBoardLaunch.x,
            y: ISLAND_KEY_COORDS.pongBoardLaunch.y,
            accentHex: '#00f3ff',
          });
          consider({
            kind: 'pong-hoverboard-ride',
            id: 'board-at-garganta',
            label: 'Tabla Voladora de Pong · Regreso al Santuario 1972',
            actionLabel: 'Volar al Santuario de Pong',
            x: ISLAND_KEY_COORDS.pongBoardLanding.x - 42,
            y: ISLAND_KEY_COORDS.pongBoardLanding.y + 16,
            accentHex: '#00f3ff',
          });
        }

        consider(
          {
            kind: 'glitch-portal',
            id: 'portal-glitch-trail',
            label: st.glitchTrailCleared
              ? 'El Sendero del Glitch Perdido · Puente Reconstruido'
              : 'Portal: El Sendero del Glitch Perdido',
            actionLabel: st.glitchTrailCleared
              ? 'Recorrer Sendero del Glitch'
              : 'Iniciar El Sendero del Glitch',
            x: ISLAND_KEY_COORDS.glitchTrailPortal.x,
            y: ISLAND_KEY_COORDS.glitchTrailPortal.y + 14,
            accentHex: '#00f3ff',
          },
          106
        );

        consider(
          {
            kind: 'invaders-cabinet',
            id: 'cabinet-invaders-1978',
            label: st.invadersRestored
              ? 'Gabinete Space Invaders (1978) · Memoria Restaurada'
              : 'Gabinete Upright Space Invaders (1978) · Meta 1000 PTS',
            actionLabel: st.invadersRestored
              ? 'Rejugar Space Invaders'
              : 'Defender Sector 1978',
            x: ISLAND_KEY_COORDS.invadersCabinet.x,
            y: ISLAND_KEY_COORDS.invadersCabinet.y + 20,
            accentHex: '#39ff14',
          },
          106
        );

        consider({
          kind: 'astrolabe',
          id: 'monument-astrolabe',
          label: 'Astrolabio de las Eras · Cumbre del Arquitecto',
          actionLabel: 'Inspeccionar Astrolabio',
          x: ISLAND_KEY_COORDS.architectAstrolabe.x,
          y: ISLAND_KEY_COORDS.architectAstrolabe.y + 20,
          accentHex: '#7dd3fc',
        });

        for (const npc of ISLAND_NPCS) {
          consider({
            kind: 'npc',
            id: npc.id,
            label: npc.name,
            actionLabel: 'Conversar',
            x: npc.x,
            y: npc.y,
            accentHex: npc.palette.glow,
          });
        }

        for (const echo of ISLAND_ECHOES) {
          consider({
            kind: 'echo',
            id: echo.id,
            label: echo.title,
            actionLabel: 'Sintonizar Sombra',
            x: echo.x,
            y: echo.y,
            accentHex: echo.accentHex,
          });
        }

        for (const sw of ISLAND_SWITCHES) {
          const isOn = st.progressState.island70s.activatedIslandSwitches.includes(sw.id);
          consider({
            kind: 'switch',
            id: sw.id,
            label: sw.label,
            actionLabel: isOn ? 'Resonancia Activa' : 'Activar Pedestal',
            x: sw.x,
            y: sw.y,
            accentHex: sw.accentHex,
          });
        }

        for (const vista of DISTANT_DECADE_VISTAS) {
          consider(
            {
              kind: 'vista',
              id: vista.id,
              label: vista.title,
              actionLabel: 'Mirar por Telescopio Astral',
              x: vista.x,
              y: vista.y,
              accentHex: vista.accentHex,
            },
            96
          );
        }
      }

      const resolvedTarget = targetHolder.current;
      const nextPromptId = resolvedTarget
        ? `${resolvedTarget.kind}:${resolvedTarget.id}`
        : '';
      if (nextPromptId !== prevPromptId) {
        prevPromptId = nextPromptId;
        setNearbyPrompt(resolvedTarget);
      }

      lastPosSaveTimer += dt;
      if (lastPosSaveTimer >= 1.8 && flight.type === 'none') {
        lastPosSaveTimer = 0;
        callbacksRef.current.onSavePosition(player.x, player.y);
      }
      miniMapSyncTimer += dt;
      if (miniMapSyncTimer >= 0.16) {
        miniMapSyncTimer = 0;
        setPlayerMiniPos({ x: player.x, y: player.y });
      }

      const targetCamX = Math.max(0, Math.min(ISLAND_WORLD_W - vw, player.x - vw * 0.5));
      const targetCamY = Math.max(0, Math.min(ISLAND_WORLD_H - vh, player.y - vh * 0.5));
      camera.x += (targetCamX - camera.x) * Math.min(1, dt * 6.5);
      camera.y += (targetCamY - camera.y) * Math.min(1, dt * 6.5);

      for (let i = pickupBursts.length - 1; i >= 0; i--) {
        pickupBursts[i].x += pickupBursts[i].vx * dt;
        pickupBursts[i].y += pickupBursts[i].vy * dt;
        pickupBursts[i].life -= dt;
        if (pickupBursts[i].life <= 0) pickupBursts.splice(i, 1);
      }

      renderIsland70sFrame({
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
        skinColor: st.skinColor,
        hairColor: st.hairColor,
        shirtColor: st.shirtColor,
        pongRestored: st.pongRestored,
        glitchTrailCleared: st.glitchTrailCleared,
        invadersRestored: st.invadersRestored,
        invadersCabinetUnlocked: st.invadersCabinetUnlocked,
        southShortcutActive: st.southShortcutActive,
        allUnlocked: st.allUnlocked,
        progressState: st.progressState,
        activeZoneId: activeRect ? activeRect.zoneId : null,
        prompt: nearbyPromptRef.current,
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      reducedMotionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    };
  }, [showToast, triggerInteraction]);

  const currentZone = ISLAND_ZONES[currentZoneId];
  const collectedDiamondsCount = progressState.island70s.collectedDiamondIds.length;
  const restored70sCount =
    (pongRestored ? 1 : 0) + (glitchTrailCleared ? 1 : 0) + (invadersRestored ? 1 : 0);

  const currentObjectiveText = !pongRestored
    ? 'Camina al sureste hasta El Santuario de Pong y alcanza 3 puntos en Pong (1972)'
    : !glitchTrailCleared
    ? 'Vuela al norte hasta La Garganta del Invasor y supera El Sendero del Glitch Perdido'
    : !invadersRestored
    ? 'Cruza el Puente Astral hacia La Fortaleza y alcanza 1000 puntos en Space Invaders (1978)'
    : 'Década de 1970 estabilizada · Explora La Cumbre, las Cavernas y el Puerto del Este';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#020614]">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

      {/* HUD Superior Izquierdo: jerarquía editorial limpia sin píldoras estáticas */}
      <div className="absolute top-4 left-4 z-20 max-w-md glass-hud rounded-xl px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-mono-tabular tracking-[0.22em] text-[#00f3ff] uppercase">
            EL ORIGEN · ARCHIPIÉLAGO CERO (AÑOS 70)
          </span>
          <span className="text-[10px] font-mono-tabular text-slate-300">
            ZONAS {progressState.island70s.visitedZones.length}/9
          </span>
        </div>

        <div>
          <p className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
            {zoneBanner ? `${zoneBanner.numberLabel} · ${zoneBanner.name}` : currentZone.name}
          </p>
          <p className="text-[11px] text-slate-300 font-ui leading-snug">
            {currentZone.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-[11px] font-mono-tabular">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[#00f3ff]">
              <Diamond className="w-3.5 h-3.5 shrink-0" />
              <span>
                DIAMANTES {collectedDiamondsCount}/{TOTAL_70S_DIAMONDS}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>MEMORIAS {restored70sCount}/3</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setCodexOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#00f3ff]/45 bg-cyan-950/55 hover:bg-cyan-900/75 text-[10px] font-bold text-[#00f3ff] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Códice [C]</span>
          </button>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-white/10 text-[11px] text-sky-200 font-ui pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-[#00f3ff] shrink-0 mt-0.5" />
          <span>{currentObjectiveText}</span>
        </div>
      </div>

      {/* Minimapa compacto conmutable en esquina inferior derecha */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => {
            retroAudio.uiClick();
            setMinimapOpen((o) => !o);
          }}
          className="glass-hud px-3 py-1.5 rounded-md text-[11px] font-mono-tabular text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <MapIcon className="w-3.5 h-3.5 text-[#00f3ff]" />
          <span>{minimapOpen ? 'Ocultar Mapa (Tab)' : 'Mapa Isla 70s (Tab)'}</span>
        </button>

        {minimapOpen && (
          <div className="glass-panel rounded-xl p-2.5 w-60 space-y-1.5">
            <div className="relative w-full h-36 bg-[#030a1c] rounded border border-white/15 overflow-hidden">
              {ISLAND_WALKABLE_RECTS.map((r) => {
                if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) {
                  return null;
                }
                if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) {
                  return null;
                }
                return (
                  <div
                    key={r.id}
                    style={{
                      left: `${(r.x / ISLAND_WORLD_W) * 100}%`,
                      top: `${(r.y / ISLAND_WORLD_H) * 100}%`,
                      width: `${(r.w / ISLAND_WORLD_W) * 100}%`,
                      height: `${(r.h / ISLAND_WORLD_H) * 100}%`,
                    }}
                    className={`absolute ${
                      r.surface === 'bridge'
                        ? 'bg-cyan-400/75'
                        : r.zoneId === 'cavernas-codigo'
                        ? 'bg-purple-800/65'
                        : 'bg-emerald-700/60'
                    }`}
                  />
                );
              })}

              <div
                title="Santuario de Pong (1972)"
                style={{
                  left: `${(ISLAND_KEY_COORDS.pongCabinet.x / ISLAND_WORLD_W) * 100}%`,
                  top: `${(ISLAND_KEY_COORDS.pongCabinet.y / ISLAND_WORLD_H) * 100}%`,
                }}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-amber-300 border border-black"
              />
              <div
                title="El Sendero del Glitch Perdido"
                style={{
                  left: `${(ISLAND_KEY_COORDS.glitchTrailPortal.x / ISLAND_WORLD_W) * 100}%`,
                  top: `${(ISLAND_KEY_COORDS.glitchTrailPortal.y / ISLAND_WORLD_H) * 100}%`,
                }}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-[#00f3ff] border border-black"
              />
              <div
                title="Fortaleza de las Oleadas · Space Invaders (1978)"
                style={{
                  left: `${(ISLAND_KEY_COORDS.invadersCabinet.x / ISLAND_WORLD_W) * 100}%`,
                  top: `${(ISLAND_KEY_COORDS.invadersCabinet.y / ISLAND_WORLD_H) * 100}%`,
                }}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-[#39ff14] border border-black"
              />

              <div
                style={{
                  left: `${(playerMiniPos.x / ISLAND_WORLD_W) * 100}%`,
                  top: `${(playerMiniPos.y / ISLAND_WORLD_H) * 100}%`,
                }}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-[#00f3ff]"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-300 px-0.5">
              <span>WASD / Clic · Caminar</span>
              <span>Shift · Impulso</span>
            </div>
          </div>
        )}
      </div>

      {/* Notificación flotante de hallazgo o vuelo */}
      {(toastBanner || flightStatusText) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-lg px-5 py-2.5 text-xs sm:text-sm font-mono-tabular text-[#00f3ff] text-center max-w-xl">
          {flightStatusText || toastBanner}
        </div>
      )}

      {/* Barra contextual inferior */}
      {nearbyPrompt && !activeDialog && !codexOpen && !flightStatusText && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 glass-panel rounded-xl px-5 py-3 flex flex-wrap items-center justify-center gap-3 max-w-xl">
          <div className="text-left min-w-0">
            <p className="text-[10px] font-mono-tabular tracking-wider text-[#00f3ff] uppercase">
              INTERACCIÓN DISPONIBLE
            </p>
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {nearbyPrompt.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerInteraction(nearbyPrompt)}
            className="btn-ui px-4 py-2 rounded-md text-xs font-bold tracking-wider cursor-pointer whitespace-nowrap shrink-0"
          >
            {nearbyPrompt.actionLabel} [E]
          </button>
        </div>
      )}

      {/* Cuadro de diálogo narrativo */}
      {activeDialog && (
        <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/12 pb-3">
              <div>
                <p className="text-[10px] font-mono-tabular tracking-[0.2em] text-[#00f3ff] uppercase">
                  {activeDialog.category}
                </p>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {activeDialog.title}
                </h3>
                {activeDialog.subtitle && (
                  <p className="text-xs font-mono-tabular text-amber-300 mt-1">
                    {activeDialog.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                aria-label="Cerrar diálogo"
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-200 font-ui leading-relaxed">
              {activeDialog.paragraphs.map((par, idx) => (
                <p key={idx}>{par}</p>
              ))}
            </div>

            {activeDialog.hint && (
              <p className="pt-3 border-t border-white/10 text-xs text-cyan-200 font-ui">
                {activeDialog.hint}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setActiveDialog(null);
                }}
                className="btn-ui px-6 py-2 rounded-md text-xs font-bold tracking-wider cursor-pointer whitespace-nowrap shrink-0"
              >
                Continuar Exploración [Enter]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Códice del Arquitecto */}
      {codexOpen && (
        <ArchitectCodexModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onClose={() => setCodexOpen(false)}
        />
      )}
    </div>
  );
}
