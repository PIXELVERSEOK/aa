/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido estructurado RPG 2D de PIXELVERSE — ISLA DEL ORIGEN (Estilo Game Boy Color):
 * - Direcciones cardinales (4 direcciones)
 * - Catálogo de Objetos (llaves, piezas arcade, memorias, herramientas, reliquias, cosméticos)
 * - Sistema de Misiones con objetivos verificables y recompensas reales
 * - Punto de Guardado del Pueblo, Carteles de Orientación GBC y Túneles Subterráneos conectados
 * - Interiores accesibles (Centro de Historia, Taller TTL, Archivo Pionero), paredes falsas y grutas
 * - Expansión jugable hacia «Isla Neón 1980s: Muelle de las Vigas Rojas»
 */

import { PixelAbilityId, PixelverseProgressState } from '../memories/progressionState';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export type RpgAreaId =
  | 'exterior-70s'
  | 'interior-centro-historia'
  | 'interior-taller-alcorn'
  | 'secret-camara-osciloscopio'
  | 'interior-templo-pioneros'
  | 'interior-cronoscopio'
  | 'chamber-boveda-cronoscopio'
  | 'cave-gruta-cascada'
  | 'island-80s';

export type RpgItemCategory =
  | 'herramienta'
  | 'pieza-arcade'
  | 'cinta-memoria'
  | 'llave'
  | 'reliquia'
  | 'cosmetico';

export interface RpgItemSpec {
  id: string;
  name: string;
  category: RpgItemCategory;
  categoryLabel: string;
  accentHex: string;
  shortCode: string;
  description: string;
  usageHint: string;
  usableAction?: 'scanner' | 'lantern' | 'welder' | 'equip-cosmetic' | 'inspect';
  grantsAbility?: PixelAbilityId;
}

export interface RpgQuestSpec {
  id: string;
  code: string;
  title: string;
  giverName: string;
  decadeTag: string;
  accentHex: string;
  summary: string;
  steps: {
    label: string;
    isDone: (state: PixelverseProgressState, allUnlocked: boolean) => boolean;
  }[];
  rewardSummary: string;
  rewardItemIds: string[];
}

export interface SolidObstacleRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExteriorBuildingSpec {
  id: string;
  name: string;
  subtitle: string;
  archStyle?: 'cottage-archive' | 'forest-workshop' | 'ruins-sanctuary' | 'chrono-dome';
  x: number;
  y: number;
  w: number;
  h: number;
  roofHex: string;
  roofShadeHex: string;
  wallHex: string;
  trimHex: string;
  signText: string;
  doorX: number;
  doorY: number;
  targetArea: RpgAreaId;
  targetSpawnX: number;
  targetSpawnY: number;
  returnExteriorX: number;
  returnExteriorY: number;
}

export interface AnomalyPortalSpec {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  style: 'glyph-shortcut' | 'abyssal-chamber';
  accentHex: string;
  requiredSecretIds?: string[];
  targetKind: 'exterior-coords' | 'sub-area';
  destX: number;
  destY: number;
  destFacing: FacingDirection;
  targetArea?: RpgAreaId;
  returnExteriorX?: number;
  returnExteriorY?: number;
  dormantTitle: string;
  dormantLore: string[];
  dormantHint: string;
  activeToast: string;
}

export interface WoodenSignSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneTitle: string;
  lines: string[];
}

export interface TunnelPortalSpec {
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  destFacing: FacingDirection;
  toastText: string;
  secretId?: string;
}

export interface RpgChestSpec {
  id: string;
  areaId: RpgAreaId;
  label: string;
  x: number;
  y: number;
  accentHex: string;
  rewardItemIds: string[];
  requiresPuzzleId?: string;
  requiresItemId?: string;
  requiresLanternInDark?: boolean;
}

export interface RpgExaminableSpec {
  id: string;
  areaId: RpgAreaId;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  accentHex: string;
  category: string;
  paragraphs: string[];
  hint?: string;
  secretIdToDiscover?: string;
  isFalseWall?: boolean;
  unlocksDoorToArea?: {
    targetArea: RpgAreaId;
    spawnX: number;
    spawnY: number;
  };
}

export interface RpgSubAreaNpcSpec {
  id: string;
  areaId: RpgAreaId;
  name: string;
  role: string;
  x: number;
  y: number;
  facing: FacingDirection;
  palette: { primary: string; secondary: string; glow: string };
  pitch: number;
}

export interface PressureTileSpec {
  id: string;
  orderIndex: number; // 1, 2, 3
  label: string;
  x: number;
  y: number;
  accentHex: string;
}

export interface SubAreaSpec {
  id: Exclude<RpgAreaId, 'exterior-70s'>;
  numberLabel: string;
  name: string;
  subtitle: string;
  accentHex: string;
  floorHex: string;
  floorGridHex: string;
  wallHex: string;
  borderHex: string;
  width: number;
  height: number;
  walkableBounds: { x: number; y: number; w: number; h: number };
  isDarkCave?: boolean;
  obstacles: SolidObstacleRect[];
  exits: {
    id: string;
    label: string;
    actionLabel: string;
    x: number;
    y: number;
    accentHex: string;
    targetArea: RpgAreaId;
    targetX?: number;
    targetY?: number;
    returnToSavedExterior?: boolean;
  }[];
  pressurePuzzle?: {
    puzzleId: string;
    tiles: PressureTileSpec[];
    successMessage: string;
  };
  decorProps: {
    kind:
      | 'workbench'
      | 'crt-rack'
      | 'archive-shelf'
      | 'oscilloscope-altar'
      | 'cave-crystal'
      | 'underground-pool'
      | 'neon-arch'
      | 'dk-cabinet-1981'
      | 'astral-ferry'
      | 'time-machine-core'
      | 'temporal-conduit';
    x: number;
    y: number;
    w: number;
    h: number;
    accentHex: string;
    label?: string;
  }[];
}

/* ============================================================================
   1. CATÁLOGO DE OBJETOS Y HERRAMIENTAS DE EXPLORACIÓN
   ============================================================================ */
export const RPG_ITEMS: Record<string, RpgItemSpec> = {
  'item-bitacora-cero': {
    id: 'item-bitacora-cero',
    name: 'Bitácora de la Isla del Origen',
    category: 'cinta-memoria',
    categoryLabel: 'DIARIO DEL VIAJERO',
    accentHex: '#5cc8ff',
    shortCode: 'BIT-00',
    description:
      'Cuaderno portátil de Pixel. Registra pistas de las cinco zonas de la Isla del Origen, atajos descubiertos y crónicas de los videojuegos.',
    usageHint: 'Lee carteles de madera e inscripciones para hallar cuevas, túneles y pasadizos entre árboles.',
    usableAction: 'inspect',
  },
  'item-lampara-fosforo': {
    id: 'item-lampara-fosforo',
    name: 'Lámpara de Fósforo Ámbar',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#facc15',
    shortCode: 'LMP-72',
    description:
      'Farol clásico alimentado por el pulso de Pong (1972). Disipa la oscuridad en cuevas húmedas y permite abrir cofres ocultos en la penumbra.',
    usageHint: 'Pulsa [USAR] o la tecla [L] para encender/apagar el halo de luz alrededor de Pixel.',
    usableAction: 'lantern',
    grantsAbility: 'phosphor-lantern',
  },
  'item-escaner-frecuencias': {
    id: 'item-escaner-frecuencias',
    name: 'Buscador de Secretos GBC',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#5cc8ff',
    shortCode: 'SCN-74',
    description:
      'Dispositivo de pulso armónico que revela paredes falsas, entradas disimuladas en rocas, árboles huecos y cofres sin abrir cercanos.',
    usageHint: 'Pulsa [USAR] o la tecla [R] durante la exploración para emitir una onda detectora.',
    usableAction: 'scanner',
    grantsAbility: 'secret-scanner',
  },
  'item-soldador-logico': {
    id: 'item-soldador-logico',
    name: 'Soldador Lógico de Precisión',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#4ca64c',
    shortCode: 'SLD-76',
    description:
      'Herramienta maestra forjada en el Taller del Bosque de los Secretos. Repara mecanismos antiguos y despliega puentes bloqueados.',
    usageHint: 'Acércate al mecanismo averiado al sur de la Plaza Mayor y pulsa [E].',
    usableAction: 'welder',
    grantsAbility: 'circuit-welder',
  },
  'item-condensador-cuarzo': {
    id: 'item-condensador-cuarzo',
    name: 'Condensador de Cuarzo Puro',
    category: 'pieza-arcade',
    categoryLabel: 'PIEZA DE MÁQUINA ARCADE',
    accentHex: '#c084fc',
    shortCode: 'CAP-QZ',
    description:
      'Cristal estabilizador extraído de los Túneles Subterráneos del Tiempo. Regula fuentes de video clásicas sin fluctuaciones.',
    usageHint: 'Entrégaselo al Maestro Kertz dentro del Taller del Bosque de los Secretos.',
    usableAction: 'inspect',
  },
  'item-cinta-alfa': {
    id: 'item-cinta-alfa',
    name: 'Cartucho Histórico Alfa (1971)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#8cd96c',
    shortCode: 'CRT-A1',
    description:
      'Memoria recuperada en la cala costera del Pueblo del Origen. Conserva esquemas de las primeras recreativas.',
    usageHint: 'Llévaselo a la Archivera Lira en el Archivo de la Plaza Mayor.',
    usableAction: 'inspect',
  },
  'item-cinta-beta': {
    id: 'item-cinta-beta',
    name: 'Cartucho Histórico Beta (1975)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#f2c94c',
    shortCode: 'CRT-B2',
    description:
      'Memoria resguardada detrás de la cascada del Paso Volcánico. Documenta el salto a los microprocesadores de 8 bits.',
    usageHint: 'Llévaselo a la Archivera Lira en el Archivo de la Plaza Mayor.',
    usableAction: 'inspect',
  },
  'item-llave-binaria': {
    id: 'item-llave-binaria',
    name: 'Llave Antigua de 8 Pines',
    category: 'llave',
    categoryLabel: 'LLAVE ANTIGUA',
    accentHex: '#f59e0b',
    shortCode: 'KEY-08',
    description:
      'Llave metálica labrada con ocho muescas precisas. Abre cofres sellados de alta seguridad.',
    usageHint: 'Se utiliza automáticamente al interactuar con cofres con cerradura de 8 pines.',
    usableAction: 'inspect',
  },
  'item-reliquia-osciloscopio': {
    id: 'item-reliquia-osciloscopio',
    name: 'Válvula Luminosa de 1958',
    category: 'reliquia',
    categoryLabel: 'RELIQUIA FUNDACIONAL',
    accentHex: '#5cc8ff',
    shortCode: 'REL-58',
    description:
      'Tubo analógico oculto tras la pared falsa del Taller del Bosque. Aún proyecta una pequeña estela verde.',
    usageHint: 'Muéstrasela al Ermitaño que habita en la Gruta tras la Cascada.',
    usableAction: 'inspect',
  },
  'item-mapa-secreto-isla': {
    id: 'item-mapa-secreto-isla',
    name: 'Plano Secreto de Túneles y Árboles',
    category: 'reliquia',
    categoryLabel: 'MAPA DE EXPLORADOR',
    accentHex: '#8cd96c',
    shortCode: 'MAP-01',
    description:
      'Pergamino pixelado hallado tras los árboles del Bosque de los Secretos. Señala rocas huecas en la Costa y un pasadizo detrás del Centro de Historia.',
    usageHint: 'Pista: Busca rocas agrietadas al oeste del Pueblo y en las Ruinas Costeras del Este para viajar por túneles subterráneos.',
    usableAction: 'inspect',
  },
  'item-pase-astral-80s': {
    id: 'item-pase-astral-80s',
    name: 'Carta Náutica · Nuevas Islas (80s)',
    category: 'llave',
    categoryLabel: 'PASE MARÍTIMO',
    accentHex: '#f43f5e',
    shortCode: 'NAV-80',
    description:
      'Ruta marítima desbloqueada junto al Logro de 1.000 Puntos en Space Invaders. Permite zarpar desde el muelle de La Costa y las Ruinas del Tiempo.',
    usageHint: 'Dirígete al muelle oriental (Zona 5) y aborda el navío hacia la siguiente década.',
    usableAction: 'inspect',
  },
  'item-visor-vectorial': {
    id: 'item-visor-vectorial',
    name: 'Gafas Retro de Explorador',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#5cc8ff',
    shortCode: 'VIS-GB',
    description:
      'Lentes luminosas halladas detrás del Centro de Historia o en cofres especiales. Cambian el aspecto de Pixel al caminar.',
    usageHint: 'Pulsa [EQUIPAR] en la Mochila [I] para llevarlas puestas.',
    usableAction: 'equip-cosmetic',
  },
  'item-manto-arquitecto': {
    id: 'item-manto-arquitecto',
    name: 'Corona Dorada del Origen',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#fde047',
    shortCode: 'CRN-70',
    description:
      'Insignia real entregada a quienes descubren la cámara oculta de 1958 y la gruta tras la cascada.',
    usageHint: 'Pulsa [EQUIPAR] en la Mochila [I] para lucirla sobre Pixel.',
    usableAction: 'equip-cosmetic',
  },
  'item-bobina-temporal': {
    id: 'item-bobina-temporal',
    name: 'Bobina de Resonancia Temporal',
    category: 'pieza-arcade',
    categoryLabel: 'ARTEFACTO DEL CRONOSCOPIO',
    accentHex: '#00f3ff',
    shortCode: 'CRN-77',
    description:
      'Núcleo espiral de cuarzo y cobre hallado en la Cámara Abisal de las Cavernas de Memoria. Estabiliza los anillos de época de la Máquina del Tiempo.',
    usageHint: 'Llévala al Observatorio del Cronoscopio en Las Ruinas del Primer Pulso.',
    usableAction: 'inspect',
  },
  'item-insignia-vigas-1981': {
    id: 'item-insignia-vigas-1981',
    name: 'Emblema de las Vigas Rojas (1981)',
    category: 'reliquia',
    categoryLabel: 'TROFEO DE EXPANSIÓN',
    accentHex: '#fb7185',
    shortCode: 'EMB-81',
    description:
      'Medalla obtenida al superar el gabinete clásico de 1981 tras viajar a la década de 1980.',
    usageHint: 'Acredita tu avance hacia las nuevas décadas de PIXELVERSE.',
    usableAction: 'inspect',
  },
};

/* ============================================================================
   2. SISTEMA DE MISIONES DE LA ISLA DEL ORIGEN
   ============================================================================ */
export const RPG_QUESTS: RpgQuestSpec[] = [
  {
    id: 'quest-pulso-1972',
    code: 'MIS-01',
    title: 'El Despertar en Las Praderas del Pixel',
    giverName: 'Bit-01 · Alcalde del Pueblo del Origen',
    decadeTag: 'ZONA 1 → ZONA 2 · PONG',
    accentHex: '#8cd96c',
    summary:
      'Recorre el Pueblo del Origen, atraviesa el Bosque de los Secretos hasta la Plaza Mayor y llega a Las Praderas del Pixel para jugar y restaurar Pong (1972).',
    steps: [
      {
        label: 'Orientarse en El Pueblo del Origen y cruzar hacia la Plaza Mayor',
        isDone: (st, all) =>
          all ||
          st.island70s.visitedZones.includes('ruinas-primer-arcade') ||
          Boolean(st.games['pong']?.memoryUnlocked),
      },
      {
        label: 'Restaurar Pong (1972) en Las Praderas del Pixel',
        isDone: (st, all) => all || Boolean(st.games['pong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Tabla Planeadora de Pong + Lámpara de Fósforo [L]',
    rewardItemIds: ['item-lampara-fosforo'],
  },
  {
    id: 'quest-taller-ttl',
    code: 'MIS-02',
    title: 'El Artesano del Bosque de los Secretos',
    giverName: 'Maestro Kertz · Taller del Bosque',
    decadeTag: 'ZONA 3 · BOSQUE Y TÚNELES',
    accentHex: '#4ca64c',
    summary:
      'Encuentra el Condensador de Cuarzo en los Túneles Subterráneos y llévaselo al Maestro Kertz en el Taller del Bosque para forjar el Soldador Lógico.',
    steps: [
      {
        label: 'Conversar con el Maestro Kertz dentro del Taller del Bosque',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-maestro-kertz') ||
          st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
      {
        label: 'Recuperar el Condensador de Cuarzo en los Túneles Subterráneos',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-condensador-cuarzo'),
      },
      {
        label: 'Entregar el cuarzo en el Taller para recibir el Soldador Lógico',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
    ],
    rewardSummary: 'Soldador Lógico (Abre el atajo del Puente Costero)',
    rewardItemIds: ['item-soldador-logico'],
  },
  {
    id: 'quest-archivo-cartuchos',
    code: 'MIS-03',
    title: 'Los Cartuchos Perdidos de la Historia',
    giverName: 'Archivera Lira · Archivo Pionero',
    decadeTag: 'ZONA 1 Y ZONA 5 · EXPLORACIÓN',
    accentHex: '#f2c94c',
    summary:
      'Recupera los dos Cartuchos Históricos escondidos en la isla y resuelve las losetas I → II → III del Archivo para obtener el Buscador de Secretos.',
    steps: [
      {
        label: 'Hallar el Cartucho Alfa en la cala sur del Pueblo del Origen',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-alfa'),
      },
      {
        label: 'Hallar el Cartucho Beta en la gruta oculta tras la cascada',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-beta'),
      },
      {
        label: 'Resolver el acertijo de losetas (I → II → III) o informar a Lira',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-templo-losetas') ||
          st.rpg.questStates['quest-archivo-cartuchos'] === 'completed',
      },
    ],
    rewardSummary: 'Buscador de Secretos GBC [R]',
    rewardItemIds: ['item-escaner-frecuencias'],
  },
  {
    id: 'quest-secreto-cascada',
    code: 'MIS-04',
    title: 'Paredes Falsas y el Ermitaño del Agua',
    giverName: 'Ermitaño del Bit Cero',
    decadeTag: 'SECRETO · ZONA 3 Y ZONA 4',
    accentHex: '#c084fc',
    summary:
      'Descubre el pasadizo detrás del muro falso del Taller para obtener la Válvula de 1958 y entrégasela al Ermitaño detrás de la cascada norte.',
    steps: [
      {
        label: 'Abrir la pared falsa en el muro norte del Taller del Bosque',
        isDone: (st, all) =>
          all || st.rpg.discoveredSecretIds.includes('secret-muro-taller'),
      },
      {
        label: 'Recoger la Válvula Luminosa de 1958 en la cámara secreta',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-reliquia-osciloscopio'),
      },
      {
        label: 'Cruzar la cascada con la Lámpara [L] y hablar con el Ermitaño',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-secreto-cascada'] === 'completed',
      },
    ],
    rewardSummary: 'Corona Dorada del Origen (Cosmético equipable)',
    rewardItemIds: ['item-manto-arquitecto'],
  },
  {
    id: 'quest-defensa-1978',
    code: 'MIS-05',
    title: 'La Fortaleza Volcánica y los 1.000 Puntos',
    giverName: 'Cartógrafo y Vigía del Cráter',
    decadeTag: 'ZONA 4 · LOGRO SPACE INVADERS',
    accentHex: '#f26419',
    summary:
      'Abre el puente hacia La Fortaleza Volcánica y alcanza 1.000 puntos en Space Invaders para desbloquear el Logro Persistente y el muelle costero.',
    steps: [
      {
        label: 'Cruzar El Sendero del Glitch Perdido para abrir el puente volcánico',
        isDone: (st, all) => all || st.island70s.glitchTrailCompleted,
      },
      {
        label: 'Alcanzar 1.000 puntos en Space Invaders (Logro Persistente)',
        isDone: (st, all) =>
          all ||
          Boolean(st.games['space-invaders']?.memoryUnlocked) ||
          st.rpg.achievementsUnlocked.includes('invaders-1000-pts'),
      },
    ],
    rewardSummary: 'Logro 1.000 PTS + Nave Estelar + Carta Náutica Costera',
    rewardItemIds: ['item-pase-astral-80s'],
  },
  {
    id: 'quest-despertar-1981',
    code: 'MIS-06',
    title: 'La Máquina del Tiempo y el Salto a los 80',
    giverName: 'Crono-0 & Capitana Vectoria',
    decadeTag: 'CRONOSCOPIO · VIAJE TEMPORAL',
    accentHex: '#00f3ff',
    summary:
      'Descubre la Máquina del Tiempo en Las Ruinas del Primer Pulso, sincroniza su energía completando los hitos de 1970 y viaja hacia la década de 1980.',
    steps: [
      {
        label: 'Descubrir la Máquina del Tiempo en el Observatorio del Cronoscopio',
        isDone: (st, all) =>
          all ||
          st.rpg.discoveredSecretIds.includes('secret-cronoscopio-hallado') ||
          st.rpg.discoveredSecretIds.includes('visited-island-80s'),
      },
      {
        label: 'Viajar a la década de 1980 y superar el desafío clásico de 1981',
        isDone: (st, all) => all || Boolean(st.games['donkey-kong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Viaje Temporal 1980s + Emblema de las Vigas Rojas (1981)',
    rewardItemIds: ['item-insignia-vigas-1981'],
  },
];

/* ============================================================================
   3. EDIFICIOS EXPLORABLES CON ARQUITECTURA DIFERENCIADA DE PIXELVERSE
   ============================================================================ */
export const ISLAND_70S_BUILDINGS: ExteriorBuildingSpec[] = [
  {
    id: 'bldg-casa-historiador',
    name: 'Casa del Cronista · Archivo de los Orígenes',
    subtitle: 'Aldea de los Orígenes · Crónicas, mapas y jardín trasero secreto',
    archStyle: 'cottage-archive',
    x: 560,
    y: 1624,
    w: 144,
    h: 88,
    roofHex: '#2563eb',
    roofShadeHex: '#1e3a8a',
    wallHex: '#e8dcc4',
    trimHex: '#38bdf8',
    signText: 'CRÓNICAS',
    doorX: 632,
    doorY: 1714,
    targetArea: 'interior-centro-historia',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 632,
    returnExteriorY: 1738,
  },
  {
    id: 'bldg-taller-alcorn',
    name: 'Taller Analógico de las Señales',
    subtitle: 'Bosque de las Señales · Osciloscopios, antena rotatoria y pared falsa',
    archStyle: 'forest-workshop',
    x: 944,
    y: 936,
    w: 148,
    h: 88,
    roofHex: '#0f766e',
    roofShadeHex: '#134e4a',
    wallHex: '#dfd3b8',
    trimHex: '#34d399',
    signText: 'TALLER TTL',
    doorX: 1018,
    doorY: 1026,
    targetArea: 'interior-taller-alcorn',
    targetSpawnX: 380,
    targetSpawnY: 438,
    returnExteriorX: 1018,
    returnExteriorY: 1052,
  },
  {
    id: 'bldg-templo-pioneros',
    name: 'Santuario del Archivo Pionero',
    subtitle: 'Ruinas del Primer Pulso · Cartuchos perdidos y losetas armónicas',
    archStyle: 'ruins-sanctuary',
    x: 1852,
    y: 1094,
    w: 168,
    h: 92,
    roofHex: '#b45309',
    roofShadeHex: '#78350f',
    wallHex: '#e5d9c3',
    trimHex: '#f59e0b',
    signText: 'ARCHIVO',
    doorX: 1936,
    doorY: 1188,
    targetArea: 'interior-templo-pioneros',
    targetSpawnX: 410,
    targetSpawnY: 462,
    returnExteriorX: 1936,
    returnExteriorY: 1216,
  },
  {
    id: 'bldg-cronoscopio-origen',
    name: 'Observatorio del Cronoscopio',
    subtitle: 'Instalación ancestral que alberga la Máquina del Tiempo de PIXELVERSE',
    archStyle: 'chrono-dome',
    x: 2068,
    y: 1094,
    w: 164,
    h: 92,
    roofHex: '#0e7490',
    roofShadeHex: '#164e63',
    wallHex: '#cbd5e1',
    trimHex: '#00f3ff',
    signText: 'CRONOSCOPIO',
    doorX: 2150,
    doorY: 1188,
    targetArea: 'interior-cronoscopio',
    targetSpawnX: 410,
    targetSpawnY: 468,
    returnExteriorX: 2150,
    returnExteriorY: 1216,
  },
];

/* ============================================================================
   3B. PORTALES ANÓMALOS ENTRE SECTORES Y CÁMARAS OCULTAS
   ============================================================================ */
export const ISLAND_ANOMALY_PORTALS: AnomalyPortalSpec[] = [
  {
    id: 'portal-aldea-mirador',
    name: 'Portal Anómalo del Mirador Sur',
    subtitle: 'Fractura armónica conectada con Las Ruinas del Primer Pulso',
    x: 976,
    y: 1876,
    style: 'glyph-shortcut',
    accentHex: '#00f3ff',
    requiredSecretIds: ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'],
    targetKind: 'exterior-coords',
    destX: 1856,
    destY: 1684,
    destFacing: 'up',
    dormantTitle: 'Portal Anómalo Inactivo · Resonancia Incompleta',
    dormantLore: [
      'Un arco de piedra y cátodos antiguos vibra débilmente frente al mar. Tres ranuras vacías muestran símbolos geométricos apagados: [ ◈ ] · [ ◈◈ ] · [ ◈◈◈ ].',
      'Quien sintonice los tres Símbolos del Primer Pulso tallados en la Aldea, el Bosque de las Señales y la Terraza Costera abrirá este puente instantáneo entre sectores.',
    ],
    dormantHint: 'Busca monolitos con glifos brillantes en la Aldea (Sur), el Bosque (Norte) y la Terraza de Pong (Sureste).',
    activeToast: '¡Portal Anómalo cruzado! Emerges en la terraza sur de Las Ruinas del Primer Pulso',
  },
  {
    id: 'portal-ruinas-sur',
    name: 'Portal Anómalo de las Ruinas',
    subtitle: 'Fractura armónica conectada con el Mirador de la Aldea',
    x: 1856,
    y: 1648,
    style: 'glyph-shortcut',
    accentHex: '#00f3ff',
    requiredSecretIds: ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'],
    targetKind: 'exterior-coords',
    destX: 944,
    destY: 1876,
    destFacing: 'left',
    dormantTitle: 'Portal Anómalo de las Ruinas (Latente)',
    dormantLore: [
      'El núcleo cristalino de este portal aguarda la alineación de los tres Símbolos del Primer Pulso repartidos por la Isla del Origen.',
    ],
    dormantHint: 'Usa el Escáner [R] o explora los rincones de la Aldea, el Bosque y la Costa de Pong para hallar los 3 glifos.',
    activeToast: '¡Portal Anómalo cruzado! Regresas al Mirador Costero de La Aldea de los Orígenes',
  },
  {
    id: 'portal-caverna-boveda',
    name: 'Portal Abisal de Memoria',
    subtitle: 'Anomalía subterránea hacia la Cámara Oculta del Cronoscopio',
    x: 1360,
    y: 508,
    style: 'abyssal-chamber',
    accentHex: '#c084fc',
    targetKind: 'sub-area',
    targetArea: 'chamber-boveda-cronoscopio',
    destX: 380,
    destY: 428,
    destFacing: 'up',
    returnExteriorX: 1360,
    returnExteriorY: 544,
    dormantTitle: 'Portal Abisal de Memoria',
    dormantLore: [],
    dormantHint: '',
    activeToast: 'Atravesando anomalía subterránea · Cámara Abisal del Cronoscopio',
  },
];

export const TIME_MACHINE_CONSOLE = {
  id: 'console-cronoscopio-central',
  x: 410,
  y: 235,
};

export interface TimeMachineProgressStatus {
  discovered: boolean;
  pongReady: boolean;
  glitchReady: boolean;
  invadersReady: boolean;
  archaeologyReady: boolean;
  syncedCount: number; // 0..4
  canTravelTo80s: boolean;
  stageNumber: 1 | 2 | 3 | 4;
}

export function evaluateTimeMachineStatus(
  state: PixelverseProgressState,
  allUnlocked: boolean
): TimeMachineProgressStatus {
  const discovered =
    allUnlocked || state.rpg.discoveredSecretIds.includes('secret-cronoscopio-hallado');
  const pongReady = allUnlocked || Boolean(state.games['pong']?.memoryUnlocked);
  const glitchReady =
    allUnlocked ||
    Boolean(state.island70s.glitchTrailCompleted) ||
    Boolean(state.games['glitch-trail']?.completed);
  const invadersReady =
    allUnlocked || Boolean(state.games['space-invaders']?.memoryUnlocked);
  const glyphsAll =
    state.rpg.discoveredSecretIds.includes('secret-glyph-1') &&
    state.rpg.discoveredSecretIds.includes('secret-glyph-2') &&
    state.rpg.discoveredSecretIds.includes('secret-glyph-3');
  const archaeologyReady =
    allUnlocked ||
    state.rpg.inventoryItems.includes('item-bobina-temporal') ||
    glyphsAll;

  const syncedCount =
    (pongReady ? 1 : 0) +
    (glitchReady ? 1 : 0) +
    (invadersReady ? 1 : 0) +
    (archaeologyReady ? 1 : 0);

  const canTravelTo80s = pongReady && glitchReady && invadersReady;
  const stageNumber: 1 | 2 | 3 | 4 = canTravelTo80s
    ? 4
    : syncedCount >= 2
    ? 3
    : syncedCount >= 1 || discovered
    ? 2
    : 1;

  return {
    discovered,
    pongReady,
    glitchReady,
    invadersReady,
    archaeologyReady,
    syncedCount,
    canTravelTo80s,
    stageNumber,
  };
}

/* Punto de Guardado en Zona 1 — El Pueblo del Origen */
export const VILLAGE_SAVE_TERMINAL = {
  id: 'save-pueblo-origen',
  label: 'Bitácora de Guardado · Pueblo del Origen',
  x: 416,
  y: 1744,
};

/* Carteles de Orientación estilo Game Boy Color en las 5 Grandes Zonas */
export const ISLAND_WOODEN_SIGNS: WoodenSignSpec[] = [
  {
    id: 'sign-pueblo-llegada',
    label: 'Cartel de Bienvenida · Pueblo del Origen',
    x: 696,
    y: 1796,
    zoneTitle: 'ZONA 1 — EL PUEBLO DEL ORIGEN',
    lines: [
      '▲ NORTE: Centro de Historia del Videojuego y sendero hacia El Bosque de los Secretos.',
      '◀ OESTE: Bitácora de Guardado y roca hueca hacia los Túneles Subterráneos.',
      '▼ SUR: Cala de arena del Pueblo (hay objetos escondidos junto a la orilla).',
    ],
  },
  {
    id: 'sign-bosque-bifurcacion',
    label: 'Cartel de Madera · Bosque de los Secretos',
    x: 928,
    y: 1264,
    zoneTitle: 'ZONA 3 — EL BOSQUE DE LOS SECRETOS',
    lines: [
      '▶ ESTE: Camino empedrado hacia la Plaza Mayor del Pueblo y Las Praderas del Pixel.',
      '▲ NORTE: Taller del Artesano Kertz y arboleda densa (¡observa bien los huecos entre los árboles!).',
      '◀ NOROESTE: Paso rocoso hacia las Cuevas del Tiempo.',
    ],
  },
  {
    id: 'sign-plaza-central',
    label: 'Poste Indicador · Plaza Mayor',
    x: 1776,
    y: 1360,
    zoneTitle: 'CRUCE CENTRAL DE LA ISLA DEL ORIGEN',
    lines: [
      '↘ SURESTE: Las Praderas del Pixel y acceso a PONG (1972).',
      '▲ NORTE: Paso de Montaña y La Fortaleza Volcánica — SPACE INVADERS (1978).',
      '▼ SUR: Mecanismo del Puente Costero (atajo de regreso al Pueblo).',
    ],
  },
  {
    id: 'sign-praderas-pong',
    label: 'Cartel Florido · Las Praderas del Pixel',
    x: 2464,
    y: 1552,
    zoneTitle: 'ZONA 2 — LAS PRADERAS DEL PIXEL',
    lines: [
      '▶ ESTE: Claro del Primer Arcade — Gabinete clásico de PONG.',
      '▲ NORTE: Pradera alta de flores silvestres.',
      '↘ SURESTE: Terraza costera escondida tras los arbustos.',
    ],
  },
  {
    id: 'sign-fortaleza-volcanica',
    label: 'Estela de Basalto · La Fortaleza Volcánica',
    x: 2496,
    y: 672,
    zoneTitle: 'ZONA 4 — LA FORTALEZA VOLCÁNICA',
    lines: [
      '▶ ESTE: Patio de Lava y Gabinete de SPACE INVADERS (¡Alcanza 1.000 PTS para el Logro!).',
      '▲ NOROESTE: Escalinata hacia el Cráter Superior y el Astrolabio.',
      '↘ SURESTE: Sendero de descenso hacia La Costa y las Ruinas del Tiempo.',
    ],
  },
  {
    id: 'sign-costa-ruinas',
    label: 'Cartel del Muelle · La Costa y las Ruinas del Tiempo',
    x: 3088,
    y: 1152,
    zoneTitle: 'ZONA 5 — LA COSTA Y LAS RUINAS DEL TIEMPO',
    lines: [
      '▶ ESTE: Embarcadero hacia futuras islas y telescopios del horizonte.',
      '▼ SUR: Ruinas del Tiempo, entrada secreta al túnel subterráneo y Monolito del Origen.',
    ],
  },
];

/* Túneles subterráneos ocultos bajo rocas que conectan la Costa con las Cuevas */
export const COASTAL_SUBTERRANEAN_TUNNELS: TunnelPortalSpec[] = [
  {
    id: 'tunnel-pueblo-to-caverna',
    label: 'Roca Hueca Costera · Entrada a Túnel Subterráneo',
    actionLabel: 'Descender al Túnel',
    x: 272,
    y: 1656,
    destX: 304,
    destY: 736,
    destFacing: 'up',
    toastText: 'Túnel Costero atravesado · Emerges en las Cuevas del Tiempo (Norte)',
    secretId: 'secret-tunel-costero',
  },
  {
    id: 'tunnel-caverna-to-pueblo',
    label: 'Escalinata de Roca · Regreso a la Costa del Pueblo',
    actionLabel: 'Subir a la Costa Sur',
    x: 304,
    y: 760,
    destX: 272,
    destY: 1684,
    destFacing: 'down',
    toastText: 'Regresaste por el túnel subterráneo al Pueblo del Origen',
  },
  {
    id: 'tunnel-ruinas-tiempo-to-caverna',
    label: 'Gruta Marina en las Ruinas del Tiempo',
    actionLabel: 'Cruzar Pasadizo Subterráneo',
    x: 3056,
    y: 1520,
    destX: 1472,
    destY: 656,
    destFacing: 'left',
    toastText: 'Atajo subterráneo completado · Conectaste la Costa Este con el Túnel Central',
    secretId: 'secret-tunel-ruinas-tiempo',
  },
  {
    id: 'tunnel-caverna-east-to-ruinas',
    label: 'Galería Submarina · Salida a las Ruinas del Tiempo',
    actionLabel: 'Salir a la Costa Este',
    x: 1504,
    y: 656,
    destX: 3056,
    destY: 1488,
    destFacing: 'down',
    toastText: 'Emerges frente al mar en La Costa y las Ruinas del Tiempo',
  },
];

/* Pasaje secreto tras la cascada en el Paso Volcánico */
export const WATERFALL_SECRET_ENTRANCE = {
  id: 'waterfall-grotto-entry',
  x: 2088,
  y: 748,
  targetArea: 'cave-gruta-cascada' as RpgAreaId,
  targetSpawnX: 390,
  targetSpawnY: 455,
  returnExteriorX: 2062,
  returnExteriorY: 752,
};

/* Embarcadero en La Costa y las Ruinas del Tiempo hacia la siguiente isla */
export const HARBOR_80S_FERRY = {
  id: 'ferry-to-80s',
  x: 3255,
  y: 1125,
  targetArea: 'island-80s' as RpgAreaId,
  targetSpawnX: 190,
  targetSpawnY: 360,
  returnExteriorX: 3215,
  returnExteriorY: 1155,
};

/* Mecanismo averiado reparable con el Soldador Lógico al sur de la Plaza */
export const BROKEN_RELAY_MECHANISM = {
  id: 'mech-ruinas-puente',
  label: 'Mecanismo Antiguo del Puente Costero',
  x: 1745,
  y: 1618,
  accentHex: '#4ca64c',
};

/* ============================================================================
   4. COFRES PERSISTENTES EN LA ISLA DEL ORIGEN, CUEVAS E ISLA 80s
   ============================================================================ */
export const RPG_CHESTS: RpgChestSpec[] = [
  {
    id: 'chest-costa-cala',
    areaId: 'exterior-70s',
    label: 'Cofre de la Cala del Pueblo',
    x: 248,
    y: 1925,
    accentHex: '#5cc8ff',
    rewardItemIds: ['item-cinta-alfa'],
  },
  {
    id: 'chest-pueblo-trasero',
    areaId: 'exterior-70s',
    label: 'Cofre Oculto Tras el Centro de Historia',
    x: 632,
    y: 1556,
    accentHex: '#f2c94c',
    rewardItemIds: ['item-visor-vectorial'],
  },
  {
    id: 'chest-bosque-arboles',
    areaId: 'exterior-70s',
    label: 'Cofre Escondido Entre los Árboles del Bosque',
    x: 608,
    y: 896,
    accentHex: '#8cd96c',
    rewardItemIds: ['item-mapa-secreto-isla'],
  },
  {
    id: 'chest-caverna-cuarzo',
    areaId: 'exterior-70s',
    label: 'Cofre de Cuarzo Subterráneo',
    x: 615,
    y: 425,
    accentHex: '#c084fc',
    rewardItemIds: ['item-condensador-cuarzo'],
  },
  {
    id: 'chest-secreto-1958',
    areaId: 'secret-camara-osciloscopio',
    label: 'Arca Fundacional de 1958',
    x: 380,
    y: 175,
    accentHex: '#5cc8ff',
    rewardItemIds: ['item-reliquia-osciloscopio', 'item-llave-binaria'],
  },
  {
    id: 'chest-templo-boveda',
    areaId: 'interior-templo-pioneros',
    label: 'Cofre Armónico del Archivo',
    x: 410,
    y: 158,
    accentHex: '#f2c94c',
    rewardItemIds: ['item-escaner-frecuencias'],
    requiresPuzzleId: 'puzzle-templo-losetas',
  },
  {
    id: 'chest-gruta-cascada',
    areaId: 'cave-gruta-cascada',
    label: 'Cofre Sumergido tras la Cascada',
    x: 610,
    y: 205,
    accentHex: '#fbbf24',
    rewardItemIds: ['item-cinta-beta'],
    requiresLanternInDark: true,
  },
  {
    id: 'chest-boveda-bobina',
    areaId: 'chamber-boveda-cronoscopio',
    label: 'Relicario de la Cámara Abisal',
    x: 380,
    y: 172,
    accentHex: '#00f3ff',
    rewardItemIds: ['item-bobina-temporal'],
  },
  {
    id: 'chest-80s-callejon',
    areaId: 'island-80s',
    label: 'Cofre Cerrado del Callejón 1980',
    x: 865,
    y: 185,
    accentHex: '#f43f5e',
    rewardItemIds: ['item-visor-vectorial'],
    requiresItemId: 'item-llave-binaria',
  },
];

/* ============================================================================
   5. OBJETOS EXAMINABLES, SÍMBOLOS DEL PULSO, PAREDES FALSAS Y SECRETOS
   ============================================================================ */
export const RPG_EXAMINABLES: RpgExaminableSpec[] = [
  {
    id: 'exam-simbolo-pulso-1',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈ ] · Símbolo I del Primer Pulso',
    actionLabel: 'Sintonizar Glifo I',
    x: 828,
    y: 1948,
    accentHex: '#00f3ff',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO I DE III',
    paragraphs: [
      'Al acercarte, el grabado espiral de la piedra se enciende con luz cian: «[ ◈ ] Donde nace la primera chispa sobre la pantalla oscura».',
      'Una vibración recorre el suelo hacia el Portal Anómalo del Mirador Sur.',
    ],
    hint: 'Busca los otros dos Símbolos del Primer Pulso en el Bosque de las Señales y en la Terraza Costera de Pong.',
    secretIdToDiscover: 'secret-glyph-1',
  },
  {
    id: 'exam-simbolo-pulso-2',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈◈ ] · Símbolo II del Primer Pulso',
    actionLabel: 'Sintonizar Glifo II',
    x: 1192,
    y: 956,
    accentHex: '#34d399',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO II DE III',
    paragraphs: [
      'Entre raíces cubiertas de musgo y filamentos de cobre despierta el segundo símbolo: «[ ◈◈ ] Dos señales dialogan a través del bosque del tiempo».',
    ],
    hint: 'El tercer símbolo aguarda junto a la brisa marina al sureste del Claro de Pong.',
    secretIdToDiscover: 'secret-glyph-2',
  },
  {
    id: 'exam-simbolo-pulso-3',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈◈◈ ] · Símbolo III del Primer Pulso',
    actionLabel: 'Sintonizar Glifo III',
    x: 3064,
    y: 1764,
    accentHex: '#fde047',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO III DE III',
    paragraphs: [
      'Las líneas doradas del monolito costero resplandecen: «[ ◈◈◈ ] Tres frecuencias abren el pliegue entre las ruinas y la aldea».',
      'Si ya sintonizaste los glifos de la Aldea y del Bosque, ¡el Portal Anómalo de Continuidad se habrá activado!',
    ],
    hint: 'Comprueba los Portales Anómalos en el Mirador de la Aldea o al sur de Las Ruinas del Primer Pulso.',
    secretIdToDiscover: 'secret-glyph-3',
  },
  {
    id: 'exam-recreativa-olvidada-costa',
    areaId: 'exterior-70s',
    label: 'Bastidor Arcade Erosionado por la Marea',
    actionLabel: 'Inspeccionar Restos',
    x: 3128,
    y: 1428,
    accentHex: '#38bdf8',
    category: 'ARQUEOLOGÍA DE LA COSTA · MÁQUINA OLVIDADA',
    paragraphs: [
      'Un antiguo chasis recreativo descansa semienterrado en la arena húmeda, cubierto de percebes luminosos y placas oxidadas de los años 70.',
      'En su interior alguien grabó una coordenada: «Bajo las Cavernas de Memoria abrimos una bóveda para resguardar la Bobina del Cronoscopio antes de que la tormenta temporal nos alcanzara».',
    ],
    hint: 'Explora la galería noreste de Las Cavernas de Memoria para encontrar el Portal Abisal.',
    secretIdToDiscover: 'secret-arcade-olvidado',
  },
  {
    id: 'exam-inscripcion-boveda',
    areaId: 'chamber-boveda-cronoscopio',
    label: 'Bitácora Mural de los Primeros Arquitectos',
    actionLabel: 'Leer Grabado Antiguo',
    x: 215,
    y: 235,
    accentHex: '#c084fc',
    category: 'CÁMARA ABISAL · EL SECRETO DE LAS RUINAS',
    paragraphs: [
      '«Construimos Las Ruinas del Primer Pulso y el Cronoscopio porque cada década del videojuego es un eslabón vivo de la imaginación humana.»',
      '«Si algún día la continuidad se fractura, reúne el pulso de 1972, estabiliza la falla del Sendero Glitch y defiende el bastión de 1978: entonces la Máquina del Tiempo abrirá el horizonte hacia los años 80.»',
    ],
    hint: 'Abre el relicario central de esta cámara para recuperar la Bobina de Resonancia Temporal.',
    secretIdToDiscover: 'secret-boveda-cronoscopio',
  },
  {
    id: 'exam-monolito-costa',
    areaId: 'exterior-70s',
    label: 'Piedra Tallada del Pueblo del Origen',
    actionLabel: 'Leer Inscripción',
    x: 392,
    y: 1808,
    accentHex: '#5cc8ff',
    category: 'INSCRIPCIÓN DEL PUEBLO · PISTA DE EXPLORADOR',
    paragraphs: [
      '«Quien camina con curiosidad por la Isla del Origen descubre que ningún rincón está vacío: detrás de la casa azul del pueblo se esconde un jardín secreto, y entre los árboles del norte del Bosque se abre un claro invisible.»',
    ],
    hint: 'Rodea el Centro de Historia por su costado izquierdo para hallar el pasadizo trasero.',
    secretIdToDiscover: 'clue-monolito-cero',
  },
  {
    id: 'exam-secreto-origen-pixelverse',
    areaId: 'exterior-70s',
    label: 'Altar Ancestral de las Ruinas del Tiempo',
    actionLabel: 'Descifrar Reliquia del Origen',
    x: 3248,
    y: 1504,
    accentHex: '#ffd166',
    category: 'GRAN SECRETO · EL ORIGEN DE PIXELVERSE',
    paragraphs: [
      'Entre columnas bañadas por la marea descansa el grabado fundacional de PIXELVERSE: antes de que existieran consolas, géneros o fronteras tecnológicas, cada juego nacido de la creatividad humana encendía una estrella en este archipiélago.',
      'Pixel no fue creado por accidente durante el colapso de SUPER CUPA: es la chispa viva del primer píxel dibujado en una pantalla, destinado a enlazar todas las décadas para que ninguna generación olvide de dónde venimos.',
    ],
    hint: '¡Has descubierto el Gran Secreto de La Costa y las Ruinas del Tiempo!',
    secretIdToDiscover: 'secret-origen-pixelverse',
  },
  {
    id: 'exam-cronologia-historia',
    areaId: 'interior-centro-historia',
    label: 'Mural Cronológico · Los Primeros Videojuegos',
    actionLabel: 'Estudiar Mural',
    x: 205,
    y: 215,
    accentHex: '#60a5fa',
    category: 'CENTRO DE HISTORIA · CRÓNICA INTERACTIVA',
    paragraphs: [
      '1958–1962: Los laboratorios universitarios alumbran los primeros experimentos interactivos en pantallas circulares de radar y osciloscopio.',
      '1972: Pong lleva la diversión directa de dos paletas y un punto luminoso a millones de personas, simbolizado en esta isla por Las Praderas del Pixel.',
      '1978: Space Invaders inaugura la intensidad estratégica, las tablas de récords y los duelos legendarios representados en La Fortaleza Volcánica.',
    ],
    hint: 'Alcanzar 1.000 puntos en Space Invaders registra tu hazaña de forma permanente.',
  },
  {
    id: 'exam-atlas-islas',
    areaId: 'interior-centro-historia',
    label: 'Mesa Cartográfica de las Cinco Zonas',
    actionLabel: 'Consultar Mapa Mural',
    x: 525,
    y: 215,
    accentHex: '#f2c94c',
    category: 'CENTRO DE HISTORIA · GUÍA DE LA ISLA DEL ORIGEN',
    paragraphs: [
      '1. El Pueblo del Origen · 2. Las Praderas del Pixel · 3. El Bosque de los Secretos · 4. La Fortaleza Volcánica · 5. La Costa y las Ruinas del Tiempo.',
      'Una nota escrita a tinta añade: «En el extremo sur de las Ruinas Costeras del Este reposa un altar que revela el verdadero origen de Pixel».',
    ],
  },
  {
    id: 'exam-banco-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Planos de Lógica Discreta (1972)',
    actionLabel: 'Leer Planos',
    x: 215,
    y: 265,
    accentHex: '#8cd96c',
    category: 'DOCUMENTO TÉCNICO · TALLER DEL BOSQUE',
    paragraphs: [
      'Diagramas originales trazados a mano: contadores síncronos y generadores de pulso horizontal construidos con pura lógica electrónica.',
      'Una nota al margen dice: «Sentí una corriente de aire detrás del ladrillo agrietado del muro norte... como si resguardara el viejo laboratorio de 1958».',
    ],
    hint: 'Inspecciona el centro del muro norte del Taller con [E] o usa el Buscador [R].',
  },
  {
    id: 'exam-muro-falso-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Muro Norte con Ladrillos Huecos',
    actionLabel: 'Examinar Grieta Sospechosa',
    x: 380,
    y: 108,
    accentHex: '#5cc8ff',
    category: 'DESCUBRIMIENTO · PARED FALSA',
    paragraphs: [
      '¡Los ladrillos ceden con un chasquido mecánico! Detrás del muro se abre un pasadizo secreto hacia la Cámara Oculta de 1958.',
    ],
    secretIdToDiscover: 'secret-muro-taller',
    isFalseWall: true,
    unlocksDoorToArea: {
      targetArea: 'secret-camara-osciloscopio',
      spawnX: 380,
      spawnY: 395,
    },
  },
  {
    id: 'exam-altar-1958',
    areaId: 'secret-camara-osciloscopio',
    label: 'Terminal Analógico de Brookhaven (1958)',
    actionLabel: 'Inspeccionar Osciloscopio',
    x: 230,
    y: 210,
    accentHex: '#5cc8ff',
    category: 'CÁMARA SECRETA · MEMORIA PROFUNDA',
    paragraphs: [
      'Un tubo redondo muestra un destello verde rebotando sobre una red central: la chispa experimental nacida catorce años antes de los salones arcade.',
    ],
    hint: 'El Ermitaño que medita detrás de la cascada busca la válvula resguardada en el cofre de esta sala.',
  },
  {
    id: 'exam-estela-templo',
    areaId: 'interior-templo-pioneros',
    label: 'Códice Tallado de Secuencia Armónica',
    actionLabel: 'Leer Estela',
    x: 195,
    y: 235,
    accentHex: '#f2c94c',
    category: 'ACERTIJO DEL ARCHIVO · PISTA DE LOSETAS',
    paragraphs: [
      '«Camina sobre los tres nodos del suelo respetando el orden del tiempo: primero el Alba (I · Izquierda), luego el Pulso Dorado (II · Derecha) y finalmente el Cenit (III · Centro).»',
    ],
    hint: 'Pisa las tres baldosas cuadradas en orden I → II → III para abrir el cofre superior.',
  },
  {
    id: 'exam-cartel-80s',
    areaId: 'island-80s',
    label: 'Cartel Luminoso · Muelle de las Vigas Rojas',
    actionLabel: 'Leer Cartel',
    x: 475,
    y: 205,
    accentHex: '#f43f5e',
    category: 'NUEVA REGIÓN · DÉCADA DE 1980',
    paragraphs: [
      '¡Has navegado más allá de la Isla del Origen! Al este del muelle te aguarda el desafío vertical de vigas y barriles de 1981.',
    ],
    hint: 'Usa la Llave Antigua de 8 Pines para abrir el cofre del callejón noreste.',
  },
];

/* ============================================================================
   6. PERSONAJES ORIGINALES EN INTERIORES, CUEVAS E ISLA 80s
   ============================================================================ */
export const RPG_SUBAREA_NPCS: RpgSubAreaNpcSpec[] = [
  {
    id: 'npc-cronista-orfeo',
    areaId: 'interior-centro-historia',
    name: 'Sabio Orfeo · Historiador',
    role: 'Director del Centro de Historia (Pueblo del Origen)',
    x: 360,
    y: 265,
    facing: 'down',
    palette: { primary: '#2563eb', secondary: '#fde047', glow: '#60a5fa' },
    pitch: 0.92,
  },
  {
    id: 'npc-maestro-kertz',
    areaId: 'interior-taller-alcorn',
    name: 'Maestro Kertz · Artesano TTL',
    role: 'Ingeniero del Bosque de los Secretos',
    x: 525,
    y: 255,
    facing: 'down',
    palette: { primary: '#2d7a47', secondary: '#fbbf24', glow: '#8cd96c' },
    pitch: 0.88,
  },
  {
    id: 'npc-archivera-lira',
    areaId: 'interior-templo-pioneros',
    name: 'Archivera Lira',
    role: 'Custodia del Archivo de la Plaza Mayor',
    x: 615,
    y: 265,
    facing: 'left',
    palette: { primary: '#0284c7', secondary: '#fde047', glow: '#5cc8ff' },
    pitch: 1.14,
  },
  {
    id: 'npc-ermitano-cascada',
    areaId: 'cave-gruta-cascada',
    name: 'Ermitaño del Bit Cero',
    role: 'Sabio Oculto tras la Cascada',
    x: 245,
    y: 225,
    facing: 'right',
    palette: { primary: '#7b2cbf', secondary: '#e0f2fe', glow: '#c084fc' },
    pitch: 0.76,
  },
  {
    id: 'npc-automa-crono',
    areaId: 'interior-cronoscopio',
    name: 'Crono-0 · Guardián del Tiempo',
    role: 'Custodio del Observatorio del Cronoscopio',
    x: 235,
    y: 305,
    facing: 'right',
    palette: { primary: '#0e7490', secondary: '#fde047', glow: '#00f3ff' },
    pitch: 0.98,
  },
  {
    id: 'npc-capitana-vectoria',
    areaId: 'island-80s',
    name: 'Capitana Vectoria',
    role: 'Navegante de la Expansión 1980s',
    x: 355,
    y: 315,
    facing: 'down',
    palette: { primary: '#e11d48', secondary: '#5cc8ff', glow: '#fb7185' },
    pitch: 1.05,
  },
];

/* ============================================================================
   7. DEFINICIÓN ESPACIAL DE INTERIORES, CUEVAS, SALAS SECRETAS E ISLA 80s
   ============================================================================ */
export const SUB_AREAS: Record<Exclude<RpgAreaId, 'exterior-70s'>, SubAreaSpec> = {
  'interior-centro-historia': {
    id: 'interior-centro-historia',
    numberLabel: 'PUEBLO DEL ORIGEN · INTERIOR',
    name: 'Centro de Historia del Videojuego',
    subtitle: 'Biblioteca cálida de madera y cartuchos clásicos en el corazón del pueblo',
    accentHex: '#60a5fa',
    floorHex: '#3b2b1d',
    floorGridHex: 'rgba(248, 245, 230, 0.08)',
    wallHex: '#1c1510',
    borderHex: '#f2c94c',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [
      { id: 'hist-shelf-left', x: 135, y: 145, w: 130, h: 48 },
      { id: 'hist-shelf-right', x: 455, y: 145, w: 130, h: 48 },
    ],
    exits: [
      {
        id: 'exit-historia-outside',
        label: 'Puerta al Pueblo del Origen',
        actionLabel: 'Salir al Pueblo',
        x: 360,
        y: 440,
        accentHex: '#60a5fa',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'archive-shelf',
        x: 135,
        y: 145,
        w: 130,
        h: 48,
        accentHex: '#60a5fa',
        label: 'HISTORIA 58-78',
      },
      {
        kind: 'archive-shelf',
        x: 455,
        y: 145,
        w: 130,
        h: 48,
        accentHex: '#f2c94c',
        label: 'ATLAS ORIGEN',
      },
    ],
  },

  'interior-taller-alcorn': {
    id: 'interior-taller-alcorn',
    numberLabel: 'BOSQUE DE LOS SECRETOS · INTERIOR',
    name: 'Taller del Bosque de los Secretos',
    subtitle: 'Mesas de madera, osciloscopios y una misteriosa grieta en el muro norte',
    accentHex: '#8cd96c',
    floorHex: '#253528',
    floorGridHex: 'rgba(140, 217, 108, 0.1)',
    wallHex: '#111b14',
    borderHex: '#4ca64c',
    width: 760,
    height: 520,
    walkableBounds: { x: 86, y: 112, w: 588, h: 356 },
    obstacles: [
      { id: 'taller-bench-left', x: 145, y: 195, w: 140, h: 52 },
      { id: 'taller-rack-right', x: 545, y: 165, w: 96, h: 54 },
    ],
    exits: [
      {
        id: 'exit-taller-outside',
        label: 'Puerta al Bosque de los Secretos',
        actionLabel: 'Salir al Bosque',
        x: 380,
        y: 462,
        accentHex: '#8cd96c',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'workbench',
        x: 145,
        y: 195,
        w: 140,
        h: 52,
        accentHex: '#8cd96c',
        label: 'BANCO TTL',
      },
      {
        kind: 'crt-rack',
        x: 545,
        y: 165,
        w: 96,
        h: 54,
        accentHex: '#facc15',
        label: 'OSCILOSCOPIO',
      },
    ],
  },

  'secret-camara-osciloscopio': {
    id: 'secret-camara-osciloscopio',
    numberLabel: 'HABITACIÓN SECRETA',
    name: 'Cámara Oculta de 1958',
    subtitle: 'Sala sellada tras la pared falsa del Taller · Recuerdo analógico primigenio',
    accentHex: '#5cc8ff',
    floorHex: '#102235',
    floorGridHex: 'rgba(92, 200, 255, 0.12)',
    wallHex: '#07111d',
    borderHex: '#5cc8ff',
    width: 760,
    height: 460,
    walkableBounds: { x: 140, y: 118, w: 480, h: 300 },
    obstacles: [{ id: 'altar-1958-prop', x: 185, y: 160, w: 92, h: 42 }],
    exits: [
      {
        id: 'exit-secret-to-taller',
        label: 'Pasadizo de regreso al Taller',
        actionLabel: 'Volver al Taller',
        x: 380,
        y: 412,
        accentHex: '#5cc8ff',
        targetArea: 'interior-taller-alcorn',
        targetX: 380,
        targetY: 146,
      },
    ],
    decorProps: [
      {
        kind: 'oscilloscope-altar',
        x: 185,
        y: 160,
        w: 92,
        h: 42,
        accentHex: '#5cc8ff',
        label: 'BROOKHAVEN 58',
      },
    ],
  },

  'interior-templo-pioneros': {
    id: 'interior-templo-pioneros',
    numberLabel: 'PLAZA MAYOR · INTERIOR',
    name: 'Archivo de la Plaza Mayor',
    subtitle: 'Bóveda de cartuchos históricos y acertijo de baldosas de presión',
    accentHex: '#f2c94c',
    floorHex: '#2a2438',
    floorGridHex: 'rgba(242, 201, 76, 0.1)',
    wallHex: '#13101c',
    borderHex: '#f2c94c',
    width: 820,
    height: 540,
    walkableBounds: { x: 92, y: 118, w: 636, h: 372 },
    obstacles: [
      { id: 'templo-shelf-l', x: 130, y: 160, w: 120, h: 48 },
      { id: 'templo-shelf-r', x: 570, y: 160, w: 120, h: 48 },
    ],
    exits: [
      {
        id: 'exit-templo-outside',
        label: 'Puerta a la Plaza Mayor',
        actionLabel: 'Salir a la Plaza',
        x: 410,
        y: 482,
        accentHex: '#f2c94c',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-templo-losetas',
      successMessage:
        '¡Secuencia I → II → III resuelta! El Cofre Armónico del Archivo se ha desbloqueado.',
      tiles: [
        { id: 'tile-1', orderIndex: 1, label: 'I', x: 265, y: 335, accentHex: '#8cd96c' },
        { id: 'tile-3', orderIndex: 3, label: 'III', x: 410, y: 295, accentHex: '#5cc8ff' },
        { id: 'tile-2', orderIndex: 2, label: 'II', x: 555, y: 335, accentHex: '#f2c94c' },
      ],
    },
    decorProps: [
      {
        kind: 'archive-shelf',
        x: 130,
        y: 160,
        w: 120,
        h: 48,
        accentHex: '#f59e0b',
        label: 'MEMORIAS 70-74',
      },
      {
        kind: 'archive-shelf',
        x: 570,
        y: 160,
        w: 120,
        h: 48,
        accentHex: '#5cc8ff',
        label: 'MEMORIAS 75-79',
      },
    ],
  },

  'cave-gruta-cascada': {
    id: 'cave-gruta-cascada',
    numberLabel: 'CUEVA OCULTA',
    name: 'Gruta Subterránea Tras la Cascada',
    subtitle: 'Caverna húmeda oculta tras el agua · Enciende la Lámpara [L] para ver tesoros',
    accentHex: '#c084fc',
    floorHex: '#18122b',
    floorGridHex: 'rgba(192, 132, 252, 0.09)',
    wallHex: '#090614',
    borderHex: '#9d7cd8',
    width: 780,
    height: 510,
    walkableBounds: { x: 96, y: 118, w: 588, h: 356 },
    isDarkCave: true,
    obstacles: [{ id: 'cave-pool', x: 350, y: 235, w: 125, h: 72 }],
    exits: [
      {
        id: 'exit-cave-waterfall',
        label: 'Cortina de Agua · Regreso al Exterior',
        actionLabel: 'Salir por la Cascada',
        x: 390,
        y: 468,
        accentHex: '#5cc8ff',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'underground-pool',
        x: 350,
        y: 235,
        w: 125,
        h: 72,
        accentHex: '#5cc8ff',
      },
      {
        kind: 'cave-crystal',
        x: 150,
        y: 155,
        w: 36,
        h: 42,
        accentHex: '#a855f7',
      },
      {
        kind: 'cave-crystal',
        x: 620,
        y: 345,
        w: 36,
        h: 42,
        accentHex: '#5cc8ff',
      },
    ],
  },

  'interior-cronoscopio': {
    id: 'interior-cronoscopio',
    numberLabel: 'INSTALACIÓN ESPECIAL · MÁQUINA DEL TIEMPO',
    name: 'Observatorio del Cronoscopio',
    subtitle: 'Cámara abovedada donde aguarda la Máquina del Tiempo que enlaza las décadas de PIXELVERSE',
    accentHex: '#00f3ff',
    floorHex: '#101d33',
    floorGridHex: 'rgba(0, 243, 255, 0.1)',
    wallHex: '#060c18',
    borderHex: '#d8be88',
    width: 820,
    height: 540,
    walkableBounds: { x: 92, y: 118, w: 636, h: 372 },
    obstacles: [
      { id: 'chrono-core-pedestal', x: 350, y: 168, w: 120, h: 64 },
      { id: 'chrono-conduit-left', x: 140, y: 165, w: 84, h: 48 },
      { id: 'chrono-conduit-right', x: 596, y: 165, w: 84, h: 48 },
    ],
    exits: [
      {
        id: 'exit-cronoscopio-outside',
        label: 'Puerta a Las Ruinas del Primer Pulso',
        actionLabel: 'Salir a las Ruinas',
        x: 410,
        y: 482,
        accentHex: '#00f3ff',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'temporal-conduit',
        x: 140,
        y: 165,
        w: 84,
        h: 48,
        accentHex: '#f59e0b',
        label: 'PULSO 1972',
      },
      {
        kind: 'temporal-conduit',
        x: 596,
        y: 165,
        w: 84,
        h: 48,
        accentHex: '#34d399',
        label: 'ANCLA 1978',
      },
      {
        kind: 'time-machine-core',
        x: 350,
        y: 168,
        w: 120,
        h: 64,
        accentHex: '#00f3ff',
        label: 'CRONOSCOPIO',
      },
    ],
  },

  'chamber-boveda-cronoscopio': {
    id: 'chamber-boveda-cronoscopio',
    numberLabel: 'CAVERNAS DE MEMORIA · CÁMARA SECRETA',
    name: 'Cámara Abisal del Cronoscopio',
    subtitle: 'Antigua instalación subterránea tras el Portal Abisal de las Cavernas de Memoria',
    accentHex: '#c084fc',
    floorHex: '#191332',
    floorGridHex: 'rgba(192, 132, 252, 0.12)',
    wallHex: '#080514',
    borderHex: '#c084fc',
    width: 760,
    height: 480,
    walkableBounds: { x: 110, y: 118, w: 540, h: 332 },
    obstacles: [
      { id: 'boveda-conduit-l', x: 150, y: 155, w: 88, h: 46 },
      { id: 'boveda-conduit-r', x: 522, y: 155, w: 88, h: 46 },
    ],
    exits: [
      {
        id: 'exit-boveda-to-cavernas',
        label: 'Portal Abisal · Regreso a Las Cavernas de Memoria',
        actionLabel: 'Regresar a la Caverna',
        x: 380,
        y: 440,
        accentHex: '#c084fc',
        targetArea: 'exterior-70s',
        targetX: 1360,
        targetY: 544,
      },
    ],
    decorProps: [
      {
        kind: 'temporal-conduit',
        x: 150,
        y: 155,
        w: 88,
        h: 46,
        accentHex: '#c084fc',
        label: 'MEMORIA 01',
      },
      {
        kind: 'temporal-conduit',
        x: 522,
        y: 155,
        w: 88,
        h: 46,
        accentHex: '#00f3ff',
        label: 'MEMORIA 02',
      },
      {
        kind: 'cave-crystal',
        x: 285,
        y: 270,
        w: 32,
        h: 38,
        accentHex: '#00f3ff',
      },
      {
        kind: 'cave-crystal',
        x: 445,
        y: 270,
        w: 32,
        h: 38,
        accentHex: '#c084fc',
      },
    ],
  },

  'island-80s': {
    id: 'island-80s',
    numberLabel: 'NUEVA ÉPOCA HISTÓRICA · DÉCADA DE 1980',
    name: 'Isla 1980s · Muelle de las Vigas Rojas',
    subtitle: 'Siguiente etapa histórica alcanzada a través del Cronoscopio o el Muelle del Este',
    accentHex: '#f43f5e',
    floorHex: '#1b1130',
    floorGridHex: 'rgba(244, 63, 94, 0.14)',
    wallHex: '#090414',
    borderHex: '#f43f5e',
    width: 1040,
    height: 580,
    walkableBounds: { x: 90, y: 145, w: 860, h: 365 },
    obstacles: [
      { id: '80s-arch-prop', x: 430, y: 150, w: 96, h: 38 },
      { id: '80s-dk-pedestal', x: 705, y: 245, w: 72, h: 52 },
    ],
    exits: [
      {
        id: 'exit-80s-ferry',
        label: 'Navío · Regresar a la Costa de la Isla del Origen',
        actionLabel: 'Zarpar a Isla del Origen',
        x: 145,
        y: 360,
        accentHex: '#5cc8ff',
        targetArea: 'exterior-70s',
        targetX: 3215,
        targetY: 1155,
      },
      {
        id: 'exit-80s-cronoscopio',
        label: 'Ancla del Cronoscopio · Regreso Temporal a 1970s',
        actionLabel: 'Volver al Cronoscopio (70s)',
        x: 235,
        y: 185,
        accentHex: '#00f3ff',
        targetArea: 'interior-cronoscopio',
        targetX: 410,
        targetY: 315,
      },
    ],
    decorProps: [
      {
        kind: 'astral-ferry',
        x: 96,
        y: 325,
        w: 84,
        h: 46,
        accentHex: '#5cc8ff',
        label: 'NAVÍO ORIGEN',
      },
      {
        kind: 'temporal-conduit',
        x: 195,
        y: 148,
        w: 80,
        h: 32,
        accentHex: '#00f3ff',
        label: 'NEXO 1970s',
      },
      {
        kind: 'neon-arch',
        x: 430,
        y: 150,
        w: 96,
        h: 38,
        accentHex: '#f43f5e',
        label: 'SECTOR 1980',
      },
      {
        kind: 'dk-cabinet-1981',
        x: 740,
        y: 280,
        w: 64,
        h: 72,
        accentHex: '#f43f5e',
        label: '1981 ARCADE',
      },
    ],
  },
};

export const DK_CABINET_80S_INTERACT = {
  x: 740,
  y: 312,
};

export function doesCircleCollideRect(
  cx: number,
  cy: number,
  radius: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function isBlockedByExteriorBuilding(px: number, py: number): boolean {
  for (const b of ISLAND_70S_BUILDINGS) {
    if (doesCircleCollideRect(px, py, 12, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      return true;
    }
  }
  return false;
}

export function isWalkableInSubArea(
  area: SubAreaSpec,
  px: number,
  py: number
): boolean {
  const b = area.walkableBounds;
  if (px < b.x + 14 || px > b.x + b.w - 14 || py < b.y + 14 || py > b.y + b.h - 14) {
    return false;
  }
  for (const obs of area.obstacles) {
    if (doesCircleCollideRect(px, py, 13, obs)) {
      return false;
    }
  }
  return true;
}
