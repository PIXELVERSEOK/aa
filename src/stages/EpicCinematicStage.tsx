/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { bgmEngine } from '../audio/bgmEngine';
import { cinematicAudio, CinematicCueId } from './cinematicAudio';
import { cinematicNarrator, NarrationClipId } from './cinematicNarrator';
import { useTypewriter } from '../hooks/useTypewriter';
import {
  drawBowserClassic,
  drawDonkeyKongClassic,
  drawDrWilyCapsule,
  drawEggmanClassic,
  drawGanondorfClassic,
  drawKingKRoolClassic,
  drawMBisonClassic,
  drawPacManGhostClassic,
  drawPixelArchitectCrisp,
  drawSuperCupaSovereign,
  PacGhostId,
} from './cinematicVillains';

import cosmicHorizonUrl from '../assets/images/pixelverse_cosmic_horizon_1792895057605.jpg';
import entropyCollapseUrl from '../assets/images/cinematic_entropy_collapse_1792895059006.jpg';
import architectAwakeningUrl from '../assets/images/cinematic_architect_awakening_1792895058806.jpg';
import kingKoopa16BitUrl from '../assets/images/king_koopa_16bit_1792910687212.jpg';
import classicArcadeRoomUrl from '../assets/images/classic_arcade_room_16bit_1792911577679.jpg';

interface VillainShotSpec {
  label: string;
  clipId: NarrationClipId;
  cue: CinematicCueId;
  duration: number;
  narration: string;
}

const VILLAIN_SHOTS: VillainShotSpec[] = [
  {
    label: 'BOWSER · SUPER MARIO BROS.',
    clipId: '02a-bowser',
    cue: 'villain-bowser',
    duration: 3.2,
    narration: 'De pronto, una anomalía sacude cada dimensión...',
  },
  {
    label: 'DR. EGGMAN · SONIC THE HEDGEHOG',
    clipId: '02b-eggman',
    cue: 'villain-eggman',
    duration: 7.4,
    narration:
      'En el laboratorio industrial, las máquinas del Doctor Eggman se sobrecargan fuera de todo control.',
  },
  {
    label: 'KING K. ROOL & DONKEY KONG · UNIVERSO DK',
    clipId: '02c-dk-krool',
    cue: 'villain-dk-krool',
    duration: 9.7,
    narration:
      'Los dominios de Donkey Kong y King K. Rool se fracturan mientras los barriles flotan sin gravedad.',
  },
  {
    label: 'BLINKY, PINKY, INKY & CLYDE · PAC-MAN',
    clipId: '02d-pacman',
    cue: 'villain-pacman',
    duration: 9.5,
    narration:
      'En la oscuridad neón, los fantasmas de Pac-Man recorren un laberinto que se desintegra píxel a píxel.',
  },
  {
    label: 'M. BISON · DR. WILY · GANONDORF',
    clipId: '02e-legends',
    cue: 'villain-legends',
    duration: 11.3,
    narration:
      'Y a través de grietas dimensionales, Bison, el Doctor Wily y Ganondorf presencian la ruptura de sus mundos.',
  },
];

interface CinematicSceneSpec {
  id: string;
  tag: string;
  clipId?: NarrationClipId;
  duration: number;
  narration: string;
  speechText?: string;
}

const TOTAL_VILLAIN_DURATION = VILLAIN_SHOTS.reduce(
  (acc, s) => acc + s.duration,
  0
);

const CINEMATIC_SCENES: CinematicSceneSpec[] = [
  {
    id: 'arcade-universe',
    tag: 'Escena 01 · El Universo Arcade',
    clipId: '01-arcade-universe',
    duration: 12.9,
    narration:
      'El universo de los videojuegos latía en perfecta armonía, iluminado por destellos eternos y memorias clásicas en el espacio arcade.',
  },
  {
    id: 'classic-villains',
    tag: 'Escena 02 · Los Antagonistas Clásicos',
    duration: TOTAL_VILLAIN_DURATION,
    narration: VILLAIN_SHOTS[0].narration,
  },
  {
    id: 'the-collapse',
    tag: 'Escena 03 · El Colapso',
    clipId: '03-collapse',
    duration: 3.2,
    narration: '...mientras los castillos y templos colapsan.',
    speechText: 'mientras los castillos y templos de los mundos colapsan.',
  },
  {
    id: 'super-cupa',
    tag: 'Escena 04 · Irrupción de King Koopa',
    clipId: '04-super-cupa',
    duration: 12.0,
    narration: 'En el epicentro irrumpe SUPER KING KOOPA.',
    speechText: 'En el epicentro irrumpe Super King Koopa.',
  },
  {
    id: 'pixel-birth',
    tag: 'Escena 05 · El Nacimiento de Pixel',
    clipId: '05-pixel-birth',
    duration: 13.2,
    narration:
      'Todo enmudece en el vacío absoluto... hasta que brilla un único píxel blanco y despierta Pixel, el Arquitecto del Universo.',
  },
  {
    id: 'pong-connection',
    tag: 'Escena 06 · Conexión con Pong (1972)',
    clipId: '06-pong-link',
    duration: 12.5,
    narration:
      'Frente a Pixel surge la primera memoria sobreviviente de 1972: el gabinete original de Pong aguarda para reconstruir la historia.',
    speechText:
      'Frente a Pixel surge la primera memoria sobreviviente de mil novecientos setenta y dos: el gabinete original de Pong aguarda para reconstruir la historia.',
  },
];

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  depth: number;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  vw: number,
  vh: number,
  alpha: number,
  panX: number,
  panY: number,
  zoom = 1.06
): void {
  if (!img || !img.complete || img.naturalWidth === 0 || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const viewAspect = vw / Math.max(1, vh);
  let drawW = vw * zoom;
  let drawH = vh * zoom;
  if (viewAspect > imgAspect) {
    drawH = drawW / imgAspect;
  } else {
    drawW = drawH * imgAspect;
  }
  const dx = (vw - drawW) / 2 + panX;
  const dy = (vh - drawH) / 2 + panY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawWorldRelicFragment(
  ctx: CanvasRenderingContext2D,
  kind: 'mario' | 'pacman' | 'dk' | 'sonic' | 'castle' | 'temple' | 'lab',
  cx: number,
  cy: number,
  rot: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.shadowBlur = 0;

  if (kind === 'mario' || kind === 'castle') {
    // Fragmento de Castillo Gótico (Estilo Mario/Bowser Castle)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-36, -22, 72, 44);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-36, -28, 16, 8);
    ctx.fillRect(-8, -28, 16, 8);
    ctx.fillRect(20, -28, 16, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, -12, 20, 24);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(18, -22); ctx.lineTo(0, -16);
    ctx.fill();
  } else if (kind === 'dk' || kind === 'temple') {
    // Fragmento de Templo Ancestral (Estilo DK/Zelda)
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-40, -20, 80, 40);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-36, -20, 12, 24);
    ctx.fillRect(16, -10, 14, 30);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(-14, -12, 28, 24);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-8, -6, 5, 4);
    ctx.fillRect(3, -6, 5, 4);
  } else if (kind === 'sonic' || kind === 'lab') {
    // Fragmento de Laboratorio Tecnológico (Estilo Eggman/Wily)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-42, -18, 84, 36);
    for (let i = -36; i < 36; i += 18) {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(i, -18, 9, 36);
    }
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-18, -10, 36, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -6, 20, 12);
  } else {
    // Esquina de Laberinto Neón Pac-Man
    ctx.strokeStyle = '#2121de';
    ctx.lineWidth = 4;
    ctx.strokeRect(-36, -18, 72, 14);
    ctx.fillStyle = '#ffb8ae';
    ctx.fillRect(-24, 6, 6, 6);
    ctx.fillRect(-4, 6, 6, 6);
    ctx.fillRect(16, 4, 10, 10);
  }

  ctx.restore();
}

interface Scene4SubCutSpec {
  cutIndex: number;
  startTime: number;
  endTime: number;
  cutTitle: string;
  text: string;
  sfxCue: CinematicCueId;
}

const SCENE_4_SUB_CUTS: Scene4SubCutSpec[] = [
  {
    cutIndex: 0,
    startTime: 0.0,
    endTime: 2.0,
    cutTitle: 'PixelVerse: SUPER KING KOOPA',
    text: 'En el epicentro irrumpe SUPER KING KOOPA.',
    sfxCue: 'scene-3-cut-0',
  },
  {
    cutIndex: 1,
    startTime: 2.0,
    endTime: 5.0,
    cutTitle: 'SUPER KING KOOPA · RUGIDO CÓSMICO',
    text: 'Las dimensiones colapsan mientras su rugido fractura el espacio.',
    sfxCue: 'scene-3-super-cupa',
  },
  {
    cutIndex: 2,
    startTime: 5.0,
    endTime: 8.0,
    cutTitle: 'SUPER KING KOOPA · IMPACTO DIMENSIONAL',
    text: '¡Un puño descomunal destruye la matriz de 16-bits!',
    sfxCue: 'scene-2-collapse',
  },
  {
    cutIndex: 3,
    startTime: 8.0,
    endTime: 12.0,
    cutTitle: 'SUPER KING KOOPA · SOBERANO SUPREMO',
    text: 'El supremo antagonista reclama el control absoluto del PixelVerse.',
    sfxCue: 'scene-3-super-cupa',
  },
];

export function EpicCinematicStage({
  runKey,
  onComplete,
}: {
  runKey: number;
  onComplete: () => void;
  onEnterPong?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [villainShotIndex, setVillainShotIndex] = useState<number>(0);
  const [scene4CutIndex, setScene4CutIndex] = useState<number>(0);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [sceneProgressPct, setSceneProgressPct] = useState<number>(0);
  const [awaitingAudioUnlock, setAwaitingAudioUnlock] = useState<boolean>(
    () => !cinematicNarrator.isAudioUnlocked()
  );

  const awaitingUnlockRef = useRef<boolean>(awaitingAudioUnlock);
  awaitingUnlockRef.current = awaitingAudioUnlock;

  const imagesRef = useRef<{
    horizon: HTMLImageElement | null;
    collapse: HTMLImageElement | null;
    awakening: HTMLImageElement | null;
    kingKoopa: HTMLImageElement | null;
    arcadeRoom: HTMLImageElement | null;
  }>({
    horizon: null,
    collapse: null,
    awakening: null,
    kingKoopa: null,
    arcadeRoom: null,
  });

  const timelineRef = useRef<{
    sceneIdx: number;
    sceneElapsed: number;
    shotElapsed: number;
    villainShot: number;
    scene4Cut: number;
    finished: boolean;
  }>({
    sceneIdx: 0,
    sceneElapsed: 0,
    shotElapsed: 0,
    villainShot: 0,
    scene4Cut: 0,
    finished: false,
  });

  const pointerRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });

  // Carga limpia de ilustraciones HD-2D y precarga de locución en español
  useEffect(() => {
    cinematicNarrator.preloadAll();

    const loadImg = (src: string): HTMLImageElement => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      return img;
    };

    imagesRef.current = {
      horizon: loadImg(cosmicHorizonUrl),
      collapse: loadImg(entropyCollapseUrl),
      awakening: loadImg(architectAwakeningUrl),
      kingKoopa: loadImg(kingKoopa16BitUrl),
      arcadeRoom: loadImg(classicArcadeRoomUrl),
    };
  }, []);

  const triggerBeatNarrationAndAudio = useCallback(
    (sIdx: number, vShotIdx = 0) => {
      if (sIdx === 0) {
        bgmEngine.setDuckFactor(0.24);
        cinematicAudio.triggerCueOnce('scene-0-mystery');
        const sc = CINEMATIC_SCENES[0];
        if (sc.clipId) {
          cinematicNarrator.playClip(sc.clipId, sc.speechText || sc.narration, {
            onAutoplayBlocked: () => {
              awaitingUnlockRef.current = true;
              setAwaitingAudioUnlock(true);
            },
          });
        }
      } else if (sIdx === 1) {
        bgmEngine.setDuckFactor(0.25);
        const shot = VILLAIN_SHOTS[vShotIdx] || VILLAIN_SHOTS[0];
        cinematicAudio.triggerCueOnce(shot.cue);
        cinematicNarrator.playClip(shot.clipId, shot.narration);
      } else if (sIdx === 2) {
        bgmEngine.setDuckFactor(0.24);
        cinematicAudio.triggerCueOnce('scene-2-collapse');
        const sc = CINEMATIC_SCENES[2];
        if (sc.clipId) {
          cinematicNarrator.playClip(sc.clipId, sc.speechText || sc.narration);
        }
      } else if (sIdx === 3) {
        bgmEngine.setDuckFactor(0.24);
        cinematicAudio.triggerCueOnce('scene-3-super-cupa');
        cinematicAudio.triggerCueOnce('scene-3-cut-0');
        const sc = CINEMATIC_SCENES[3];
        if (sc.clipId) {
          cinematicNarrator.playClip(sc.clipId, sc.speechText || sc.narration);
        }
      } else if (sIdx === 4) {
        bgmEngine.setDuckFactor(0.12);
        cinematicAudio.triggerCueOnce('scene-4-silence');
        const sc = CINEMATIC_SCENES[4];
        if (sc.clipId) {
          cinematicNarrator.playClip(sc.clipId, sc.speechText || sc.narration);
        }
      } else if (sIdx === 5) {
        bgmEngine.setDuckFactor(0.24);
        cinematicAudio.triggerCueOnce('scene-5-pong-link');
        const sc = CINEMATIC_SCENES[5];
        if (sc.clipId) {
          cinematicNarrator.playClip(sc.clipId, sc.speechText || sc.narration);
        }
      }
    },
    []
  );

  const handleStartNarratedIntro = useCallback(() => {
    // Forzar desmonte inmediato de la cortina de bienvenida sin depender de audio asíncrono
    awaitingUnlockRef.current = false;
    setAwaitingAudioUnlock(false);

    // Intentar desbloqueo de contextos de audio en segundo plano
    retroAudio.unlock();
    void cinematicNarrator.unlockAudioContext();

    timelineRef.current = {
      sceneIdx: 0,
      sceneElapsed: 0,
      shotElapsed: 0,
      villainShot: 0,
      scene4Cut: 0,
      finished: false,
    };
    setSceneIndex(0);
    setVillainShotIndex(0);
    setScene4CutIndex(0);
    setSceneProgressPct(0);
    cinematicAudio.resetRun();
    triggerBeatNarrationAndAudio(0, 0);
  }, [triggerBeatNarrationAndAudio]);

  // Reinicio limpio cuando cambia runKey (ej. inicio o "Repetir cinemática")
  useEffect(() => {
    cinematicAudio.resetRun();
    cinematicNarrator.stopCurrent();

    const unlocked = cinematicNarrator.isAudioUnlocked();
    awaitingUnlockRef.current = !unlocked;
    setAwaitingAudioUnlock(!unlocked);

    timelineRef.current = {
      sceneIdx: 0,
      sceneElapsed: 0,
      shotElapsed: 0,
      villainShot: 0,
      scene4Cut: 0,
      finished: false,
    };
    setSceneIndex(0);
    setVillainShotIndex(0);
    setScene4CutIndex(0);
    setSceneProgressPct(0);

    if (unlocked) {
      triggerBeatNarrationAndAudio(0, 0);
    } else {
      bgmEngine.setDuckFactor(0.35);
    }

    return () => {
      cinematicNarrator.stopCurrent();
      cinematicAudio.stopAll();
      bgmEngine.setDuckFactor(1.0);
    };
  }, [runKey, triggerBeatNarrationAndAudio]);

  const currentScene = CINEMATIC_SCENES[sceneIndex] || CINEMATIC_SCENES[0];
  const activeScene4Cut = SCENE_4_SUB_CUTS[scene4CutIndex] || SCENE_4_SUB_CUTS[0];

  const currentLine =
    sceneIndex === 1
      ? VILLAIN_SHOTS[villainShotIndex]?.narration || currentScene.narration
      : sceneIndex === 3
      ? activeScene4Cut.text
      : currentScene.narration;

  const currentShotDuration =
    sceneIndex === 1
      ? VILLAIN_SHOTS[villainShotIndex]?.duration || 3.2
      : sceneIndex === 3
      ? activeScene4Cut.endTime - activeScene4Cut.startTime
      : currentScene.duration;

  // Hook de máquina de escribir 'useTypewriter' para sincronización perfecta carácter a carácter
  const { displayedText, isComplete: lineFullyTyped } = useTypewriter({
    text: currentLine,
    durationSec: currentShotDuration,
    enabled: !awaitingAudioUnlock,
    targetAudioRatio: 0.82,
  });

  const isSpeaking = cinematicNarrator.isSpeaking();
  // El indicador de avance ▶ solo requiere completado visual del texto o finalización de locución o progreso > 75%
  const showAdvanceIndicator = lineFullyTyped || !isSpeaking || sceneProgressPct >= 75;

  const finishSequence = useCallback(() => {
    if (timelineRef.current.finished) return;
    timelineRef.current.finished = true;
    cinematicNarrator.stopCurrent();
    cinematicAudio.stopAll();
    bgmEngine.setDuckFactor(1.0);
    onCompleteRef.current();
  }, []);

  const handleManualAdvance = useCallback(() => {
    if (awaitingUnlockRef.current) {
      void handleStartNarratedIntro();
      return;
    }
    const ctrl = timelineRef.current;
    if (ctrl.finished) return;

    if (ctrl.sceneIdx === 1) {
      if (ctrl.shotElapsed < 0.25) return;
      cinematicNarrator.stopCurrent();
      if (ctrl.villainShot + 1 < VILLAIN_SHOTS.length) {
        ctrl.villainShot += 1;
        ctrl.shotElapsed = 0;
        setVillainShotIndex(ctrl.villainShot);
        triggerBeatNarrationAndAudio(1, ctrl.villainShot);
      } else {
        ctrl.sceneIdx = 2;
        ctrl.sceneElapsed = 0;
        ctrl.shotElapsed = 0;
        ctrl.villainShot = 0;
        setSceneIndex(2);
        setVillainShotIndex(0);
        triggerBeatNarrationAndAudio(2, 0);
      }
    } else {
      if (ctrl.sceneElapsed < 0.25) return;
      cinematicNarrator.stopCurrent();
      if (ctrl.sceneIdx + 1 < CINEMATIC_SCENES.length) {
        ctrl.sceneIdx += 1;
        ctrl.sceneElapsed = 0;
        ctrl.shotElapsed = 0;
        ctrl.villainShot = 0;
        ctrl.scene4Cut = 0;
        setSceneIndex(ctrl.sceneIdx);
        setVillainShotIndex(0);
        setScene4CutIndex(0);
        triggerBeatNarrationAndAudio(ctrl.sceneIdx, 0);
      } else {
        finishSequence();
      }
    }
  }, [handleStartNarratedIntro, triggerBeatNarrationAndAudio, finishSequence]);

  // Manejo de atajos de teclado: 'H' modo cine, Espacio/Enter avanzan escena
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleManualAdvance();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setHudCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleManualAdvance]);

  // Motor principal de renderizado HD-2D a 60FPS (único bucle RAF limpio)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.nx = (e.clientX / Math.max(1, vw) - 0.5) * 2;
      pointerRef.current.ny = (e.clientY / Math.max(1, vh) - 0.5) * 2;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Estrellas y píxeles blancos deterministas (0 asignaciones por frame)
    const stars = Array.from({ length: 130 }, (_, i) => ({
      x: ((i * 97) % 1000) / 1000,
      y: ((i * 53) % 1000) / 1000,
      size: 1 + (i % 3),
      phase: i * 0.77,
    }));

    const particles: AmbientParticle[] = Array.from({ length: 72 }, (_, i) => ({
      x: ((i * 131) % 1000) / 1000 * vw,
      y: ((i * 73) % 1000) / 1000 * vh,
      vx: ((i % 7) - 3) * 8,
      vy: -10 - (i % 5) * 6,
      size: 2 + (i % 3),
      alpha: 0.3 + (i % 4) * 0.14,
      color: i % 3 === 0 ? '#00f3ff' : i % 3 === 1 ? '#f43f5e' : '#fde047',
      depth: 0.5 + (i % 4) * 0.25,
    }));

    const collapseFragments: {
      kind: 'mario' | 'pacman' | 'dk' | 'sonic';
      angle0: number;
      radiusRatio: number;
      speed: number;
      rotSpeed: number;
      scale: number;
    }[] = [
      { kind: 'mario', angle0: 0.2, radiusRatio: 0.29, speed: 0.38, rotSpeed: 0.55, scale: 1.05 },
      { kind: 'pacman', angle0: 1.75, radiusRatio: 0.33, speed: -0.32, rotSpeed: -0.45, scale: 1.0 },
      { kind: 'dk', angle0: 3.3, radiusRatio: 0.27, speed: 0.41, rotSpeed: 0.48, scale: 1.05 },
      { kind: 'sonic', angle0: 4.85, radiusRatio: 0.34, speed: -0.35, rotSpeed: -0.52, scale: 0.98 },
      { kind: 'mario', angle0: 2.5, radiusRatio: 0.42, speed: 0.24, rotSpeed: -0.35, scale: 0.78 },
      { kind: 'pacman', angle0: 5.6, radiusRatio: 0.41, speed: -0.26, rotSpeed: 0.38, scale: 0.8 },
    ];

    let rafId = 0;
    let prevNow = performance.now();
    const startNow = prevNow;

    const renderFrame = (now: number) => {
      const ctrl = timelineRef.current;
      if (ctrl.finished) return;

      const dt = Math.min(0.05, (now - prevNow) / 1000);
      prevNow = now;
      const elapsed = (now - startNow) / 1000;

      if (!awaitingUnlockRef.current) {
        ctrl.sceneElapsed += dt;
        ctrl.shotElapsed += dt;

        if (ctrl.sceneIdx === 1) {
          const curShotSpec =
            VILLAIN_SHOTS[ctrl.villainShot] || VILLAIN_SHOTS[0];
          // Timeout de seguridad: Máximo 1.8s adicionales por plano de villano
          const maxSafetySec = curShotSpec.duration + 1.8;
          const canAdvanceShot =
            ctrl.shotElapsed >= curShotSpec.duration &&
            (!cinematicNarrator.isSpeaking() || ctrl.shotElapsed >= maxSafetySec);

          if (canAdvanceShot) {
            if (ctrl.villainShot + 1 < VILLAIN_SHOTS.length) {
              ctrl.villainShot += 1;
              ctrl.shotElapsed = 0;
              setVillainShotIndex(ctrl.villainShot);
              triggerBeatNarrationAndAudio(1, ctrl.villainShot);
            } else {
              ctrl.sceneIdx = 2;
              ctrl.sceneElapsed = 0;
              ctrl.shotElapsed = 0;
              ctrl.villainShot = 0;
              setSceneIndex(2);
              setVillainShotIndex(0);
              triggerBeatNarrationAndAudio(2, 0);
            }
          }
        } else {
          if (ctrl.sceneIdx === 3) {
            const rawCut =
              ctrl.sceneElapsed < 2.0
                ? 0
                : ctrl.sceneElapsed < 5.0
                ? 1
                : ctrl.sceneElapsed < 8.0
                ? 2
                : 3;
            const safeCut = Math.min(rawCut, SCENE_4_SUB_CUTS.length - 1);
            if (ctrl.scene4Cut !== safeCut) {
              ctrl.scene4Cut = safeCut;
              setScene4CutIndex(safeCut);
              const cue = SCENE_4_SUB_CUTS[safeCut]?.sfxCue;
              if (cue) {
                cinematicAudio.triggerCueOnce(cue);
              }
            }
          }

          const curSpec =
            CINEMATIC_SCENES[ctrl.sceneIdx] || CINEMATIC_SCENES[0];
          // Timeout de seguridad de 4s máximo por escena
          const maxSafetySec = Math.min(curSpec.duration + 2.0, curSpec.duration + 4.0);
          const canAdvanceScene =
            ctrl.sceneElapsed >= curSpec.duration &&
            (!cinematicNarrator.isSpeaking() || ctrl.sceneElapsed >= maxSafetySec);

          if (canAdvanceScene) {
            if (ctrl.sceneIdx + 1 < CINEMATIC_SCENES.length) {
              ctrl.sceneIdx += 1;
              ctrl.sceneElapsed = 0;
              ctrl.shotElapsed = 0;
              ctrl.villainShot = 0;
              ctrl.scene4Cut = 0;
              setSceneIndex(ctrl.sceneIdx);
              setVillainShotIndex(0);
              setScene4CutIndex(0);
              triggerBeatNarrationAndAudio(ctrl.sceneIdx, 0);
            } else {
              finishSequence();
              return;
            }
          }
        }
      }

      const sIdx = ctrl.sceneIdx;
      const sTime = awaitingUnlockRef.current ? 1.4 : ctrl.sceneElapsed;
      const sDur = CINEMATIC_SCENES[sIdx]?.duration || 12.0;
      const sProg = awaitingUnlockRef.current
        ? 0.22
        : Math.min(1, sTime / sDur);

      if (!awaitingUnlockRef.current && Math.floor(now / 120) !== Math.floor((now - dt * 1000) / 120)) {
        setSceneProgressPct(Math.round(sProg * 100));
      }

      const camX = Math.sin(elapsed * 0.42) * 24 + pointerRef.current.nx * 18;
      const camY = pointerRef.current.ny * 10;
      const pxUnit = Math.max(4, Math.min(6, Math.round(Math.min(vw, vh) / 145)));

      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      ctx.imageSmoothingEnabled = false;

      // ===================================================================
      // ESCENA 1 — EL UNIVERSO ARCADE (Sala Recreativa Clásica de los 80s/90s)
      // ===================================================================
      if (sIdx === 0) {
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, vw, vh);

        const emerge = Math.min(1, Math.max(0, sTime / 0.8));

        // Ilustración de la Sala Arcade Clásica de los 80s/90s llena de gabinetes y neones
        drawCoverImage(
          ctx,
          imagesRef.current.arcadeRoom,
          vw,
          vh,
          emerge,
          -camX * 0.3,
          -camY * 0.15,
          1.05 + Math.sin(elapsed * 0.5) * 0.012
        );

        // Destellos neón y reflejos luminosos en marquesinas y suelos
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const neonPulse = 0.25 + Math.abs(Math.sin(elapsed * 3.8)) * 0.28;

        // Resplandor neón cian (Street Fighter / Galaga)
        const cyanGlow = ctx.createRadialGradient(vw * 0.28, vh * 0.18, 10, vw * 0.28, vh * 0.18, 300);
        cyanGlow.addColorStop(0, `rgba(0, 243, 255, ${0.4 * neonPulse})`);
        cyanGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cyanGlow;
        ctx.fillRect(0, 0, vw, vh * 0.52);

        // Resplandor neón magenta (TMNT / Mortal Kombat)
        const magentaGlow = ctx.createRadialGradient(vw * 0.72, vh * 0.18, 10, vw * 0.72, vh * 0.18, 300);
        magentaGlow.addColorStop(0, `rgba(244, 63, 94, ${0.38 * neonPulse})`);
        magentaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = magentaGlow;
        ctx.fillRect(0, 0, vw, vh * 0.52);

        // Reflejos en el suelo pulido del salón recreativo
        const floorReflectionY = vh * 0.76;
        const reflectionAlpha = 0.14 + Math.sin(elapsed * 4.2) * 0.06;
        ctx.fillStyle = `rgba(0, 243, 255, ${reflectionAlpha})`;
        ctx.fillRect(vw * 0.06, floorReflectionY, vw * 0.38, vh - floorReflectionY);
        ctx.fillStyle = `rgba(234, 179, 8, ${reflectionAlpha * 0.95})`;
        ctx.fillRect(vw * 0.52, floorReflectionY, vw * 0.42, vh - floorReflectionY);
        ctx.restore();

        // Parpadeo sutil de escaneo CRT en las pantallas de las máquinas
        if (Math.sin(elapsed * 18) > 0.82) {
          const scanY = (elapsed * 250) % vh;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(0, scanY, vw, 3);
        }
      }

      // ===================================================================
      // ESCENA 2 — LOS VILLANOS (5 Planos Cinematográficos Dedicados)
      // ===================================================================
      else if (sIdx === 1) {
        const shotIdx = ctrl.villainShot;
        const shotSpec = VILLAIN_SHOTS[shotIdx] || VILLAIN_SHOTS[0];
        const shotTime = ctrl.shotElapsed;
        const shotProg = Math.min(1, shotTime / shotSpec.duration);

        // Curva suave de entrada de cámara por plano
        const enterEase = 1 - Math.pow(1 - Math.min(1, shotTime / 0.55), 3);

        // --- PLANO 2.1: KING KOOPA (BOWSER) EN SU CASTILLO 16 BITS ---
        if (shotIdx === 0) {
          ctx.fillStyle = '#140507';
          ctx.fillRect(0, 0, vw, vh);

          const quakeX = Math.sin(elapsed * 28) * 3 * shotProg;

          // Ilustración 16-bit adaptada de King Koopa
          drawCoverImage(
            ctx,
            imagesRef.current.kingKoopa,
            vw,
            vh,
            1.0,
            -camX * 0.35 + quakeX,
            -camY * 0.2,
            1.04 + shotProg * 0.05
          );

          // Llamaradas y chispas 16-bit emergiendo de la base
          const bridgeY = vh * 0.72;
          for (let f = 0; f < 6; f++) {
            const fx = vw * (0.12 + f * 0.15) + quakeX;
            const fy =
              bridgeY +
              15 -
              Math.abs(Math.sin(elapsed * 3.8 + f * 1.3)) * (65 + f * 10);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(Math.round(fx - 6), Math.round(fy - 6), 12, 16);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(Math.round(fx - 3), Math.round(fy - 3), 6, 8);
          }
        }

        // --- PLANO 2.2: DR. EGGMAN EN SU LABORATORIO SOBRECARGADO ---
        else if (shotIdx === 1) {
          const bg = ctx.createLinearGradient(0, 0, 0, vh);
          bg.addColorStop(0, '#070d19');
          bg.addColorStop(0.65, '#0f172a');
          bg.addColorStop(1, '#090d16');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, vw, vh);

          const floorY = vh * 0.73;

          // Tuberías industriales y balizas de alerta del laboratorio
          ctx.fillStyle = '#1e293b';
          for (let p = 0; p < 6; p++) {
            const pxPos = vw * (0.1 + p * 0.16) - camX * 0.25;
            ctx.fillRect(pxPos, 0, 26, floorY);
            ctx.fillStyle = '#334155';
            ctx.fillRect(pxPos + 4, 0, 6, floorY);
            ctx.fillStyle = '#1e293b';
          }

          // Alerta roja pulsante en techo del laboratorio
          const alarmPulse = 0.25 + Math.abs(Math.sin(elapsed * 8)) * 0.55;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(239, 68, 68, ${alarmPulse * 0.22})`;
          ctx.fillRect(0, 0, vw, vh * 0.35);
          ctx.restore();

          // Plataforma industrial con bandas amarillo/negro de peligro
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, floorY, vw, vh - floorY);
          for (let s = -40; s < vw + 40; s += 36) {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(s, floorY, 18, 10);
            ctx.fillStyle = '#09090b';
            ctx.fillRect(s + 18, floorY, 18, 10);
          }

          // Máquina tecnológica maestra perdiendo el control (derecha)
          const machX = vw * 0.64;
          const machJitter = Math.sin(elapsed * 42) * 4 * shotProg;
          ctx.fillStyle = '#334155';
          ctx.fillRect(machX - 65 + machJitter, floorY - 165, 130, 165);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(machX - 48 + machJitter, floorY - 145, 96, 86);
          // Núcleo inestable sobrecargado
          const coreColor = Math.floor(elapsed * 12) % 2 === 0 ? '#38bdf8' : '#f43f5e';
          ctx.fillStyle = coreColor;
          ctx.fillRect(machX - 34 + machJitter, floorY - 130, 68, 56);

          // Arcos eléctricos saltando de la máquina fuera de control
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          for (let a = 0; a < 4; a++) {
            ctx.beginPath();
            ctx.moveTo(machX + machJitter, floorY - 102);
            ctx.lineTo(
              machX + Math.cos(elapsed * 15 + a * 1.7) * 95,
              floorY - 102 + Math.sin(elapsed * 17 + a * 2.1) * 75
            );
            ctx.stroke();
          }

          // DR. EGGMAN junto a la consola sobrecargada
          const eggX = vw * (0.28 + enterEase * 0.1);
          drawEggmanClassic(ctx, eggX, floorY, pxUnit + 1, elapsed);
        }

        // --- PLANO 2.3: UNIVERSO DONKEY KONG (KING K. ROOL Y DONKEY KONG) ---
        else if (shotIdx === 2) {
          const bg = ctx.createLinearGradient(0, 0, 0, vh);
          bg.addColorStop(0, '#071712');
          bg.addColorStop(0.55, '#0f291e');
          bg.addColorStop(1, '#090d16');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, vw, vh);

          // Vigas metálicas rojas del arcade clásico de 1981 en plano medio izquierdo
          const girderY = vh * 0.56;
          ctx.save();
          ctx.translate(vw * 0.3 - camX * 0.35, girderY);
          ctx.rotate(-0.04);
          ctx.fillStyle = '#be123c';
          ctx.fillRect(-150, 0, 300, 8);
          ctx.fillRect(-150, 18, 300, 8);
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 2.5;
          for (let z = -140; z < 130; z += 28) {
            ctx.beginPath();
            ctx.moveTo(z, 8);
            ctx.lineTo(z + 14, 18);
            ctx.lineTo(z + 28, 8);
            ctx.stroke();
          }
          ctx.restore();

          // Barriles clásicos flotando al perderse la gravedad
          for (let b = 0; b < 3; b++) {
            const bx = vw * (0.14 + b * 0.14);
            const by = vh * 0.34 - shotProg * 28 + Math.sin(elapsed * 3 + b) * 10;
            ctx.fillStyle = '#b45309';
            ctx.fillRect(bx - 14, by - 10, 28, 20);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(bx - 10, by - 10, 4, 20);
            ctx.fillRect(bx + 6, by - 10, 4, 20);
          }

          // DONKEY KONG sobre la estructura de vigas (izquierda, con su corbata DK)
          drawDonkeyKongClassic(
            ctx,
            vw * (0.25 + enterEase * 0.05) - camX * 0.35,
            girderY,
            pxUnit,
            elapsed
          );

          // Estructura antigua de piedra (templo Kremling) en primer plano derecho
          const templeY = vh * 0.74;
          ctx.fillStyle = '#292524';
          ctx.fillRect(vw * 0.48, templeY, vw * 0.52, vh - templeY);
          ctx.fillStyle = '#57534e';
          ctx.fillRect(vw * 0.48, templeY, vw * 0.52, 10);
          // Pilares tallados antiguos agrietándose
          ctx.fillStyle = '#44403c';
          ctx.fillRect(vw * 0.82, templeY - 170, 44, 170);
          ctx.fillStyle = '#15803d';
          ctx.fillRect(vw * 0.82, templeY - 120, 12, 65); // Lianas

          // KING K. ROOL observando el colapso desde el templo antiguo
          drawKingKRoolClassic(
            ctx,
            vw * (0.76 - enterEase * 0.08),
            templeY,
            pxUnit + 1,
            elapsed
          );
        }

        // --- PLANO 2.4: BLINKY, PINKY, INKY Y CLYDE EN EL LABERINTO PAC-MAN ---
        else if (shotIdx === 3) {
          ctx.fillStyle = '#010208';
          ctx.fillRect(0, 0, vw, vh);

          const corridorTop = vh * 0.34;
          const corridorBot = vh * 0.66;
          const disintegrateX = vw * (0.86 - shotProg * 0.28);

          // Paredes dobles azul neón del laberinto clásico desintegrándose a la derecha
          ctx.strokeStyle = '#2121de';
          ctx.lineWidth = 4;
          for (let segX = 24; segX < vw - 24; segX += 34) {
            const broken = segX > disintegrateX;
            const driftY = broken ? (segX - disintegrateX) * 0.32 * Math.sin(segX) : 0;
            const alpha = broken ? Math.max(0, 1 - (segX - disintegrateX) / 220) : 1;
            ctx.globalAlpha = alpha;
            ctx.strokeRect(segX, corridorTop - 16 + driftY, 28, 12);
            ctx.strokeRect(segX, corridorBot + 4 - driftY, 28, 12);

            // Pac-dots clásicos en el pasillo
            if (!broken && segX % 68 === 24) {
              ctx.fillStyle = '#ffb8ae';
              ctx.fillRect(
                segX + 10,
                (corridorTop + corridorBot) / 2 - 4,
                8,
                8
              );
            }
          }
          ctx.globalAlpha = 1;

          // Power Pellet clásico parpadeando
          if (Math.floor(elapsed * 6) % 2 === 0) {
            ctx.fillStyle = '#ffb8ae';
            ctx.fillRect(vw * 0.14, (corridorTop + corridorBot) / 2 - 11, 22, 22);
          }

          // Píxeles azules desprendiéndose de las paredes fracturadas
          for (let p = 0; p < 18; p++) {
            const pxFrag = disintegrateX + ((p * 29 + elapsed * 70) % 180);
            const pyFrag =
              corridorTop - 20 + ((p * 47) % (corridorBot - corridorTop + 40));
            ctx.fillStyle = p % 3 === 0 ? '#00f3ff' : '#2121de';
            ctx.fillRect(pxFrag, pyFrag, 6, 6);
          }

          // Los 4 fantasmas auténticos atravesando el laberinto en formación
          const ghosts: PacGhostId[] = ['blinky', 'pinky', 'inky', 'clyde'];
          const ghostScale = Math.max(5, pxUnit + 1);
          ghosts.forEach((gid, idx) => {
            const gx =
              vw * (0.72 - shotProg * 0.24) +
              idx * (ghostScale * 17) -
              (1.5 * ghostScale * 17) * 0.4;
            const gy =
              corridorBot -
              14 +
              Math.sin(elapsed * 6 + idx * 1.1) * 4;
            drawPacManGhostClassic(ctx, gx, gy, ghostScale, gid, elapsed, -1);
          });
        }

        // --- PLANO 2.5: BISON, DR. WILY Y GANONDORF EN FRAGMENTOS DE SUS MUNDOS ---
        else {
          const bg = ctx.createRadialGradient(
            vw / 2,
            vh * 0.45,
            30,
            vw / 2,
            vh * 0.5,
            Math.max(vw, vh) * 0.75
          );
          bg.addColorStop(0, '#1e0b36');
          bg.addColorStop(0.55, '#090516');
          bg.addColorStop(1, '#020108');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, vw, vh);

          // Grietas dimensionales luminosas separando los 3 dominios
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(vw * 0.35, vh * 0.12);
          ctx.lineTo(vw * 0.32, vh * 0.82);
          ctx.moveTo(vw * 0.65, vh * 0.12);
          ctx.lineTo(vw * 0.68, vh * 0.82);
          ctx.stroke();

          // 1) Izquierda: M. BISON sobre losa flotante de templo
          const leftY = vh * 0.68 + Math.sin(elapsed * 2.2) * 6;
          ctx.fillStyle = '#334155';
          ctx.fillRect(vw * 0.11, leftY, vw * 0.2, 16);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(vw * 0.11, leftY, vw * 0.2, 4);
          drawMBisonClassic(ctx, vw * 0.21, leftY, pxUnit, elapsed);

          // 2) Centro-Arriba: DR. WILY en su Wily Capsule entre engranes de fortaleza
          drawDrWilyCapsule(ctx, vw * 0.5, vh * 0.44, pxUnit, elapsed);

          // 3) Derecha: GANONDORF entre columnas hylianas rotas
          const rightY = vh * 0.69 + Math.cos(elapsed * 2.1) * 6;
          ctx.fillStyle = '#44403c';
          ctx.fillRect(vw * 0.69, rightY, vw * 0.2, 16);
          drawGanondorfClassic(ctx, vw * 0.78, rightY, pxUnit, elapsed);
        }
      }

      // ===================================================================
      // ESCENA 3 — EL COLAPSO (Mundos mezclándose, grietas y separación RGB)
      // ===================================================================
      else if (sIdx === 2) {
        ctx.fillStyle = '#03010a';
        ctx.fillRect(0, 0, vw, vh);

        drawCoverImage(
          ctx,
          imagesRef.current.collapse,
          vw,
          vh,
          0.44,
          -camX * 0.35,
          -camY * 0.25,
          1.04 + sProg * 0.08
        );

        const cx = vw / 2;
        const cy = vh * 0.45;

        // Grietas digitales luminosas y separación cromática controlada
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let c = 0; c < 6; c++) {
          const ang = (c / 6) * Math.PI * 2 + elapsed * 0.22;
          const len = Math.min(vw, vh) * (0.22 + sProg * 0.26);
          const midX = cx + Math.cos(ang + 0.18) * (len * 0.52);
          const midY = cy + Math.sin(ang + 0.18) * (len * 0.52);
          const endX = cx + Math.cos(ang) * len;
          const endY = cy + Math.sin(ang) * len;

          // Canal Cian desplazado
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 3, cy);
          ctx.lineTo(midX - 4, midY);
          ctx.lineTo(endX - 3, endY);
          ctx.stroke();

          // Canal Magenta desplazado
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
          ctx.beginPath();
          ctx.moveTo(cx + 3, cy);
          ctx.lineTo(midX + 4, midY);
          ctx.lineTo(endX + 3, endY);
          ctx.stroke();
        }
        ctx.restore();

        // Fragmentos reconocibles de los distintos mundos orbitando sin gravedad
        collapseFragments.forEach((frag, idx) => {
          const ang = frag.angle0 + elapsed * frag.speed;
          const rad =
            Math.min(vw, vh) *
            frag.radiusRatio *
            (1 - sProg * 0.28 + Math.sin(elapsed * 2 + idx) * 0.04);
          const fx = cx + Math.cos(ang) * rad * 1.35 - camX * 0.3;
          const fy = cy + Math.sin(ang) * rad * 0.78 - camY * 0.3;
          drawWorldRelicFragment(
            ctx,
            frag.kind,
            fx,
            fy,
            elapsed * frag.rotSpeed,
            frag.scale
          );
        });
      }

      // ===================================================================
      // ESCENA 4 — IRRUPCIÓN DE KING KOOPA (4 Cortes Rápidos: Realismo vs. Pixel)
      // ===================================================================
      else if (sIdx === 3) {
        const cutTime = sTime;
        const cx = vw / 2;
        const cy = vh * 0.45;

        // --- CORTE RÁPIDO 1 (00:00 - 00:02.0): Primer plano extremo de Ojo de Reptil Rojo ---
        if (cutTime < 2.0) {
          const t1 = cutTime / 2.0;
          ctx.fillStyle = '#050208';
          ctx.fillRect(0, 0, vw, vh);

          // Fondo con resplandor ígneo rojizo
          const eyeBg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(vw, vh) * 0.6);
          eyeBg.addColorStop(0, '#7f1d1d');
          eyeBg.addColorStop(0.5, '#450a0a');
          eyeBg.addColorStop(1, '#020104');
          ctx.fillStyle = eyeBg;
          ctx.fillRect(0, 0, vw, vh);

          // Latido / apertura de párpado
          const eyeOpen = Math.min(1, Math.pow(t1 * 1.5, 2));
          const heartbeat = 1 + Math.sin(t1 * Math.PI * 8) * 0.04;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(heartbeat, heartbeat);

          // Piel con escamas rugosas hiper-detalladas alrededor del ojo
          const eyeRadius = Math.min(vw, vh) * 0.32;
          
          for (let ring = 5; ring >= 1; ring--) {
            const r = eyeRadius * (0.4 + ring * 0.15);
            ctx.fillStyle = ring % 2 === 0 ? '#15803d' : '#166534';
            ctx.beginPath();
            ctx.ellipse(0, 0, r, Math.max(2, r * eyeOpen * 0.75), 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#052e16';
            ctx.lineWidth = 3;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8 * eyeOpen);
              ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * eyeOpen);
              ctx.stroke();
            }
          }

          // Globo ocular carnoso / rojizo
          const eyeGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, eyeRadius * 0.55);
          eyeGlow.addColorStop(0, '#fef08a');
          eyeGlow.addColorStop(0.3, '#f97316');
          eyeGlow.addColorStop(0.7, '#dc2626');
          eyeGlow.addColorStop(1, '#7f1d1d');

          ctx.beginPath();
          ctx.ellipse(0, 0, eyeRadius * 0.55, Math.max(2, eyeRadius * 0.55 * eyeOpen), 0, 0, Math.PI * 2);
          ctx.fillStyle = eyeGlow;
          ctx.fill();

          // Pupila de reptil rasgada / vertical
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.ellipse(0, 0, eyeRadius * 0.08, Math.max(1, eyeRadius * 0.42 * eyeOpen), 0, 0, Math.PI * 2);
          ctx.fill();

          // Matriz de píxeles 16-bits colapsando reflejada dentro de la pupila
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (let pxRow = -4; pxRow <= 4; pxRow++) {
            for (let pxCol = -2; pxCol <= 2; pxCol++) {
              if (Math.sin(elapsed * 12 + pxRow * 3 + pxCol) > 0.1) {
                ctx.fillStyle = (pxRow + pxCol) % 2 === 0 ? '#00f3ff' : '#f43f5e';
                ctx.fillRect(
                  pxCol * 6 - 2,
                  pxRow * 8 - 3,
                  4,
                  5
                );
              }
            }
          }
          ctx.restore();

          // Párpados pesados cerrándose ligeramente por arriba y abajo en la apertura
          ctx.fillStyle = '#0f172a';
          const lidOffset = eyeRadius * (1 - eyeOpen);
          ctx.fillRect(-vw / 2, -vh / 2, vw, lidOffset + 40);
          ctx.fillRect(-vw / 2, vh / 2 - lidOffset - 40, vw, lidOffset + 40);

          ctx.restore();
        }

        // --- CORTE RÁPIDO 2 (00:02.0 - 00:05.0): Contrapicado King Koopa Fotorrealista entre Bloques '?' 16-bits ---
        else if (cutTime < 5.0) {
          const t2 = (cutTime - 2.0) / 3.0;
          ctx.fillStyle = '#0a0212';
          ctx.fillRect(0, 0, vw, vh);

          // Fondo cósmico con nebulosas carmesí y púrpura
          drawCoverImage(
            ctx,
            imagesRef.current.kingKoopa,
            vw,
            vh,
            0.88,
            -camX * 0.4,
            -camY * 0.2,
            1.05 + t2 * 0.08
          );

          // Bloques '?' abstractos de 16-bits y debris flotando alrededor en vacío cósmico
          const qBlocks = [
            { x: vw * 0.18, y: vh * 0.28, rot: 0.15, scale: 1.2 },
            { x: vw * 0.82, y: vh * 0.22, rot: -0.22, scale: 1.1 },
            { x: vw * 0.22, y: vh * 0.72, rot: -0.3, scale: 0.9 },
            { x: vw * 0.78, y: vh * 0.75, rot: 0.28, scale: 1.0 },
          ];

          qBlocks.forEach((qb, i) => {
            const floatY = qb.y + Math.sin(elapsed * 3 + i) * 12;
            drawWorldRelicFragment(ctx, 'mario', qb.x, floatY, qb.rot + Math.sin(elapsed) * 0.05, qb.scale);
          });

          // Ondas expansivas de rugido distorsionando la matriz digital
          const roarR = (t2 * 600) % 450;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy - 20, roarR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy - 20, Math.max(1, roarR - 40), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          if (Math.sin(elapsed * 22) > 0.6) {
            const gy = (elapsed * 320) % vh;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
            ctx.fillRect(0, gy, vw, 6);
          }
        }

        // --- CORTE RÁPIDO 3 (00:05.0 - 00:08.0): Zoom Dinámico y Puño Hiper-Realista Rompiendo la Red de Píxeles ---
        else if (cutTime < 8.0) {
          const t3 = (cutTime - 5.0) / 3.0;
          ctx.fillStyle = '#140307';
          ctx.fillRect(0, 0, vw, vh);

          const flash = Math.max(0, 1 - t3 * 2.5);
          if (flash > 0.01) {
            ctx.fillStyle = `rgba(254, 240, 138, ${flash * 0.65})`;
            ctx.fillRect(0, 0, vw, vh);
          }

          const fistX = cx + Math.sin(t3 * 3) * 10;
          const fistY = cy + (1 - Math.pow(Math.min(1, t3 * 2), 0.5)) * 120;

          ctx.save();
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
          ctx.lineWidth = 2;
          for (let r = 0; r < 8; r++) {
            const rad = 60 + r * 45 + t3 * 60;
            ctx.beginPath();
            ctx.arc(fistX, fistY, rad, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.5;
          for (let a = 0; a < 10; a++) {
            const ang = (a / 10) * Math.PI * 2 + t3 * 0.2;
            const length = 120 + t3 * 300;
            ctx.beginPath();
            ctx.moveTo(fistX, fistY);
            ctx.lineTo(fistX + Math.cos(ang) * length, fistY + Math.sin(ang) * length);
            ctx.stroke();
          }
          ctx.restore();

          // Renderizado del Puño Hiper-Realista en primer plano
          ctx.save();
          ctx.translate(fistX, fistY);
          const fistScale = 1.4 + t3 * 0.3;
          ctx.scale(fistScale, fistScale);

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-65, -25, 130, 32);
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(-45, -25); ctx.lineTo(-35, -55); ctx.lineTo(-25, -25);
          ctx.moveTo(0, -25); ctx.lineTo(10, -60); ctx.lineTo(20, -25);
          ctx.moveTo(45, -25); ctx.lineTo(55, -55); ctx.lineTo(65, -25);
          ctx.fill();

          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(0, 25, 55, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#166534';
          ctx.fillRect(-35, 10, 70, 30);

          ctx.fillStyle = '#fef3c7';
          for (let c = -2; c <= 2; c++) {
            ctx.beginPath();
            ctx.arc(c * 20, 50, 10, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          for (let p = 0; p < 24; p++) {
            const pxAng = (p / 24) * Math.PI * 2 + elapsed * 2;
            const pxDist = (t3 * 500 + p * 18) % 450;
            const pxX = fistX + Math.cos(pxAng) * pxDist;
            const pxY = fistY + Math.sin(pxAng) * pxDist;
            ctx.fillStyle = p % 2 === 0 ? '#dc2626' : '#9d00ff';
            ctx.fillRect(pxX, pxY, 8, 8);
          }
        }

        // --- CORTE RÁPIDO 4 (00:08.0 - 00:10.0): Perfil Sonrisa Malvada, Red Corrupta Girando & Título ---
        else {
          const t4 = (cutTime - 8.0) / 2.0;
          ctx.fillStyle = '#05010a';
          ctx.fillRect(0, 0, vw, vh);

          const pullBack = 1.2 - t4 * 0.25;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(pullBack, pullBack);

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (let v = 0; v < 5; v++) {
            const vRot = elapsed * 1.8 * (v % 2 === 0 ? 1 : -1) + v;
            ctx.strokeStyle = v % 2 === 0 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(168, 85, 247, 0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 240 + v * 35, 80 + v * 18, vRot, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          drawSuperCupaSovereign(ctx, 0, 0, pxUnit + 1, elapsed);

          ctx.restore();

          if (t4 > 0.15) {
            const titleAlpha = Math.min(1, (t4 - 0.15) * 3);
            ctx.save();
            ctx.globalAlpha = titleAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 18;
            ctx.font = '900 26px "Press Start 2P", "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PIXELVERSE', cx, vh * 0.18);

            ctx.fillStyle = '#fde047';
            ctx.font = '700 13px "Press Start 2P", "Courier New", monospace';
            ctx.fillText('SUPER KING KOOPA', cx, vh * 0.24);
            ctx.restore();
          }
        }
      }

      // ===================================================================
      // ESCENA 5 — EL NACIMIENTO DE PIXEL (Silencio -> Píxel Blanco -> Pixel)
      // ===================================================================
      else if (sIdx === 4) {
        // Atenuación suave de la música para escuchar la narración sobre el vacío contemplativo
        const targetDuck = sTime < 3.6 ? 0.1 : 0.22;
        bgmEngine.setDuckFactor(targetDuck);

        ctx.fillStyle = '#010207';
        ctx.fillRect(0, 0, vw, vh);

        const sparkAppear = Math.min(1, Math.max(0, (sTime - 3.6) / 1.2));
        const architectAppear = Math.min(1, Math.max(0, (sTime - 6.0) / 1.8));

        if (sTime >= 3.6) {
          cinematicAudio.triggerCueOnce('scene-4-pixel-birth');
        }

        drawCoverImage(
          ctx,
          imagesRef.current.awakening,
          vw,
          vh,
          architectAppear * 0.3,
          -camX * 0.18,
          -camY * 0.12,
          1.04 + architectAppear * 0.06
        );

        const pxX = vw / 2 - camX * 0.2;
        const pxY = vh * 0.45;

        if (sparkAppear > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const pulse = 1 + Math.sin(elapsed * 4.2) * 0.08;
          const haloR = (90 + architectAppear * 95) * sparkAppear * pulse;
          const halo = ctx.createRadialGradient(pxX, pxY, 2, pxX, pxY, haloR);
          halo.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
          halo.addColorStop(0.22, 'rgba(0, 243, 255, 0.72)');
          halo.addColorStop(0.55, 'rgba(14, 165, 233, 0.18)');
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(pxX, pxY, haloR, 0, Math.PI * 2);
          ctx.fill();

          // Destello horizontal y vertical limpio
          ctx.fillStyle = `rgba(0, 243, 255, ${0.42 * sparkAppear})`;
          ctx.fillRect(pxX - 110 * sparkAppear, pxY - 1, 220 * sparkAppear, 2);
          ctx.fillRect(pxX - 1, pxY - 75 * sparkAppear, 2, 150 * sparkAppear);
          ctx.restore();

          if (architectAppear < 0.85) {
            // El Único Píxel Blanco Puro expandiéndose
            const sq = Math.round((14 + architectAppear * 20) * sparkAppear);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(Math.round(pxX - sq / 2), Math.round(pxY - sq / 2), sq, sq);
          }
        }

        // Nacimiento de Pixel, el Arquitecto, con acercamiento suave de cámara
        if (architectAppear > 0.05) {
          const zoomUnit = Math.round((pxUnit + 1) * (0.9 + architectAppear * 0.35));
          drawPixelArchitectCrisp(
            ctx,
            pxX,
            pxY + zoomUnit * 7,
            zoomUnit,
            architectAppear
          );

          // Pequeños fragmentos del universo reaccionando e iluminándose alrededor
          for (let f = 0; f < 8; f++) {
            const ang = (f / 8) * Math.PI * 2 + elapsed * 0.55;
            const rx = 140 + Math.sin(elapsed * 2 + f) * 12;
            const ry = 64;
            const fx = pxX + Math.cos(ang) * rx;
            const fy = pxY + Math.sin(ang) * ry;
            ctx.fillStyle = f % 2 === 0 ? '#00f3ff' : '#fde047';
            ctx.globalAlpha = architectAppear * 0.85;
            ctx.fillRect(Math.round(fx - 4), Math.round(fy - 4), 8, 8);
          }
          ctx.globalAlpha = 1;
        }
      }

      // ===================================================================
      // ESCENA 6 — CONEXIÓN CON PONG (Gabinete 1972 y Zoom hacia la partida)
      // ===================================================================
      else if (sIdx === 5) {
        bgmEngine.setDuckFactor(
          cinematicNarrator.isSpeaking() ? 0.24 : Math.min(0.85, 0.35 + sProg * 0.5)
        );

        const bg = ctx.createRadialGradient(
          vw / 2,
          vh * 0.44,
          20,
          vw / 2,
          vh * 0.48,
          Math.max(vw, vh) * 0.8
        );
        bg.addColorStop(0, '#09182e');
        bg.addColorStop(0.55, '#030712');
        bg.addColorStop(1, '#010206');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, vw, vh);

        // Zoom progresivo de cámara aproximándose al monitor de Pong
        const zoomT = Math.pow(Math.max(0, (sProg - 0.18) / 0.82), 1.85);
        const cabScale = 1 + zoomT * 2.45;
        const cabCx = vw / 2;
        const cabCy = vh * 0.45;

        ctx.save();
        ctx.translate(cabCx, cabCy);
        ctx.scale(cabScale, cabScale);

        // Resplandor dorado/cian del primer fragmento arcade de 1972
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 145);
        aura.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
        aura.addColorStop(0.5, 'rgba(0, 243, 255, 0.18)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 145, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Gabinete Amarillo Clásico de PONG (1972)
        ctx.fillStyle = '#a16207';
        ctx.fillRect(-76, -104, 152, 208);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-72, -100, 144, 200);
        // Marquesina superior PONG 1972
        ctx.fillStyle = '#171717';
        ctx.fillRect(-62, -92, 124, 22);
        ctx.fillStyle = '#fde047';
        ctx.font = '700 12px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P O N G  ·  1 9 7 2', 0, -77);

        // Bisel hundido y pantalla CRT real en espera (0 - 0, meta 3 puntos)
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-58, -62, 116, 84);
        ctx.fillStyle = '#030812';
        ctx.fillRect(-52, -56, 104, 72);

        // Red punteada central, 2 paletas blancas y pelota en espera viva
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let ny = -50; ny < 12; ny += 10) {
          ctx.fillRect(-1, ny, 2, 5);
        }
        const pad1Y = -28 + Math.sin(elapsed * 3.5) * 14;
        const pad2Y = -28 - Math.sin(elapsed * 3.5) * 14;
        const bx = Math.sin(elapsed * 3.5) * 34;
        const by = -20 + Math.cos(elapsed * 5.2) * 16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-44, Math.round(pad1Y), 4, 18);
        ctx.fillRect(40, Math.round(pad2Y), 4, 18);
        ctx.fillRect(Math.round(bx - 2), Math.round(by - 2), 4, 4);

        // Marcador limpio 0 - 0 listo para jugar
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText('0', -20, -42);
        ctx.fillText('0', 20, -42);

        // Panel de control amarillo/negro inferior
        ctx.fillStyle = '#171717';
        ctx.fillRect(-62, 30, 124, 16);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-28, 38, 4, 0, Math.PI * 2);
        ctx.arc(28, 38, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pixel frente al gabinete observándolo antes de fundirse en el zoom
        const pixelFade = Math.max(0, 1 - zoomT * 1.45);
        if (pixelFade > 0.04) {
          drawPixelArchitectCrisp(
            ctx,
            vw * 0.28,
            vh * 0.68,
            pxUnit + 1,
            pixelFade
          );
        }
      }

      // ===================================================================
      // PARTÍCULAS AMBIENTALES MODERADAS Y VIÑETA CINEMATOGRÁFICA
      // ===================================================================
      if (sIdx !== 4 || sTime > 2.2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx * p.depth * dt;
          p.y += p.vy * p.depth * dt;
          if (p.y < -8) p.y = vh + 8;
          if (p.x < -8) p.x = vw + 8;
          if (p.x > vw + 8) p.x = -8;

          ctx.fillStyle = sIdx === 3 ? '#f43f5e' : p.color;
          ctx.globalAlpha = sIdx === 4 ? p.alpha * 0.45 : p.alpha * 0.65;
          const sz = Math.round(p.size * p.depth);
          ctx.fillRect(Math.round(p.x - camX * 0.25 * p.depth), Math.round(p.y), sz, sz);
        }
        ctx.restore();
      }

      // Viñeta óptica suave para contraste cinematográfico
      const vig = ctx.createRadialGradient(
        vw / 2,
        vh / 2,
        Math.min(vw, vh) * 0.34,
        vw / 2,
        vh / 2,
        Math.max(vw, vh) * 0.74
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(1, 2, 8, 0.76)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, vw, vh);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [runKey, finishSequence, triggerBeatNarrationAndAudio]);

  return (
    <div
      onClick={awaitingAudioUnlock ? () => void handleStartNarratedIntro() : undefined}
      className={`relative w-full h-full overflow-hidden bg-black select-none ${
        awaitingAudioUnlock ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <canvas
        id="hd2d-cinematic-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 block crisp-arcade-canvas"
      />

      {/* Cortina inicial estilo Pantalla de Título Arcade 16-bits (CPS-2 / Neo-Geo) */}
      {awaitingAudioUnlock && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-[1px] px-4 select-none">
          <div className="bg-black border-4 border-[#00f3ff] p-1 rounded-none shadow-[inset_0_0_0_2px_#000000,inset_0_0_0_4px_#dc2626,0_0_25px_rgba(0,243,255,0.65)] max-w-lg w-full text-center font-mono">
            <div className="bg-black p-6 sm:p-8 space-y-4 border-2 border-[#00f3ff]/40">
              
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-[#00f3ff] tracking-widest uppercase">
                  ★ PIXELVERSE SYSTEM 16-BIT ★
                </p>
                <h2 className="font-mono text-xl sm:text-2xl font-black text-[#f2c94c] uppercase tracking-wider drop-shadow-[2px_2px_0px_#000000]">
                  EL REINICIO ARCADE
                </h2>
                
                {/* Línea divisoria nítida por puntos de luz - - - - - */}
                <div className="text-[#00f3ff]/70 text-xs tracking-[0.25em] font-mono select-none py-0.5">
                  - - - - - - - - - - - - - - - -
                </div>

                <p className="text-[11px] sm:text-xs font-mono text-slate-200 tracking-wide leading-relaxed">
                  PRÓLOGO NARRADO EN ESPAÑOL · MUNDOS Y ANTAGONISTAS LEGENDARIOS
                </p>
              </div>

              {/* Botón Acción Rojo Arcade Clásico de los 90 con Borde Blanco Sólido */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartNarratedIntro();
                  }}
                  className="w-full bg-[#dc2626] hover:bg-[#ef4444] active:bg-[#b91c1c] text-white border-2 border-white px-5 py-4 font-mono font-black text-sm sm:text-base uppercase tracking-widest cursor-pointer shadow-[inset_0_0_0_2px_#000000,0_0_0_2px_#000000,4px_4px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="text-[#f2c94c] group-hover:text-white font-bold animate-pulse text-lg">
                    ►
                  </span>
                  <span className="animate-pulse">INSERT COIN / PRESS START</span>
                </button>
              </div>

              <p className="text-[10px] sm:text-[11px] font-mono text-amber-300 tracking-widest uppercase animate-pulse">
                CREDIT 00 · PULSA PARA INICIAR LA HISTORIA
              </p>

            </div>
          </div>
        </div>
      )}

      {/* Recuadro de Texto NES Clásico con marco doble, texto blanco y amarillo, y botón SIGUIENTE ▶ */}
      {!awaitingAudioUnlock && (
        <div
          id="cinematic-hud"
          className={`absolute left-1/2 -translate-x-1/2 bottom-4 w-[min(840px,94vw)] z-20 transition-transform duration-200 ${
            hudCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
          }`}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setHudCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 text-[10px] font-mono text-white bg-black border-t-2 border-x-2 border-white cursor-pointer whitespace-nowrap shrink-0 hover:text-[#f2c94c]"
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>MOSTRAR TEXTO NES</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>MODO CINE (H)</span>
                </>
              )}
            </button>
          </div>

          {/* NES RPG Box: Negro sólido, borde doble blanco en ángulo recto */}
          <div className="bg-black border-4 border-white p-1 rounded-none shadow-[inset_0_0_0_2px_#000000,inset_0_0_0_4px_#ffffff]">
            <div className="bg-black p-4 sm:p-5 relative font-mono text-white text-xs sm:text-base leading-relaxed tracking-wider min-h-[115px] flex flex-col justify-between select-none">
              
              {/* Título o Nombres destacados en Amarillo NES (#f2c94c) y Botón de Acción SIGUIENTE ▶ */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b-2 border-dashed border-white/30 font-bold">
                <span className="text-[#f2c94c] text-xs sm:text-sm font-bold tracking-wider font-mono uppercase">
                  {sceneIndex === 3 ? activeScene4Cut.cutTitle : currentScene.tag}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[#00f3ff] text-[10px] sm:text-xs font-mono hidden sm:inline">
                    {sceneIndex === 3
                      ? `Corte ${scene4CutIndex + 1}/4`
                      : sceneIndex === 1
                      ? `Plano ${villainShotIndex + 1}/5`
                      : 'NES 16-BIT'}
                  </span>

                  {/* Botón interactivo SIGUIENTE ▶ */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualAdvance();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#dc2626] hover:bg-[#ef4444] active:bg-[#b91c1c] text-white border border-white font-mono font-black text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all group"
                    title="Avanzar a la siguiente escena (Espacio / Clic)"
                  >
                    <span className="group-hover:text-amber-300">SIGUIENTE</span>
                    <span className="text-[#f2c94c] font-bold text-xs animate-pulse">▶</span>
                  </button>
                </div>
              </div>

              {/* Cuerpo del texto con typewriter en blanco puro */}
              <p
                id="cinematic-text"
                className="min-h-[46px] font-mono font-bold text-white tracking-wide text-xs sm:text-sm md:text-base leading-relaxed"
              >
                <span>{displayedText}</span>
              </p>

              {/* Pie con barra de progreso pixelada y Triángulo Parpadeante ▶ al terminar */}
              <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-3 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[#f2c94c] font-bold">PROGRESO</span>
                  <div className="w-28 sm:w-44 h-2 bg-slate-900 border border-white p-0.5">
                    <div
                      className="h-full bg-[#f2c94c] transition-all duration-150"
                      style={{ width: `${sceneProgressPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px] font-mono">
                    ESCENA {sceneIndex + 1}/{CINEMATIC_SCENES.length}
                  </span>
                  
                  {/* Indicador NES de avance ▶ parpadeante al finalizar la locución y el tipeo */}
                  {showAdvanceIndicator && (
                    <span className="text-[#f2c94c] font-bold text-sm sm:text-base animate-pulse">
                      ▶
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
