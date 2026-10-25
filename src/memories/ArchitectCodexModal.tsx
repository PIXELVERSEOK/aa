/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Códice del Arquitecto: registro consultable en la Gran Isla de los 70
 * para inspeccionar Memorias Históricas restauradas, Sombras del Pasado,
 * Habilidades desbloqueadas y progreso de las 9 zonas sin cajas redundantes.
 */

import React, { useState } from 'react';
import { BookOpen, Compass, Diamond, Sparkles, X } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from './historicalCatalog';
import {
  PixelAbilityId,
  PixelverseProgressState,
  SPACE_INVADERS_UNLOCK_SCORE,
} from './progressionState';
import { ISLAND_ECHOES, ISLAND_ZONES, IslandZoneId } from '../island/island70sData';

type CodexTab = 'memories' | 'echoes' | 'atlas';

const TRAIL_ECHO_ENTRIES = [
  {
    id: 'echo-1972-odyssey',
    year: 1972,
    title: 'Sombra del Pasado · Magnavox Odyssey (1972)',
    pioneer: 'Ralph Baer · La «Brown Box» doméstica',
    loreText:
      'El mismo año en que Pong conquistó los salones recreativos, Ralph Baer llevó el videojuego al televisor del hogar mediante láminas translúcidas adheridas a la pantalla.',
  },
  {
    id: 'echo-1976-breakout',
    year: 1976,
    title: 'Sombra del Pasado · Breakout (1976)',
    pioneer: 'Nolan Bushnell, Steve Bristow y Steve Wozniak · Atari',
    loreText:
      'Convirtió el rebote de una sola paleta en el arte de demoler muros de ladrillos cromáticos con optimización extrema de chips TTL.',
  },
];

const ABILITY_CATALOG: {
  id: PixelAbilityId;
  name: string;
  keyHint: string;
  scopeNote: string;
  description: string;
}[] = [
  {
    id: 'phase-sprint',
    name: 'Impulso de Exploración',
    keyHint: 'SHIFT',
    scopeNote: 'Movimiento terrestre en las 9 zonas de los 70',
    description:
      'Aumenta la velocidad de desplazamiento de Pixel por playas, senderos de circuito, ruinas y cavernas.',
  },
  {
    id: 'pong-hoverboard',
    name: 'Tabla Voladora de Pong (1972)',
    keyHint: 'E en terminales de vuelo',
    scopeNote: 'Movilidad interna exclusiva dentro de la Isla de los 70',
    description:
      'La paleta blanca restaurada en el Santuario de Pong se acopla como tabla antigravedad para cruzar sobre cascadas entre zonas de esta misma isla.',
  },
  {
    id: 'phase-dash',
    name: 'Dash de Fase',
    keyHint: 'SHIFT en El Sendero del Glitch',
    scopeNote: 'Aventura de plataformas y cañones de datos',
    description:
      'Proyección horizontal instantánea en el aire o suelo para salvar abismos amplios y alcanzar plataformas en fase.',
  },
  {
    id: 'star-shuttle',
    name: 'Nave Estelar PIXELVERSE (1978)',
    keyHint: 'Secuencia orbital y plataforma norte',
    scopeNote: 'Retorno orbital exclusivo hacia la Isla de los 70',
    description:
      'Tras superar los 1000 puntos reales en Space Invaders, transporta a Pixel de vuelta a la plataforma de aterrizaje de La Fortaleza de las Oleadas.',
  },
];

const ZONE_ORDER: IslandZoneId[] = [
  'costa-despertar',
  'bosque-circuitos',
  'ruinas-primer-arcade',
  'santuario-pong',
  'garganta-invasor',
  'fortaleza-oleadas',
  'cavernas-codigo',
  'cumbre-arquitecto',
  'puerto-islas-perdidas',
];

export function ArchitectCodexModal({
  progressState,
  allUnlocked,
  onClose,
}: {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<CodexTab>('memories');

  const coreGames = [
    {
      id: 'pong',
      requirement: 'Alcanzar 3 puntos reales frente a la máquina en el Santuario de Pong',
    },
    {
      id: 'glitch-trail',
      requirement:
        'Alinear los prismas, reunir los 3 fragmentos del puente y estabilizar los 3 resonadores',
    },
    {
      id: 'space-invaders',
      requirement: `Alcanzar al menos ${SPACE_INVADERS_UNLOCK_SCORE} puntos reales en La Fortaleza de las Oleadas`,
    },
  ];

  const allEchoes = [
    ...ISLAND_ECHOES.map((e) => ({
      id: e.id,
      year: e.year,
      title: e.title,
      pioneer: e.pioneer,
      loreText: e.loreText,
    })),
    ...TRAIL_ECHO_ENTRIES,
  ];

  const discoveredEchoes = progressState.island70s.discoveredEchoIds;
  const visitedZones = progressState.island70s.visitedZones;
  const unlockedAbilities = progressState.island70s.abilitiesUnlocked;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Códice del Arquitecto"
      className="fixed inset-0 z-50 bg-black/78 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="glass-panel rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-auto">
        <div className="flex items-start justify-between gap-4 border-b border-white/12 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular tracking-[0.24em] text-[#00f3ff] uppercase">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>CÓDICE DEL ARQUITECTO · ARCHIPIÉLAGO CERO</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Crónica de la Década de 1970
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar Códice"
            className="text-slate-400 hover:text-white cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen métrico limpio sin píldoras decorativas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-white/10 font-mono-tabular">
          <div>
            <span className="block text-[10px] tracking-widest text-slate-400 uppercase">
              MEMORIAS 70s
            </span>
            <span className="text-base font-bold text-amber-300">
              {progressState.restoredCount} / 3
            </span>
          </div>
          <div>
            <span className="block text-[10px] tracking-widest text-slate-400 uppercase">
              DIAMANTES CIAN
            </span>
            <span className="text-base font-bold text-[#00f3ff]">
              {progressState.island70s.collectedDiamondIds.length} / 9
            </span>
          </div>
          <div>
            <span className="block text-[10px] tracking-widest text-slate-400 uppercase">
              SOMBRAS DEL PASADO
            </span>
            <span className="text-base font-bold text-emerald-300">
              {discoveredEchoes.length} / {allEchoes.length}
            </span>
          </div>
          <div>
            <span className="block text-[10px] tracking-widest text-slate-400 uppercase">
              ZONAS EXPLORADAS
            </span>
            <span className="text-base font-bold text-white">
              {visitedZones.length} / 9
            </span>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: 'memories' as const, label: 'Hitos Históricos' },
            { id: 'echoes' as const, label: 'Sombras del Pasado' },
            { id: 'atlas' as const, label: 'Habilidades y Regiones' },
          ].map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setTab(item.id);
                }}
                className={`px-4 py-2 rounded text-xs font-mono-tabular font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-950/75 border border-[#00f3ff] text-white'
                    : 'bg-black/40 border border-white/12 text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de la pestaña seleccionada */}
        <div className="max-h-[48vh] overflow-y-auto pr-1 space-y-5">
          {tab === 'memories' &&
            coreGames.map((item) => {
              const entry = getHistoricalMemory(item.id);
              const rec = progressState.games[item.id];
              const unlocked = Boolean(rec?.memoryUnlocked) || allUnlocked;
              return (
                <article
                  key={item.id}
                  className="border-b border-white/10 pb-4 last:border-b-0 space-y-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className={`w-4 h-4 shrink-0 ${
                          unlocked ? 'text-amber-300' : 'text-slate-500'
                        }`}
                      />
                      <h3 className="font-display text-lg font-bold text-white">
                        {entry.name} ({entry.year})
                      </h3>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-slate-300">
                      {unlocked
                        ? `RESTAURADO · RÉCORD ${rec?.bestScore ?? 0} PTS`
                        : 'PENDIENTE DE RESTAURACIÓN'}
                    </span>
                  </div>

                  {unlocked ? (
                    <>
                      <p className="text-xs font-mono-tabular text-cyan-200/90">
                        {entry.creator} · {entry.company}
                      </p>
                      <p className="text-sm text-slate-200 font-ui leading-relaxed">
                        {entry.review}
                      </p>
                      <p className="text-xs text-amber-200/90 font-ui">
                        Dato histórico: {entry.funFact}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 font-ui">
                      Condición de desbloqueo: {item.requirement}.
                    </p>
                  )}
                </article>
              );
            })}

          {tab === 'echoes' &&
            allEchoes.map((echo) => {
              const known = discoveredEchoes.includes(echo.id) || allUnlocked;
              return (
                <article
                  key={echo.id}
                  className="border-b border-white/10 pb-4 last:border-b-0 space-y-1.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-white">
                      {known ? echo.title : `Eco Holográfico de ${echo.year} · Sin sintonizar`}
                    </h3>
                    <span className="font-mono-tabular text-[11px] text-emerald-300">
                      {known ? 'SINTONIZADO' : 'OCULTO'}
                    </span>
                  </div>
                  {known ? (
                    <>
                      <p className="text-xs font-mono-tabular text-amber-300">
                        {echo.pioneer}
                      </p>
                      <p className="text-sm text-slate-200 font-ui leading-relaxed">
                        {echo.loreText}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 font-ui">
                      Explora las ruinas, bosques, fortalezas y el Sendero del Glitch para sintonizar este recuerdo pionero.
                    </p>
                  )}
                </article>
              );
            })}

          {tab === 'atlas' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-mono-tabular text-xs tracking-[0.2em] text-[#00f3ff] uppercase">
                  Habilidades y Movilidad de Pixel
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ABILITY_CATALOG.map((ab) => {
                    const active = unlockedAbilities.includes(ab.id) || allUnlocked;
                    return (
                      <div
                        key={ab.id}
                        className="rounded-lg border border-white/12 bg-black/35 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-display text-sm font-bold text-white">
                            {ab.name}
                          </span>
                          <span className="font-mono-tabular text-[10px] text-[#00f3ff]">
                            {active ? ab.keyHint : 'BLOQUEADO'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono-tabular text-amber-200/85">
                          {ab.scopeNote}
                        </p>
                        <p className="text-xs text-slate-300 font-ui leading-snug">
                          {ab.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-mono-tabular text-xs tracking-[0.2em] text-[#00f3ff] uppercase">
                  Atlas de las 9 Zonas · Gran Isla de los 70
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ZONE_ORDER.map((zId) => {
                    const z = ISLAND_ZONES[zId];
                    const visited = visitedZones.includes(zId) || allUnlocked;
                    return (
                      <div
                        key={zId}
                        className="rounded border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="block font-mono-tabular text-[10px] text-slate-400">
                            {z.numberLabel}
                          </span>
                          <span className="block text-xs font-bold text-white truncate">
                            {visited ? z.name : 'Región en niebla'}
                          </span>
                        </div>
                        <Compass
                          className={`w-3.5 h-3.5 shrink-0 ${
                            visited ? 'text-[#00f3ff]' : 'text-slate-600'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/12">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular text-slate-400">
            <Diamond className="w-3.5 h-3.5 text-[#00f3ff]" />
            <span>Presiona [C] o [Esc] para volver a la isla</span>
          </span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="btn-ui px-6 py-2 rounded-md text-xs font-bold tracking-wider cursor-pointer whitespace-nowrap shrink-0"
          >
            Cerrar Códice
          </button>
        </div>
      </div>
    </div>
  );
}
