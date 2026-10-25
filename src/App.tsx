/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  KeyRound,
  Layers,
  Save,
  Settings,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { retroAudio } from './audio/retroAudio';
import { bgmEngine } from './audio/bgmEngine';
import { Breakout1976Stage } from './stages/Breakout1976Stage';
import { HD2DDonkeyKongStage } from './stages/DonkeyKongStage';
import { HD2DSpaceInvadersStage } from './stages/SpaceInvadersStage';
import { EpicCinematicStage } from './stages/EpicCinematicStage';
import { GlitchTrailStage } from './stages/GlitchTrailStage';
import { Pong1972Stage } from './stages/Pong1972Stage';
import { Origin70sIsland, Island70sArrivalMode } from './island/Origin70sIsland';
import {
  BREAKOUT_UNLOCK_SCORE,
  calmGuardianCreature,
  collectUniqueMemoryDiamond,
  discoverInvestigationClue,
  discoverRpgSecret,
  loadProgressState,
  markCeremonyCompleted,
  markGameStarted,
  markTransitionFinished,
  openRpgChest,
  PixelverseProgressState,
  recordEchoDiscovered,
  recordGameVictory,
  recordGlobalManualSave,
  recordIslandSwitchActivated,
  recordIslandZoneVisited,
  recordManualSave80sCheckpoint,
  recordManualSaveCheckpoint,
  recordMuseumExhibitInspected,
  recordNpcTalked,
  repairRpgMechanism,
  saveLast80sCoordinates,
  saveLastIslandCoordinates,
  savePlayerOptions,
  saveStageCheckpoint,
  setEquippedCosmetic,
  solveInvestigationCase,
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
  | 'state-breakout'
  | 'state-archipelago'
  | 'state-platformer'
  | 'state-invaders'
  | 'state-dk-classic';

const MASTER_SERIAL = 'zudoka26';
const SECRET_KEY_SEQUENCE = ['a', 'd', 's', 'w', 'a', 'd', 's', 'w', 'b', 'a'];

const UNLOCKABLE_LEVELS: {
  id: ViewStateId;
  code: string;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'state-cinematic',
    code: 'EST-01',
    title: 'Cinemática 64-Bit SEGA',
    subtitle: '«Cuando el mundo olvidó jugar»',
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
    title: 'Isla del Origen · Aventura HD-2D (70s y 80s)',
    subtitle: 'Museo Viviente, Laberinto 1976, Cuevas e Isla Neón',
  },
  {
    id: 'state-pong',
    code: 'NIV-01',
    title: 'Pong (1972)',
    subtitle: 'Santuario Clásico Atari · Meta 1000 PTS',
  },
  {
    id: 'state-breakout',
    code: 'ARC-76',
    title: 'Breakout (1976) · Secreto',
    subtitle: 'Sala Secreta de las Cuatro Bandas · Meta 400 PTS',
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
    'state-breakout',
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
  // Estado persistente de aventura e historial
  const [progressState, setProgressState] = useState<PixelverseProgressState>(() =>
    loadProgressState()
  );

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() =>
    Boolean(progressState.rpg.savedOptions?.audioMuted)
  );

  const [isGbGreenMode, setIsGbGreenMode] = useState<boolean>(
    () => Boolean(progressState.rpg.savedOptions?.gbGreenMode)
  );

  // Estado 3: Variables CSS de identidad del Arquitecto (persistidas en el guardado)
  const [skinColor, setSkinColor] = useState<string>(
    () => progressState.rpg.savedOptions?.skinColor || SKIN_SWATCHES[0].hex
  );
  const [hairColor, setHairColor] = useState<string>(
    () => progressState.rpg.savedOptions?.hairColor || HAIR_SWATCHES[0].hex
  );
  const [shirtColor, setShirtColor] = useState<string>(
    () => progressState.rpg.savedOptions?.shirtColor || SHIRT_SWATCHES[0].hex
  );

  // Modo de entrada a Pong (con o sin intro de pelota blanca)
  const [pongSkipIntro, setPongSkipIntro] = useState<boolean>(false);

  const [islandArrivalMode, setIslandArrivalMode] =
    useState<IslandArrivalMode>('awakening');
  const [achievementToast, setAchievementToast] = useState<string | null>(null);

  // Panel de Configuración (Sonido y Guardado de Partida)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    locationLabel: string;
    timeLabel: string;
  } | null>(null);
  const saveFeedbackTimerRef = useRef<number | null>(null);
  const islandManualSaveRef = useRef<(() => string) | null>(null);

  // Desbloqueo maestro de niveles mediante serial y código secreto ADSWADSWBA
  const [serialInput, setSerialInput] = useState<string>('');
  const [masterUnlocked, setMasterUnlocked] = useState<boolean>(false);
  const [serialStatus, setSerialStatus] = useState<'idle' | 'error' | 'unlocked'>('idle');
  const [levelMenuOpen, setLevelMenuOpen] = useState<boolean>(false);
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false);

  // Estado para revelar el botón CÓDIGO en el menú inicial tras la secuencia ADSWADSWBA
  const [codeButtonRevealed, setCodeButtonRevealed] = useState<boolean>(false);
  const [codeGlitchEffect, setCodeGlitchEffect] = useState<boolean>(false);
  const [pixelCeremonyActive, setPixelCeremonyActive] = useState<boolean>(false);
  const secretSequenceIndexRef = useRef<number>(0);

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

    if (progressState.rpg.savedOptions?.audioMuted) {
      bgmEngine.setMuted(true);
    } else {
      bgmEngine.initAndStart();
    }
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
    } else if (activeState === 'state-breakout') {
      setProgressState((prev) => markGameStarted(prev, 'breakout'));
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

  // Persistir opciones visuales, audio y paleta del jugador en el sistema de guardado
  useEffect(() => {
    setProgressState((prev) =>
      savePlayerOptions(prev, {
        skinColor,
        hairColor,
        shirtColor,
        gbGreenMode: isGbGreenMode,
        audioMuted: isAudioMuted,
      })
    );
  }, [skinColor, hairColor, shirtColor, isGbGreenMode, isAudioMuted]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Escape') {
        setSettingsOpen((wasOpen) => {
          if (wasOpen) {
            e.preventDefault();
            return false;
          }
          return false;
        });
        setLevelMenuOpen(false);
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'm') {
        const nextMuted = bgmEngine.toggleMute();
        if (!nextMuted) {
          retroAudio.uiClick();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Detector de la secuencia secreta ADSWADSWBA en la pantalla inicial
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onSecretKeyDown = (e: KeyboardEvent) => {
      // Activo únicamente cuando se encuentra en la pantalla inicial ('state-title') y sin modales ni inputs
      if (activeState !== 'state-title') {
        secretSequenceIndexRef.current = 0;
        return;
      }
      if (codeModalOpen || settingsOpen || levelMenuOpen) {
        secretSequenceIndexRef.current = 0;
        return;
      }
      if (isEditableTarget(e.target)) {
        secretSequenceIndexRef.current = 0;
        return;
      }

      const key = e.key.toLowerCase();
      const expectedKey = SECRET_KEY_SEQUENCE[secretSequenceIndexRef.current];

      if (key === expectedKey) {
        secretSequenceIndexRef.current += 1;
        if (secretSequenceIndexRef.current === SECRET_KEY_SEQUENCE.length) {
          secretSequenceIndexRef.current = 0;
          setCodeButtonRevealed(true);
          setCodeGlitchEffect(true);
          retroAudio.portalVictory();
          window.dispatchEvent(new CustomEvent('pixelverse-shake'));
          window.setTimeout(() => setCodeGlitchEffect(false), 2000);
        }
      } else {
        if (key === SECRET_KEY_SEQUENCE[0]) {
          secretSequenceIndexRef.current = 1;
        } else {
          secretSequenceIndexRef.current = 0;
        }
      }
    };

    window.addEventListener('keydown', onSecretKeyDown);
    return () => window.removeEventListener('keydown', onSecretKeyDown);
  }, [activeState, codeModalOpen, settingsOpen, levelMenuOpen]);

  useEffect(() => {
    return () => {
      if (saveFeedbackTimerRef.current !== null) {
        window.clearTimeout(saveFeedbackTimerRef.current);
      }
    };
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
      if (normalized === 'pixel' || normalized === MASTER_SERIAL) {
        setMasterUnlocked(true);
        setSerialStatus('unlocked');
        setPixelCeremonyActive(true);
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

  const handleToggleGlobalSound = useCallback(() => {
    const nextMuted = bgmEngine.toggleMute();
    if (!nextMuted) {
      retroAudio.uiClick();
    }
  }, []);

  const handleManualSaveFromSettings = useCallback(() => {
    let savedLocationLabel = 'Progreso general';
    if (activeState === 'state-archipelago' && islandManualSaveRef.current) {
      savedLocationLabel = islandManualSaveRef.current();
    } else {
      setProgressState((prev) => recordGlobalManualSave(prev));
      if (activeState === 'state-pong') savedLocationLabel = 'Pong (1972)';
      else if (activeState === 'state-breakout') savedLocationLabel = 'Breakout (1976)';
      else if (activeState === 'state-platformer')
        savedLocationLabel = 'El Sendero del Glitch Perdido';
      else if (activeState === 'state-invaders') savedLocationLabel = 'Space Invaders (1978)';
      else if (activeState === 'state-dk-classic') savedLocationLabel = 'Donkey Kong (1981)';
      else if (activeState === 'state-avatar') savedLocationLabel = 'Identidad del Arquitecto';
    }

    retroAudio.saveJingle();
    const nowTimeLabel = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSaveFeedback({
      locationLabel: savedLocationLabel,
      timeLabel: nowTimeLabel,
    });
    if (saveFeedbackTimerRef.current !== null) {
      window.clearTimeout(saveFeedbackTimerRef.current);
    }
    saveFeedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
      saveFeedbackTimerRef.current = null;
    }, 4500);
  }, [activeState]);

  const hasSavedProgress =
    progressState.restoredCount > 0 ||
    progressState.island70s.visitedZones.length > 1 ||
    progressState.island70s.collectedDiamondIds.length > 0 ||
    progressState.rpg.openedChestIds.length > 0 ||
    Boolean(progressState.rpg.lastManualSaveIso);

  const hasInvaders1000Achievement =
    progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts') ||
    Boolean(progressState.games['space-invaders']?.memoryUnlocked);

  const restoredMemoriesSummaryCount =
    (progressState.games['pong']?.memoryUnlocked ? 1 : 0) +
    (progressState.games['breakout']?.memoryUnlocked ? 1 : 0) +
    (progressState.island70s.glitchTrailCompleted || progressState.games['glitch-trail']?.completed
      ? 1
      : 0) +
    (progressState.games['space-invaders']?.memoryUnlocked ? 1 : 0) +
    (progressState.games['donkey-kong']?.memoryUnlocked ? 1 : 0);

  const formattedLastSaveLabel = progressState.rpg.lastManualSaveIso
    ? new Date(progressState.rpg.lastManualSaveIso).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

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

      {/* Insignia de Logro Visual: Arquitecto Legendario (oculta durante la exploración del mapa para mantener la vista despejada) */}
      {masterUnlocked &&
        activeState !== 'state-archipelago' &&
        activeState !== 'state-cinematic' && (
          <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-md glass-panel border border-[#00f3ff] shadow-[0_0_24px_rgba(0,243,255,0.75)] animate-pulse">
            <Sparkles
              className="w-4 h-4 text-amber-300 animate-spin"
              style={{ animationDuration: '4s' }}
            />
            <span className="text-xs font-mono-tabular font-bold tracking-widest text-[#00f3ff] uppercase drop-shadow-[0_0_8px_rgba(0,243,255,0.9)]">
              ★ ARQUITECTO LEGENDARIO ★
            </span>
          </div>
        )}

      {/* Notificación de Logro Permanente Desbloqueado */}
      {achievementToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 gbc-hud-frame px-5 py-2.5 flex items-center gap-2.5 text-xs font-mono font-bold text-[#fde047]">
          <Award className="w-4 h-4 text-[#86efac] shrink-0" />
          <span>{achievementToast}</span>
        </div>
      )}

      {/* Botón compacto de Configuración en esquina superior derecha (vista limpia y despejada) */}
      {activeState !== 'state-cinematic' && (
        <div className="fixed top-3.5 right-3.5 z-40 flex items-center gap-2">
          {hasInvaders1000Achievement && activeState !== 'state-archipelago' && (
            <div
              title="Logro Especial Permanente: 1.000 PTS en Space Invaders"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-mono-tabular font-bold gbc-hud-frame text-[#fde047] whitespace-nowrap shrink-0"
            >
              <Award className="w-3.5 h-3.5 text-[#86efac] shrink-0" />
              <span>1000 PTS INVADERS</span>
            </div>
          )}

          {masterUnlocked && activeState !== 'state-title' && activeState !== 'state-archipelago' && (
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setSettingsOpen(false);
                setLevelMenuOpen((open) => !open);
              }}
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-mono-tabular gbc-hud-frame text-[#00f3ff] hover:text-[#fde047] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
              <span>Elegir nivel</span>
            </button>
          )}

          <button
            id="btn-open-settings"
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setLevelMenuOpen(false);
              setSettingsOpen((prev) => !prev);
            }}
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            title="Configuración: sonido y guardar partida"
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-mono-tabular font-semibold gbc-hud-frame text-slate-100 hover:text-[#fde047] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4 text-[#fde047] shrink-0" />
            <span>Configuración</span>
            {isAudioMuted && (
              <VolumeX
                className="w-3.5 h-3.5 text-rose-400 shrink-0"
                aria-label="Sonido silenciado"
              />
            )}
          </button>
        </div>
      )}

      {/* Modal de Configuración (Quitar/Activar Sonido y Guardar Partida) */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          onClick={() => setSettingsOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="gbc-hud-frame w-full max-w-md p-5 sm:p-6 space-y-5 text-slate-100"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Settings className="w-4 h-4 text-[#fde047] shrink-0" />
                <h2
                  id="settings-modal-title"
                  className="text-base font-bold text-white tracking-wide whitespace-nowrap"
                >
                  Configuración
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setSettingsOpen(false);
                }}
                aria-label="Cerrar configuración"
                className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-2 text-xs font-mono-tabular text-slate-300 hover:text-[#fde047] cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Control 1: Sonido general (Quitar / Activar sonido) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-200">Sonido del juego</span>
                <span className="font-mono-tabular text-slate-400">
                  {isAudioMuted ? 'Silenciado · Tecla M' : 'Activado · Tecla M'}
                </span>
              </div>

              <button
                id="btn-toggle-sound"
                type="button"
                onClick={handleToggleGlobalSound}
                className={`w-full min-h-[44px] px-4 py-2.5 border text-xs font-mono-tabular font-bold flex items-center justify-between gap-3 cursor-pointer transition-colors whitespace-nowrap ${
                  isAudioMuted
                    ? 'bg-emerald-950/70 border-emerald-400/80 text-emerald-200 hover:bg-emerald-900/80'
                    : 'gbc-menu-btn'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  {isAudioMuted ? (
                    <Volume2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-300 shrink-0" />
                  )}
                  <span>{isAudioMuted ? 'Activar sonido' : 'Quitar sonido'}</span>
                </span>
                <span className="text-[11px] font-normal text-slate-300">
                  {isAudioMuted ? 'Audio OFF' : 'Audio ON'}
                </span>
              </button>
            </div>

            {/* Control 2: Guardar partida */}
            <div className="space-y-2.5 border-t border-white/15 pt-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-200">Partida y progreso</span>
                  <span className="font-mono-tabular text-slate-400">
                    {formattedLastSaveLabel
                      ? `Último: ${formattedLastSaveLabel}`
                      : 'Autoguardado activo'}
                  </span>
                </div>
                <p className="text-[11px] font-mono-tabular text-slate-400">
                  Diamantes {progressState.island70s.collectedDiamondIds.length}/9 · Memorias{' '}
                  {restoredMemoriesSummaryCount}/5 · Cofres {progressState.rpg.openedChestIds.length}
                </p>
              </div>

              <button
                id="btn-save-game"
                type="button"
                onClick={handleManualSaveFromSettings}
                className="w-full min-h-[44px] px-4 py-2.5 border-2 border-[#fde047] bg-[#0c2d48] hover:bg-[#144266] text-xs font-mono-tabular font-bold text-white flex items-center justify-center gap-2.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-[#fde047] shrink-0" />
                <span>Guardar partida</span>
              </button>

              {saveFeedback && (
                <div
                  role="status"
                  className="flex items-center gap-2 pt-1 text-xs font-mono-tabular text-emerald-300"
                >
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">
                    Partida guardada ({saveFeedback.timeLabel}) · {saveFeedback.locationLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Opción visual complementaria + cierre */}
            <div className="space-y-3 border-t border-white/15 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-300">Filtro Game Boy Verde</span>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setIsGbGreenMode((prev) => !prev);
                  }}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-mono-tabular gbc-menu-btn cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isGbGreenMode ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              {masterUnlocked && activeState !== 'state-title' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">Selector maestro de niveles</span>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      setSettingsOpen(false);
                      setLevelMenuOpen(true);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 text-xs font-mono-tabular gbc-menu-btn text-[#00f3ff] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Abrir selector
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {activeState === 'state-archipelago'
                    ? '[I] Inventario · [ESC] Cerrar'
                    : '[ESC] Cerrar'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setSettingsOpen(false);
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs font-mono-tabular font-semibold gbc-menu-btn cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        className="view-state z-10 w-full h-full relative overflow-hidden bg-[#050614]"
      >
        <img
          src="/assets/aistudio/imagen_67ebc66c.png"
          alt="Pixelverse: El Reinicio del Universo"
          className="absolute inset-0 w-full h-full object-cover object-top select-none pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none z-10"
        />

        {/* Botones apilados verticalmente y centrados sobre la ilustración */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center space-y-2.5 w-full px-4">
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

            {/* CÓDIGO - Solo visible tras introducir la secuencia secreta ADSWADSWBA o haber activado el desbloqueo maestro */}
            {(codeButtonRevealed || masterUnlocked) && (
              <button
                id="btn-code-modal"
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setCodeModalOpen(true);
                }}
                className={`w-full py-2.5 sm:py-3 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600 text-black border-2 border-emerald-100 shadow-[0_4px_0_#166534,0_0_20px_rgba(16,185,129,0.6)] font-display font-black tracking-widest text-xs sm:text-sm uppercase cursor-pointer hover:brightness-110 active:translate-y-1 active:shadow-none transition-all text-center ${
                  codeGlitchEffect ? 'btn-code-reveal-anim' : ''
                }`}
              >
                CÓDIGO
              </button>
            )}
          </div>

          <p className="text-[10px] font-mono-tabular tracking-[0.22em] text-[#00f3ff] font-bold uppercase text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {hasSavedProgress
              ? 'ISLA DEL ORIGEN · PARTIDA GUARDADA LISTA'
              : 'EL REINICIO DEL UNIVERSO ARCADE'}
          </p>
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

              {/* Banner de Ceremonia "PROTOCOLO PIXEL ACTIVADO" */}
              {pixelCeremonyActive && (
                <div className="p-4 rounded-lg bg-emerald-950/90 border-2 border-emerald-400 pixel-ceremony-box space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-mono-tabular font-bold text-xs tracking-wider uppercase">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>PROTOCOLO PIXEL ACTIVADO</span>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  </div>
                  <p className="text-xs font-mono-tabular text-[#00f3ff] font-bold tracking-widest uppercase">
                    MEMORIA DEL UNIVERSO RESTAURADA
                  </p>
                  <p className="text-[11px] font-mono-tabular text-slate-300">
                    Todos los niveles y reinos retro del multiverso han sido desbloqueados.
                  </p>
                </div>
              )}

              <form onSubmit={handleValidateSerial} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tabular text-slate-300">
                    Ingresa el Código de Desbloqueo Maestro (Ej. PIXEL):
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
                      placeholder="Ej. PIXEL"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[#040715]/90 border border-[#00f3ff]/40 text-sm font-mono-tabular text-white uppercase tracking-wider placeholder:text-slate-500 placeholder:normal-case focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
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
                  Código incorrecto · Acceso no reconocido.
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
            onEnterBreakout={() => {
              managerRef.current?.transitionTo('state-breakout');
            }}
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
            onManualSave={(x, y) => {
              setProgressState((prev) => recordManualSaveCheckpoint(prev, x, y));
            }}
            onManualSave80s={(x, y) => {
              setProgressState((prev) => recordManualSave80sCheckpoint(prev, x, y));
            }}
            onOpenChest={(chestId, rewardItemIds) => {
              setProgressState((prev) => openRpgChest(prev, chestId, rewardItemIds));
            }}
            onDiscoverSecret={(secretId) => {
              setProgressState((prev) => discoverRpgSecret(prev, secretId));
            }}
            onDiscoverClue={(clueId) => {
              setProgressState((prev) => discoverInvestigationClue(prev, clueId));
            }}
            onSolveCase={(caseId, rewardItemIds) => {
              setProgressState((prev) =>
                solveInvestigationCase(prev, caseId, rewardItemIds)
              );
            }}
            onCalmCreature={(creatureId) => {
              setProgressState((prev) => calmGuardianCreature(prev, creatureId));
            }}
            onInspectExhibit={(exhibitId) => {
              setProgressState((prev) => recordMuseumExhibitInspected(prev, exhibitId));
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
            isGbGreenMode={isGbGreenMode}
            onToggleGbGreenMode={() => {
              setIsGbGreenMode((prev) => !prev);
            }}
            isAudioMuted={isAudioMuted}
            onToggleAudio={handleToggleGlobalSound}
            onOpenLevelSelector={() => {
              setLevelMenuOpen(true);
            }}
            externalModalOpen={settingsOpen}
            manualSaveTriggerRef={islandManualSaveRef}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 5B: BREAKOUT (1976) — SALA SECRETA DE LAS CUATRO BANDAS
         ========================================================= */}
      <section id="state-breakout" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-breakout' && (
          <Breakout1976Stage
            active={activeState === 'state-breakout'}
            alreadyRestored={Boolean(progressState.games['breakout']?.memoryUnlocked)}
            bestSavedScore={progressState.games['breakout']?.bestScore ?? 0}
            onMemoryRestored={(finalScore: number) => {
              const firstTime =
                finalScore >= BREAKOUT_UNLOCK_SCORE &&
                !progressState.rpg.achievementsUnlocked.includes('breakout-secreto-1976');
              setProgressState((prev) =>
                recordGameVictory(prev, 'breakout', finalScore, 2)
              );
              if (firstTime) {
                retroAudio.achievementUnlock();
                setAchievementToast(
                  '★ LOGRO PERMANENTE: MURO CROMÁTICO 1976 RESTAURADO (BREAKOUT) ★'
                );
                window.setTimeout(() => {
                  setAchievementToast(null);
                }, 5200);
              }
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'breakout'));
            }}
            onExitToSecretRoom={() => {
              setIslandArrivalMode('return-breakout');
              setProgressState((prev) => markTransitionFinished(prev, 'breakout', true));
              managerRef.current?.transitionTo('state-archipelago');
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
              const firstTime1000 =
                finalScore >= 1000 &&
                !progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts');
              setProgressState((prev) =>
                recordGameVictory(prev, 'space-invaders', finalScore, 3)
              );
              if (firstTime1000) {
                retroAudio.achievementUnlock();
                setAchievementToast(
                  '★ LOGRO PERMANENTE: DEFENSOR DE LOS 1.000 PUNTOS (SPACE INVADERS) ★'
                );
                window.setTimeout(() => {
                  setAchievementToast(null);
                }, 5200);
              }
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
