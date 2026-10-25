/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Datos espaciales, zonas interconectadas, NPCs, Sombras del Pasado,
 * Diamantes de Memoria e hitos interactivos de:
 * «LA GRAN ISLA DE LOS 70: EL ORIGEN DEL UNIVERSO ARCADE (ARCHIPIÉLAGO CERO)»
 */

export const ISLAND_WORLD_W = 3640;
export const ISLAND_WORLD_H = 2240;

export type IslandZoneId =
  | 'costa-despertar'
  | 'bosque-circuitos'
  | 'ruinas-primer-arcade'
  | 'santuario-pong'
  | 'garganta-invasor'
  | 'fortaleza-oleadas'
  | 'cavernas-codigo'
  | 'cumbre-arquitecto'
  | 'puerto-islas-perdidas';

export interface WalkableRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zoneId: IslandZoneId;
  surface: 'sand' | 'grass' | 'circuit' | 'stone' | 'crystal' | 'bridge' | 'fortress' | 'pier';
  requiresCondition?: 'south-shortcut' | 'garganta-bridge';
}

export interface IslandZoneMeta {
  id: IslandZoneId;
  numberLabel: string;
  name: string;
  subtitle: string;
  accentHex: string;
  ambientTint: string;
  mapCenter: { x: number; y: number };
}

export interface IslandNpcSpec {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  palette: { primary: string; secondary: string; glow: string };
  pitch: number;
  linesInitial: string[];
  linesAfterPong?: string[];
  linesAfterInvaders?: string[];
}

export interface IslandEchoSpec {
  id: string;
  year: number;
  title: string;
  pioneer: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  accentHex: string;
  motif: 'oscilloscope' | 'pdp1-star' | 'rocket-cabinet';
  loreText: string;
  gameplayHint: string;
}

export interface IslandDiamondSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  requiresSwitchId?: string;
  requiresShortcut?: boolean;
}

export interface IslandSwitchSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  accentHex: string;
  descriptionOnActivate: string;
}

export interface DistantDecadeVistaSpec {
  id: string;
  decadeLabel: string;
  title: string;
  x: number;
  y: number;
  accentHex: string;
  statusText: string;
  unlockRequirement: string;
  lorePreview: string;
}

export const ISLAND_ZONES: Record<IslandZoneId, IslandZoneMeta> = {
  'costa-despertar': {
    id: 'costa-despertar',
    numberLabel: 'ZONA 01',
    name: 'La Costa del Despertar',
    subtitle: 'Playa de espuma binaria y monolitos del Reinicio Cero',
    accentHex: '#38bdf8',
    ambientTint: 'rgba(14, 165, 233, 0.08)',
    mapCenter: { x: 540, y: 1820 },
  },
  'bosque-circuitos': {
    id: 'bosque-circuitos',
    numberLabel: 'ZONA 02',
    name: 'El Bosque de los Circuitos',
    subtitle: 'Árboles de silicio luminiscente, pulsos de fósforo y senderos ocultos',
    accentHex: '#10b981',
    ambientTint: 'rgba(16, 185, 129, 0.08)',
    mapCenter: { x: 980, y: 1280 },
  },
  'ruinas-primer-arcade': {
    id: 'ruinas-primer-arcade',
    numberLabel: 'ZONA 03',
    name: 'Las Ruinas del Primer Arcade',
    subtitle: 'Columnas catódicas y mosaicos fundacionales de la década de 1970',
    accentHex: '#f59e0b',
    ambientTint: 'rgba(245, 158, 11, 0.07)',
    mapCenter: { x: 1860, y: 1340 },
  },
  'santuario-pong': {
    id: 'santuario-pong',
    numberLabel: 'ZONA 04',
    name: 'El Santuario de Pong',
    subtitle: 'Terraza dorada de 1972 · Hogar del gabinete amarillo original',
    accentHex: '#facc15',
    ambientTint: 'rgba(250, 204, 21, 0.09)',
    mapCenter: { x: 2780, y: 1680 },
  },
  'garganta-invasor': {
    id: 'garganta-invasor',
    numberLabel: 'ZONA 05',
    name: 'La Garganta del Invasor',
    subtitle: 'Cañón de cascadas estelares · Umbral del Sendero del Glitch Perdido',
    accentHex: '#00f3ff',
    ambientTint: 'rgba(0, 243, 255, 0.08)',
    mapCenter: { x: 1880, y: 720 },
  },
  'fortaleza-oleadas': {
    id: 'fortaleza-oleadas',
    numberLabel: 'ZONA 06',
    name: 'La Fortaleza de las Oleadas',
    subtitle: 'Bastión defensivo de 1978 · Gabinete Space Invaders y Plataforma Estelar',
    accentHex: '#39ff14',
    ambientTint: 'rgba(57, 255, 20, 0.07)',
    mapCenter: { x: 2820, y: 680 },
  },
  'cavernas-codigo': {
    id: 'cavernas-codigo',
    numberLabel: 'ZONA 07',
    name: 'Las Cavernas del Código',
    subtitle: 'Gruta subterránea de cuarzo cian, ecos ocultos y cristales de memoria',
    accentHex: '#a855f7',
    ambientTint: 'rgba(168, 85, 247, 0.12)',
    mapCenter: { x: 600, y: 580 },
  },
  'cumbre-arquitecto': {
    id: 'cumbre-arquitecto',
    numberLabel: 'ZONA 08',
    name: 'La Cumbre del Arquitecto',
    subtitle: 'Santuario lunar y Astrolabio de las Eras sobre el horizonte cósmico',
    accentHex: '#e0f2fe',
    ambientTint: 'rgba(224, 242, 254, 0.09)',
    mapCenter: { x: 1960, y: 290 },
  },
  'puerto-islas-perdidas': {
    id: 'puerto-islas-perdidas',
    numberLabel: 'ZONA 09',
    name: 'El Puerto de las Islas Perdidas',
    subtitle: 'Muelle astral frente a las islas bloqueadas de los años 80, 90 y el futuro',
    accentHex: '#f472b6',
    ambientTint: 'rgba(244, 114, 182, 0.08)',
    mapCenter: { x: 3280, y: 1180 },
  },
};

/**
 * Regiones caminables solapadas que conforman la geografía continua de la Gran Isla de los 70.
 * Ninguna transición deja a Pixel fuera de terreno válido.
 */
export const ISLAND_WALKABLE_RECTS: WalkableRect[] = [
  // 1. La Costa del Despertar
  { id: 'costa-main', x: 220, y: 1620, w: 680, h: 420, zoneId: 'costa-despertar', surface: 'sand' },
  { id: 'costa-cove', x: 200, y: 1880, w: 320, h: 210, zoneId: 'costa-despertar', surface: 'sand' },
  { id: 'costa-to-bosque', x: 700, y: 1440, w: 280, h: 260, zoneId: 'costa-despertar', surface: 'grass' },

  // 2. El Bosque de los Circuitos
  { id: 'bosque-main', x: 560, y: 1000, w: 860, h: 520, zoneId: 'bosque-circuitos', surface: 'circuit' },
  { id: 'bosque-glade', x: 760, y: 920, w: 480, h: 160, zoneId: 'bosque-circuitos', surface: 'grass' },
  { id: 'bosque-to-caverna', x: 480, y: 740, w: 240, h: 320, zoneId: 'bosque-circuitos', surface: 'stone' },
  { id: 'bosque-to-ruinas', x: 1360, y: 1180, w: 220, h: 260, zoneId: 'bosque-circuitos', surface: 'circuit' },

  // Puente opcional reconstruible entre Costa / Bosque Sur y Ruinas
  {
    id: 'puente-atajo-sur',
    x: 860,
    y: 1640,
    w: 720,
    h: 110,
    zoneId: 'ruinas-primer-arcade',
    surface: 'bridge',
    requiresCondition: 'south-shortcut',
  },

  // 3. Las Ruinas del Primer Arcade
  { id: 'ruinas-plaza', x: 1500, y: 1080, w: 760, h: 520, zoneId: 'ruinas-primer-arcade', surface: 'stone' },
  { id: 'ruinas-south-terrace', x: 1500, y: 1540, w: 420, h: 180, zoneId: 'ruinas-primer-arcade', surface: 'stone' },
  { id: 'ruinas-to-pong', x: 2180, y: 1380, w: 300, h: 240, zoneId: 'ruinas-primer-arcade', surface: 'stone' },
  { id: 'ruinas-to-garganta', x: 1760, y: 840, w: 260, h: 280, zoneId: 'ruinas-primer-arcade', surface: 'stone' },

  // 4. El Santuario de Pong
  { id: 'pong-sanctuary-main', x: 2400, y: 1440, w: 720, h: 480, zoneId: 'santuario-pong', surface: 'circuit' },
  { id: 'pong-secret-balcony', x: 2980, y: 1720, w: 240, h: 240, zoneId: 'santuario-pong', surface: 'stone' },

  // 7. Las Cavernas del Código
  { id: 'cavernas-main', x: 240, y: 360, w: 720, h: 440, zoneId: 'cavernas-codigo', surface: 'crystal' },
  { id: 'cavernas-east-tunnel', x: 920, y: 580, w: 640, h: 150, zoneId: 'cavernas-codigo', surface: 'crystal' },

  // 5. La Garganta del Invasor (Borde Oeste + Puente Astral)
  { id: 'garganta-west-rim', x: 1520, y: 560, w: 580, h: 340, zoneId: 'garganta-invasor', surface: 'stone' },
  {
    id: 'puente-astral-garganta',
    x: 2060,
    y: 620,
    w: 390,
    h: 130,
    zoneId: 'garganta-invasor',
    surface: 'bridge',
    requiresCondition: 'garganta-bridge',
  },

  // 6. La Fortaleza de las Oleadas
  { id: 'fortaleza-courtyard', x: 2410, y: 440, w: 800, h: 520, zoneId: 'fortaleza-oleadas', surface: 'fortress' },
  { id: 'fortaleza-star-pad', x: 2520, y: 380, w: 340, h: 160, zoneId: 'fortaleza-oleadas', surface: 'fortress' },

  // 8. La Cumbre del Arquitecto
  { id: 'cumbre-stairway', x: 2180, y: 280, w: 380, h: 200, zoneId: 'cumbre-arquitecto', surface: 'stone' },
  { id: 'cumbre-sanctuary', x: 1560, y: 170, w: 780, h: 270, zoneId: 'cumbre-arquitecto', surface: 'stone' },

  // 9. El Puerto de las Islas Perdidas
  { id: 'fortaleza-to-puerto', x: 2960, y: 900, w: 240, h: 220, zoneId: 'puerto-islas-perdidas', surface: 'stone' },
  { id: 'puerto-pier-main', x: 3000, y: 1060, w: 520, h: 320, zoneId: 'puerto-islas-perdidas', surface: 'pier' },
];

export const ISLAND_KEY_COORDS = {
  awakeningSpawn: { x: 470, y: 1830 },
  pongCabinet: { x: 2820, y: 1660 },
  pongBoardLaunch: { x: 2710, y: 1610 },
  pongBoardLanding: { x: 1760, y: 780 },
  glitchTrailPortal: { x: 1880, y: 645 },
  glitchTrailReturn: { x: 2020, y: 685 },
  invadersCabinet: { x: 2910, y: 650 },
  starShuttlePad: { x: 2680, y: 495 },
  starShuttleDisembark: { x: 2742, y: 522 },
  architectAstrolabe: { x: 1940, y: 275 },
};

export const ISLAND_NPCS: IslandNpcSpec[] = [
  {
    id: 'npc-bit01',
    name: 'Bit-01 · El Faro Antiguo',
    role: 'Centinela de la Costa del Despertar',
    x: 610,
    y: 1765,
    zoneId: 'costa-despertar',
    palette: { primary: '#38bdf8', secondary: '#facc15', glow: '#00f3ff' },
    pitch: 1.08,
    linesInitial: [
      '¡Despertaste, Pixel! Cuando SUPER CUPA fracturó las eras, esta isla fue el primer recuerdo en resistir sobre el abismo: el Archipiélago Cero de los años 70.',
      'Sigue las venas luminosas hacia el Bosque de los Circuitos y las Ruinas Centrales. Al sureste aguarda el Santuario de Pong (1972), el pulso que encendió toda nuestra historia.',
    ],
    linesAfterPong: [
      '¡El pulso de 1972 vuelve a latir en toda la costa! ¿Viste cómo la barra blanca de Pong te llevó volando hasta la Garganta del norte?',
      'Dicen que el Cartógrafo del Caos desordenó el puente hacia la Fortaleza de 1978 para poner a prueba tu destreza como Arquitecto.',
    ],
    linesAfterInvaders: [
      'La isla entera vibra en armonía. Desde la Cumbre del Arquitecto y el Puerto del Este ya se distinguen las siluetas de los años 80 y 90 entre la bruma.',
    ],
  },
  {
    id: 'npc-ambar',
    name: 'Cronista Ámbar',
    role: 'Guardiana de las Ruinas del Primer Arcade',
    x: 1865,
    y: 1320,
    zoneId: 'ruinas-primer-arcade',
    palette: { primary: '#f59e0b', secondary: '#fef08a', glow: '#f59e0b' },
    pitch: 0.94,
    linesInitial: [
      'Estas columnas guardan los planos previos a la edad dorada: osciloscopios analógicos, computadoras PDP-1 y las primeras placas de lógica discreta.',
      'Consejo de explorador: si activas los dos Pedestales Rúnicos al sur del Bosque y de esta plaza, reconstruirás el Puente Costero hacia un Diamante de Memoria.',
    ],
    linesAfterPong: [
      'Pong ha sido restaurado para la humanidad. Ahora el Portal de la Garganta al norte está abierto: cruza «El Sendero del Glitch Perdido» para alcanzar 1978.',
    ],
    linesAfterInvaders: [
      '¡1972 y 1978 brillan unidos en un mismo territorio! Sube a la Cumbre del Arquitecto para contemplar el Astrolabio de las Eras en plenitud.',
    ],
  },
  {
    id: 'npc-eco-caverna',
    name: 'Eco Subterráneo',
    role: 'Morador de las Cavernas del Código',
    x: 540,
    y: 565,
    zoneId: 'cavernas-codigo',
    palette: { primary: '#a855f7', secondary: '#67e8f9', glow: '#c084fc' },
    pitch: 1.24,
    linesInitial: [
      'Shhh... ¿escuchas cantar al cuarzo hexadecimal? Aquí abajo se refugian los Diamantes de Memoria que no cayeron en el vórtice.',
      'Activa el Nodo de Cuarzo al oeste de esta gruta para disipar la barrera cristalina, y usa el túnel del este si quieres asomarte directo a la Garganta del Invasor.',
    ],
  },
  {
    id: 'npc-cartografo-isla',
    name: 'Holograma del Cartógrafo del Caos',
    role: 'Arquitecto Errante de Coordenadas',
    x: 1795,
    y: 675,
    zoneId: 'garganta-invasor',
    palette: { primary: '#9d00ff', secondary: '#00f3ff', glow: '#e879f9' },
    pitch: 0.86,
    linesInitial: [
      '¡Ajá, el pequeño Pixel en persona! No me mires así, yo no trabajo para SUPER CUPA... pero tampoco regalo puentes a cualquiera.',
      'Desarmé el Puente Astral en tres fragmentos dentro de mi «Sendero del Glitch Perdido». ¡Entra al portal si tienes reflejos para reconstruirlo jugando!',
    ],
    linesAfterInvaders: [
      '¡Ja! Admito que superaste mis plataformas en fase y defendiste 1978 con estilo. Cuando se abran las rutas a los años 80, te tendré acertijos aún mejores.',
    ],
  },
  {
    id: 'npc-guardian-cumbre',
    name: 'Guardián del Horizonte',
    role: 'Vigía de la Cumbre del Arquitecto',
    x: 1775,
    y: 305,
    zoneId: 'cumbre-arquitecto',
    palette: { primary: '#e0f2fe', secondary: '#38bdf8', glow: '#7dd3fc' },
    pitch: 0.78,
    linesInitial: [
      'Bienvenido al punto más alto del Archipiélago Cero. Bajo esta luna pálida convergen las memorias restauradas de los años 70.',
      'Asómate también al Puerto de las Islas Perdidas, al sureste de la Fortaleza: allí verás aguardar las islas de los años 80 y 90.',
    ],
  },
];

export const ISLAND_ECHOES: IslandEchoSpec[] = [
  {
    id: 'echo-1958-tennis',
    year: 1958,
    title: 'Sombra del Pasado · Tennis for Two (1958)',
    pioneer: 'William Higinbotham · Laboratorio Nacional de Brookhaven',
    x: 845,
    y: 1210,
    zoneId: 'bosque-circuitos',
    accentHex: '#34d399',
    motif: 'oscilloscope',
    loreText:
      'Catorce años antes de Pong, un computador analógico conectado a un osciloscopio redondo proyectó una pelota con gravedad sobre una red lateral para maravillar a los visitantes científicos.',
    gameplayHint:
      'Pista del Bosque: Al noroeste de estos árboles de circuito se oculta la entrada rocosa hacia las Cavernas del Código.',
  },
  {
    id: 'echo-1962-spacewar',
    year: 1962,
    title: 'Sombra del Pasado · Spacewar! (1962)',
    pioneer: 'Steve Russell y el club ferroviario del MIT · PDP-1',
    x: 1665,
    y: 1185,
    zoneId: 'ruinas-primer-arcade',
    accentHex: '#fbbf24',
    motif: 'pdp1-star',
    loreText:
      'Dos naves —«La Aguja» y «La Cuña»— maniobrando alrededor del pozo gravitatorio de una estrella central en el monitor circular del PDP-1 sembraron el sueño espacial de toda la década siguiente.',
    gameplayHint:
      'Pista de las Ruinas: El Santuario de Pong brilla siguiendo la calzada dorada hacia el sureste.',
  },
  {
    id: 'echo-1971-computerspace',
    year: 1971,
    title: 'Sombra del Pasado · Computer Space (1971)',
    pioneer: 'Nolan Bushnell y Ted Dabney · Nutting Associates',
    x: 2560,
    y: 785,
    zoneId: 'fortaleza-oleadas',
    accentHex: '#4ade80',
    motif: 'rocket-cabinet',
    loreText:
      'El primer videojuego arcade comercial operado con monedas vestía una escultura futurista de fibra de vidrio. Su complejidad inspiró a sus creadores a buscar la elegancia directa de Pong un año más tarde.',
    gameplayHint:
      'Pista de la Fortaleza: Al norte se alza la escalinata hacia la Cumbre del Arquitecto, y al sureste el Puerto de las Islas Perdidas.',
  },
];

export const ISLAND_SWITCHES: IslandSwitchSpec[] = [
  {
    id: 'sw-bosque-sur',
    label: 'Pedestal Rúnico del Bosque',
    x: 1280,
    y: 1475,
    zoneId: 'bosque-circuitos',
    accentHex: '#10b981',
    descriptionOnActivate:
      '¡Frecuencia 01 acoplada! Activa el Pedestal gemelo al sur de las Ruinas para tender el Puente Costero.',
  },
  {
    id: 'sw-ruinas-sur',
    label: 'Pedestal Rúnico de las Ruinas',
    x: 1585,
    y: 1595,
    zoneId: 'ruinas-primer-arcade',
    accentHex: '#f59e0b',
    descriptionOnActivate:
      '¡Frecuencia 02 acoplada! Si ambos pedestales brillan, el Puente de Atajo Costero se materializa con su Diamante.',
  },
  {
    id: 'sw-caverna-cristal',
    label: 'Nodo de Cuarzo Hexadecimal',
    x: 355,
    y: 505,
    zoneId: 'cavernas-codigo',
    accentHex: '#a855f7',
    descriptionOnActivate:
      '¡Armónico subterráneo liberado! La barrera de cristal al noreste de la caverna se ha abierto.',
  },
];

export const ISLAND_DIAMONDS: IslandDiamondSpec[] = [
  {
    id: 'isl-dia-costa',
    label: 'Diamante de la Espuma Binaria',
    x: 285,
    y: 1995,
    zoneId: 'costa-despertar',
  },
  {
    id: 'isl-dia-puente-sur',
    label: 'Diamante del Puente Rúnico',
    x: 1210,
    y: 1692,
    zoneId: 'ruinas-primer-arcade',
    requiresShortcut: true,
  },
  {
    id: 'isl-dia-pong-terraza',
    label: 'Diamante del Balcón Solar 1972',
    x: 3115,
    y: 1850,
    zoneId: 'santuario-pong',
  },
  {
    id: 'isl-dia-caverna',
    label: 'Diamante del Cuarzo Profundo',
    x: 825,
    y: 445,
    zoneId: 'cavernas-codigo',
    requiresSwitchId: 'sw-caverna-cristal',
  },
  {
    id: 'isl-dia-cumbre',
    label: 'Diamante Cenital del Arquitecto',
    x: 2235,
    y: 235,
    zoneId: 'cumbre-arquitecto',
  },
];

export const DISTANT_DECADE_VISTAS: DistantDecadeVistaSpec[] = [
  {
    id: 'vista-80s',
    decadeLabel: 'HORIZONTE · AÑOS 80',
    title: 'Isla de los Laberintos y Vigas de Neón (1980–1989)',
    x: 3440,
    y: 1110,
    accentHex: '#f43f5e',
    statusText: 'SECTOR EN NIEBLA TEMPORAL · PRÓXIMA EXPANSIÓN DEL ARCHIPIÉLAGO',
    unlockRequirement:
      'Condición narrativa: Restaurar Pong (1972), reconstruir el Puente del Sendero del Glitch y restaurar Space Invaders (1978) para estabilizar el Faro Inter-Décadas.',
    lorePreview:
      'Entre las nubes del este laten laberintos amarillos, torres de vigas rojas, castillos de ladrillo y salones de neón donde aguardan los campeones y villanos de los 80.',
  },
  {
    id: 'vista-90s',
    decadeLabel: 'HORIZONTE · AÑOS 90',
    title: 'Ciudadela Flotante de 16 y 32 Bits (1990–1999)',
    x: 3440,
    y: 1225,
    accentHex: '#a855f7',
    statusText: 'SECTOR SELLADO POR LA ANOMALÍA DE SUPER CUPA',
    unlockRequirement:
      'Condición narrativa: Completar primero la travesía del Archipiélago de los 80 para sincronizar los motores poligonales.',
    lorePreview:
      'Más allá del mar estelar giran anillos dorados a velocidad supersónica, fortalezas de Mode-7 y los primeros bastiones tridimensionales.',
  },
  {
    id: 'vista-futuro',
    decadeLabel: 'HORIZONTE · NUEVO MILENIO',
    title: 'Constelación de Mundos Abiertos y Redes Globales',
    x: 3440,
    y: 1335,
    accentHex: '#38bdf8',
    statusText: 'SILUETA LEJANA EN EL BORDE DEL COSMOS',
    unlockRequirement:
      'Condición narrativa: Reunir los núcleos históricos previos antes del duelo definitivo contra SUPER CUPA.',
    lorePreview:
      'En el confín luminoso aguardan las eras modernas del videojuego, listas para renacer cuando los cimientos clásicos estén a salvo.',
  },
];

export function isSouthShortcutUnlocked(switches: string[], allUnlocked = false): boolean {
  if (allUnlocked) return true;
  return switches.includes('sw-bosque-sur') && switches.includes('sw-ruinas-sur');
}

export function isPointWalkableOnIsland(
  px: number,
  py: number,
  opts: { southShortcut: boolean; gargantaBridge: boolean }
): WalkableRect | null {
  for (let i = ISLAND_WALKABLE_RECTS.length - 1; i >= 0; i--) {
    const r = ISLAND_WALKABLE_RECTS[i];
    if (r.requiresCondition === 'south-shortcut' && !opts.southShortcut) continue;
    if (r.requiresCondition === 'garganta-bridge' && !opts.gargantaBridge) continue;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      return r;
    }
  }
  return null;
}
