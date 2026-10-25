/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR RPG 2D CENITAL DE PIXELVERSE:
 * - La Gran Isla de los 70 (9 zonas interconectadas + arquitectura accesible)
 * - Movimiento y animaciones pixel-art en 4 direcciones, carrera e interacción
 * - Interiores accesibles, cámara oculta tras pared falsa, gruta oscura tras cascada
 * - Expansión jugable inter-islas hacia «Isla Neón 1980s: Muelle de las Vigas Rojas»
 * - Inventario funcional [I], Diario de Misiones [Q], Lámpara [L], Escáner [R] y Códice [C]
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Backpack,
  BookOpen,
  Compass,
  Diamond,
  Flame,
  Map as MapIcon,
  Radio,
  Save,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { ArchitectCodexModal } from '../memories/ArchitectCodexModal';
import {
  PONG_UNLOCK_SCORE,
  PixelverseProgressState,
  SPACE_INVADERS_UNLOCK_SCORE,
} from '../memories/progressionState';
import {
  BROKEN_RELAY_MECHANISM,
  COASTAL_SUBTERRANEAN_TUNNELS,
  DK_CABINET_80S_INTERACT,
  evaluateTimeMachineStatus,
  FacingDirection,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  ISLAND_ANOMALY_PORTALS,
  ISLAND_WOODEN_SIGNS,
  isBlockedByExteriorBuilding,
  isWalkableInSubArea,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  RPG_ITEMS,
  RPG_QUESTS,
  RPG_SUBAREA_NPCS,
  RpgAreaId,
  SUB_AREAS,
  TIME_MACHINE_CONSOLE,
  VILLAGE_SAVE_TERMINAL,
  WATERFALL_SECRET_ENTRANCE,
} from '../rpg/rpgContent';
import { RpgInventoryModal, RpgQuestsModal } from '../rpg/rpgModals';
import { renderSubAreaFrame } from '../rpg/subAreaRenderer';
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
  | 'invaders-ship'
  | 'return-80s';

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
  onEnterDonkeyKong: () => void;
  onCollectDiamond: (diamondId: string) => void;
  onVisitZone: (zoneId: IslandZoneId) => void;
  onDiscoverEcho: (echoId: string) => void;
  onActivateSwitch: (switchId: string) => void;
  onTalkNpc: (npcId: string) => void;
  onSavePosition: (x: number, y: number) => void;
  onSave80sPosition: (x: number, y: number) => void;
  onManualSave: (x: number, y: number) => void;
  onOpenChest: (chestId: string, rewardItemIds: string[]) => void;
  onDiscoverSecret: (secretId: string) => void;
  onSolvePuzzle: (puzzleId: string, rewardItemIds?: string[]) => void;
  onRepairMechanism: (mechanismId: string, alsoSwitches?: string[]) => void;
  onUpdateQuest: (
    questId: string,
    status: 'active' | 'completed',
    rewardItemIds?: string[]
  ) => void;
  onEquipCosmetic: (cosmeticId: string | null) => void;
  onToggleLantern: (forceValue?: boolean) => void;
  onArrivalSequenceFinished?: () => void;
}

interface InteractivePromptTarget {
  kind:
    | 'save-terminal'
    | 'wooden-sign'
    | 'rock-tunnel'
    | 'anomaly-portal'
    | 'time-machine'
    | 'pong-cabinet'
    | 'pong-hoverboard-ride'
    | 'glitch-portal'
    | 'invaders-cabinet'
    | 'dk-cabinet-80s'
    | 'astrolabe'
    | 'npc'
    | 'sub-npc'
    | 'echo'
    | 'switch'
    | 'vista'
    | 'building-door'
    | 'waterfall-entrance'
    | 'ferry-80s'
    | 'broken-relay'
    | 'chest'
    | 'examinable'
    | 'sub-exit';
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
  onEnterDonkeyKong,
  onCollectDiamond,
  onVisitZone,
  onDiscoverEcho,
  onActivateSwitch,
  onTalkNpc,
  onSavePosition,
  onSave80sPosition,
  onManualSave,
  onOpenChest,
  onDiscoverSecret,
  onSolvePuzzle,
  onRepairMechanism,
  onUpdateQuest,
  onEquipCosmetic,
  onToggleLantern,
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
  const dkRestored =
    Boolean(progressState.games['donkey-kong']?.memoryUnlocked) || allUnlocked;
  const invadersCabinetUnlocked =
    glitchTrailCleared ||
    progressState.island70s.unlockedCabinets.includes('space-invaders') ||
    allUnlocked;

  const southShortcutActive = isSouthShortcutUnlocked(
    progressState.island70s.activatedIslandSwitches,
    allUnlocked
  );

  const determineInitialAreaAndSpawn = (): {
    areaId: RpgAreaId;
    x: number;
    y: number;
    extReturnX: number;
    extReturnY: number;
  } => {
    const fallbackExterior = progressState.island70s.lastIslandPos &&
      isPointWalkableOnIsland(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y,
        { southShortcut: southShortcutActive, gargantaBridge: glitchTrailCleared }
      ) &&
      !isBlockedByExteriorBuilding(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y
      )
      ? { ...progressState.island70s.lastIslandPos }
      : { ...ISLAND_KEY_COORDS.awakeningSpawn };

    if (
      arrivalMode === 'return-80s' ||
      (arrivalMode === 'standard' && progressState.rpg.lastSafeArea === 'island-80s')
    ) {
      const spec80s = SUB_AREAS['island-80s'];
      const candidate80s =
        arrivalMode === 'return-80s'
          ? { x: 702, y: 344 }
          : progressState.rpg.last80sPos ?? { x: 215, y: 360 };
      const valid80s = isWalkableInSubArea(spec80s, candidate80s.x, candidate80s.y)
        ? candidate80s
        : { x: 215, y: 360 };
      return {
        areaId: 'island-80s',
        x: valid80s.x,
        y: valid80s.y,
        extReturnX: HARBOR_80S_FERRY.returnExteriorX,
        extReturnY: HARBOR_80S_FERRY.returnExteriorY,
      };
    }

    if (arrivalMode === 'pong-board') {
      return {
        areaId: 'exterior-70s',
        x: ISLAND_KEY_COORDS.pongBoardLanding.x,
        y: ISLAND_KEY_COORDS.pongBoardLanding.y,
        extReturnX: ISLAND_KEY_COORDS.pongBoardLanding.x,
        extReturnY: ISLAND_KEY_COORDS.pongBoardLanding.y,
      };
    }
    if (arrivalMode === 'glitch-trail-cleared') {
      return {
        areaId: 'exterior-70s',
        x: ISLAND_KEY_COORDS.glitchTrailReturn.x,
        y: ISLAND_KEY_COORDS.glitchTrailReturn.y,
        extReturnX: ISLAND_KEY_COORDS.glitchTrailReturn.x,
        extReturnY: ISLAND_KEY_COORDS.glitchTrailReturn.y,
      };
    }
    if (arrivalMode === 'invaders-ship') {
      return {
        areaId: 'exterior-70s',
        x: ISLAND_KEY_COORDS.starShuttleDisembark.x,
        y: ISLAND_KEY_COORDS.starShuttleDisembark.y,
        extReturnX: ISLAND_KEY_COORDS.starShuttleDisembark.x,
        extReturnY: ISLAND_KEY_COORDS.starShuttleDisembark.y,
      };
    }
    if (arrivalMode === 'standard') {
      return {
        areaId: 'exterior-70s',
        x: fallbackExterior.x,
        y: fallbackExterior.y,
        extReturnX: fallbackExterior.x,
        extReturnY: fallbackExterior.y,
      };
    }
    return {
      areaId: 'exterior-70s',
      x: ISLAND_KEY_COORDS.awakeningSpawn.x,
      y: ISLAND_KEY_COORDS.awakeningSpawn.y,
      extReturnX: ISLAND_KEY_COORDS.awakeningSpawn.x,
      extReturnY: ISLAND_KEY_COORDS.awakeningSpawn.y,
    };
  };

  const initSetupRef = useRef(determineInitialAreaAndSpawn());

  const [activeAreaId, setActiveAreaId] = useState<RpgAreaId>(initSetupRef.current.areaId);
  const activeAreaRef = useRef<RpgAreaId>(initSetupRef.current.areaId);
  activeAreaRef.current = activeAreaId;

  const exteriorReturnPosRef = useRef<{ x: number; y: number }>({
    x: initSetupRef.current.extReturnX,
    y: initSetupRef.current.extReturnY,
  });

  const playerPosBridgeRef = useRef<{
    x: number;
    y: number;
    facingDir: FacingDirection;
    interactAnim: number;
    teleportPending: { x: number; y: number; facingDir?: FacingDirection } | null;
  }>({
    x: initSetupRef.current.x,
    y: initSetupRef.current.y,
    facingDir: 'down',
    interactAnim: 0,
    teleportPending: null,
  });

  const steppedTilesRef = useRef<number[]>([]);
  const scannerPulseRef = useRef<{ active: boolean; elapsed: number }>({
    active: false,
    elapsed: 0,
  });

  const [areaFadeActive, setAreaFadeActive] = useState<boolean>(false);
  const [chronoWarpActive, setChronoWarpActive] = useState<boolean>(false);
  const areaTransitionLockRef = useRef<boolean>(false);

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
  const [inventoryOpen, setInventoryOpen] = useState<boolean>(false);
  const [questsOpen, setQuestsOpen] = useState<boolean>(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [minimapOpen, setMinimapOpen] = useState<boolean>(true);
  const [flightStatusText, setFlightStatusText] = useState<string | null>(null);
  const [playerMiniPos, setPlayerMiniPos] = useState<{ x: number; y: number }>({
    x: initSetupRef.current.x,
    y: initSetupRef.current.y,
  });

  const anyModalOpen =
    Boolean(activeDialog) || codexOpen || inventoryOpen || questsOpen || chronoWarpActive;

  const latestStateRef = useRef({
    skinColor,
    hairColor,
    shirtColor,
    allUnlocked,
    pongRestored,
    glitchTrailCleared,
    invadersRestored,
    dkRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: anyModalOpen,
  });
  latestStateRef.current = {
    skinColor,
    hairColor,
    shirtColor,
    allUnlocked,
    pongRestored,
    glitchTrailCleared,
    invadersRestored,
    dkRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: anyModalOpen,
  };

  const callbacksRef = useRef({
    onEnterPong,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onEnterDonkeyKong,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onSave80sPosition,
    onManualSave,
    onOpenChest,
    onDiscoverSecret,
    onSolvePuzzle,
    onRepairMechanism,
    onUpdateQuest,
    onEquipCosmetic,
    onToggleLantern,
    onArrivalSequenceFinished,
  });
  callbacksRef.current = {
    onEnterPong,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onEnterDonkeyKong,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onSave80sPosition,
    onManualSave,
    onOpenChest,
    onDiscoverSecret,
    onSolvePuzzle,
    onRepairMechanism,
    onUpdateQuest,
    onEquipCosmetic,
    onToggleLantern,
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
    }, 3900);
  }, []);

  const transitionToArea = useCallback(
    (
      nextArea: RpgAreaId,
      spawnX: number,
      spawnY: number,
      facingDir: FacingDirection = 'down',
      toastMsg?: string
    ) => {
      if (areaTransitionLockRef.current) return;
      areaTransitionLockRef.current = true;
      virtualInputRef.current.clickTarget = null;
      retroAudio.doorTransition();
      setAreaFadeActive(true);

      window.setTimeout(() => {
        activeAreaRef.current = nextArea;
        setActiveAreaId(nextArea);
        setNearbyPrompt(null);
        steppedTilesRef.current = [];
        playerPosBridgeRef.current.teleportPending = {
          x: spawnX,
          y: spawnY,
          facingDir,
        };
        if (nextArea === 'exterior-70s') {
          callbacksRef.current.onSavePosition(spawnX, spawnY);
        } else if (nextArea === 'island-80s') {
          callbacksRef.current.onSave80sPosition(spawnX, spawnY);
          callbacksRef.current.onDiscoverSecret('visited-island-80s');
        }
        if (toastMsg) {
          showToast(toastMsg);
        }
      }, 165);

      window.setTimeout(() => {
        setAreaFadeActive(false);
        areaTransitionLockRef.current = false;
      }, 340);
    },
    [showToast]
  );

  const teleportExteriorTunnel = useCallback(
    (
      destX: number,
      destY: number,
      facingDir: FacingDirection,
      toastMsg?: string
    ) => {
      if (areaTransitionLockRef.current) return;
      areaTransitionLockRef.current = true;
      virtualInputRef.current.clickTarget = null;
      retroAudio.doorTransition();
      setAreaFadeActive(true);

      window.setTimeout(() => {
        setNearbyPrompt(null);
        playerPosBridgeRef.current.teleportPending = {
          x: destX,
          y: destY,
          facingDir,
        };
        callbacksRef.current.onSavePosition(destX, destY);
        if (toastMsg) {
          showToast(toastMsg);
        }
      }, 155);

      window.setTimeout(() => {
        setAreaFadeActive(false);
        areaTransitionLockRef.current = false;
      }, 320);
    },
    [showToast]
  );

  const handleUseScannerPulse = useCallback(() => {
    const st = latestStateRef.current;
    const hasScanner =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('secret-scanner') ||
      st.progressState.rpg.inventoryItems.includes('item-escaner-frecuencias');
    if (!hasScanner) {
      retroAudio.npcBlip(0.75);
      showToast(
        'Escáner bloqueado · Resuelve las losetas del Templo Pionero o ayuda a la Archivera Lira.'
      );
      return;
    }
    retroAudio.scannerPing();
    scannerPulseRef.current = { active: true, elapsed: 0 };
    showToast('Pulso Escáner TTL emitido · Buscando muros falsos, cofres y reliquias...');
  }, [showToast]);

  const handleToggleLanternAction = useCallback(() => {
    const st = latestStateRef.current;
    const hasLantern =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('phosphor-lantern') ||
      st.progressState.rpg.inventoryItems.includes('item-lampara-fosforo');
    if (!hasLantern) {
      retroAudio.npcBlip(0.75);
      showToast(
        'Lámpara no disponible · Restaura Pong (1972) con 1.000 PTS para obtener la Lámpara de Fósforo.'
      );
      return;
    }
    const nextState = !st.progressState.rpg.lanternActive;
    retroAudio.shardCollect(nextState ? 2 : 0);
    callbacksRef.current.onToggleLantern(nextState);
    showToast(
      nextState
        ? 'Lámpara de Fósforo Ámbar ENCENDIDA · Penumbra disipada.'
        : 'Lámpara de Fósforo Ámbar APAGADA.'
    );
  }, [showToast]);

  const handleUseWelderAction = useCallback(() => {
    const st = latestStateRef.current;
    const hasWelder =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('circuit-welder') ||
      st.progressState.rpg.inventoryItems.includes('item-soldador-logico');
    if (!hasWelder) {
      retroAudio.npcBlip(0.75);
      showToast('Aún no posees el Soldador Lógico · Visita al Maestro Kertz en el Taller.');
      return;
    }
    const px = playerPosBridgeRef.current.x;
    const py = playerPosBridgeRef.current.y;
    if (
      activeAreaRef.current === 'exterior-70s' &&
      Math.hypot(px - BROKEN_RELAY_MECHANISM.x, py - BROKEN_RELAY_MECHANISM.y) < 115
    ) {
      const already = st.progressState.rpg.repairedMechanismIds.includes(
        BROKEN_RELAY_MECHANISM.id
      );
      if (already) {
        showToast('El Relé Auxiliar ya opera al 100% de resonancia.');
        return;
      }
      retroAudio.questComplete();
      callbacksRef.current.onRepairMechanism(BROKEN_RELAY_MECHANISM.id, [
        'sw-costa-este',
        'sw-ruinas-sur',
      ]);
      showToast(
        '¡Relé Auxiliar soldado con éxito! El Puente Costero del Sur se ha sincronizado.'
      );
    } else {
      showToast(
        'Acércate al Relé Auxiliar averiado al sur de las Ruinas Centrales para usar el Soldador.'
      );
    }
  }, [showToast]);

  const triggerInteraction = useCallback(
    (targetOverride?: InteractivePromptTarget | null) => {
      const target = targetOverride ?? nearbyPromptRef.current;
      if (!target) return;
      if (vehicleFlightRef.current.type !== 'none' || areaTransitionLockRef.current) {
        return;
      }

      playerPosBridgeRef.current.interactAnim = 0.28;
      const st = latestStateRef.current;

      if (target.kind === 'save-terminal') {
        const px = playerPosBridgeRef.current.x;
        const py = playerPosBridgeRef.current.y;
        callbacksRef.current.onManualSave(px, py);
        retroAudio.saveJingle();
        const zInfo = ISLAND_ZONES[currentZoneId];
        const inv1000 =
          st.invadersRestored ||
          st.progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts');
        setActiveDialog({
          category: 'PUNTO DE GUARDADO · CARTUCHO GBC SINCRONIZADO',
          title: VILLAGE_SAVE_TERMINAL.label,
          subtitle: `${zInfo.macroRegionTitle} · ${zInfo.name}`,
          paragraphs: [
            '¡Partida guardada correctamente en la memoria no volátil de PIXELVERSE!',
            `Progreso registrado: Diamantes (${st.progressState.island70s.collectedDiamondIds.length}/${TOTAL_70S_DIAMONDS}) · Cofres (${st.progressState.rpg.openedChestIds.length}/${RPG_CHESTS.length}) · Secretos (${st.progressState.rpg.discoveredSecretIds.length}) · Objetos (${st.progressState.rpg.inventoryItems.length}).`,
            inv1000
              ? '★ Logro Especial Verificado: «Defensor 1.000 PTS en Space Invaders» activo de forma permanente.'
              : 'Consejo: Supera los 1.000 puntos en Pong (Zona 2) y en Space Invaders (Zona 4) para registrar tus emblemas permanentes.',
          ],
          hint: 'Puedes retomar tu aventura en cualquier momento pulsando CONTINUAR en la pantalla de título.',
          accentHex: '#38bdf8',
        });
        return;
      }

      if (target.kind === 'wooden-sign') {
        const sign = ISLAND_WOODEN_SIGNS.find((s) => s.id === target.id);
        if (!sign) return;
        retroAudio.uiClick();
        setActiveDialog({
          category: 'CARTEL DE MADERA · ORIENTACIÓN DE RUTA',
          title: sign.zoneTitle,
          paragraphs: sign.lines,
          accentHex: '#fde047',
        });
        return;
      }

      if (target.kind === 'rock-tunnel') {
        const tunnel = COASTAL_SUBTERRANEAN_TUNNELS.find((t) => t.id === target.id);
        if (!tunnel) return;
        const secretId = tunnel.secretId;
        const firstDiscovery =
          Boolean(secretId) &&
          !st.progressState.rpg.discoveredSecretIds.includes(secretId!);
        if (firstDiscovery && secretId) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret(secretId);
        }
        teleportExteriorTunnel(
          tunnel.destX,
          tunnel.destY,
          tunnel.destFacing,
          firstDiscovery
            ? `¡Túnel subterráneo oculto en la roca descubierto! · ${tunnel.toastText}`
            : tunnel.toastText
        );
        return;
      }

      if (target.kind === 'anomaly-portal') {
        const portal = ISLAND_ANOMALY_PORTALS.find((p) => p.id === target.id);
        if (!portal) return;

        const syncedGlyphs = ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'].filter(
          (gid) =>
            st.allUnlocked || st.progressState.rpg.discoveredSecretIds.includes(gid)
        ).length;

        const unlocked =
          st.allUnlocked ||
          !portal.requiredSecretIds ||
          portal.requiredSecretIds.every((req) =>
            st.progressState.rpg.discoveredSecretIds.includes(req)
          );

        if (!unlocked) {
          retroAudio.portalResonance(false);
          setActiveDialog({
            category: `ANOMALÍA ARQUEOLÓGICA · GLIFOS SINCRONIZADOS (${syncedGlyphs}/3)`,
            title: portal.dormantTitle,
            subtitle: portal.subtitle,
            paragraphs: portal.dormantLore,
            hint: portal.dormantHint,
            accentHex: portal.accentHex,
          });
          return;
        }

        retroAudio.portalResonance(true);
        if (portal.targetKind === 'exterior-coords') {
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-portal-atajo-sincronizado'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-portal-atajo-sincronizado');
          }
          teleportExteriorTunnel(
            portal.destX,
            portal.destY,
            portal.destFacing,
            portal.activeToast
          );
          return;
        }

        if (portal.targetKind === 'sub-area' && portal.targetArea) {
          exteriorReturnPosRef.current = {
            x: portal.returnExteriorX ?? playerPosBridgeRef.current.x,
            y: portal.returnExteriorY ?? playerPosBridgeRef.current.y,
          };
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-boveda-cronoscopio'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-boveda-cronoscopio');
          }
          transitionToArea(
            portal.targetArea,
            portal.destX,
            portal.destY,
            portal.destFacing,
            portal.activeToast
          );
        }
        return;
      }

      if (target.kind === 'time-machine') {
        const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
        if (
          !st.progressState.rpg.discoveredSecretIds.includes(
            'secret-cronoscopio-hallado'
          )
        ) {
          callbacksRef.current.onDiscoverSecret('secret-cronoscopio-hallado');
        }
        if (!st.progressState.rpg.questStates['quest-cronoscopio-origen']) {
          callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'active');
        }

        if (!tm.canTravelTo80s) {
          retroAudio.portalResonance(false);
          setActiveDialog({
            category: `LA MÁQUINA DEL TIEMPO · ETAPA ${tm.stageNumber} DE 4`,
            title: 'El Cronoscopio de las Décadas',
            subtitle: `Subsistemas sincronizados: ${tm.syncedCount} / 4`,
            paragraphs: [
              'Ante ti reposa El Cronoscopio: un astrolabio electromecánico de bronce, cuarzo y cátodos diseñado para navegar entre las décadas de la historia del videojuego.',
              `• Pulso Fundacional 1972 (Pong ≥ ${PONG_UNLOCK_SCORE} PTS): ${
                tm.pongReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Puente de Coordenadas (El Sendero del Glitch): ${
                tm.glitchReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Escudo Orbital 1978 (Space Invaders ≥ ${SPACE_INVADERS_UNLOCK_SCORE} PTS): ${
                tm.invadersReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Resonancia Arqueológica (Bobina Temporal o 3 Glifos): ${
                tm.archaeologyReady ? 'ACOPLADA ✓' : 'EN BÚSQUEDA'
              }`,
            ],
            hint: 'Completa los hitos de La Isla del Origen (1972 → Sendero Glitch → 1978) para activar la Etapa 4 y abrir el viaje temporal hacia la década de 1980.',
            accentHex: '#00f3ff',
          });
          return;
        }

        // Etapa 4 alcanzada: Ceremonia audiovisual de Salto Temporal hacia 1980s
        if (
          st.progressState.rpg.questStates['quest-cronoscopio-origen'] !== 'completed'
        ) {
          callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'completed', [
            'item-insignia-crononauta',
          ]);
        }

        areaTransitionLockRef.current = true;
        virtualInputRef.current.clickTarget = null;
        retroAudio.timeMachineWarp();
        setChronoWarpActive(true);

        window.setTimeout(() => {
          activeAreaRef.current = 'island-80s';
          setActiveAreaId('island-80s');
          setNearbyPrompt(null);
          steppedTilesRef.current = [];
          playerPosBridgeRef.current.teleportPending = {
            x: 268,
            y: 186,
            facingDir: 'down',
          };
          callbacksRef.current.onSave80sPosition(268, 186);
          callbacksRef.current.onDiscoverSecret('visited-island-80s');
        }, 1250);

        window.setTimeout(() => {
          setChronoWarpActive(false);
          areaTransitionLockRef.current = false;
          showToast(
            '¡Salto Temporal completado en El Cronoscopio! · Década de 1980: Paseo Neón de las Vigas Rojas'
          );
        }, 1750);
        return;
      }

      if (target.kind === 'building-door') {
        const bldg = ISLAND_70S_BUILDINGS.find((b) => b.id === target.id);
        if (!bldg) return;
        exteriorReturnPosRef.current = {
          x: bldg.returnExteriorX,
          y: bldg.returnExteriorY,
        };
        transitionToArea(
          bldg.targetArea,
          bldg.targetSpawnX,
          bldg.targetSpawnY,
          'up',
          `Entrando a ${bldg.name}`
        );
        return;
      }

      if (target.kind === 'waterfall-entrance') {
        const firstTime =
          !st.progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
        if (firstTime) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret('secret-cascada-gruta');
        }
        exteriorReturnPosRef.current = {
          x: WATERFALL_SECRET_ENTRANCE.returnExteriorX,
          y: WATERFALL_SECRET_ENTRANCE.returnExteriorY,
        };
        transitionToArea(
          WATERFALL_SECRET_ENTRANCE.targetArea,
          WATERFALL_SECRET_ENTRANCE.targetSpawnX,
          WATERFALL_SECRET_ENTRANCE.targetSpawnY,
          'up',
          firstTime
            ? '¡Pasadizo secreto descubierto detrás de la cascada!'
            : 'Gruta Subterránea Tras la Cascada'
        );
        return;
      }

      if (target.kind === 'ferry-80s') {
        const canSail =
          st.invadersRestored ||
          st.allUnlocked ||
          st.progressState.rpg.unlockedIslands.includes('island-80s');
        if (!canSail) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'EMBARCADERO ASTRAL · RUTA MARÍTIMA SELLADA',
            title: 'Navío hacia la Isla Neón 1980s',
            subtitle: `Requiere Carta Náutica (Space Invaders ≥ ${SPACE_INVADERS_UNLOCK_SCORE} PTS)`,
            paragraphs: [
              'Las corrientes cuánticas del mar oriental aún están agitadas por la invasión de 1978.',
              'Defiende La Fortaleza de las Oleadas superando los 1.000 puntos reales en Space Invaders para despejar la niebla y desbloquear la travesía hacia la Isla Neón de los años 80.',
            ],
            hint: 'Completa la cadena Pong (1.000 PTS) → Sendero del Glitch → Space Invaders (1.000 PTS).',
            accentHex: '#f43f5e',
          });
          return;
        }
        exteriorReturnPosRef.current = {
          x: HARBOR_80S_FERRY.returnExteriorX,
          y: HARBOR_80S_FERRY.returnExteriorY,
        };
        retroAudio.portalVictory();
        transitionToArea(
          'island-80s',
          HARBOR_80S_FERRY.targetSpawnX,
          HARBOR_80S_FERRY.targetSpawnY,
          'right',
          '¡Travesía completada! Bienvenido a la Isla Neón 1980s · Muelle de las Vigas Rojas'
        );
        return;
      }

      if (target.kind === 'sub-exit') {
        const curAreaId = activeAreaRef.current;
        if (curAreaId === 'exterior-70s') return;
        const spec = SUB_AREAS[curAreaId];
        const exitSpec = spec.exits.find((ex) => ex.id === target.id);
        if (!exitSpec) return;

        if (exitSpec.returnToSavedExterior) {
          transitionToArea(
            'exterior-70s',
            exteriorReturnPosRef.current.x,
            exteriorReturnPosRef.current.y,
            'down'
          );
        } else {
          if (exitSpec.targetArea === 'interior-cronoscopio') {
            exteriorReturnPosRef.current = { x: 2150, y: 1218 };
          }
          transitionToArea(
            exitSpec.targetArea,
            exitSpec.targetX ?? ISLAND_KEY_COORDS.awakeningSpawn.x,
            exitSpec.targetY ?? ISLAND_KEY_COORDS.awakeningSpawn.y,
            'down',
            exitSpec.targetArea === 'interior-cronoscopio'
              ? 'Regresando al Observatorio del Cronoscopio · Isla del Origen (1970s)'
              : undefined
          );
        }
        return;
      }

      if (target.kind === 'broken-relay') {
        const repaired = st.progressState.rpg.repairedMechanismIds.includes(
          BROKEN_RELAY_MECHANISM.id
        );
        if (repaired) {
          retroAudio.echoDiscover();
          showToast(
            'Relé Auxiliar operativo · El Puente Costero del Sur permanece energizado.'
          );
          return;
        }
        const hasWelder =
          st.allUnlocked ||
          st.progressState.island70s.abilitiesUnlocked.includes('circuit-welder') ||
          st.progressState.rpg.inventoryItems.includes('item-soldador-logico');
        if (!hasWelder) {
          retroAudio.npcBlip(0.82);
          setActiveDialog({
            category: 'MECANISMO ANTIGUO AVERIADO · REQUIERE HERRAMIENTA',
            title: BROKEN_RELAY_MECHANISM.label,
            subtitle: 'Pistas de cobre fracturadas',
            paragraphs: [
              'Este terminal auxiliar enlaza los dos pedestales del Puente Costero del Sur, pero sus pistas TTL están partidas.',
              'Si consigues un Soldador Lógico de Precisión en el Taller Analógico del Bosque, podrás repararlo y abrir el atajo costero al instante.',
            ],
            hint: 'Entra al Taller TTL en el Bosque de los Circuitos y habla con el Maestro Kertz.',
            accentHex: '#f97316',
          });
          return;
        }
        retroAudio.questComplete();
        callbacksRef.current.onRepairMechanism(BROKEN_RELAY_MECHANISM.id, [
          'sw-costa-este',
          'sw-ruinas-sur',
        ]);
        setActiveDialog({
          category: 'INGENIERÍA APLICADA · MECANISMO REPARADO',
          title: '¡Relé Auxiliar Soldado con Éxito!',
          subtitle: 'Atajo del Puente Costero del Sur activado',
          paragraphs: [
            'Con pulso firme unes los contactos con estaño luminoso. Una onda cian recorre la costa meridional y despliega el puente energético hacia el Santuario de Pong.',
          ],
          accentHex: '#10b981',
        });
        return;
      }

      if (target.kind === 'chest') {
        const chest = RPG_CHESTS.find((c) => c.id === target.id);
        if (!chest) return;
        const alreadyOpened = st.progressState.rpg.openedChestIds.includes(chest.id);
        if (alreadyOpened) {
          retroAudio.uiClick();
          showToast(`${chest.label} · Ya has recuperado su tesoro.`);
          return;
        }

        if (
          chest.requiresLanternInDark &&
          !st.progressState.rpg.lanternActive &&
          !st.allUnlocked
        ) {
          retroAudio.npcBlip(0.76);
          setActiveDialog({
            category: 'OSCURIDAD PROFUNDA · CERROJO INVISIBLE',
            title: chest.label,
            paragraphs: [
              'La penumbra húmeda de la gruta impide distinguir el mecanismo del cofre. Necesitas encender tu Lámpara de Fósforo Ámbar [L] para iluminar la caverna.',
            ],
            hint: 'Restaura Pong (1972) para recibir la Lámpara de Fósforo y actívala con [L] o desde [I].',
            accentHex: '#fbbf24',
          });
          return;
        }

        if (
          chest.requiresPuzzleId &&
          !st.progressState.rpg.solvedPuzzleIds.includes(chest.requiresPuzzleId) &&
          !st.allUnlocked
        ) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'BÓVEDA SELLADA · ACERTIJO DE LOSETAS',
            title: chest.label,
            subtitle: 'Cerrojo armónico activo',
            paragraphs: [
              'Tres bobinas magnéticas mantienen cerrado este cofre. Examina la estela tallada a la izquierda y pisa las tres losetas del suelo en el orden correcto (I → II → III).',
            ],
            accentHex: '#00f3ff',
          });
          return;
        }

        if (
          chest.requiresItemId &&
          !st.progressState.rpg.inventoryItems.includes(chest.requiresItemId) &&
          !st.allUnlocked
        ) {
          const reqItem = RPG_ITEMS[chest.requiresItemId];
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'COFRE CON CERRADURA BINARIA',
            title: chest.label,
            subtitle: `Requiere: ${reqItem ? reqItem.name : 'Llave especial'}`,
            paragraphs: [
              'Una cerradura de 8 pines protege esta reliquia de neón. Cuenta la leyenda que la llave descansa oculta tras una pared falsa en el Taller Analógico de los años 70.',
            ],
            accentHex: '#f43f5e',
          });
          return;
        }

        retroAudio.chestOpen();
        callbacksRef.current.onOpenChest(chest.id, chest.rewardItemIds);
        const rewardNames = chest.rewardItemIds
          .map((id) => RPG_ITEMS[id]?.name || id)
          .join(' + ');
        setActiveDialog({
          category: '¡TESORO DESCUBIERTO! · COFRE ABIERTO',
          title: chest.label,
          subtitle: `Obtenido: ${rewardNames}`,
          paragraphs: chest.rewardItemIds.map((id) => {
            const spec = RPG_ITEMS[id];
            return spec
              ? `★ ${spec.name}: ${spec.description}`
              : `★ Objeto añadido a la Mochila.`;
          }),
          hint: 'Abre tu Mochila con [I] para inspeccionar, equipar o utilizar tus nuevos objetos.',
          accentHex: chest.accentHex,
        });
        return;
      }

      if (target.kind === 'examinable') {
        const exam = RPG_EXAMINABLES.find((ex) => ex.id === target.id);
        if (!exam) return;

        if (exam.isFalseWall && exam.unlocksDoorToArea) {
          const alreadyFound =
            exam.secretIdToDiscover &&
            st.progressState.rpg.discoveredSecretIds.includes(exam.secretIdToDiscover);
          if (!alreadyFound && exam.secretIdToDiscover) {
            retroAudio.secretFound();
            callbacksRef.current.onDiscoverSecret(exam.secretIdToDiscover);
            setActiveDialog({
              category: exam.category,
              title: exam.label,
              paragraphs: exam.paragraphs,
              hint: 'Pulsa [E] nuevamente frente a la abertura para adentrarte en la Cámara Oculta de 1958.',
              accentHex: exam.accentHex,
            });
            return;
          }
          transitionToArea(
            exam.unlocksDoorToArea.targetArea,
            exam.unlocksDoorToArea.spawnX,
            exam.unlocksDoorToArea.spawnY,
            'up',
            'Cámara Oculta de 1958 · Sala Secreta'
          );
          return;
        }

        retroAudio.echoDiscover();
        if (exam.secretIdToDiscover) {
          callbacksRef.current.onDiscoverSecret(exam.secretIdToDiscover);
        }
        setActiveDialog({
          category: exam.category,
          title: exam.label,
          paragraphs: exam.paragraphs,
          hint: exam.hint,
          accentHex: exam.accentHex,
        });
        return;
      }

      if (target.kind === 'sub-npc') {
        const snpc = RPG_SUBAREA_NPCS.find((n) => n.id === target.id);
        if (!snpc) return;
        retroAudio.npcBlip(snpc.pitch);
        callbacksRef.current.onTalkNpc(snpc.id);

        if (snpc.id === 'npc-maestro-kertz') {
          const qDone = st.progressState.rpg.questStates['quest-taller-ttl'] === 'completed';
          const hasCap =
            st.progressState.rpg.inventoryItems.includes('item-condensador-cuarzo') ||
            st.allUnlocked;
          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Misión Completada · Soldador Lógico entregado',
              paragraphs: [
                '«¡Ese Condensador de Cuarzo estabilizó todos mis osciloscopios! Usa bien el Soldador Lógico en las Ruinas del Sur para reactivar el viejo relé del puente costero.»',
                '«Por cierto... ¿has notado la corriente fría que sale de los ladrillos del muro norte?»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasCap) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-taller-ttl', 'completed', [
              'item-soldador-logico',
            ]);
            setActiveDialog({
              category: '¡MISIÓN COMPLETADA! · INGENIERÍA TTL',
              title: snpc.name,
              subtitle: 'Recompensa recibida: Soldador Lógico de Precisión',
              paragraphs: [
                '«¡Increíble, Pixel! Cuarzo hexadecimal puro de las cavernas del noroeste. Mis generadores de pulso vuelven a latir como en 1972.»',
                '«Toma mi Soldador Lógico de Precisión. Con él podrás reparar el Relé Auxiliar averiado en las Ruinas Centrales y abrir atajos antiguos.»',
              ],
              hint: 'Nueva herramienta desbloqueada en tu Mochila [I]: Soldador Lógico.',
              accentHex: '#10b981',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-taller-ttl', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Nueva Misión: El Condensador de Cuarzo [Q]',
              paragraphs: [
                '«Bienvenido al Taller Analógico. Aquí ensamblábamos máquinas enteras sin microprocesadores, solo con ingenio y compuertas TTL.»',
                '«Mi fuente principal perdió estabilidad. Si encuentras un Condensador de Cuarzo Puro en algún cofre de las Cavernas del Código al noroeste, te forjaré un Soldador Lógico.»',
              ],
              hint: 'Revisa tus encargos activos pulsando [Q].',
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-archivera-lira') {
          const qDone =
            st.progressState.rpg.questStates['quest-archivo-cartuchos'] === 'completed';
          const hasAlpha =
            st.progressState.rpg.inventoryItems.includes('item-cinta-alfa') ||
            st.allUnlocked;
          const hasBeta =
            st.progressState.rpg.inventoryItems.includes('item-cinta-beta') ||
            st.allUnlocked;

          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Archivo Histórico Sincronizado',
              paragraphs: [
                '«Ambas Cintas Magnéticas giran ya en las bobinas maestras del Templo. Recuerda emitir pulsos con tu Escáner TTL [R] cuando sospeches de muros o cascadas.»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasAlpha && hasBeta) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-archivo-cartuchos', 'completed', [
              'item-escaner-frecuencias',
            ]);
            setActiveDialog({
              category: '¡MISIÓN COMPLETADA! · ARCHIVO PIONERO',
              title: snpc.name,
              subtitle: 'Recompensa: Escáner de Secretos TTL [R]',
              paragraphs: [
                '«¡Has reunido las Cintas Alfa (1971) y Beta (1975)! La memoria documental de la primera década vuelve a estar íntegra.»',
                '«Recibe este Escáner de Secretos TTL. Pulsa [R] en cualquier zona para lanzar una onda armónica que revela cofres, pistas y paredes falsas.»',
              ],
              hint: 'También puedes resolver las losetas I → II → III del suelo para abrir el cofre de la bóveda.',
              accentHex: '#00f3ff',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-archivo-cartuchos', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: `Cintas recuperadas: ${(hasAlpha ? 1 : 0) + (hasBeta ? 1 : 0)} / 2`,
              paragraphs: [
                '«Custodio la memoria grabada del Archipiélago Cero, pero el colapso dispersó dos carretes esenciales: la Cinta Alfa en la costa sur y la Cinta Beta detrás de la cascada del norte.»',
                '«Además, si lees la estela izquierda y pisas las losetas en orden I → II → III, abrirás el Cofre Armónico del Templo.»',
              ],
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-ermitano-cascada') {
          const qDone =
            st.progressState.rpg.questStates['quest-secreto-cascada'] === 'completed';
          const hasRelic =
            st.progressState.rpg.inventoryItems.includes('item-reliquia-osciloscopio') ||
            st.allUnlocked;

          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Portador de la Corona Estelar',
              paragraphs: [
                '«El destello verde de 1958 ilumina ahora esta gruta silenciosa. Eres un verdadero explorador de secretos, Pixel.»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasRelic) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-secreto-cascada', 'completed', [
              'item-manto-arquitecto',
            ]);
            setActiveDialog({
              category: '¡MISIÓN SECRETA COMPLETADA!',
              title: snpc.name,
              subtitle: 'Recompensa: Corona Estelar del Descubridor (Cosmético)',
              paragraphs: [
                '«¡Por todos los cátodos antiguos! ¡La Válvula de Osciloscopio de 1958! Entonces encontraste el muro falso oculto en el Taller Analógico.»',
                '«Acepta la Corona Estelar del Descubridor. Puedes equiparla desde tu Mochila [I] para que brille sobre tu avatar mientras recorres el archipiélago.»',
              ],
              accentHex: '#fde047',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-secreto-cascada', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Misión Secreta: El Secreto Tras la Cascada',
              paragraphs: [
                '«Pocos viajeros cruzan el velo de agua de La Garganta... Medito aquí custodiando el recuerdo anterior a las recreativas.»',
                '«En el muro norte del Taller Analógico existe un ladrillo hueco que conduce a una cámara sellada de 1958. Si me muestras su Válvula luminiscente, te otorgaré una reliquia real.»',
              ],
              hint: 'Si la cueva está oscura, enciende tu Lámpara de Fósforo con [L] para ver el cofre sumergido al noreste.',
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-cronista-orfeo') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Zona 1 · Centro de Historia del Videojuego',
            paragraphs: [
              '«¡Bienvenido al Centro de Historia del Pueblo del Origen! Esta isla conserva en cinco regiones la chispa que dio vida a los videojuegos.»',
              '«Al este se extienden Las Praderas del Pixel con Pong (1972); al oeste, El Bosque de los Secretos oculta senderos entre los árboles; al norte arde La Fortaleza Volcánica con Space Invaders (1978); y en La Costa las rocas esconden túneles subterráneos.»',
            ],
            hint: 'Examina los murales de 1958, 1972 y 1978 en esta sala o camina detrás de este edificio para hallar un callejón secreto.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-capitana-vectoria') {
          callbacksRef.current.onUpdateQuest(
            'quest-despertar-1981',
            st.dkRestored ? 'completed' : 'active',
            st.dkRestored ? ['item-insignia-vigas-1981'] : []
          );
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: st.dkRestored
              ? '¡Hito Vertical de 1981 Restaurado!'
              : 'Expansión Desbloqueada · Década de 1980',
            paragraphs: st.dkRestored
              ? [
                  '«¡Brillante ascenso sobre las vigas rojas, Arquitecto! El Emblema de 1981 ya luce en tu inventario y el Paseo Neón vibra con nueva energía.»',
                  '«No olvides revisar el callejón noreste si ya encontraste la Llave Binaria de 8 Pines.»',
                ]
              : [
                  '«¡Bienvenido a la Isla Neón de los años 80! Gracias a tu defensa en Space Invaders, el Navío Astral puede cruzar libremente entre décadas.»',
                  '«Al este del paseo te aguarda el gabinete clásico de plataformas verticales de 1981. ¡Esquiva los barriles y rescata la memoria de la nueva era!»',
                ],
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-automa-crono') {
          const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-cronoscopio-hallado'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-cronoscopio-hallado');
          }
          if (!tm.canTravelTo80s) {
            callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'active');
          } else if (
            st.progressState.rpg.questStates['quest-cronoscopio-origen'] !== 'completed'
          ) {
            callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'completed', [
              'item-insignia-crononauta',
            ]);
          }

          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: tm.canTravelTo80s
              ? 'Etapa 4/4 Activa · Apertura Temporal 1980s Lista'
              : `Observatorio del Cronoscopio · Etapa ${tm.stageNumber}/4`,
            paragraphs: tm.canTravelTo80s
              ? [
                  '«¡Asombroso, Pixel! Los anillos de bronce y fósforo cantan al unísono: 1972, el Sendero del Glitch y 1978 laten estabilizados dentro del núcleo.»',
                  '«Acércate a la consola central de El Cronoscopio y pulsa [E] cuando estés listo para cruzar el umbral temporal hacia la década de 1980. Podrás regresar a esta isla siempre que quieras.»',
                ]
              : [
                  '«Saludos, viajero. Custodio El Cronoscopio desde que las décadas se fragmentaron en islas aisladas.»',
                  '«Para despertar su salto temporal hacia los años 80 necesitas restaurar la memoria completa de los años 70 (Pong, El Sendero del Glitch y Space Invaders). Además, al norte de las Cavernas de Memoria un Portal Abisal guarda nuestra Bobina de Resonancia original.»',
                ],
            hint: 'También puedes grabar los 3 Glifos de Pulso ([ ◈ ], [ ◈◈ ], [ ◈◈◈ ]) en la Aldea, el Bosque y la Costa para activar los Portales Anómalos exteriores.',
            accentHex: snpc.palette.glow,
          });
          return;
        }
      }

      if (target.kind === 'dk-cabinet-80s') {
        retroAudio.uiClick();
        callbacksRef.current.onEnterDonkeyKong();
        return;
      }

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
            ? 'Tabla de Pong activada · Planeando hacia La Garganta del Invasor...'
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
            subtitle: `Estabilización previa necesaria (${PONG_UNLOCK_SCORE} PTS en Pong)`,
            paragraphs: [
              'Las coordenadas de este portal vibran sin ancla. Antes de adentrarte en el desafío del Cartógrafo del Caos, visita el Santuario de Pong al sureste y restaura el pulso fundacional de 1972 alcanzando 1.000 puntos.',
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
        const chestsCount = st.progressState.rpg.openedChestIds.length;
        setActiveDialog({
          category: 'MONUMENTO CENTRAL · CUMBRE DEL ARQUITECTO',
          title: 'El Astrolabio de las Eras (Década de 1970)',
          subtitle: `Memorias 70s: ${
            (st.pongRestored ? 1 : 0) +
            (st.glitchTrailCleared ? 1 : 0) +
            (st.invadersRestored ? 1 : 0)
          }/3 · Diamantes: ${diamondsCount}/${TOTAL_70S_DIAMONDS} · Cofres: ${chestsCount}/${RPG_CHESTS.length} · Sombras: ${echoesCount}`,
          paragraphs: [
            st.pongRestored && st.invadersRestored
              ? 'Los anillos de latón y fósforo giran en resonancia bajo la luna pálida. Tanto Pong (1972) como Space Invaders (1978) superaron los 1.000 puntos y el Navío del Puerto Este ya conecta con la Isla Neón de los años 80.'
              : 'Este astrolabio sincroniza los recuerdos fundacionales del Archipiélago Cero. Cada videojuego restaurado (1.000 PTS), cada secreto oculto y cada Diamante de Memoria fortalece el puente hacia las siguientes décadas.',
            'Explora también el Taller Analógico en el Bosque, el Templo del Archivo en las Ruinas y la misteriosa cortina de agua en La Garganta.',
          ],
          hint:
            st.invadersRestored || st.allUnlocked
              ? '¡Ruta abierta! Dirígete al Puerto de las Islas Perdidas (Zona 09, al este) para abordar el Navío hacia la Isla Neón 1980s.'
              : `Quedan secretos y desafíos por descubrir. Pulsa [Q] para consultar tus misiones activas.`,
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
          subtitle:
            vista.id === 'vista-80s' && (st.invadersRestored || st.allUnlocked)
              ? '¡RUTA DESBLOQUEADA EN EL EMBARCADERO!'
              : vista.statusText,
          paragraphs: [vista.lorePreview],
          hint:
            vista.id === 'vista-80s' && (st.invadersRestored || st.allUnlocked)
              ? 'Camina unos pasos al norte en este mismo muelle y aborda el Navío 1980s con [E].'
              : vista.unlockRequirement,
          accentHex: vista.accentHex,
        });
      }
    },
    [currentZoneId, showToast, teleportExteriorTunnel, transitionToArea]
  );

  useEffect(() => {
    if (arrivalMode === 'glitch-trail-cleared') {
      retroAudio.bridgeActivate();
      showToast(
        '¡Puente Astral reconstruido! Cruza hacia el este para alcanzar La Fortaleza de las Oleadas (1978).'
      );
      onArrivalSequenceFinished?.();
    } else if (arrivalMode === 'return-80s') {
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
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const player = {
      x: playerPosBridgeRef.current.x,
      y: playerPosBridgeRef.current.y,
      facing: 1 as 1 | -1,
      facingDir: playerPosBridgeRef.current.facingDir as FacingDirection,
      walking: false,
      sprinting: false,
      interactAnim: 0,
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
          setInventoryOpen(false);
          setQuestsOpen(false);
          return;
        }
      }

      if (code === 'KeyI') {
        e.preventDefault();
        retroAudio.uiClick();
        setCodexOpen(false);
        setQuestsOpen(false);
        setInventoryOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyQ') {
        e.preventDefault();
        retroAudio.uiClick();
        setCodexOpen(false);
        setInventoryOpen(false);
        setQuestsOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyC') {
        e.preventDefault();
        retroAudio.uiClick();
        setInventoryOpen(false);
        setQuestsOpen(false);
        setCodexOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyL' && !latestStateRef.current.modalOpen) {
        e.preventDefault();
        handleToggleLanternAction();
        return;
      }

      if (code === 'KeyR' && !latestStateRef.current.modalOpen) {
        e.preventDefault();
        handleUseScannerPulse();
        return;
      }

      if (code === 'Tab') {
        e.preventDefault();
        setMinimapOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
        if (latestStateRef.current.modalOpen) {
          if (code === 'KeyE' || code === 'Enter') {
            e.preventDefault();
            setActiveDialog(null);
            setCodexOpen(false);
            setInventoryOpen(false);
            setQuestsOpen(false);
          }
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
      if (
        latestStateRef.current.modalOpen ||
        vehicleFlightRef.current.type !== 'none' ||
        areaTransitionLockRef.current
      ) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const curArea = activeAreaRef.current;
      let wx = sx + camera.x;
      let wy = sy + camera.y;

      if (curArea !== 'exterior-70s') {
        const sub = SUB_AREAS[curArea];
        const subCamX =
          sub.width <= vw
            ? -(vw - sub.width) * 0.5
            : Math.max(-40, Math.min(sub.width - vw + 40, player.x - vw * 0.5));
        const subCamY =
          sub.height <= vh
            ? -(vh - sub.height) * 0.5
            : Math.max(-40, Math.min(sub.height - vh + 40, player.y - vh * 0.5));
        wx = sx + subCamX;
        wy = sy + subCamY;
      }

      const prompt = nearbyPromptRef.current;
      if (prompt && Math.hypot(wx - prompt.x, wy - prompt.y) < 76) {
        triggerInteraction(prompt);
        return;
      }

      const st = latestStateRef.current;
      if (curArea === 'exterior-70s') {
        const walkable =
          Boolean(
            isPointWalkableOnIsland(wx, wy, {
              southShortcut: st.southShortcutActive,
              gargantaBridge: st.glitchTrailCleared,
            })
          ) && !isBlockedByExteriorBuilding(wx, wy);
        if (walkable) {
          virtualInputRef.current.clickTarget = { x: wx, y: wy };
        }
      } else {
        const sub = SUB_AREAS[curArea];
        if (isWalkableInSubArea(sub, wx, wy)) {
          virtualInputRef.current.clickTarget = { x: wx, y: wy };
        }
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
    let stepAudioTimer = 0;
    let lastTileSteppedId = '';
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

      // Aplicar teletransporte pendiente al cambiar entre exterior, interiores o Isla 80s
      if (playerPosBridgeRef.current.teleportPending) {
        const tp = playerPosBridgeRef.current.teleportPending;
        playerPosBridgeRef.current.teleportPending = null;
        player.x = tp.x;
        player.y = tp.y;
        if (tp.facingDir) {
          player.facingDir = tp.facingDir;
          if (tp.facingDir === 'right') player.facing = 1;
          else if (tp.facingDir === 'left') player.facing = -1;
        }
        player.walking = false;
        pickupBursts.length = 0;
        lastTileSteppedId = '';
        if (activeAreaRef.current === 'exterior-70s') {
          camera.x = Math.max(0, Math.min(ISLAND_WORLD_W - vw, player.x - vw * 0.5));
          camera.y = Math.max(0, Math.min(ISLAND_WORLD_H - vh, player.y - vh * 0.5));
        }
      }

      if (playerPosBridgeRef.current.interactAnim > 0) {
        playerPosBridgeRef.current.interactAnim = Math.max(
          0,
          playerPosBridgeRef.current.interactAnim - dt
        );
      }
      player.interactAnim = playerPosBridgeRef.current.interactAnim;

      if (scannerPulseRef.current.active) {
        scannerPulseRef.current.elapsed += dt;
        if (scannerPulseRef.current.elapsed >= 1.5) {
          scannerPulseRef.current.active = false;
        }
      }

      const st = latestStateRef.current;
      const curArea = activeAreaRef.current;
      const flight = vehicleFlightRef.current;

      if (curArea === 'exterior-70s' && flight.type !== 'none') {
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
            player.facingDir = 'right';
          }

          if (p >= 1) {
            flight.type = 'none';
            player.x = disembark.x;
            player.y = disembark.y;
            player.walking = false;
            setFlightStatusText(null);
            retroAudio.portalVictory();
            showToast(
              '¡Aterrizaje completado! El Navío del Puerto Este (Zona 09) hacia la Isla Neón 1980s está habilitado.'
            );
            callbacksRef.current.onSavePosition(player.x, player.y);
            callbacksRef.current.onArrivalSequenceFinished?.();
          }
        }
      } else if (!st.modalOpen && !areaTransitionLockRef.current) {
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
        const baseSpeed = curArea === 'exterior-70s' ? 215 : 190;
        const sprintSpeed = curArea === 'exterior-70s' ? 315 : 265;
        const speed = sprinting ? sprintSpeed : baseSpeed;

        player.sprinting = sprinting && (dx !== 0 || dy !== 0);
        player.walking = dx !== 0 || dy !== 0;

        if (player.walking) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            player.facingDir = dx >= 0 ? 'right' : 'left';
            player.facing = dx >= 0 ? 1 : -1;
          } else {
            player.facingDir = dy >= 0 ? 'down' : 'up';
          }

          stepAudioTimer += dt * (player.sprinting ? 1.45 : 1);
          if (stepAudioTimer >= 0.34) {
            stepAudioTimer = 0;
            retroAudio.stepTile();
          }

          const nextX = player.x + dx * speed * dt;
          const nextY = player.y + dy * speed * dt;

          if (curArea === 'exterior-70s') {
            const walkOpts = {
              southShortcut: st.southShortcutActive,
              gargantaBridge: st.glitchTrailCleared,
            };
            const canXY =
              Boolean(isPointWalkableOnIsland(nextX, nextY, walkOpts)) &&
              !isBlockedByExteriorBuilding(nextX, nextY);
            const canX =
              Boolean(isPointWalkableOnIsland(nextX, player.y, walkOpts)) &&
              !isBlockedByExteriorBuilding(nextX, player.y);
            const canY =
              Boolean(isPointWalkableOnIsland(player.x, nextY, walkOpts)) &&
              !isBlockedByExteriorBuilding(player.x, nextY);

            if (canXY) {
              player.x = nextX;
              player.y = nextY;
            } else if (canX) {
              player.x = nextX;
            } else if (canY) {
              player.y = nextY;
            } else {
              vIn.clickTarget = null;
            }
          } else {
            const subSpec = SUB_AREAS[curArea];
            if (isWalkableInSubArea(subSpec, nextX, nextY)) {
              player.x = nextX;
              player.y = nextY;
            } else if (isWalkableInSubArea(subSpec, nextX, player.y)) {
              player.x = nextX;
            } else if (isWalkableInSubArea(subSpec, player.x, nextY)) {
              player.y = nextY;
            } else {
              vIn.clickTarget = null;
            }
          }
        }
      } else {
        player.walking = false;
      }

      playerPosBridgeRef.current.x = player.x;
      playerPosBridgeRef.current.y = player.y;
      playerPosBridgeRef.current.facingDir = player.facingDir;

      // Evaluar losetas de presión si estamos en un interior con acertijo
      if (curArea !== 'exterior-70s') {
        const subSpec = SUB_AREAS[curArea];
        if (
          subSpec.pressurePuzzle &&
          !st.progressState.rpg.solvedPuzzleIds.includes(subSpec.pressurePuzzle.puzzleId)
        ) {
          let onAnyTile = false;
          for (const tile of subSpec.pressurePuzzle.tiles) {
            if (Math.hypot(player.x - tile.x, player.y - tile.y) < 25) {
              onAnyTile = true;
              if (
                lastTileSteppedId !== tile.id &&
                !steppedTilesRef.current.includes(tile.orderIndex)
              ) {
                lastTileSteppedId = tile.id;
                const expectedNext = steppedTilesRef.current.length + 1;
                if (tile.orderIndex === expectedNext) {
                  steppedTilesRef.current = [...steppedTilesRef.current, tile.orderIndex];
                  retroAudio.shardCollect(tile.orderIndex);
                  spawnBurst(tile.x, tile.y, tile.accentHex, 14);
                  if (steppedTilesRef.current.length === 3) {
                    retroAudio.secretFound();
                    callbacksRef.current.onSolvePuzzle(subSpec.pressurePuzzle.puzzleId);
                    showToast(subSpec.pressurePuzzle.successMessage);
                  } else {
                    showToast(`Nodo ${tile.label} activado (${steppedTilesRef.current.length}/3)`);
                  }
                } else {
                  steppedTilesRef.current = [];
                  retroAudio.npcBlip(0.68);
                  showToast('Secuencia reiniciada · Respeta el orden I → II → III');
                }
              }
            }
          }
          if (!onAnyTile) {
            lastTileSteppedId = '';
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

      if (curArea === 'exterior-70s') {
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

          // Punto de Guardado GBC en El Pueblo del Origen
          consider(
            {
              kind: 'save-terminal',
              id: VILLAGE_SAVE_TERMINAL.id,
              label: `${VILLAGE_SAVE_TERMINAL.label} · Punto de Guardado GBC`,
              actionLabel: 'Guardar Partida',
              x: VILLAGE_SAVE_TERMINAL.x,
              y: VILLAGE_SAVE_TERMINAL.y + 8,
              accentHex: '#38bdf8',
            },
            78
          );

          // Carteles de madera de orientación en las 5 grandes zonas
          for (const sign of ISLAND_WOODEN_SIGNS) {
            consider(
              {
                kind: 'wooden-sign',
                id: sign.id,
                label: sign.label,
                actionLabel: 'Leer Cartel',
                x: sign.x,
                y: sign.y + 6,
                accentHex: '#fde047',
              },
              74
            );
          }

          // Bocas de túneles subterráneos ocultas en formaciones rocosas costeras
          for (const tunnel of COASTAL_SUBTERRANEAN_TUNNELS) {
            consider(
              {
                kind: 'rock-tunnel',
                id: tunnel.id,
                label: tunnel.label,
                actionLabel: tunnel.actionLabel,
                x: tunnel.x,
                y: tunnel.y + 6,
                accentHex: '#c084fc',
              },
              76
            );
          }

          // Portales Anómalos exteriores (Atajo de Glifos y Portal Abisal en Cavernas)
          for (const portal of ISLAND_ANOMALY_PORTALS) {
            const unlocked =
              st.allUnlocked ||
              !portal.requiredSecretIds ||
              portal.requiredSecretIds.every((req) =>
                st.progressState.rpg.discoveredSecretIds.includes(req)
              );
            consider(
              {
                kind: 'anomaly-portal',
                id: portal.id,
                label: unlocked
                  ? `${portal.name} · Resonancia Activa`
                  : `${portal.name} · Anomalía Latente`,
                actionLabel: unlocked
                  ? 'Cruzar Portal Anómalo'
                  : 'Examinar Anomalía',
                x: portal.x,
                y: portal.y + 8,
                accentHex: portal.accentHex,
              },
              82
            );
          }

          // Puertas de edificios accesibles
          for (const bldg of ISLAND_70S_BUILDINGS) {
            consider(
              {
                kind: 'building-door',
                id: bldg.id,
                label: `${bldg.name} · ${bldg.subtitle}`,
                actionLabel: `Entrar a ${bldg.signText}`,
                x: bldg.doorX,
                y: bldg.doorY + 6,
                accentHex: bldg.trimHex,
              },
              84
            );
          }

          // Pasaje oculto tras la cascada norte
          const foundWf =
            st.progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
          consider(
            {
              kind: 'waterfall-entrance',
              id: WATERFALL_SECRET_ENTRANCE.id,
              label: foundWf
                ? 'Pasadizo a la Gruta Tras la Cascada'
                : 'Cortina de Agua con Brillo Misterioso',
              actionLabel: foundWf ? 'Entrar a la Gruta' : 'Atravesar Cascada',
              x: WATERFALL_SECRET_ENTRANCE.x,
              y: WATERFALL_SECRET_ENTRANCE.y + 8,
              accentHex: '#c084fc',
            },
            76
          );

          // Navío Astral rumbo a Isla Neón 1980s
          const ferryReady =
            st.invadersRestored ||
            st.allUnlocked ||
            st.progressState.rpg.unlockedIslands.includes('island-80s');
          consider(
            {
              kind: 'ferry-80s',
              id: HARBOR_80S_FERRY.id,
              label: ferryReady
                ? 'Navío Astral · Travesía a Isla Neón 1980s'
                : 'Navío Astral · Ruta Marítima a los Años 80 (Sellada)',
              actionLabel: ferryReady ? 'Zarpar a Isla 1980s' : 'Inspeccionar Embarcadero',
              x: HARBOR_80S_FERRY.x,
              y: HARBOR_80S_FERRY.y + 8,
              accentHex: '#f43f5e',
            },
            106
          );

          // Mecanismo averiado reparable con Soldador Lógico
          const mechRepaired = st.progressState.rpg.repairedMechanismIds.includes(
            BROKEN_RELAY_MECHANISM.id
          );
          consider(
            {
              kind: 'broken-relay',
              id: BROKEN_RELAY_MECHANISM.id,
              label: mechRepaired
                ? `${BROKEN_RELAY_MECHANISM.label} (Reparado)`
                : `${BROKEN_RELAY_MECHANISM.label} (Averiado)`,
              actionLabel: mechRepaired ? 'Ver Relé Activo' : 'Reparar / Inspeccionar',
              x: BROKEN_RELAY_MECHANISM.x,
              y: BROKEN_RELAY_MECHANISM.y + 6,
              accentHex: mechRepaired ? '#10b981' : '#f97316',
            },
            80
          );

          // Cofres exteriores
          for (const chest of RPG_CHESTS) {
            if (chest.areaId !== 'exterior-70s') continue;
            const opened = st.progressState.rpg.openedChestIds.includes(chest.id);
            consider(
              {
                kind: 'chest',
                id: chest.id,
                label: opened ? `${chest.label} (Abierto)` : chest.label,
                actionLabel: opened ? 'Cofre Vacío' : 'Abrir Cofre',
                x: chest.x,
                y: chest.y + 4,
                accentHex: chest.accentHex,
              },
              74
            );
          }

          // Pistas examinables exteriores
          for (const exam of RPG_EXAMINABLES) {
            if (exam.areaId !== 'exterior-70s') continue;
            consider(
              {
                kind: 'examinable',
                id: exam.id,
                label: exam.label,
                actionLabel: exam.actionLabel,
                x: exam.x,
                y: exam.y + 4,
                accentHex: exam.accentHex,
              },
              76
            );
          }

          consider(
            {
              kind: 'pong-cabinet',
              id: 'cabinet-pong-1972',
              label: st.pongRestored
                ? 'Gabinete Pong (1972) · Memoria Restaurada'
                : `Gabinete Arcade Pong (1972) · Meta ${PONG_UNLOCK_SCORE} PTS`,
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
              label: 'Tabla Voladora de Pong · Vuelo hacia La Garganta',
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
                : `Gabinete Upright Space Invaders (1978) · Meta ${SPACE_INVADERS_UNLOCK_SCORE} PTS`,
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

        const resolvedTarget = targetHolder.current;
        const nextPromptId = resolvedTarget
          ? `${resolvedTarget.kind}:${resolvedTarget.id}:${resolvedTarget.actionLabel}`
          : '';
        if (nextPromptId !== prevPromptId) {
          prevPromptId = nextPromptId;
          setNearbyPrompt(resolvedTarget);
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
          scannerPulse: scannerPulseRef.current,
        });
      } else {
        // Sub-área activa: Interior accesible, sala secreta, cueva o Isla Neón 1980s
        const subSpec = SUB_AREAS[curArea];

        for (const exitSpec of subSpec.exits) {
          consider(
            {
              kind: 'sub-exit',
              id: exitSpec.id,
              label: exitSpec.label,
              actionLabel: exitSpec.actionLabel,
              x: exitSpec.x,
              y: exitSpec.y,
              accentHex: exitSpec.accentHex,
            },
            70
          );
        }

        for (const chest of RPG_CHESTS) {
          if (chest.areaId !== curArea) continue;
          const opened = st.progressState.rpg.openedChestIds.includes(chest.id);
          consider(
            {
              kind: 'chest',
              id: chest.id,
              label: opened ? `${chest.label} (Abierto)` : chest.label,
              actionLabel: opened ? 'Cofre Vacío' : 'Abrir Cofre',
              x: chest.x,
              y: chest.y + 4,
              accentHex: chest.accentHex,
            },
            68
          );
        }

        for (const exam of RPG_EXAMINABLES) {
          if (exam.areaId !== curArea) continue;
          const isOpenSecretWall =
            exam.isFalseWall &&
            exam.secretIdToDiscover &&
            st.progressState.rpg.discoveredSecretIds.includes(exam.secretIdToDiscover);
          consider(
            {
              kind: 'examinable',
              id: exam.id,
              label: isOpenSecretWall
                ? 'Pasadizo Abierto · Cámara Oculta de 1958'
                : exam.label,
              actionLabel: isOpenSecretWall ? 'Entrar a Sala Secreta' : exam.actionLabel,
              x: exam.x,
              y: exam.y + 12,
              accentHex: exam.accentHex,
            },
            72
          );
        }

        for (const snpc of RPG_SUBAREA_NPCS) {
          if (snpc.areaId !== curArea) continue;
          consider(
            {
              kind: 'sub-npc',
              id: snpc.id,
              label: snpc.name,
              actionLabel: 'Conversar',
              x: snpc.x,
              y: snpc.y,
              accentHex: snpc.palette.glow,
            },
            74
          );
        }

        if (curArea === 'interior-cronoscopio') {
          const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
          consider(
            {
              kind: 'time-machine',
              id: TIME_MACHINE_CONSOLE.id,
              label: tm.canTravelTo80s
                ? 'El Cronoscopio · Etapa 4/4 · Salto Temporal 1980s Activo'
                : `El Cronoscopio · Máquina del Tiempo (Etapa ${tm.stageNumber}/4)`,
              actionLabel: tm.canTravelTo80s
                ? 'Viajar a la Década 1980s'
                : 'Examinar Cronoscopio',
              x: TIME_MACHINE_CONSOLE.x,
              y: TIME_MACHINE_CONSOLE.y,
              accentHex: tm.canTravelTo80s ? '#00f3ff' : '#d8be88',
            },
            96
          );
        }

        if (curArea === 'island-80s') {
          consider(
            {
              kind: 'dk-cabinet-80s',
              id: 'cabinet-dk-1981',
              label: st.dkRestored
                ? 'Gabinete Plataformas Verticales (1981) · Restaurado'
                : 'Gabinete Arcade de Vigas Rojas (1981) · Desafío Clásico',
              actionLabel: st.dkRestored ? 'Rejugar Clásico 1981' : 'Jugar Clásico 1981',
              x: DK_CABINET_80S_INTERACT.x,
              y: DK_CABINET_80S_INTERACT.y,
              accentHex: '#f43f5e',
            },
            88
          );

          lastPosSaveTimer += dt;
          if (lastPosSaveTimer >= 1.8) {
            lastPosSaveTimer = 0;
            callbacksRef.current.onSave80sPosition(player.x, player.y);
          }
        }

        for (let i = pickupBursts.length - 1; i >= 0; i--) {
          pickupBursts[i].x += pickupBursts[i].vx * dt;
          pickupBursts[i].y += pickupBursts[i].vy * dt;
          pickupBursts[i].life -= dt;
          if (pickupBursts[i].life <= 0) pickupBursts.splice(i, 1);
        }

        const resolvedTarget = targetHolder.current;
        const nextPromptId = resolvedTarget
          ? `${resolvedTarget.kind}:${resolvedTarget.id}:${resolvedTarget.actionLabel}`
          : '';
        if (nextPromptId !== prevPromptId) {
          prevPromptId = nextPromptId;
          setNearbyPrompt(resolvedTarget);
        }

        renderSubAreaFrame({
          ctx,
          vw,
          vh,
          area: subSpec,
          elapsed,
          reducedMotion,
          player,
          skinColor: st.skinColor,
          hairColor: st.hairColor,
          shirtColor: st.shirtColor,
          progressState: st.progressState,
          allUnlocked: st.allUnlocked,
          steppedTileOrder: steppedTilesRef.current,
          pickupBursts,
          prompt: nearbyPromptRef.current,
          scannerPulse: scannerPulseRef.current,
        });
      }

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
  }, [
    handleToggleLanternAction,
    handleUseScannerPulse,
    showToast,
    triggerInteraction,
  ]);

  const currentZone = ISLAND_ZONES[currentZoneId];
  const activeSubArea = activeAreaId !== 'exterior-70s' ? SUB_AREAS[activeAreaId] : null;
  const collectedDiamondsCount = progressState.island70s.collectedDiamondIds.length;
  const restored70sCount =
    (pongRestored ? 1 : 0) + (glitchTrailCleared ? 1 : 0) + (invadersRestored ? 1 : 0);

  const hasLanternUnlocked =
    allUnlocked ||
    progressState.island70s.abilitiesUnlocked.includes('phosphor-lantern') ||
    progressState.rpg.inventoryItems.includes('item-lampara-fosforo');

  const hasScannerUnlocked =
    allUnlocked ||
    progressState.island70s.abilitiesUnlocked.includes('secret-scanner') ||
    progressState.rpg.inventoryItems.includes('item-escaner-frecuencias');

  const completedQuestsCount = RPG_QUESTS.filter(
    (q) =>
      allUnlocked ||
      progressState.rpg.questStates[q.id] === 'completed' ||
      q.steps.every((s) => s.isDone(progressState, allUnlocked))
  ).length;

  const currentObjectiveText =
    activeAreaId === 'island-80s'
      ? !dkRestored
        ? 'Habla con la Capitana Vectoria y supera el gabinete vertical de 1981 al este del paseo'
        : 'Isla Neón 1980s explorada · Abre el cofre binario del callejón o regresa en el Navío'
      : !pongRestored
      ? `Camina al sureste hasta El Santuario de Pong y alcanza ${PONG_UNLOCK_SCORE} PTS en Pong (1972)`
      : !glitchTrailCleared
      ? 'Vuela al norte en la Tabla de Pong y supera El Sendero del Glitch Perdido'
      : !invadersRestored
      ? `Cruza el Puente Astral hacia La Fortaleza y alcanza ${SPACE_INVADERS_UNLOCK_SCORE} PTS en Space Invaders`
      : '¡Puerto Este abierto! Zarpa hacia la Isla Neón 1980s o descubre las salas secretas [Q]';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#020614]">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

      {/* Cortina rápida de transición pixelada al cruzar puertas, cuevas o islas */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-30 bg-[#020510] transition-opacity duration-150 ${
          areaFadeActive ? 'opacity-95' : 'opacity-0'
        }`}
      />

      {/* Secuencia ceremonial del Salto Temporal en El Cronoscopio (1970s -> 1980s) */}
      {chronoWarpActive && (
        <div className="fixed inset-0 z-50 chrono-warp-backdrop flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="w-28 h-28 rounded-full border-4 border-[#00f3ff] flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(0,243,255,0.65)]">
            <div className="w-16 h-16 border-2 border-[#fde047] rotate-45 flex items-center justify-center">
              <div className="w-6 h-6 bg-white" />
            </div>
          </div>
          <p className="text-[11px] font-mono-tabular font-bold tracking-[0.28em] text-[#fde047] uppercase">
            EL CRONOSCOPIO · APERTURA TEMPORAL ACTIVA
          </p>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-white mt-2">
            1970s : ISLA DEL ORIGEN → 1980s : ERA DEL NEÓN
          </h2>
          <p className="text-xs font-mono text-[#bae6fd] mt-2 max-w-md">
            Sincronizando memorias restauradas y anclando coordenadas en el Paseo de las Vigas Rojas...
          </p>
        </div>
      )}

      {/* HUD Superior Izquierdo Estilo Game Boy Color: Isla del Origen, Zona, Logros y Menús */}
      <div
        className={`absolute ${
          allUnlocked ? 'top-14' : 'top-3.5'
        } left-3.5 z-20 max-w-md gbc-hud-frame px-3.5 py-2.5 space-y-2`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-1">
          <span className="text-[10px] font-mono-tabular font-bold tracking-wider text-[#fde047] uppercase truncate">
            {activeSubArea
              ? activeSubArea.numberLabel
              : currentZone.macroRegionTitle}
          </span>
          <span className="text-[10px] font-mono-tabular font-bold text-[#7dd3fc] whitespace-nowrap shrink-0">
            {activeAreaId === 'island-80s'
              ? 'ISLA 1980s'
              : `ISLA DEL ORIGEN · ${progressState.island70s.visitedZones.length}/9`}
          </span>
        </div>

        <div>
          <p className="font-mono text-sm sm:text-base font-bold text-white leading-tight">
            {activeSubArea
              ? activeSubArea.name
              : zoneBanner
              ? `${zoneBanner.numberLabel} · ${zoneBanner.name}`
              : currentZone.name}
          </p>
          <p className="text-[11px] text-slate-200 font-mono leading-snug line-clamp-2">
            {activeSubArea ? activeSubArea.subtitle : currentZone.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-white/20 text-[10px] font-mono-tabular font-bold">
          <span className="inline-flex items-center gap-1 text-[#7dd3fc]">
            <Diamond className="w-3 h-3 shrink-0" />
            <span>
              {collectedDiamondsCount}/{TOTAL_70S_DIAMONDS}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[#fde047]">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>ARC {restored70sCount}/3</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[#86efac]">
            <ScrollText className="w-3 h-3 shrink-0" />
            <span>
              MIS {completedQuestsCount}/{RPG_QUESTS.length}
            </span>
          </span>
          {(invadersRestored ||
            progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts')) && (
            <span
              title="Logro permanente: 1.000 PTS alcanzados en Space Invaders"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#14532d] border border-[#86efac] text-[#bbf7d0]"
            >
              <Award className="w-3 h-3 shrink-0 text-[#fde047]" />
              <span>1000 PTS</span>
            </span>
          )}
        </div>

        {/* Barra de menús y herramientas GBC */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/20">
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setInventoryOpen(true);
            }}
            className="gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold text-[#fef08a] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <Backpack className="w-3 h-3 shrink-0" />
            <span>Mochila [I]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setQuestsOpen(true);
            }}
            className="gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold text-[#86efac] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <ScrollText className="w-3 h-3 shrink-0" />
            <span>Misiones [Q]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setCodexOpen(true);
            }}
            className="gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold text-[#7dd3fc] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Códice [C]</span>
          </button>

          {activeAreaId === 'exterior-70s' && (
            <button
              type="button"
              onClick={() => {
                const px = playerPosBridgeRef.current.x;
                const py = playerPosBridgeRef.current.y;
                callbacksRef.current.onManualSave(px, py);
                retroAudio.saveJingle();
                showToast('Partida guardada en la memoria GBC · Posición e inventario asegurados.');
              }}
              title="Guardar partida rápidamente en el cartucho GBC"
              className="gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold text-[#f8fafc] hover:text-[#fde047] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-3 h-3 shrink-0 text-[#38bdf8]" />
              <span>Guardar</span>
            </button>
          )}

          {hasLanternUnlocked && (
            <button
              type="button"
              onClick={handleToggleLanternAction}
              title="Encender o apagar Lámpara de Fósforo [L]"
              className={`gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                progressState.rpg.lanternActive
                  ? 'text-[#fde047] !bg-[#78350f]'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 shrink-0" />
              <span>Luz [L]</span>
            </button>
          )}

          {hasScannerUnlocked && (
            <button
              type="button"
              onClick={handleUseScannerPulse}
              title="Emitir pulso del Escáner de Secretos [R]"
              className="gbc-menu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-bold text-[#67e8f9] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              <Radio className="w-3 h-3 shrink-0" />
              <span>Sonar [R]</span>
            </button>
          )}
        </div>

        <div className="flex items-start gap-1.5 pt-1 border-t border-white/20 text-[10px] text-[#e0f2fe] font-mono pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-[#fde047] shrink-0 mt-0.5" />
          <span>{currentObjectiveText}</span>
        </div>
      </div>

      {/* Minimapa GBC conmutable en esquina inferior derecha (Isla del Origen) */}
      {activeAreaId === 'exterior-70s' && (
        <div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setMinimapOpen((o) => !o);
            }}
            className="gbc-menu-btn px-2.5 py-1 text-[10px] font-mono-tabular font-bold text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <MapIcon className="w-3.5 h-3.5 text-[#fde047]" />
            <span>{minimapOpen ? 'Ocultar Mapa [Tab]' : 'Mapa Isla [Tab]'}</span>
          </button>

          {minimapOpen && (
            <div className="gbc-hud-frame p-2 w-60 space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono-tabular font-bold text-[#fde047] px-0.5">
                <span>MAPA · ISLA DEL ORIGEN</span>
                <span>5 REGIONES</span>
              </div>
              <div className="relative w-full h-36 bg-[#134e6f] border-2 border-[#070b14] overflow-hidden">
                {ISLAND_WALKABLE_RECTS.map((r) => {
                  if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) {
                    return null;
                  }
                  if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) {
                    return null;
                  }
                  const zBiome = ISLAND_ZONES[r.zoneId]?.biome ?? 'meadow';
                  const rectColor =
                    r.surface === 'bridge'
                      ? 'bg-[#b45309]'
                      : r.zoneId === 'cavernas-codigo'
                      ? 'bg-[#6b21a8]'
                      : zBiome === 'volcanic'
                      ? 'bg-[#7f1d1d]'
                      : zBiome === 'forest'
                      ? 'bg-[#15803d]'
                      : zBiome === 'coast'
                      ? 'bg-[#eab308]'
                      : zBiome === 'village'
                      ? 'bg-[#cbd5e1]'
                      : 'bg-[#4ade80]';
                  return (
                    <div
                      key={r.id}
                      style={{
                        left: `${(r.x / ISLAND_WORLD_W) * 100}%`,
                        top: `${(r.y / ISLAND_WORLD_H) * 100}%`,
                        width: `${(r.w / ISLAND_WORLD_W) * 100}%`,
                        height: `${(r.h / ISLAND_WORLD_H) * 100}%`,
                      }}
                      className={`absolute ${rectColor}`}
                    />
                  );
                })}

                <div
                  title="Punto de Guardado · El Pueblo del Origen"
                  style={{
                    left: `${(VILLAGE_SAVE_TERMINAL.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(VILLAGE_SAVE_TERMINAL.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-[#38bdf8] border border-black"
                />
                <div
                  title="Zona 2 · Las Praderas del Pixel · Pong (1972)"
                  style={{
                    left: `${(ISLAND_KEY_COORDS.pongCabinet.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(ISLAND_KEY_COORDS.pongCabinet.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#fde047] border border-black"
                />
                <div
                  title="El Sendero del Glitch Perdido"
                  style={{
                    left: `${(ISLAND_KEY_COORDS.glitchTrailPortal.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(ISLAND_KEY_COORDS.glitchTrailPortal.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#00f3ff] border border-black"
                />
                <div
                  title="Zona 4 · La Fortaleza Volcánica · Space Invaders (1978)"
                  style={{
                    left: `${(ISLAND_KEY_COORDS.invadersCabinet.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(ISLAND_KEY_COORDS.invadersCabinet.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#ef4444] border border-black"
                />
                <div
                  title="Observatorio del Cronoscopio · Máquina del Tiempo"
                  style={{
                    left: `${(2150 / ISLAND_WORLD_W) * 100}%`,
                    top: `${(1140 / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#c084fc] border border-black"
                />
                <div
                  title="Muelle y Costa de las Máquinas Olvidadas · Ruta 1980s"
                  style={{
                    left: `${(HARBOR_80S_FERRY.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(HARBOR_80S_FERRY.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#f472b6] border border-black"
                />

                <div
                  style={{
                    left: `${(playerMiniPos.x / ISLAND_WORLD_W) * 100}%`,
                    top: `${(playerMiniPos.y / ISLAND_WORLD_H) * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-[#070b14]"
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono-tabular text-slate-200 px-0.5">
                <span>WASD / Clic · 4 Dir</span>
                <span>Shift · Correr</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notificación flotante GBC de hallazgo o vuelo */}
      {(toastBanner || flightStatusText) && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 gbc-hud-frame px-4 py-2 text-xs font-mono font-bold text-[#fde047] text-center max-w-xl">
          {flightStatusText || toastBanner}
        </div>
      )}

      {/* Barra contextual inferior estilo menú GBC */}
      {nearbyPrompt && !anyModalOpen && !flightStatusText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 gbc-hud-frame px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 max-w-xl">
          <div className="text-left min-w-0">
            <p className="text-[9px] font-mono-tabular font-bold tracking-wider text-[#fde047] uppercase">
              ▶ OBJETO / LUGAR CERCANO
            </p>
            <p className="text-xs font-mono font-bold text-white truncate">
              {nearbyPrompt.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerInteraction(nearbyPrompt)}
            className="gbc-menu-btn px-3.5 py-1.5 text-xs font-mono font-bold tracking-wider text-[#fde047] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            ▶ {nearbyPrompt.actionLabel} [E]
          </button>
        </div>
      )}

      {/* Cuadro de diálogo narrativo estilo Game Boy Color */}
      {activeDialog && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-end sm:items-center justify-center p-4">
          <div className="gbc-retro-box rounded-none max-w-xl w-full p-5 sm:p-6 space-y-3 relative">
            <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/30 pb-2.5">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-[#f2c94c] uppercase">
                  {activeDialog.category}
                </p>
                <h3 className="font-mono text-base sm:text-lg font-bold text-white mt-0.5">
                  {activeDialog.title}
                </h3>
                {activeDialog.subtitle && (
                  <p className="text-[11px] font-mono text-[#7dd3fc] mt-1">
                    {activeDialog.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                aria-label="Cerrar diálogo"
                className="text-white hover:text-amber-300 cursor-pointer p-1 font-mono font-bold"
              >
                [X]
              </button>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-100 font-mono leading-relaxed">
              {activeDialog.paragraphs.map((par, idx) => (
                <p key={idx}>{par}</p>
              ))}
            </div>

            {activeDialog.hint && (
              <p className="pt-2 border-t border-white/20 text-[11px] text-amber-200 font-mono">
                {activeDialog.hint}
              </p>
            )}

            <div className="flex justify-end pt-2 items-center gap-2">
              <span className="text-[#f2c94c] text-xs font-mono animate-pulse">▼</span>
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setActiveDialog(null);
                }}
                className="bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-white px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#000000] whitespace-nowrap shrink-0"
              >
                CONTINUAR [ENTER]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventario Funcional y Habilidades [I] */}
      {inventoryOpen && (
        <RpgInventoryModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onClose={() => setInventoryOpen(false)}
          onUseScanner={handleUseScannerPulse}
          onToggleLantern={handleToggleLanternAction}
          onUseWelder={handleUseWelderAction}
          onEquipCosmetic={(itemId) => {
            callbacksRef.current.onEquipCosmetic(itemId);
          }}
        />
      )}

      {/* Diario de Misiones [Q] */}
      {questsOpen && (
        <RpgQuestsModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onClose={() => setQuestsOpen(false)}
        />
      )}

      {/* Códice del Arquitecto [C] */}
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
