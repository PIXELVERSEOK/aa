/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo histórico extensible de PIXELVERSE.
 * Cada entrada documenta con rigor el hito original representado y define
 * los motivos visuales de reconstrucción para la ceremonia «Memoria Desbloqueada».
 */

export type HistoricalGameId =
  | 'pong'
  | 'breakout'
  | 'donkey-kong'
  | 'space-invaders'
  | string;

export type MemoryVisualMotif =
  | 'pong'
  | 'breakout'
  | 'donkey-kong'
  | 'space-invaders'
  | 'generic';

export interface HistoricalMemoryEntry {
  id: HistoricalGameId;
  name: string;
  headline: string;
  year: number;
  creator: string;
  company: string;
  review: string;
  funFact: string;
  restorationMessage: string;
  visualIdentity: {
    motif: MemoryVisualMotif;
    accentHex: string;
    secondaryHex: string;
    timelineBadge: string;
  };
}

export interface MuseumExhibit1970s {
  id: string;
  year: number;
  title: string;
  creator: string;
  company: string;
  mode: 'playable' | 'exhibition';
  linkedGameId?: HistoricalGameId;
  accentHex: string;
  hardwareType: string;
  historicalSummary: string;
  curatorialNote: string;
  secretHint?: string;
}

export const HISTORICAL_CATALOG: Record<string, HistoricalMemoryEntry> = {
  pong: {
    id: 'pong',
    name: 'Pong (Arcade Original)',
    headline: 'PONG — EL NACIMIENTO DE UNA ERA',
    year: 1972,
    creator: 'Allan Alcorn (con Nolan Bushnell y Ted Dabney)',
    company: 'Atari, Inc.',
    review:
      'Lanzado comercialmente en noviembre de 1972 por Atari, Pong convirtió el tenis de mesa electrónico en el primer gran éxito masivo de los salones recreativos. Con dos paletas blancas, una red segmentada y pulsos sonoros minimalistas, demostró que el juego digital era intuitivo y universal, inaugurando comercialmente la industria moderna del videojuego.',
    funFact:
      'Nació como un ejercicio de entrenamiento encargado a Allan Alcorn por Nolan Bushnell. El primer prototipo instalado en la taberna Andy Capp’s de Sunnyvale dejó de aceptar partidas pocos días después porque el cajón de monedas rebosaba de cuartos de dólar.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE el pulso luminoso de 1972: el instante en que dos líneas blancas enseñaron al mundo a jugar frente a una pantalla.',
    visualIdentity: {
      motif: 'pong',
      accentHex: '#00f3ff',
      secondaryHex: '#facc15',
      timelineBadge: 'HITO 1972 · RESTAURADO',
    },
  },

  breakout: {
    id: 'breakout',
    name: 'Breakout (Arcade Original)',
    headline: 'BREAKOUT — EL MURO CROMÁTICO DE 1976',
    year: 1976,
    creator: 'Nolan Bushnell, Steve Bristow y Steve Wozniak (prototipo TTL)',
    company: 'Atari, Inc.',
    review:
      'Estrenado en mayo de 1976 por Atari, Breakout reinventó el duelo de rebote para un solo jugador enfrentándolo a un muro estratificado de ocho filas de ladrillos. Su pantalla monocroma cobraba vida mediante tiras de celofán rojo, ámbar, verde y amarillo adheridas sobre el tubo CRT, acelerando el ritmo a medida que la pelota perforaba las capas superiores.',
    funFact:
      'Steve Jobs aceptó el encargo en Atari y recurrió a su amigo Steve Wozniak para optimizar la placa: trabajando cuatro noches casi sin dormir, Wozniak redujo el diseño a una cantidad asombrosamente baja de chips TTL discretos, hazaña técnica que inspiraría la arquitectura del Apple II.',
    restorationMessage:
      'Has desenterrado la Sala Secreta de 1976 y restaurado en PIXELVERSE la memoria oculta de Breakout: el muro de luz donde la ingeniería artesanal abrió camino a la computación personal.',
    visualIdentity: {
      motif: 'breakout',
      accentHex: '#f97316',
      secondaryHex: '#22d3ee',
      timelineBadge: 'SECRETO 1976 · RESTAURADO',
    },
  },

  'donkey-kong': {
    id: 'donkey-kong',
    name: 'Donkey Kong (Arcade Original)',
    headline: 'DONKEY KONG — EL SALTO QUE DEFINIÓ LAS PLATAFORMAS',
    year: 1981,
    creator: 'Shigeru Miyamoto (diseño) y Gunpei Yokoi (producción)',
    company: 'Nintendo',
    review:
      'Estrenado en salones recreativos en julio de 1981, Donkey Kong consolidó el videojuego de plataformas verticales con narrativa visual en tiempo real. Sus vigas inclinadas, escaleras y barriles rodantes exigían ritmo y precisión en el salto, presentando por primera vez juntos a Donkey Kong y al héroe entonces llamado Jumpman, hoy conocido como Mario.',
    funFact:
      'Nintendo impulsó su creación para reconvertir miles de cabinas recreativas de Radar Scope que habían quedado sin vender en Norteamérica, transformando una crisis comercial en una leyenda histórica.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE la memoria del desafío vertical, el salto preciso y los tres Diamantes de Memoria hacia el sector 1978.',
    visualIdentity: {
      motif: 'donkey-kong',
      accentHex: '#f43f5e',
      secondaryHex: '#fde047',
      timelineBadge: 'PUENTE 1981 · SINCRONIZADO',
    },
  },

  'space-invaders': {
    id: 'space-invaders',
    name: 'Space Invaders (Arcade Original)',
    headline: 'SPACE INVADERS — LA AMENAZA LLEGÓ DEL ESPACIO',
    year: 1978,
    creator: 'Tomohiro Nishikado',
    company: 'Taito Corporation (licenciado a Midway en Norteamérica)',
    review:
      'Lanzado originalmente en Japón por Taito en junio de 1978 y diseñado por Tomohiro Nishikado, Space Invaders transformó el medio al introducir oleadas descendentes, escudos destructibles y el registro persistente de la puntuación máxima. Su duelo rítmico bajo un cielo estrellado dio inicio a la edad dorada de los salones arcade en todo el mundo.',
    funFact:
      'Conforme quedaban menos invasores en pantalla, el microprocesador tenía menos figuras que actualizar y desplazaba al resto cada vez más deprisa; Nishikado conservó ese efecto porque multiplicaba la tensión dramática.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE la memoria estelar de 1978: el coraje de resistir bajo escudos de fósforo y devolver la esperanza al cosmos.',
    visualIdentity: {
      motif: 'space-invaders',
      accentHex: '#39ff14',
      secondaryHex: '#f59e0b',
      timelineBadge: 'HITO 1978 · RESTAURADO',
    },
  },

  'glitch-trail': {
    id: 'glitch-trail',
    name: 'El Sendero del Glitch Perdido',
    headline: 'ARCHIPIÉLAGO CERO — PUENTE DE LA GARGANTA RECONSTRUIDO',
    year: 1976,
    creator: 'Arquitectura Pionera de Lógica Discreta y Microcódigo',
    company: 'Memoria Original de PIXELVERSE · Era de los 70',
    review:
      'Entre el nacimiento de Pong (1972) y la fiebre espacial de Space Invaders (1978), los salones recreativos evolucionaron desde placas de circuitos discretos TTL hacia los primeros microprocesadores, dando forma al movimiento preciso, las colisiones dinámicas y los mundos con memoria.',
    funFact:
      'Antes de que existieran motores gráficos modernos, los diseñadores dibujaban cada objeto sincronizando contadores electrónicos directamente con el haz de electrones del televisor CRT.',
    restorationMessage:
      'Has superado la prueba del Cartógrafo del Caos y reconstruido el Puente Astral hacia la Fortaleza de las Oleadas (1978) en la Gran Isla de los 70.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#00f3ff',
      secondaryHex: '#facc15',
      timelineBadge: 'RUTA 1970s · RECONSTRUIDA',
    },
  },
};

export const MUSEUM_1970S_EXHIBITS: MuseumExhibit1970s[] = [
  {
    id: 'exhibit-computer-space-1971',
    year: 1971,
    title: 'Computer Space',
    creator: 'Nolan Bushnell y Ted Dabney',
    company: 'Nutting Associates',
    mode: 'exhibition',
    accentHex: '#38bdf8',
    hardwareType: 'Lógica discreta TTL · Gabinete de fibra de vidrio futurista',
    historicalSummary:
      'Lanzado en noviembre de 1971, fue el primer videojuego arcade comercial operado con monedas de la historia. Derivado de Spacewar! (1962) pero construido sin computadora mediante circuitos TTL dedicados.',
    curatorialNote:
      'Exhibición histórica documentada en el Museo Viviente de los 70. Su gabinete curvo demostró que una pantalla electrónica podía habitar bares y salones públicos.',
  },
  {
    id: 'exhibit-odyssey-1972',
    year: 1972,
    title: 'Magnavox Odyssey',
    creator: 'Ralph H. Baer (con Bill Harrison y Bill Rusch)',
    company: 'Magnavox',
    mode: 'exhibition',
    accentHex: '#f59e0b',
    hardwareType: 'Primera consola doméstica comercial · Circuitos diodo-transistor',
    historicalSummary:
      'Presentada en mayo de 1972 a partir del prototipo «Brown Box» de Ralph Baer, llevó por primera vez el videojuego al televisor del hogar utilizando tarjetas de circuito puenteadas y láminas plásticas translúcidas.',
    curatorialNote:
      'Exhibición histórica documentada. Una demostración pública del tenis electrónico de Odyssey inspiró directamente el encargo de Pong pocos meses después.',
  },
  {
    id: 'exhibit-pong-1972',
    year: 1972,
    title: 'Pong',
    creator: 'Allan Alcorn',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'pong',
    accentHex: '#00f3ff',
    hardwareType: 'Lógica discreta TTL · CRT monocromo con sonido de sincronía',
    historicalSummary:
      'Noviembre de 1972. El primer fenómeno comercial masivo de los salones arcade: dos paletas, ángulos variables según el punto de impacto y marcador digital.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Santuario Pong 1972 y acceso directo cuando ha sido restaurado).',
  },
  {
    id: 'exhibit-gran-trak-1974',
    year: 1974,
    title: 'Gran Trak 10',
    creator: 'Larryemar / Allan Alcorn y Cyan Engineering',
    company: 'Atari, Inc.',
    mode: 'exhibition',
    accentHex: '#eab308',
    hardwareType: 'ROM de diodos para pista + volante, acelerador, freno y caja de cambios',
    historicalSummary:
      'Estrenado en 1974, inauguró los videojuegos arcade de conducción en vista cenital con controles automovilísticos físicos reales y derrapes sobre manchas de aceite.',
    curatorialNote:
      'Exhibición histórica documentada. Primer uso temprano de memoria ROM de solo lectura en Atari para almacenar siluetas de circuitos y vehículos.',
  },
  {
    id: 'exhibit-breakout-1976',
    year: 1976,
    title: 'Breakout',
    creator: 'Nolan Bushnell, Steve Bristow y Steve Wozniak',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'breakout',
    accentHex: '#f97316',
    hardwareType: 'Lógica TTL ultra-compacta · CRT con bandas cromáticas de celofán',
    historicalSummary:
      'Mayo de 1976. Transformó el rebote arcade en un desafío solitario de demolición por capas de color y velocidad creciente.',
    curatorialNote:
      'Hito SECRETO JUGABLE en PIXELVERSE. El pedestal permanece cifrado hasta hallar la Sala Secreta de 1976 bajo el Laberinto de Señales.',
    secretHint:
      'Pista curatorial: al norte de las Praderas del Rebote existe una escotilla sellada cuya cerradura responde al orden cromático inferior-superior del celofán CRT de 1976.',
  },
  {
    id: 'exhibit-space-invaders-1978',
    year: 1978,
    title: 'Space Invaders',
    creator: 'Tomohiro Nishikado',
    company: 'Taito Corporation',
    mode: 'playable',
    linkedGameId: 'space-invaders',
    accentHex: '#39ff14',
    hardwareType: 'Microprocesador Intel 8080 · Espejo semitransparente sobre fondo lunar',
    historicalSummary:
      'Junio de 1978. Introdujo oleadas implacables, barreras destructibles, pulso sonoro acelerado y tabla de récord persistente (HI-SCORE).',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Fortaleza de las Oleadas 1978 · Desbloqueo con 1000 PTS).',
  },
  {
    id: 'exhibit-lunar-lander-1979',
    year: 1979,
    title: 'Lunar Lander',
    creator: 'Howard Delman y Rich Moore',
    company: 'Atari, Inc.',
    mode: 'exhibition',
    accentHex: '#a78bfa',
    hardwareType: 'Monitor vectorial QuadraScan XY · Palanca proporcional de empuje',
    historicalSummary:
      'Agosto de 1979. Primer arcade de Atari con generador gráfico vectorial capaz de trazar líneas nítidas de luz pura, simulando inercia gravitatoria, combustible limitado y zoom dinámico al acercarse al cráter.',
    curatorialNote:
      'Exhibición histórica vectorial documentada. Su proyector de haces XY inspira el puzzle de alineación vectorial del ala norte del museo.',
  },
  {
    id: 'exhibit-asteroids-1979',
    year: 1979,
    title: 'Asteroids',
    creator: 'Lyle Rains, Ed Logg y Dominic Walsh',
    company: 'Atari, Inc.',
    mode: 'exhibition',
    accentHex: '#22d3ee',
    hardwareType: 'CPU MOS 6502A + Generador Vectorial Digital (DVG)',
    historicalSummary:
      'Noviembre de 1979. Cerró la década con el mayor éxito comercial en la historia arcade de Atari: física inercial en 360 grados, rocas vectoriales que se fragmentan e iniciales de tres letras para inmortalizar récords.',
    curatorialNote:
      'Exhibición histórica vectorial documentada. Puente tecnológico directo entre el minimalismo luminoso de los 70 y la explosión cultural de los 80.',
  },
];

export function getHistoricalMemory(gameId: HistoricalGameId): HistoricalMemoryEntry {
  return (
    HISTORICAL_CATALOG[gameId] || {
      id: gameId,
      name: gameId,
      headline: `${gameId.toUpperCase()} — MEMORIA CLÁSICA`,
      year: 1980,
      creator: 'Pioneros de la Era Arcade',
      company: 'Archivo Histórico Arcade',
      review:
        'Obra fundamental preservada en el archivo viviente de PIXELVERSE para mantener intacto el legado interactivo de los primeros salones recreativos.',
      funFact:
        'Los primeros gabinetes recreativos combinaban circuitos dedicados, monitores CRT monocromos e ilustraciones impresas en el bisel para ampliar su mundo visual.',
      restorationMessage:
        'Un nuevo fragmento esencial de la historia del videojuego ha vuelto a iluminarse en PIXELVERSE.',
      visualIdentity: {
        motif: 'generic',
        accentHex: '#00f3ff',
        secondaryHex: '#9d00ff',
        timelineBadge: 'MEMORIA · RESTAURADA',
      },
    }
  );
}
