/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema integral de progresión, persistencia y estado histórico de PIXELVERSE.
 * Gestiona de forma coherente y tolerante a fallos:
 * - Zonas visitadas
 * - Gabinetes desbloqueados
 * - Memorias restauradas (con bloqueo ante recompensas duplicadas)
 * - Coleccionables únicos (Diamantes de Memoria)
 * - Objetivos completados
 * - Habilidades obtenidas
 * - Checkpoints activos por nivel
 * - Eventos narrativos importantes
 */

import { HistoricalGameId } from './historicalCatalog';

export type TransitionStageStatus = 'none' | 'pending' | 'completed';

export type PixelAbilityId =
  | 'phase-sprint'
  | 'pong-hoverboard'
  | 'phase-dash'
  | 'star-shuttle';

export interface GameRestorationRecord {
  id: HistoricalGameId;
  started: boolean;
  completed: boolean;
  memoryUnlocked: boolean;
  ceremonyShown: boolean;
  transitionStatus: TransitionStageStatus;
  returnedToIsland: boolean;
  bestScore: number;
  completionsCount: number;
}

export interface Island70sExplorationState {
  visitedZones: string[];
  unlockedCabinets: string[];
  collectedDiamondIds: string[];
  discoveredEchoIds: string[];
  activatedIslandSwitches: string[];
  talkedNpcIds: string[];
  completedObjectives: string[];
  abilitiesUnlocked: PixelAbilityId[];
  checkpoints: Record<string, string>;
  narrativeEvents: string[];
  glitchTrailCompleted: boolean;
  lastIslandPos: { x: number; y: number } | null;
}

export interface PixelverseProgressState {
  schemaVersion: number;
  games: Record<string, GameRestorationRecord>;
  diamondsSaved: number;
  restoredCount: number;
  island70s: Island70sExplorationState;
}

const STORAGE_KEY_V2 = 'pixelverse_adventure_progress_v2';
const LEGACY_STORAGE_KEY_V1 = 'pixelverse_historical_progress_v1';

export const SPACE_INVADERS_UNLOCK_SCORE = 1000;

function createDefaultRecord(id: HistoricalGameId): GameRestorationRecord {
  return {
    id,
    started: false,
    completed: false,
    memoryUnlocked: false,
    ceremonyShown: false,
    transitionStatus: 'none',
    returnedToIsland: false,
    bestScore: 0,
    completionsCount: 0,
  };
}

export function createDefaultIsland70sState(): Island70sExplorationState {
  return {
    visitedZones: ['costa-despertar'],
    unlockedCabinets: ['pong'],
    collectedDiamondIds: [],
    discoveredEchoIds: [],
    activatedIslandSwitches: [],
    talkedNpcIds: [],
    completedObjectives: ['awakened-70s'],
    abilitiesUnlocked: ['phase-sprint'],
    checkpoints: {},
    narrativeEvents: ['awakening-coast'],
    glitchTrailCompleted: false,
    lastIslandPos: null,
  };
}

export function createInitialProgressState(): PixelverseProgressState {
  return {
    schemaVersion: 2,
    games: {
      pong: createDefaultRecord('pong'),
      'donkey-kong': createDefaultRecord('donkey-kong'),
      'space-invaders': createDefaultRecord('space-invaders'),
      'glitch-trail': createDefaultRecord('glitch-trail'),
    },
    diamondsSaved: 0,
    restoredCount: 0,
    island70s: createDefaultIsland70sState(),
  };
}

function countRestored(games: Record<string, GameRestorationRecord>): number {
  const coreHistoricalIds = ['pong', 'space-invaders', 'glitch-trail'];
  return coreHistoricalIds.filter((id) => games[id]?.memoryUnlocked).length;
}

function sanitizeStringArray<T extends string = string>(
  arr: unknown,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(arr)) return fallback;
  const cleaned = arr.filter((item): item is T => typeof item === 'string' && item.length > 0);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

function sanitizeCheckpoints(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

function deriveCoherentIslandState(
  island: Island70sExplorationState,
  games: Record<string, GameRestorationRecord>
): Island70sExplorationState {
  const pongDone = Boolean(games['pong']?.memoryUnlocked);
  const trailDone =
    island.glitchTrailCompleted || Boolean(games['glitch-trail']?.completed);
  const invadersDone = Boolean(games['space-invaders']?.memoryUnlocked);

  const unlockedCabinets = new Set<string>(island.unlockedCabinets);
  unlockedCabinets.add('pong');
  if (trailDone || invadersDone) {
    unlockedCabinets.add('space-invaders');
  }

  const abilities = new Set<PixelAbilityId>(island.abilitiesUnlocked);
  abilities.add('phase-sprint');
  if (pongDone) {
    abilities.add('pong-hoverboard');
    abilities.add('phase-dash');
  }
  if (invadersDone) {
    abilities.add('star-shuttle');
  }

  const objectives = new Set<string>(island.completedObjectives);
  objectives.add('awakened-70s');
  if (pongDone) objectives.add('pong-restored');
  if (
    island.activatedIslandSwitches.includes('sw-bosque-sur') &&
    island.activatedIslandSwitches.includes('sw-ruinas-sur')
  ) {
    objectives.add('south-bridge-rebuilt');
  }
  if (island.activatedIslandSwitches.includes('sw-caverna-cristal')) {
    objectives.add('cavern-unlocked');
  }
  if (trailDone) objectives.add('glitch-trail-completed');
  if (invadersDone) objectives.add('invaders-1000pts-restored');
  if (pongDone && trailDone && invadersDone) {
    objectives.add('decade-70s-stabilized');
  }

  return {
    ...island,
    glitchTrailCompleted: trailDone,
    unlockedCabinets: Array.from(unlockedCabinets),
    abilitiesUnlocked: Array.from(abilities),
    completedObjectives: Array.from(objectives),
  };
}

function readRawStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2) return v2;
  } catch {
    // Continúa con sessionStorage
  }
  try {
    return (
      window.sessionStorage.getItem(STORAGE_KEY_V2) ||
      window.sessionStorage.getItem(LEGACY_STORAGE_KEY_V1)
    );
  } catch {
    return null;
  }
}

export function loadProgressState(): PixelverseProgressState {
  const fallback = createInitialProgressState();
  const raw = readRawStorage();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<PixelverseProgressState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.games) return fallback;

    const mergedGames: Record<string, GameRestorationRecord> = {
      ...fallback.games,
    };

    for (const [key, val] of Object.entries(parsed.games)) {
      if (val && typeof val === 'object') {
        const safeTransition: TransitionStageStatus =
          val.transitionStatus === 'pending' && val.completed
            ? 'completed'
            : val.transitionStatus || 'none';
        mergedGames[key] = {
          ...createDefaultRecord(key),
          ...val,
          id: key,
          bestScore: Math.max(0, Number(val.bestScore) || 0),
          completionsCount: Math.max(0, Number(val.completionsCount) || 0),
          transitionStatus: safeTransition,
        };
      }
    }

    const rawIsland = parsed.island70s;
    const baseIsland: Island70sExplorationState =
      rawIsland && typeof rawIsland === 'object'
        ? {
            visitedZones: sanitizeStringArray(rawIsland.visitedZones, ['costa-despertar']),
            unlockedCabinets: sanitizeStringArray(rawIsland.unlockedCabinets, ['pong']),
            collectedDiamondIds: sanitizeStringArray(rawIsland.collectedDiamondIds),
            discoveredEchoIds: sanitizeStringArray(rawIsland.discoveredEchoIds),
            activatedIslandSwitches: sanitizeStringArray(rawIsland.activatedIslandSwitches),
            talkedNpcIds: sanitizeStringArray(rawIsland.talkedNpcIds),
            completedObjectives: sanitizeStringArray(rawIsland.completedObjectives, [
              'awakened-70s',
            ]),
            abilitiesUnlocked: sanitizeStringArray<PixelAbilityId>(
              rawIsland.abilitiesUnlocked,
              ['phase-sprint']
            ),
            checkpoints: sanitizeCheckpoints(rawIsland.checkpoints),
            narrativeEvents: sanitizeStringArray(rawIsland.narrativeEvents, [
              'awakening-coast',
            ]),
            glitchTrailCompleted: Boolean(rawIsland.glitchTrailCompleted),
            lastIslandPos:
              rawIsland.lastIslandPos &&
              typeof rawIsland.lastIslandPos.x === 'number' &&
              typeof rawIsland.lastIslandPos.y === 'number' &&
              Number.isFinite(rawIsland.lastIslandPos.x) &&
              Number.isFinite(rawIsland.lastIslandPos.y)
                ? { x: rawIsland.lastIslandPos.x, y: rawIsland.lastIslandPos.y }
                : null,
          }
        : createDefaultIsland70sState();

    const coherentIsland = deriveCoherentIslandState(baseIsland, mergedGames);
    const uniqueDiamondCount = coherentIsland.collectedDiamondIds.length;
    const savedDiamonds = Math.max(
      uniqueDiamondCount,
      Math.max(0, Number(parsed.diamondsSaved) || 0)
    );

    return {
      schemaVersion: 2,
      games: mergedGames,
      diamondsSaved: savedDiamonds,
      restoredCount: countRestored(mergedGames),
      island70s: coherentIsland,
    };
  } catch {
    return fallback;
  }
}

export function saveProgressState(state: PixelverseProgressState): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, serialized);
  } catch {
    // Ignorar si almacenamiento persistente está restringido
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY_V2, serialized);
  } catch {
    // Continúa en memoria
  }
}

export function resetProgressState(): PixelverseProgressState {
  const fresh = createInitialProgressState();
  saveProgressState(fresh);
  return fresh;
}

export function markGameStarted(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  if (existing.started) return prev;
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      started: true,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
  };
  saveProgressState(next);
  return next;
}

export function recordGameVictory(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId,
  score = 0,
  diamondsEarned = 0
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  // Space Invaders exige >= 1000 puntos reales para desbloquear su recuerdo histórico
  const qualifiesForMemory =
    gameId === 'space-invaders' ? score >= SPACE_INVADERS_UNLOCK_SCORE : true;

  const updated: GameRestorationRecord = {
    ...existing,
    started: true,
    completed: existing.completed || qualifiesForMemory,
    memoryUnlocked: existing.memoryUnlocked || qualifiesForMemory,
    transitionStatus: qualifiesForMemory ? 'pending' : existing.transitionStatus,
    bestScore: Math.max(existing.bestScore, score),
    completionsCount: qualifiesForMemory
      ? existing.completionsCount + 1
      : existing.completionsCount,
  };

  const nextGames = {
    ...prev.games,
    [gameId]: updated,
  };

  const nextIslandRaw: Island70sExplorationState =
    gameId === 'glitch-trail'
      ? {
          ...prev.island70s,
          glitchTrailCompleted: true,
          narrativeEvents: Array.from(
            new Set([...prev.island70s.narrativeEvents, 'garganta-bridge-rebuilt'])
          ),
        }
      : prev.island70s;

  const coherentIsland = deriveCoherentIslandState(nextIslandRaw, nextGames);

  const next: PixelverseProgressState = {
    schemaVersion: 2,
    games: nextGames,
    diamondsSaved: Math.max(
      prev.diamondsSaved,
      coherentIsland.collectedDiamondIds.length,
      diamondsEarned
    ),
    restoredCount: countRestored(nextGames),
    island70s: coherentIsland,
  };
  saveProgressState(next);
  return next;
}

export function markCeremonyCompleted(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      ceremonyShown: true,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
    restoredCount: countRestored(nextGames),
  };
  saveProgressState(next);
  return next;
}

export function markTransitionFinished(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId,
  returnedToIsland = false
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      ceremonyShown: true,
      transitionStatus: 'completed' as const,
      returnedToIsland: existing.returnedToIsland || returnedToIsland,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
    restoredCount: countRestored(nextGames),
  };
  saveProgressState(next);
  return next;
}

export function collectUniqueMemoryDiamond(
  prev: PixelverseProgressState,
  diamondId: string
): PixelverseProgressState {
  if (prev.island70s.collectedDiamondIds.includes(diamondId)) return prev;
  const collectedDiamondIds = [...prev.island70s.collectedDiamondIds, diamondId];
  const next: PixelverseProgressState = {
    ...prev,
    diamondsSaved: Math.max(prev.diamondsSaved, collectedDiamondIds.length),
    island70s: deriveCoherentIslandState(
      {
        ...prev.island70s,
        collectedDiamondIds,
      },
      prev.games
    ),
  };
  saveProgressState(next);
  return next;
}

export function recordIslandZoneVisited(
  prev: PixelverseProgressState,
  zoneId: string
): PixelverseProgressState {
  if (prev.island70s.visitedZones.includes(zoneId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      visitedZones: [...prev.island70s.visitedZones, zoneId],
    },
  };
  saveProgressState(next);
  return next;
}

export function recordEchoDiscovered(
  prev: PixelverseProgressState,
  echoId: string
): PixelverseProgressState {
  if (prev.island70s.discoveredEchoIds.includes(echoId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      discoveredEchoIds: [...prev.island70s.discoveredEchoIds, echoId],
    },
  };
  saveProgressState(next);
  return next;
}

export function recordIslandSwitchActivated(
  prev: PixelverseProgressState,
  switchId: string
): PixelverseProgressState {
  if (prev.island70s.activatedIslandSwitches.includes(switchId)) return prev;
  const activatedIslandSwitches = [...prev.island70s.activatedIslandSwitches, switchId];
  const next: PixelverseProgressState = {
    ...prev,
    island70s: deriveCoherentIslandState(
      {
        ...prev.island70s,
        activatedIslandSwitches,
      },
      prev.games
    ),
  };
  saveProgressState(next);
  return next;
}

export function recordNpcTalked(
  prev: PixelverseProgressState,
  npcId: string
): PixelverseProgressState {
  if (prev.island70s.talkedNpcIds.includes(npcId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      talkedNpcIds: [...prev.island70s.talkedNpcIds, npcId],
    },
  };
  saveProgressState(next);
  return next;
}

export function saveStageCheckpoint(
  prev: PixelverseProgressState,
  stageId: string,
  checkpointId: string
): PixelverseProgressState {
  if (prev.island70s.checkpoints[stageId] === checkpointId) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      checkpoints: {
        ...prev.island70s.checkpoints,
        [stageId]: checkpointId,
      },
    },
  };
  saveProgressState(next);
  return next;
}

export function recordNarrativeEvent(
  prev: PixelverseProgressState,
  eventId: string
): PixelverseProgressState {
  if (prev.island70s.narrativeEvents.includes(eventId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      narrativeEvents: [...prev.island70s.narrativeEvents, eventId],
    },
  };
  saveProgressState(next);
  return next;
}

export function saveLastIslandCoordinates(
  prev: PixelverseProgressState,
  x: number,
  y: number
): PixelverseProgressState {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (
    prev.island70s.lastIslandPos &&
    prev.island70s.lastIslandPos.x === rx &&
    prev.island70s.lastIslandPos.y === ry
  ) {
    return prev;
  }
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      lastIslandPos: { x: rx, y: ry },
    },
  };
  saveProgressState(next);
  return next;
}
