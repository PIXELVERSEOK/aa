/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  KeyRound,
  Layers,
  RotateCcw,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { retroAudio } from './audio/retroAudio';
import { bgmEngine } from './audio/bgmEngine';
import { HD2DDonkeyKongStage } from './stages/DonkeyKongStage';
import { HD2DSpaceInvadersStage } from './stages/SpaceInvadersStage';
import { EpicCinematicStage } from './stages/EpicCinematicStage';
import { GlitchTrailStage } from './stages/GlitchTrailStage';
import { Pong1972Stage } from './stages/Pong1972Stage';
import { Origin70sIsland, Island70sArrivalMode } from './island/Origin70sIsland';
import {
  collectUniqueMemoryDiamond,
  discoverRpgSecret,
  loadProgressState,
  markCeremonyCompleted,
  markGameStarted,
  markTransitionFinished,
  openRpgChest,
  PixelverseProgressState,
  recordEchoDiscovered,
  recordGameVictory,
  recordIslandSwitchActivated,
  recordIslandZoneVisited,
  recordNpcTalked,
  repairRpgMechanism,
  saveLast80sCoordinates,
  saveLastIslandCoordinates,
  saveStageCheckpoint,
  setEquippedCosmetic,
  solveRpgPuzzle,
  togglePhosphorLanternState,
  updateQuestStatus,
} from './memories/progressionState';

type IslandArrivalMode = Island70sArrivalMode;

type ViewStateId =
  | 'state-cinematic'
  | 'state-title'
  | 'state-avatar'
  | 'state-pong'
  | 'state-archipelago'
  | 'state-platformer'
  | 'state-invaders'
  | 'state-dk-classic';

const MASTER_SERIAL = 'zudoka26';

const UNLOCKABLE_LEVELS: {
  id: ViewStateId;
  code: string;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'state-cinematic',
    code: 'EST-01',
    title: 'Cinemática Inicial',
    subtitle: 'Colapso Arcade y SUPER CUPA',
  },
  {
    id: 'state-avatar',
    code: 'EST-03',
    title: 'Creador de Arquitecto',
    subtitle: 'Personalizar Avatar',
  },
  {
    id: 'state-archipelago',
    code: 'MAP-70',
    title: 'Archipiélago RPG · Islas 70s y 80s',
    subtitle: '9 Zonas, Interiores, Cuevas e Isla Neón',
  },
  {
    id: 'state-pong',
    code: 'NIV-01',
    title: 'Pong (1972)',
    subtitle: 'Santuario Clásico Atari · Meta 1000 PTS',
  },
  {
    id: 'state-platformer',
    code: 'NIV-02',
    title: 'El Sendero del Glitch Perdido',
    subtitle: 'Aventura, Prismas y Cartógrafo',
  },
  {
    id: 'state-invaders',
    code: 'NIV-03',
    title: 'Space Invaders (1978)',
    subtitle: 'Fortaleza Taito · Meta 1000 PTS',
  },
  {
    id: 'state-dk-classic',
    code: 'ARC-81',
    title: 'Isla Neón 1980s · Donkey Kong',
    subtitle: 'Gabinete Vertical 1981 · Vigas Rojas',
  },
];

/* =========================================
   GESTOR PRINCIPAL DE ESTADOS (GAME MANAGER)
   Controla las secciones mediante .view-state / .active
   ========================================= */
class GameManager {
  private currentState: ViewStateId = 'state-cinematic';
  private allStates: ViewStateId[] = [
    'state-cinematic',
    'state-title',
    'state-avatar',
    'state-pong',
    'state-archipelago',
    'state-platformer',
    'state-invaders',
    'state-dk-classic',
  ];
  private listener?: (state: ViewStateId) => void;
  private swapTimer: number | null = null;
  private endTimer: number | null = null;

  private static readonly SWAP_DELAY_MS = 275;
  private static readonly TOTAL_DURATION_MS = 565;

  constructor(listener?: (state: ViewStateId) => void) {
    this.listener = listener;
  }

  public getState(): ViewStateId {
    return this.currentState;
  }

  private applyState(nextState: ViewStateId): void {
    this.currentState = nextState;

    for (const id of this.allStates) {
      const el = document.getElementById(id);
      if (el) {
        if (id === nextState) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    }

    if (this.listener) {
      this.listener(nextState);
    }
  }

  public transitionTo(
    nextState: ViewStateId,
    options?: { immediate?: boolean }
  ): void {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (options?.immediate || prefersReducedMotion || typeof document === 'undefined') {
      this.clearTimers();
      const overlay =
        typeof document !== 'undefined'
          ? document.getElementById('iris-wipe-overlay')
          : null;
      overlay?.classList.remove('iris-wipe-active');
      this.applyState(nextState);
      return;
    }

    const overlay = document.getElementById('iris-wipe-overlay');
    if (!overlay) {
      this.applyState(nextState);
      return;
    }

    this.clearTimers();

    // Reiniciar animación CSS de Iris Out / Pixel Wipe de forma determinista
    overlay.classList.remove('iris-wipe-active');
    void overlay.offsetWidth;
    overlay.classList.add('iris-wipe-active');

    // Conmutar vista exactamente en el cierre total del iris (pantalla cubierta)
    this.swapTimer = window.setTimeout(() => {
      this.swapTimer = null;
      this.applyState(nextState);
    }, GameManager.SWAP_DELAY_MS);

    // Liberar cortina al concluir la apertura escalonada (Iris In)
    this.endTimer = window.setTimeout(() => {
      this.endTimer = null;
      overlay.classList.remove('iris-wipe-active');
    }, GameManager.TOTAL_DURATION_MS);
  }

  public clearTimers(): void {
    if (typeof window === 'undefined') return;
    if (this.swapTimer !== null) {
      window.clearTimeout(this.swapTimer);
      this.swapTimer = null;
    }
    if (this.endTimer !== null) {
      window.clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }
}

/* =========================================
   CONSTANTES DE AVATAR 2D Y SPRITES PIXEL-ART
   ========================================= */
const AVATAR_MATRIX: string[] = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '.HHhhhhhhHH.',
  '.HHSSSSSSHH.',
  '..SSSSSSSS..',
  '..SEWSSEWS..',
  '..SSSSSSSS..',
  '...sSSSSs...',
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.SScCCCCcSS.',
  '.SS.BBBB.SS.',
  '...CCCCCC...',
  '...CC..CC...',
  '..cCC..CCc..',
  '..KKK..KKK..',
];

function getCellClass(code: string): string {
  switch (code) {
    case 'H':
      return 'px-cell px-hair';
    case 'h':
      return 'px-cell px-hair-shade';
    case 'S':
      return 'px-cell px-skin';
    case 's':
      return 'px-cell px-skin-shade';
    case 'E':
      return 'px-cell px-eye';
    case 'W':
      return 'px-cell px-eye-shine';
    case 'C':
      return 'px-cell px-shirt';
    case 'c':
      return 'px-cell px-shirt-shade';
    case 'B':
      return 'px-cell px-belt';
    case 'K':
      return 'px-cell px-boots';
    default:
      return 'px-cell px-empty';
  }
}

const SKIN_SWATCHES = [
  { label: 'Durazno', hex: '#ffccaa', bgClass: 'bg-[#ffccaa]' },
  { label: 'Bronce', hex: '#d4a373', bgClass: 'bg-[#d4a373]' },
  { label: 'Ébano', hex: '#8b5a2b', bgClass: 'bg-[#8b5a2b]' },
  { label: 'Marfil', hex: '#fde2c8', bgClass: 'bg-[#fde2c8]' },
];

const HAIR_SWATCHES = [
  { label: 'Castaño', hex: '#331100', bgClass: 'bg-[#331100]' },
  { label: 'Dorado', hex: '#eebb00', bgClass: 'bg-[#eebb00]' },
  { label: 'Carmesí', hex: '#aa0000', bgClass: 'bg-[#aa0000]' },
  { label: 'Cian Neón', hex: '#00f3ff', bgClass: 'bg-[#00f3ff]' },
];

const SHIRT_SWATCHES = [
  { label: 'Cian', hex: '#00f3ff', bgClass: 'bg-[#00f3ff]' },
  { label: 'Magenta', hex: '#ff00ff', bgClass: 'bg-[#ff00ff]' },
  { label: 'Verde Neón', hex: '#39ff14', bgClass: 'bg-[#39ff14]' },
  { label: 'Ámbar', hex: '#facc15', bgClass: 'bg-[#facc15]' },
];

function CssPixelCharacter() {
  return (
    <div className="flex flex-col items-center">
      <div
        className="pixel-character-grid"
        aria-label="Personaje Pixel-Art HD-2D con sombra reactiva"
      >
        {AVATAR_MATRIX.map((row, rIdx) =>
          row
            .split('')
            .map((code, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className={getCellClass(code)} />
            ))
        )}
      </div>
      <div className="avatar-floor-aura mt-5" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const managerRef = useRef<GameManager | null>(null);
  const [windowReady, setWindowReady] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.readyState === 'complete' : false
  );
  const [activeState, setActiveState] = useState<ViewStateId>('state-cinematic');
  const [cinematicRunKey, setCinematicRunKey] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isGbGreenMode, setIsGbGreenMode] = useState<boolean>(false);

  // Estado 3: Variables CSS de identidad del Arquitecto
  const [skinColor, setSkinColor] = useState<string>(SKIN_SWATCHES[0].hex);
  const [hairColor, setHairColor] = useState<string>(HAIR_SWATCHES[0].hex);
  const [shirtColor, setShirtColor] = useState<string>(SHIRT_SWATCHES[0].hex);

  // Modo de entrada a Pong (con o sin intro de pelota blanca)
  const [pongSkipIntro, setPongSkipIntro] = useState<boolean>(false);

  // Estado persistente de aventura e historial
  const [progressState, setProgressState] = useState<PixelverseProgressState>(() =>
    loadProgressState()
  );
  const [islandArrivalMode, setIslandArrivalMode] =
    useState<IslandArrivalMode>('awakening');
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  // Desbloqueo maestro de niveles mediante serial (zudoka26)
  const [serialInput, setSerialInput] = useState<string>('');
  const [masterUnlocked, setMasterUnlocked] = useState<boolean>(false);
  const [serialStatus, setSerialStatus] = useState<'idle' | 'error' | 'unlocked'>('idle');
  const [levelMenuOpen, setLevelMenuOpen] = useState<boolean>(false);
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (document.readyState === 'complete') {
      setWindowReady(true);
      return;
    }
    const onWindowLoad = () => setWindowReady(true);
    window.addEventListener('load', onWindowLoad);
    return () => window.removeEventListener('load', onWindowLoad);
  }, []);

  useEffect(() => {
    if (!windowReady) return;

    bgmEngine.initAndStart();
    const unsubscribeBgm = bgmEngine.subscribe((muted) => {
      setIsAudioMuted(muted);
    });

    const gm = new GameManager((state) => {
      setActiveState(state);
    });
    managerRef.current = gm;
    gm.transitionTo('state-cinematic', { immediate: true });

    return () => {
      gm.clearTimers();
      unsubscribeBgm();
    };
  }, [windowReady]);

  // Registrar inicio de cada videojuego histórico sin duplicar recompensas
  useEffect(() => {
    if (activeState === 'state-pong') {
      setProgressState((prev) => markGameStarted(prev, 'pong'));
    } else if (activeState === 'state-platformer') {
      setProgressState((prev) => markGameStarted(prev, 'glitch-trail'));
    } else if (activeState === 'state-dk-classic') {
      setProgressState((prev) => markGameStarted(prev, 'donkey-kong'));
    } else if (activeState === 'state-invaders') {
      setProgressState((prev) => markGameStarted(prev, 'space-invaders'));
    }
  }, [activeState]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-skin', skinColor);
  }, [skinColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-hair', hairColor);
  }, [hairColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-shirt', shirtColor);
  }, [shirtColor]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key.toLowerCase() === 'm') {
        bgmEngine.toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onShake = () => {
      const crtEl = document.getElementById('crt-overlay');
      if (crtEl) {
        crtEl.classList.add('screen-shake');
        window.setTimeout(() => {
          crtEl.classList.remove('screen-shake');
        }, 500);
      }
    };
    window.addEventListener('pixelverse-shake', onShake);
    return () => window.removeEventListener('pixelverse-shake', onShake);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    managerRef.current?.transitionTo('state-title');
  }, []);

  const handleReplayCinematic = useCallback(() => {
    retroAudio.uiClick();
    setCinematicRunKey((k) => k + 1);
    managerRef.current?.transitionTo('state-cinematic');
  }, []);

  const handleEnterPongCabinet = useCallback((skipIntro = false) => {
    retroAudio.uiClick();
    setPongSkipIntro(skipIntro);
    managerRef.current?.transitionTo('state-pong');
  }, []);

  const handleConfirmAvatar = useCallback(() => {
    retroAudio.uiClick();
    setIslandArrivalMode(
      progressState.island70s.lastIslandPos ? 'standard' : 'awakening'
    );
    managerRef.current?.transitionTo('state-archipelago');
  }, [progressState.island70s.lastIslandPos]);

  const handleValidateSerial = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const normalized = serialInput.trim().toLowerCase();
      if (normalized === MASTER_SERIAL) {
        setMasterUnlocked(true);
        setSerialStatus('unlocked');
        retroAudio.portalVictory();
        window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      } else {
        setSerialStatus('error');
        retroAudio.pongScore(false);
      }
    },
    [serialInput]
  );

  const handleJumpToLevel = useCallback((targetState: ViewStateId) => {
    retroAudio.uiClick();
    setLevelMenuOpen(false);
    setCodeModalOpen(false);

    if (targetState === 'state-cinematic') {
      setCinematicRunKey((k) => k + 1);
    } else if (targetState === 'state-pong') {
      setPongSkipIntro(true);
    } else if (targetState === 'state-archipelago') {
      setIslandArrivalMode('standard');
    }

    managerRef.current?.transitionTo(targetState);
  }, []);

  const hasSavedProgress =
    progressState.restoredCount > 0 ||
    progressState.island70s.visitedZones.length > 1 ||
    progressState.island70s.collectedDiamondIds.length > 0;

  const showAmbientBackdrop =
    activeState === 'state-title' || activeState === 'state-avatar';

  return (
    <div id="game-container" className={`relative w-screen h-screen overflow-hidden bg-[#020207] ${isGbGreenMode ? 'gbc-green-filter' : ''}`}>
      {showAmbientBackdrop && (
        <div
          className="absolute inset-0 hd2d-ambient-orbs pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      <div
        className={`cyber-grid z-0 ${
          showAmbientBackdrop ? 'opacity-45' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Cortina de transición retro Iris Out + Pixel Wipe controlada por GameManager */}
      <div
        id="iris-wipe-overlay"
        aria-hidden="true"
        className="iris-wipe-overlay"
      >
        <div className="iris-wipe-aperture" />
        <div className="iris-pixel-matrix" />
      </div>

      <div
        id="crt-overlay"
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-50 crt-scanlines-global opacity-75"
      />

      {/* Insignia de Logro Visual: Arquitecto Legendario (Se muestra al desbloquear con serial maestro) */}
      {masterUnlocked && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-md glass-panel border border-[#00f3ff] shadow-[0_0_24px_rgba(0,243,255,0.75)] animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-xs font-mono-tabular font-bold tracking-widest text-[#00f3ff] uppercase drop-shadow-[0_0_8px_rgba(0,243,255,0.9)]">
            ★ ARQUITECTO LEGENDARIO ★
          </span>
        </div>
      )}

      {/* Controles globales esquina superior derecha: Selector Rápido + Audio + Filtro GB Verde */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {masterUnlocked && activeState !== 'state-title' && (
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setLevelMenuOpen((open) => !open);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono-tabular glass-panel rounded-md text-[#00f3ff] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-[#00f3ff]" />
            <span>Elegir Nivel</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            retroAudio.uiClick();
            setIsGbGreenMode((prev) => !prev);
          }}
          title="Alternar filtro monocromo Game Boy Verde"
          aria-label="Alternar filtro monocromo Game Boy Verde"
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono-tabular glass-panel rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isGbGreenMode ? 'text-emerald-300 border-emerald-400 bg-emerald-950/60' : 'text-slate-200 hover:text-[#00f3ff]'
          }`}
        >
          <span>{isGbGreenMode ? 'GB Verde: ON' : 'GB Verde: OFF'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const nextMuted = bgmEngine.toggleMute();
            if (!nextMuted) {
              retroAudio.uiClick();
            }
          }}
          title="Alternar música retro-arcade (M)"
          aria-label={isAudioMuted ? 'Activar música retro-arcade' : 'Silenciar música retro-arcade'}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono-tabular glass-panel rounded-md text-slate-200 hover:text-[#00f3ff] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {isAudioMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Audio OFF</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#00f3ff]" />
              <span>BGM Arcade</span>
            </>
          )}
        </button>
      </div>

      {/* Menú flotante del Selector Maestro (zudoka26) */}
      {masterUnlocked && levelMenuOpen && activeState !== 'state-title' && (
        <div className="fixed top-14 right-4 z-40 w-80 glass-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono-tabular tracking-wider text-emerald-300 uppercase">
                Selector Maestro
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLevelMenuOpen(false)}
              aria-label="Cerrar selector de niveles"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleJumpToLevel('state-title')}
              className="w-full text-left px-3 py-2 rounded border border-white/15 bg-black/45 hover:border-[#00f3ff]/70 text-xs font-mono-tabular text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>EST-02 · Pantalla de Inicio</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff]" />
            </button>

            {UNLOCKABLE_LEVELS.map((lvl) => {
              const isCurrent = activeState === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleJumpToLevel(lvl.id)}
                  className={`w-full text-left px-3 py-2 rounded border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent
                      ? 'border-[#00f3ff] bg-cyan-950/60 text-white'
                      : 'border-white/12 bg-black/45 hover:border-[#00f3ff]/65 text-slate-200 hover:text-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-mono-tabular text-[11px] font-bold text-[#00f3ff]">
                      {lvl.code} · {lvl.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{lvl.subtitle}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff] shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          ESTADO 1: CINEMÁTICA INICIAL ÉPICA (COLAPSO Y SUPER CUPA)
         ========================================================= */}
      <section id="state-cinematic" className="view-state active z-10">
        {windowReady && activeState === 'state-cinematic' && (
          <EpicCinematicStage
            runKey={cinematicRunKey}
            onComplete={handleCinematicComplete}
            onEnterPong={handleConfirmAvatar}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 2: PANTALLA DE TÍTULO (ISLA MULTIVERSO + START, CONTINUAR, CÓDIGO)
         ========================================================= */}
      <section
        id="state-title"
        className="view-state z-10 w-full h-full relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/aistudio/imagen_a38b0421.png')` }}
      >
        {/* Botones apilados verticalmente y centrados exactamente sobre la ilustración */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center space-y-2">
          <div className="flex flex-col items-center space-y-2 w-56 sm:w-64 max-w-full">
            {/* START */}
            <button
              id="btn-start"
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                managerRef.current?.transitionTo('state-avatar');
              }}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-black border-2 border-amber-100 shadow-[0_4px_0_#92400e,0_0_20px_rgba(251,191,36,0.6)] font-display font-black tracking-widest text-xs sm:text-sm uppercase cursor-pointer hover:brightness-110 active:translate-y-1 active:shadow-none transition-all text-center"
            >
              START
            </button>

            {/* CONTINUAR */}
            <button
              id="btn-continue"
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setIslandArrivalMode('standard');
                managerRef.current?.transitionTo('state-archipelago');
              }}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-600 text-black border-2 border-cyan-100 shadow-[0_4px_0_#155e75,0_0_20px_rgba(6,182,212,0.6)] font-display font-black tracking-widest text-xs sm:text-sm uppercase cursor-pointer hover:brightness-110 active:translate-y-1 active:shadow-none transition-all text-center"
            >
              CONTINUAR
            </button>

            {/* CÓDIGO */}
            <button
              id="btn-code-modal"
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setCodeModalOpen(true);
              }}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600 text-black border-2 border-emerald-100 shadow-[0_4px_0_#166534,0_0_20px_rgba(16,185,129,0.6)] font-display font-black tracking-widest text-xs sm:text-sm uppercase cursor-pointer hover:brightness-110 active:translate-y-1 active:shadow-none transition-all text-center"
            >
              CÓDIGO
            </button>
          </div>

          <div className="bg-black/85 border border-[#00f3ff]/40 px-4 py-1 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
            <span className="text-[10px] font-mono-tabular tracking-[0.22em] text-[#00f3ff] font-bold uppercase">
              REINICIO DEL UNIVERSO ARCADE
            </span>
          </div>
        </div>

        {/* Modal de Ingreso de Código / Serial Maestro */}
        {codeModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm p-4">
            <div className="glass-panel rounded-xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-[#00f3ff]/60 shadow-[0_0_35px_rgba(0,243,255,0.4)]">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#00f3ff]" />
                  <span className="text-xs font-mono-tabular tracking-wider text-[#00f3ff] uppercase font-bold">
                    Terminal de Códigos · Desbloqueo Maestro
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(false)}
                  aria-label="Cerrar modal de código"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleValidateSerial} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tabular text-slate-300">
                    Ingresa el Serial Maestro (zudoka26):
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#00f3ff]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={serialInput}
                      onChange={(e) => {
                        setSerialInput(e.target.value);
                        if (serialStatus === 'error') setSerialStatus('idle');
                      }}
                      placeholder="Ej. zudoka26"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[#040715]/90 border border-[#00f3ff]/40 text-sm font-mono-tabular text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCodeModalOpen(false)}
                    className="px-4 py-2 rounded border border-white/20 bg-black/40 text-xs font-mono-tabular text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded border border-[#00f3ff]/70 bg-cyan-950/80 hover:bg-cyan-900 text-xs font-mono-tabular font-bold tracking-wider text-[#00f3ff] hover:text-white cursor-pointer transition-colors"
                  >
                    Validar Código
                  </button>
                </div>
              </form>

              {serialStatus === 'error' && (
                <p className="text-xs font-mono-tabular text-rose-400 text-center">
                  Serial incorrecto · Código maestro no reconocido.
                </p>
              )}

              {masterUnlocked && (
                <div className="space-y-3 pt-3 border-t border-white/15">
                  <div className="flex items-center justify-center gap-2 text-xs font-mono-tabular text-emerald-300 font-bold">
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span>¡ACCESO CONCEDIDO! NIVELES DESBLOQUEADOS:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {UNLOCKABLE_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setCodeModalOpen(false);
                          handleJumpToLevel(lvl.id);
                        }}
                        className="text-left px-3 py-2 rounded border border-[#00f3ff]/40 bg-black/60 hover:bg-cyan-950/60 text-xs font-mono-tabular flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="text-[#00f3ff] font-bold">{lvl.code} · </span>
                          <span className="text-white font-bold">{lvl.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================
          ESTADO 3: CREADOR DE AVATAR (GLASSMORPHISM + DROP-SHADOW REACTIVO)
         ========================================================= */}
      <section id="state-avatar" className="view-state z-10 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-4xl flex flex-col items-center space-y-6">
          <div className="text-center space-y-1">
            <h2 className="title-neon font-display text-2xl sm:text-4xl tracking-[0.12em]">
              Crea a tu Arquitecto
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-ui">
              El aura y la sombra paralela de Pixel reaccionan dinámicamente al color de tu ropa.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-12 glass-panel rounded-2xl overflow-hidden">
            <div className="md:col-span-5 flex flex-col items-center justify-center py-10 px-6 border-b md:border-b-0 md:border-r border-[#00f3ff]/35 bg-[#040715]/55">
              <CssPixelCharacter />
            </div>

            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#00f3ff]">Tono de Piel</span>
                    <span className="text-slate-300">
                      {SKIN_SWATCHES.find((s) => s.hex === skinColor)?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3" id="s-skin">
                    {SKIN_SWATCHES.map((sw) => {
                      const isSel = skinColor === sw.hex;
                      return (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => {
                            retroAudio.uiClick();
                            setSkinColor(sw.hex);
                          }}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                            isSel
                              ? 'border-[#00f3ff] bg-cyan-950/55 text-white shadow-[0_0_14px_rgba(0,243,255,0.35)] scale-105'
                              : 'border-white/15 bg-black/45 text-slate-300 hover:border-white/40'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-sm border border-white/30 ${sw.bgClass}`} />
                          <span>{sw.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#00f3ff]">Cabello</span>
                    <span className="text-slate-300">
                      {HAIR_SWATCHES.find((s) => s.hex === hairColor)?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3" id="s-hair">
                    {HAIR_SWATCHES.map((sw) => {
                      const isSel = hairColor === sw.hex;
                      return (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => {
                            retroAudio.uiClick();
                            setHairColor(sw.hex);
                          }}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                            isSel
                              ? 'border-[#00f3ff] bg-cyan-950/55 text-white shadow-[0_0_14px_rgba(0,243,255,0.35)] scale-105'
                              : 'border-white/15 bg-black/45 text-slate-300 hover:border-white/40'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-sm border border-white/30 ${sw.bgClass}`} />
                          <span>{sw.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#00f3ff]">Ropa (Aura Dinámica)</span>
                    <span className="text-slate-300">
                      {SHIRT_SWATCHES.find((s) => s.hex === shirtColor)?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3" id="s-shirt">
                    {SHIRT_SWATCHES.map((sw) => {
                      const isSel = shirtColor === sw.hex;
                      return (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => {
                            retroAudio.uiClick();
                            setShirtColor(sw.hex);
                          }}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                            isSel
                              ? 'border-[#00f3ff] bg-cyan-950/55 text-white shadow-[0_0_14px_rgba(0,243,255,0.35)] scale-105'
                              : 'border-white/15 bg-black/45 text-slate-300 hover:border-white/40'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-sm border border-white/30 ${sw.bgClass}`} />
                          <span>{sw.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                id="btn-confirm"
                type="button"
                onClick={handleConfirmAvatar}
                className="btn-ui rounded-md w-full py-3.5 px-6 text-sm font-bold tracking-[0.16em] whitespace-nowrap shrink-0"
              >
                Confirmar Identidad
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ESTADO 4: PONG (1972) — GABINETE AMARILLO ATARI Y TABLA VOLADORA
         ========================================================= */}
      <section id="state-pong" className="view-state z-10 px-4 py-6 arcade-hall-backdrop">
        {windowReady && activeState === 'state-pong' && (
          <Pong1972Stage
            skipIntro={pongSkipIntro}
            alreadyRestoredBefore={Boolean(progressState.games['pong']?.memoryUnlocked)}
            onVictoryRecorded={(finalScore) => {
              setProgressState((prev) => recordGameVictory(prev, 'pong', finalScore));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyCompleted={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'pong'));
            }}
            onReturnToIslandOnBoard={() => {
              setIslandArrivalMode('pong-board');
              setProgressState((prev) => markTransitionFinished(prev, 'pong', true));
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onBackToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 5: LA GRAN ISLA DE LOS 70 · EL ORIGEN (9 ZONAS INTERCONECTADAS)
         ========================================================= */}
      <section id="state-archipelago" className="view-state z-10 bg-[#020614]">
        {windowReady && activeState === 'state-archipelago' && (
          <Origin70sIsland
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            allUnlocked={masterUnlocked}
            arrivalMode={islandArrivalMode}
            progressState={progressState}
            onEnterPong={() => handleEnterPongCabinet(false)}
            onEnterGlitchTrail={() => {
              managerRef.current?.transitionTo('state-platformer');
            }}
            onEnterSpaceInvaders={() => {
              managerRef.current?.transitionTo('state-invaders');
            }}
            onEnterDonkeyKong={() => {
              managerRef.current?.transitionTo('state-dk-classic');
            }}
            onCollectDiamond={(diamondId) => {
              setProgressState((prev) => collectUniqueMemoryDiamond(prev, diamondId));
            }}
            onVisitZone={(zoneId) => {
              setProgressState((prev) => recordIslandZoneVisited(prev, zoneId));
            }}
            onDiscoverEcho={(echoId) => {
              setProgressState((prev) => recordEchoDiscovered(prev, echoId));
            }}
            onActivateSwitch={(switchId) => {
              setProgressState((prev) => recordIslandSwitchActivated(prev, switchId));
            }}
            onTalkNpc={(npcId) => {
              setProgressState((prev) => recordNpcTalked(prev, npcId));
            }}
            onSavePosition={(x, y) => {
              setProgressState((prev) => saveLastIslandCoordinates(prev, x, y));
            }}
            onSave80sPosition={(x, y) => {
              setProgressState((prev) => saveLast80sCoordinates(prev, x, y));
            }}
            onOpenChest={(chestId, rewardItemIds) => {
              setProgressState((prev) => openRpgChest(prev, chestId, rewardItemIds));
            }}
            onDiscoverSecret={(secretId) => {
              setProgressState((prev) => discoverRpgSecret(prev, secretId));
            }}
            onSolvePuzzle={(puzzleId, rewardItemIds) => {
              setProgressState((prev) => solveRpgPuzzle(prev, puzzleId, rewardItemIds));
            }}
            onRepairMechanism={(mechanismId, alsoSwitches) => {
              setProgressState((prev) =>
                repairRpgMechanism(prev, mechanismId, alsoSwitches)
              );
            }}
            onUpdateQuest={(questId, status, rewardItemIds) => {
              setProgressState((prev) =>
                updateQuestStatus(prev, questId, status, rewardItemIds)
              );
            }}
            onEquipCosmetic={(cosmeticId) => {
              setProgressState((prev) => setEquippedCosmetic(prev, cosmeticId));
            }}
            onToggleLantern={(forceValue) => {
              setProgressState((prev) => togglePhosphorLanternState(prev, forceValue));
            }}
            onArrivalSequenceFinished={() => {
              setIslandArrivalMode('standard');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 6: EL SENDERO DEL GLITCH PERDIDO (AVENTURA Y PLATAFORMAS ORIGINAL)
         ========================================================= */}
      <section id="state-platformer" className="view-state z-10 bg-[#030716]">
        {windowReady && activeState === 'state-platformer' && (
          <GlitchTrailStage
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            collectedDiamondIds={progressState.island70s.collectedDiamondIds}
            alreadyRestoredBefore={Boolean(
              progressState.games['glitch-trail']?.ceremonyShown
            )}
            initialCheckpointId={progressState.island70s.checkpoints['glitch-trail']}
            onCheckpointReached={(checkpointId) => {
              setProgressState((prev) =>
                saveStageCheckpoint(prev, 'glitch-trail', checkpointId)
              );
            }}
            onCollectDiamond={(diamondId) => {
              setProgressState((prev) => collectUniqueMemoryDiamond(prev, diamondId));
            }}
            onDiscoverEcho={(echoId) => {
              setProgressState((prev) => recordEchoDiscovered(prev, echoId));
            }}
            onVictoryRecorded={(trailDiamonds) => {
              setProgressState((prev) =>
                recordGameVictory(prev, 'glitch-trail', trailDiamonds * 250, trailDiamonds)
              );
            }}
            onComplete={() => {
              setIslandArrivalMode('glitch-trail-cleared');
              setProgressState((prev) =>
                markTransitionFinished(prev, 'glitch-trail', true)
              );
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onReturnToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 7: SPACE INVADERS (1978) — META >= 1000 PTS Y REGRESO EN NAVE
         ========================================================= */}
      <section id="state-invaders" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-invaders' && (
          <HD2DSpaceInvadersStage
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            alreadyRestoredBefore={Boolean(
              progressState.games['space-invaders']?.ceremonyShown
            )}
            onVictoryRecorded={(finalScore) => {
              setProgressState((prev) =>
                recordGameVictory(prev, 'space-invaders', finalScore, 3)
              );
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyCompleted={() => {
              setProgressState((prev) =>
                markCeremonyCompleted(prev, 'space-invaders')
              );
            }}
            onReturnToIslandWithShip={() => {
              setIslandArrivalMode('invaders-ship');
              setProgressState((prev) =>
                markTransitionFinished(prev, 'space-invaders', true)
              );
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onBackToMap={() => {
              retroAudio.uiClick();
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onRestartCinematic={handleReplayCinematic}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 8: GABINETE VERTICAL DE 1981 (ISLA NEÓN 1980s / SELECTOR MAESTRO)
         ========================================================= */}
      <section id="state-dk-classic" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-dk-classic' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setIslandArrivalMode('return-80s');
                managerRef.current?.transitionTo('state-archipelago');
              }}
              className="fixed bottom-4 left-4 z-30 glass-panel px-3.5 py-1.5 rounded-md text-xs font-mono-tabular text-[#00f3ff] hover:text-white cursor-pointer"
            >
              ← Volver a Isla Neón 1980s
            </button>
            <HD2DDonkeyKongStage
              skinColor={skinColor}
              hairColor={hairColor}
              shirtColor={shirtColor}
              alreadyRestoredBefore={Boolean(
                progressState.games['donkey-kong']?.ceremonyShown
              )}
              onVictoryRecorded={(diamonds) => {
                setProgressState((prev) =>
                  recordGameVictory(prev, 'donkey-kong', diamonds * 250, diamonds)
                );
                window.dispatchEvent(new CustomEvent('pixelverse-shake'));
              }}
              onComplete={() => {
                setIslandArrivalMode('return-80s');
                setProgressState((prev) =>
                  markTransitionFinished(prev, 'donkey-kong', false)
                );
                managerRef.current?.transitionTo('state-archipelago');
              }}
            />
          </div>
        )}
      </section>

    </div>
  );
}
