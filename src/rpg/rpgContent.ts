/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido estructurado RPG 2D de PIXELVERSE (Propiedad Intelectual 100% Original):
 * - Direcciones cardinales (4 direcciones)
 * - Catálogo de Objetos (llaves, piezas arcade, memorias, herramientas, reliquias, cosméticos)
 * - Sistema de Misiones con objetivos verificables y recompensas reales
 * - Interiores accesibles, pasadizos tras cascadas, cámaras tras paredes falsas
 * - Expansión jugable hacia «Isla Neón 1980s: Muelle de las Vigas Rojas»
 */

import { PixelAbilityId, PixelverseProgressState } from '../memories/progressionState';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export type RpgAreaId =
  | 'exterior-70s'
  | 'interior-taller-alcorn'
  | 'secret-camara-osciloscopio'
  | 'interior-templo-pioneros'
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
  x: number;
  y: number;
  w: number;
  h: number;
  roofHex: string;
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
      | 'astral-ferry';
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
    name: 'Bitácora del Reinicio Cero',
    category: 'cinta-memoria',
    categoryLabel: 'CRÓNICA CLAVE',
    accentHex: '#38bdf8',
    shortCode: 'BIT-00',
    description:
      'Cuaderno digital de campo de Pixel. Registra pistas ambientales, coordenadas de portales y resonancias de las islas.',
    usageHint: 'Inspecciona pistas clave para descubrir muros falsos y pasajes tras cascadas.',
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
      'Farol catódico alimentado por el pulso de 1972. Disipa la penumbra densa en grutas subterráneas y revela cofres ocultos en la oscuridad.',
    usageHint: 'Pulsa [USAR] o la tecla [L] para encender/apagar el halo lumínico alrededor de Pixel.',
    usableAction: 'lantern',
    grantsAbility: 'phosphor-lantern',
  },
  'item-escaner-frecuencias': {
    id: 'item-escaner-frecuencias',
    name: 'Escáner de Secretos TTL',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#00f3ff',
    shortCode: 'SCN-74',
    description:
      'Emite una onda armónica que detecta grietas en paredes falsas, cofres sin abrir, losetas de presión y pasajes ocultos cercanos.',
    usageHint: 'Pulsa [USAR] o la tecla [R] durante la exploración para emitir un pulso de radar.',
    usableAction: 'scanner',
    grantsAbility: 'secret-scanner',
  },
  'item-soldador-logico': {
    id: 'item-soldador-logico',
    name: 'Soldador Lógico de Precisión',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#10b981',
    shortCode: 'SLD-76',
    description:
      'Herramienta maestra forjada en el Taller Analógico. Permite reparar terminales averiados y activar relés de puentes antiguos.',
    usageHint: 'Acércate a un mecanismo dañado y pulsa [E] o úsalo desde el inventario.',
    usableAction: 'welder',
    grantsAbility: 'circuit-welder',
  },
  'item-condensador-cuarzo': {
    id: 'item-condensador-cuarzo',
    name: 'Condensador de Cuarzo Puro',
    category: 'pieza-arcade',
    categoryLabel: 'PIEZA DE MÁQUINA ARCADE',
    accentHex: '#a855f7',
    shortCode: 'CAP-QZ',
    description:
      'Componente de alta estabilidad cristalizado en las Cavernas del Código. Capaz de regular fuentes de video analógicas.',
    usageHint: 'Entrégaselo al Maestro Kertz en el Taller de Circuitos Analógicos.',
    usableAction: 'inspect',
  },
  'item-cinta-alfa': {
    id: 'item-cinta-alfa',
    name: 'Cinta Magnética Alfa (1971)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#34d399',
    shortCode: 'TAP-A1',
    description:
      'Carrete de datos recuperado en la Costa Sur. Conserva trazas de las primeras máquinas recreativas operadas con monedas.',
    usageHint: 'Llévala a la Archivera Lira en el Templo del Archivo Pionero.',
    usableAction: 'inspect',
  },
  'item-cinta-beta': {
    id: 'item-cinta-beta',
    name: 'Cinta Magnética Beta (1975)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#fbbf24',
    shortCode: 'TAP-B2',
    description:
      'Carrete oculto tras la cortina de agua de la Garganta. Documenta la transición de lógica discreta a microprocesadores.',
    usageHint: 'Llévala a la Archivera Lira en el Templo del Archivo Pionero.',
    usableAction: 'inspect',
  },
  'item-llave-binaria': {
    id: 'item-llave-binaria',
    name: 'Llave Binaria de 8 Pines',
    category: 'llave',
    categoryLabel: 'LLAVE ANTIGUA',
    accentHex: '#f59e0b',
    shortCode: 'KEY-08',
    description:
      'Llave metálica codificada con muescas 01011010. Abre cerraduras de seguridad en cofres de archivo y cámaras selladas.',
    usageHint: 'Se utiliza automáticamente al interactuar con cofres sellados con cerradura binaria.',
    usableAction: 'inspect',
  },
  'item-reliquia-osciloscopio': {
    id: 'item-reliquia-osciloscopio',
    name: 'Válvula de Osciloscopio 1958',
    category: 'reliquia',
    categoryLabel: 'RELIQUIA FUNDACIONAL',
    accentHex: '#22d3ee',
    shortCode: 'REL-58',
    description:
      'Tubo de vacío luminiscente resguardado tras el muro secreto del Taller. Aún proyecta una diminuta trayectoria parabólica.',
    usageHint: 'Muéstrasela al Ermitaño del Bit Cero en la Gruta tras la Cascada.',
    usableAction: 'inspect',
  },
  'item-pase-astral-80s': {
    id: 'item-pase-astral-80s',
    name: 'Carta Náutica · Isla Neón 1980s',
    category: 'llave',
    categoryLabel: 'PASE INTER-ISLAS',
    accentHex: '#f43f5e',
    shortCode: 'NAV-80',
    description:
      'Coordenadas estelares desbloqueadas al superar 1.000 puntos en Space Invaders. Habilita el Navío Astral del Puerto.',
    usageHint: 'Ve al Puerto de las Islas Perdidas (Zona 09) y aborda el Navío hacia los años 80.',
    usableAction: 'inspect',
  },
  'item-visor-vectorial': {
    id: 'item-visor-vectorial',
    name: 'Visor Vectorial Cian',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#00f3ff',
    shortCode: 'VIS-VX',
    description:
      'Lentes de línea vectorial luminosa inspirados en monitores XY clásicos. Modifica el aspecto de Pixel en tiempo real.',
    usageHint: 'Pulsa [EQUIPAR] en el inventario para lucir el visor sobre tu personaje.',
    usableAction: 'equip-cosmetic',
  },
  'item-manto-arquitecto': {
    id: 'item-manto-arquitecto',
    name: 'Corona Estelar del Descubridor',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#fde047',
    shortCode: 'CRN-70',
    description:
      'Diadema dorada de píxeles puros otorgada a quienes desentrañan los secretos ocultos tras cascadas y muros antiguos.',
    usageHint: 'Pulsa [EQUIPAR] en el inventario para activar su destello real sobre Pixel.',
    usableAction: 'equip-cosmetic',
  },
  'item-insignia-vigas-1981': {
    id: 'item-insignia-vigas-1981',
    name: 'Emblema de las Vigas Rojas (1981)',
    category: 'reliquia',
    categoryLabel: 'TROFEO DE DÉCADA 80s',
    accentHex: '#fb7185',
    shortCode: 'EMB-81',
    description:
      'Sello conmemorativo obtenido al conquistar la torre de vigas y barriles en el gabinete de la Isla Neón 1980s.',
    usageHint: 'Acredita la expansión de PIXELVERSE hacia la era dorada de 1981.',
    usableAction: 'inspect',
  },
};

/* ============================================================================
   2. SISTEMA DE MISIONES (PRINCIPALES, SECUNDARIAS Y SECRETAS)
   ============================================================================ */
export const RPG_QUESTS: RpgQuestSpec[] = [
  {
    id: 'quest-pulso-1972',
    code: 'MIS-01',
    title: 'El Pulso Dorado de 1972',
    giverName: 'Bit-01 · El Faro Antiguo',
    decadeTag: 'HISTORIA PRINCIPAL · 1972',
    accentHex: '#facc15',
    summary:
      'Viaja al sureste de la Gran Isla hasta el Santuario de Pong y alcanza 1.000 puntos para reactivar el primer latido arcade y volar hacia la Garganta.',
    steps: [
      {
        label: 'Explorar el Bosque de los Circuitos y las Ruinas Centrales',
        isDone: (st, all) =>
          all ||
          st.island70s.visitedZones.includes('ruinas-primer-arcade') ||
          Boolean(st.games['pong']?.memoryUnlocked),
      },
      {
        label: 'Alcanzar 1.000 puntos en el gabinete Pong (1972) y volar en la barra',
        isDone: (st, all) => all || Boolean(st.games['pong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Tabla Voladora de Pong + Lámpara de Fósforo Ámbar',
    rewardItemIds: ['item-lampara-fosforo'],
  },
  {
    id: 'quest-taller-ttl',
    code: 'MIS-02',
    title: 'El Condensador de Cuarzo',
    giverName: 'Maestro Kertz · Taller Analógico',
    decadeTag: 'SECUNDARIA · INGENIERÍA',
    accentHex: '#10b981',
    summary:
      'El Maestro Kertz necesita un Condensador de Cuarzo Puro de las Cavernas del Código para calibrar su banco de pruebas y forjarte un Soldador Lógico.',
    steps: [
      {
        label: 'Hablar con el Maestro Kertz dentro del Taller Analógico (Bosque)',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-maestro-kertz') ||
          st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
      {
        label: 'Obtener el Condensador de Cuarzo en el cofre de las Cavernas del Código',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-condensador-cuarzo'),
      },
      {
        label: 'Entregar el condensador al Maestro Kertz en el Taller',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
    ],
    rewardSummary: 'Soldador Lógico de Precisión (Habilidad para reparar mecanismos)',
    rewardItemIds: ['item-soldador-logico'],
  },
  {
    id: 'quest-archivo-cartuchos',
    code: 'MIS-03',
    title: 'Las Cintas Perdidas del Archivo',
    giverName: 'Archivera Lira · Templo Pionero',
    decadeTag: 'SECUNDARIA · DESCUBRIMIENTO',
    accentHex: '#00f3ff',
    summary:
      'Recupera las dos Cintas Magnéticas dispersas en cofres de la isla y resuelve la secuencia de losetas I-II-III en el Templo para obtener el Escáner de Secretos.',
    steps: [
      {
        label: 'Recuperar la Cinta Magnética Alfa (Cofre de la Cala Costera)',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-alfa'),
      },
      {
        label: 'Recuperar la Cinta Magnética Beta (Gruta tras la Cascada)',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-beta'),
      },
      {
        label: 'Resolver el enigma de losetas de presión (I → II → III) o informar a Lira',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-templo-losetas') ||
          st.rpg.questStates['quest-archivo-cartuchos'] === 'completed',
      },
    ],
    rewardSummary: 'Escáner de Secretos TTL [R] (Detecta paredes falsas y cofres)',
    rewardItemIds: ['item-escaner-frecuencias'],
  },
  {
    id: 'quest-secreto-cascada',
    code: 'MIS-04',
    title: 'El Secreto Tras la Cascada',
    giverName: 'Ermitaño del Bit Cero',
    decadeTag: 'MISIÓN SECRETA · EXPLORACIÓN',
    accentHex: '#a855f7',
    summary:
      'Descubre el muro falso dentro del Taller Analógico para hallar la Válvula de 1958 y llévasela al Ermitaño oculto detrás de la cascada norte.',
    steps: [
      {
        label: 'Descubrir la Cámara Oculta de 1958 tras el muro falso del Taller',
        isDone: (st, all) =>
          all || st.rpg.discoveredSecretIds.includes('secret-muro-taller'),
      },
      {
        label: 'Obtener la Válvula de Osciloscopio 1958 en el cofre secreto',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-reliquia-osciloscopio'),
      },
      {
        label: 'Cruzar la cascada norte con luz y entregar la reliquia al Ermitaño',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-secreto-cascada'] === 'completed',
      },
    ],
    rewardSummary: 'Corona Estelar del Descubridor (Cosmético equipable)',
    rewardItemIds: ['item-manto-arquitecto'],
  },
  {
    id: 'quest-defensa-1978',
    code: 'MIS-05',
    title: 'Escudo Estelar de 1978',
    giverName: 'Cronista Ámbar & Guardián',
    decadeTag: 'HISTORIA PRINCIPAL · 1978',
    accentHex: '#39ff14',
    summary:
      'Reconstruye el Puente Astral en El Sendero del Glitch Perdido y supera los 1.000 puntos en Space Invaders para abrir la ruta marítima a la Isla 1980s.',
    steps: [
      {
        label: 'Superar El Sendero del Glitch Perdido para tender el Puente Astral',
        isDone: (st, all) => all || st.island70s.glitchTrailCompleted,
      },
      {
        label: 'Alcanzar 1.000 puntos reales en Space Invaders (1978)',
        isDone: (st, all) => all || Boolean(st.games['space-invaders']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Nave Estelar PIXELVERSE + Ruta desbloqueada a Isla Neón 1980s',
    rewardItemIds: ['item-pase-astral-80s'],
  },
  {
    id: 'quest-despertar-1981',
    code: 'MIS-06',
    title: 'Travesía a las Vigas de Neón (1981)',
    giverName: 'Capitana Vectoria · Puerto 80s',
    decadeTag: 'EXPANSIÓN INTER-ISLAS · 1980s',
    accentHex: '#f43f5e',
    summary:
      'Zarpa desde el Puerto de las Islas Perdidas hacia la Isla Neón de los años 80 y restaura el gabinete clásico de plataformas verticales de 1981.',
    steps: [
      {
        label: 'Viajar en el Navío Astral desde el Puerto Este hacia la Isla Neón 1980s',
        isDone: (st, all) =>
          all ||
          st.rpg.discoveredSecretIds.includes('visited-island-80s') ||
          Boolean(st.games['donkey-kong']?.memoryUnlocked),
      },
      {
        label: 'Superar el desafío vertical del gabinete de 1981 en el Paseo Neón',
        isDone: (st, all) => all || Boolean(st.games['donkey-kong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Emblema de las Vigas Rojas (1981)',
    rewardItemIds: ['item-insignia-vigas-1981'],
  },
];

/* ============================================================================
   3. EDIFICIOS EXTERIORES CON COLISIÓN FÍSICA Y PUERTAS ACCESIBLES (ISLA 70s)
   ============================================================================ */
export const ISLAND_70S_BUILDINGS: ExteriorBuildingSpec[] = [
  {
    id: 'bldg-taller-alcorn',
    name: 'Taller de Circuitos Analógicos',
    subtitle: 'Laboratorio de placas TTL y osciloscopios',
    x: 948,
    y: 938,
    w: 148,
    h: 88,
    roofHex: '#047857',
    wallHex: '#1e293b',
    trimHex: '#34d399',
    signText: 'TALLER TTL',
    doorX: 1022,
    doorY: 1028,
    targetArea: 'interior-taller-alcorn',
    targetSpawnX: 380,
    targetSpawnY: 438,
    returnExteriorX: 1022,
    returnExteriorY: 1054,
  },
  {
    id: 'bldg-templo-pioneros',
    name: 'Templo del Archivo Pionero',
    subtitle: 'Bóveda de crónicas, cintas y losetas armónicas',
    x: 1852,
    y: 1094,
    w: 168,
    h: 92,
    roofHex: '#b45309',
    wallHex: '#1e293b',
    trimHex: '#fbbf24',
    signText: 'ARCHIVO 70s',
    doorX: 1936,
    doorY: 1188,
    targetArea: 'interior-templo-pioneros',
    targetSpawnX: 410,
    targetSpawnY: 462,
    returnExteriorX: 1936,
    returnExteriorY: 1216,
  },
];

/* Pasaje secreto tras la cascada en La Garganta del Invasor */
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

/* Embarcadero Astral hacia la Isla Neón 1980s en el Puerto del Este */
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

/* Mecanismo averiado reparable con el Soldador Lógico en las Ruinas Sur */
export const BROKEN_RELAY_MECHANISM = {
  id: 'mech-ruinas-puente',
  label: 'Relé Auxiliar del Puente Costero',
  x: 1745,
  y: 1618,
  accentHex: '#10b981',
};

/* ============================================================================
   4. COFRES PERSISTENTES REPARTIDOS EN EL MUNDO, CUEVAS Y SALAS SECRETAS
   ============================================================================ */
export const RPG_CHESTS: RpgChestSpec[] = [
  {
    id: 'chest-costa-cala',
    areaId: 'exterior-70s',
    label: 'Cofre del Náufrago Binario',
    x: 248,
    y: 1925,
    accentHex: '#38bdf8',
    rewardItemIds: ['item-cinta-alfa'],
  },
  {
    id: 'chest-caverna-cuarzo',
    areaId: 'exterior-70s',
    label: 'Cofre de Cuarzo Hexadecimal',
    x: 615,
    y: 425,
    accentHex: '#a855f7',
    rewardItemIds: ['item-condensador-cuarzo'],
  },
  {
    id: 'chest-secreto-1958',
    areaId: 'secret-camara-osciloscopio',
    label: 'Arca Fundacional de 1958',
    x: 380,
    y: 175,
    accentHex: '#22d3ee',
    rewardItemIds: ['item-reliquia-osciloscopio', 'item-llave-binaria'],
  },
  {
    id: 'chest-templo-boveda',
    areaId: 'interior-templo-pioneros',
    label: 'Cofre Armónico del Archivo',
    x: 410,
    y: 158,
    accentHex: '#00f3ff',
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
    id: 'chest-80s-callejon',
    areaId: 'island-80s',
    label: 'Cofre Neón del Callejón 1980',
    x: 865,
    y: 185,
    accentHex: '#f43f5e',
    rewardItemIds: ['item-visor-vectorial'],
    requiresItemId: 'item-llave-binaria',
  },
];

/* ============================================================================
   5. OBJETOS EXAMINABLES, PISTAS Y PAREDES FALSAS
   ============================================================================ */
export const RPG_EXAMINABLES: RpgExaminableSpec[] = [
  {
    id: 'exam-monolito-costa',
    areaId: 'exterior-70s',
    label: 'Inscripción del Monolito Cero',
    actionLabel: 'Examinar Grabado',
    x: 402,
    y: 1785,
    accentHex: '#38bdf8',
    category: 'INSCRIPCIÓN ANTIGUA · PISTA DE EXPLORADOR',
    paragraphs: [
      '«Tres secretos aguardan a los curiosos del Archipiélago Cero: una grieta fría en el muro norte del Taller Analógico, una gruta oculta tras el velo de agua en la Garganta y tres losetas numeradas en el Archivo.»',
    ],
    hint: 'Explora los edificios de madera y piedra usando [E] frente a sus puertas.',
    secretIdToDiscover: 'clue-monolito-cero',
  },
  {
    id: 'exam-banco-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Planos de Lógica Discreta (1972)',
    actionLabel: 'Leer Planos',
    x: 215,
    y: 265,
    accentHex: '#34d399',
    category: 'DOCUMENTO TÉCNICO · TALLER TTL',
    paragraphs: [
      'Diagramas originales trazados a mano: contadores síncronos 74LS y generadores de pulso horizontal sin una sola línea de código ni microprocesador.',
      'Una nota al margen dice: «Sentí una corriente de aire detrás del ladrillo agrietado del muro norte... como si resguardara el viejo laboratorio de 1958».',
    ],
    hint: 'Inspecciona el centro del muro norte del Taller con [E] o usa el Escáner [R].',
  },
  {
    id: 'exam-muro-falso-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Muro Norte con Ladrillos Huecos',
    actionLabel: 'Examinar Grieta Sospechosa',
    x: 380,
    y: 108,
    accentHex: '#22d3ee',
    category: 'DESCUBRIMIENTO · PARED FALSA',
    paragraphs: [
      '¡Los ladrillos ceden con un chasquido mecánico! Detrás del panel de mantenimiento se abre un pasadizo secreto hacia la Cámara Oculta de 1958.',
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
    accentHex: '#22d3ee',
    category: ' CÁMARA SECRETA · MEMORIA PROFUNDA',
    paragraphs: [
      'Un tubo de rayos catódicos redondo muestra un destello verde rebotando sobre una red central. Aquí nació la chispa experimental catorce años antes de los salones recreativos.',
    ],
    hint: 'El Ermitaño que medita detrás de la cascada norte busca una válvula original de esta sala.',
  },
  {
    id: 'exam-estela-templo',
    areaId: 'interior-templo-pioneros',
    label: 'Códice Tallado de Secuencia Armónica',
    actionLabel: 'Leer Estela',
    x: 195,
    y: 235,
    accentHex: '#fbbf24',
    category: 'ACERTIJO DEL ARCHIVO · PISTA DE LOSETAS',
    paragraphs: [
      '«Camina sobre los tres nodos del suelo respetando el orden cronológico del cosmos: primero el Alba Analógica (I · Izquierda), luego el Pulso Dorado (II · Derecha) y finalmente el Cenit Cian (III · Centro).»',
    ],
    hint: 'Pisa las tres baldosas cuadradas en orden I → II → III para desbloquear el cofre superior.',
  },
  {
    id: 'exam-cartel-80s',
    areaId: 'island-80s',
    label: 'Marquesina Luminosa · Bienvenida a 1980s',
    actionLabel: 'Leer Marquesina',
    x: 475,
    y: 205,
    accentHex: '#f43f5e',
    category: 'ARCHIPIÉLAGO EXPANDIDO · ISLA NEÓN 1980s',
    paragraphs: [
      '¡Bienvenido al Muelle de las Vigas Rojas! Con la década de 1970 estabilizada, las brumas temporales retrocedieron revelando la primera costa jugable de los años 80.',
      'Al este brilla el gabinete original de plataformas verticales de 1981, y en el callejón noreste aguarda un cofre con cerradura binaria de 8 pines.',
    ],
    hint: 'Usa la Llave Binaria hallada en la Cámara Secreta de 1958 para abrir el cofre del callejón.',
  },
];

/* ============================================================================
   6. PERSONAJES ORIGINALES EN INTERIORES, CUEVAS E ISLA 80s
   ============================================================================ */
export const RPG_SUBAREA_NPCS: RpgSubAreaNpcSpec[] = [
  {
    id: 'npc-maestro-kertz',
    areaId: 'interior-taller-alcorn',
    name: 'Maestro Kertz · Ingeniero TTL',
    role: 'Artesano de Circuitos Discretos',
    x: 525,
    y: 255,
    facing: 'down',
    palette: { primary: '#10b981', secondary: '#fbbf24', glow: '#34d399' },
    pitch: 0.88,
  },
  {
    id: 'npc-archivera-lira',
    areaId: 'interior-templo-pioneros',
    name: 'Archivera Lira',
    role: 'Custodia de las Cintas Magnéticas',
    x: 615,
    y: 265,
    facing: 'left',
    palette: { primary: '#0284c7', secondary: '#fde047', glow: '#38bdf8' },
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
    palette: { primary: '#9333ea', secondary: '#e0f2fe', glow: '#c084fc' },
    pitch: 0.76,
  },
  {
    id: 'npc-capitana-vectoria',
    areaId: 'island-80s',
    name: 'Capitana Vectoria',
    role: 'Navegante del Paseo Neón 1980s',
    x: 355,
    y: 315,
    facing: 'down',
    palette: { primary: '#e11d48', secondary: '#22d3ee', glow: '#fb7185' },
    pitch: 1.05,
  },
];

/* ============================================================================
   7. DEFINICIÓN ESPACIAL DE INTERIORES, CUEVAS, SALAS SECRETAS E ISLA 80s
   ============================================================================ */
export const SUB_AREAS: Record<Exclude<RpgAreaId, 'exterior-70s'>, SubAreaSpec> = {
  'interior-taller-alcorn': {
    id: 'interior-taller-alcorn',
    numberLabel: 'INTERIOR 01',
    name: 'Taller de Circuitos Analógicos',
    subtitle: 'Mesas de soldadura, osciloscopios y un extraño aire frío en el muro norte',
    accentHex: '#34d399',
    floorHex: '#132421',
    floorGridHex: 'rgba(52, 211, 153, 0.11)',
    wallHex: '#0b1518',
    borderHex: '#10b981',
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
        label: 'Puerta al Bosque de los Circuitos',
        actionLabel: 'Salir al Exterior',
        x: 380,
        y: 462,
        accentHex: '#34d399',
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
        accentHex: '#34d399',
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
    numberLabel: 'SALA SECRETA',
    name: 'Cámara Oculta de 1958',
    subtitle: 'Santuario sellado tras el muro falso · Memoria analógica primigenia',
    accentHex: '#22d3ee',
    floorHex: '#0c1c2c',
    floorGridHex: 'rgba(34, 211, 238, 0.14)',
    wallHex: '#060e18',
    borderHex: '#00f3ff',
    width: 760,
    height: 460,
    walkableBounds: { x: 140, y: 118, w: 480, h: 300 },
    obstacles: [{ id: 'altar-1958-prop', x: 185, y: 160, w: 92, h: 42 }],
    exits: [
      {
        id: 'exit-secret-to-taller',
        label: 'Pasadizo hacia el Taller Analógico',
        actionLabel: 'Volver al Taller',
        x: 380,
        y: 412,
        accentHex: '#22d3ee',
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
        accentHex: '#22d3ee',
        label: 'BROOKHAVEN 58',
      },
    ],
  },

  'interior-templo-pioneros': {
    id: 'interior-templo-pioneros',
    numberLabel: 'INTERIOR 02',
    name: 'Templo del Archivo Pionero',
    subtitle: 'Bóveda de cintas históricas y cámara del mecanismo armónico',
    accentHex: '#fbbf24',
    floorHex: '#1b1d30',
    floorGridHex: 'rgba(251, 191, 36, 0.10)',
    wallHex: '#0e101d',
    borderHex: '#f59e0b',
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
        label: 'Portón a Las Ruinas del Primer Arcade',
        actionLabel: 'Salir a la Plaza',
        x: 410,
        y: 482,
        accentHex: '#fbbf24',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-templo-losetas',
      successMessage:
        '¡Secuencia I → II → III completada! El sello magnético del Cofre Armónico se ha abierto.',
      tiles: [
        { id: 'tile-1', orderIndex: 1, label: 'I', x: 265, y: 335, accentHex: '#34d399' },
        { id: 'tile-3', orderIndex: 3, label: 'III', x: 410, y: 295, accentHex: '#00f3ff' },
        { id: 'tile-2', orderIndex: 2, label: 'II', x: 555, y: 335, accentHex: '#facc15' },
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
        label: 'CINTAS 70-74',
      },
      {
        kind: 'archive-shelf',
        x: 570,
        y: 160,
        w: 120,
        h: 48,
        accentHex: '#38bdf8',
        label: 'CINTAS 75-79',
      },
    ],
  },

  'cave-gruta-cascada': {
    id: 'cave-gruta-cascada',
    numberLabel: 'GRUTA OCULTA',
    name: 'Gruta Subterránea Tras la Cascada',
    subtitle: 'Caverna húmeda de bioluminiscencia tenue · Usa la Lámpara [L] para ver secretos',
    accentHex: '#c084fc',
    floorHex: '#120d26',
    floorGridHex: 'rgba(192, 132, 252, 0.09)',
    wallHex: '#070412',
    borderHex: '#a855f7',
    width: 780,
    height: 510,
    walkableBounds: { x: 96, y: 118, w: 588, h: 356 },
    isDarkCave: true,
    obstacles: [{ id: 'cave-pool', x: 350, y: 235, w: 125, h: 72 }],
    exits: [
      {
        id: 'exit-cave-waterfall',
        label: 'Cortina de Agua · Regreso a La Garganta',
        actionLabel: 'Cruzar Cascada al Exterior',
        x: 390,
        y: 468,
        accentHex: '#38bdf8',
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
        accentHex: '#00f3ff',
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
        accentHex: '#22d3ee',
      },
    ],
  },

  'island-80s': {
    id: 'island-80s',
    numberLabel: 'ISLA EXPANDIDA · 1980s',
    name: 'Isla Neón 1980s · Muelle de las Vigas Rojas',
    subtitle: 'Primer sector desbloqueado de la nueva década · Hogar del gabinete vertical de 1981',
    accentHex: '#f43f5e',
    floorHex: '#180d2b',
    floorGridHex: 'rgba(244, 63, 94, 0.16)',
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
        label: 'Navío Astral · Regresar al Puerto de los 70',
        actionLabel: 'Zarpar a Isla 70s',
        x: 145,
        y: 360,
        accentHex: '#38bdf8',
        targetArea: 'exterior-70s',
        targetX: 3215,
        targetY: 1155,
      },
    ],
    decorProps: [
      {
        kind: 'astral-ferry',
        x: 96,
        y: 325,
        w: 84,
        h: 46,
        accentHex: '#38bdf8',
        label: 'NAVÍO 70s',
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
