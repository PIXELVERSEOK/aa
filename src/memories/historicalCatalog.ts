/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo histórico extensible de PIXELVERSE.
 * Cada entrada documenta con rigor el hito original representado y define
 * los motivos visuales de reconstrucción para la ceremonia «Memoria Desbloqueada».
 */

export type HistoricalGameId = 'pong' | 'donkey-kong' | 'space-invaders' | string;

export type MemoryVisualMotif =
  | 'pong'
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
