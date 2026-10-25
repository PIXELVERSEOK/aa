/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ventanas RPG integradas (Inventario Funcional, Habilidades y Diario de Misiones)
 * con estética retro pixel-art nítida, tipografía monoespaciada legible y acciones reales.
 */

import React, { useState } from 'react';
import {
  Backpack,
  CheckCircle2,
  Circle,
  Compass,
  Flame,
  KeyRound,
  Radio,
  ScrollText,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { PixelAbilityId, PixelverseProgressState } from '../memories/progressionState';
import { RPG_ITEMS, RPG_QUESTS, RpgItemSpec } from './rpgContent';

const EXPLORATION_ABILITY_BADGES: {
  id: PixelAbilityId;
  title: string;
  hotkey: string;
  desc: string;
}[] = [
  {
    id: 'phase-sprint',
    title: 'Impulso Terrestre',
    hotkey: 'SHIFT',
    desc: 'Carrera rápida en 4 direcciones.',
  },
  {
    id: 'phosphor-lantern',
    title: 'Lámpara de Fósforo',
    hotkey: 'L',
    desc: 'Ilumina cuevas oscuras y revela cofres ocultos.',
  },
  {
    id: 'secret-scanner',
    title: 'Escáner de Secretos',
    hotkey: 'R',
    desc: 'Pulso de sonar que detecta paredes falsas y reliquias.',
  },
  {
    id: 'circuit-welder',
    title: 'Soldador Lógico',
    hotkey: 'E',
    desc: 'Repara relés antiguos y terminales averiados.',
  },
  {
    id: 'pong-hoverboard',
    title: 'Tabla de Pong (1972)',
    hotkey: 'E',
    desc: 'Planeo sobre abismos entre el Sur y la Garganta.',
  },
  {
    id: 'star-shuttle',
    title: 'Nave Estelar (1978)',
    hotkey: 'AUTO',
    desc: 'Transporte orbital y acceso marítimo a los años 80.',
  },
];

export function RpgInventoryModal({
  progressState,
  allUnlocked,
  onClose,
  onUseScanner,
  onToggleLantern,
  onUseWelder,
  onEquipCosmetic,
}: {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onClose: () => void;
  onUseScanner: () => void;
  onToggleLantern: () => void;
  onUseWelder: () => void;
  onEquipCosmetic: (itemId: string | null) => void;
}) {
  const ownedIds = allUnlocked
    ? Object.keys(RPG_ITEMS)
    : progressState.rpg.inventoryItems;

  const ownedItems: RpgItemSpec[] = ownedIds
    .map((id) => RPG_ITEMS[id])
    .filter((it): it is RpgItemSpec => Boolean(it));

  const [selectedId, setSelectedId] = useState<string>(
    ownedItems[0]?.id ?? 'item-bitacora-cero'
  );
  const [inspectNotice, setInspectNotice] = useState<string | null>(null);

  const selectedItem = RPG_ITEMS[selectedId] || ownedItems[0];
  const equippedCosmetic = progressState.rpg.equippedCosmetic;
  const lanternOn = progressState.rpg.lanternActive;

  const renderCategoryIcon = (cat: RpgItemSpec['category']) => {
    switch (cat) {
      case 'herramienta':
        return <Wrench className="w-4 h-4 shrink-0" />;
      case 'llave':
        return <KeyRound className="w-4 h-4 shrink-0" />;
      case 'cosmetico':
        return <Sparkles className="w-4 h-4 shrink-0" />;
      default:
        return <Backpack className="w-4 h-4 shrink-0" />;
    }
  };

  const handleActionClick = (item: RpgItemSpec) => {
    if (item.usableAction === 'scanner') {
      retroAudio.uiClick();
      onClose();
      onUseScanner();
      return;
    }
    if (item.usableAction === 'lantern') {
      retroAudio.uiClick();
      onToggleLantern();
      setInspectNotice(
        !lanternOn
          ? 'Lámpara de Fósforo ENCENDIDA · Tu halo iluminará grutas oscuras.'
          : 'Lámpara de Fósforo APAGADA.'
      );
      return;
    }
    if (item.usableAction === 'welder') {
      retroAudio.uiClick();
      onClose();
      onUseWelder();
      return;
    }
    if (item.usableAction === 'equip-cosmetic') {
      retroAudio.shardCollect(2);
      const next = equippedCosmetic === item.id ? null : item.id;
      onEquipCosmetic(next);
      setInspectNotice(
        next
          ? `¡${item.name} equipado sobre Pixel!`
          : `${item.name} guardado en la mochila.`
      );
      return;
    }
    retroAudio.echoDiscover();
    setInspectNotice(`Pista: ${item.usageHint}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inventario y Habilidades de Pixel"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="gbc-retro-box max-w-3xl w-full p-5 sm:p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/25 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#f2c94c] uppercase">
              <Backpack className="w-4 h-4 shrink-0" />
              <span>MOCHILA DEL ARQUITECTO · OBJETOS Y HABILIDADES</span>
            </div>
            <h2 className="font-mono text-lg sm:text-xl font-bold text-white mt-0.5">
              Inventario Funcional ({ownedItems.length} / {Object.keys(RPG_ITEMS).length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar Inventario"
            className="text-white hover:text-amber-300 cursor-pointer font-mono font-bold px-2 py-1"
          >
            [X]
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Lista de objetos obtenidos */}
          <div className="md:col-span-6 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {ownedItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isEquipped = equippedCosmetic === item.id;
              const isLanternActive =
                item.id === 'item-lampara-fosforo' && lanternOn;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setSelectedId(item.id);
                    setInspectNotice(null);
                  }}
                  className={`w-full text-left px-3 py-2 border-2 font-mono text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-[#00f3ff] bg-cyan-950/70 text-white'
                      : 'border-white/20 bg-black/50 text-slate-200 hover:border-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ color: item.accentHex }}>
                      {renderCategoryIcon(item.category)}
                    </span>
                    <span className="truncate font-bold">{item.name}</span>
                  </div>
                  <span className="text-[10px] shrink-0 text-amber-300">
                    {isEquipped
                      ? '[EQUIPADO]'
                      : isLanternActive
                      ? '[ACTIVA]'
                      : item.shortCode}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inspector y botón de uso real */}
          <div className="md:col-span-6 border-2 border-white/25 bg-[#060a18] p-4 flex flex-col justify-between space-y-4">
            {selectedItem && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-mono tracking-wider uppercase font-bold"
                      style={{ color: selectedItem.accentHex }}
                    >
                      {selectedItem.categoryLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      CÓD: {selectedItem.shortCode}
                    </span>
                  </div>
                  <h3 className="font-mono text-base font-bold text-white">
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-200 leading-relaxed">
                    {selectedItem.description}
                  </p>
                  <p className="text-[11px] font-mono text-amber-200/90 pt-1 border-t border-white/15">
                    Uso: {selectedItem.usageHint}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {inspectNotice && (
                    <p className="text-[11px] font-mono text-[#39ff14] bg-emerald-950/50 border border-emerald-400/40 px-2.5 py-1.5">
                      {inspectNotice}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleActionClick(selectedItem)}
                    className="w-full py-2 px-4 border-2 border-white bg-[#0284c7] hover:bg-[#0ea5e9] text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-2"
                  >
                    {selectedItem.usableAction === 'scanner' && (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        <span>EMITIR PULSO ESCÁNER [R]</span>
                      </>
                    )}
                    {selectedItem.usableAction === 'lantern' && (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        <span>
                          {lanternOn
                            ? 'APAGAR LÁMPARA DE FÓSFORO [L]'
                            : 'ENCENDER LÁMPARA DE FÓSFORO [L]'}
                        </span>
                      </>
                    )}
                    {selectedItem.usableAction === 'welder' && (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        <span>USAR SOLDADOR EN EL MUNDO</span>
                      </>
                    )}
                    {selectedItem.usableAction === 'equip-cosmetic' && (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {equippedCosmetic === selectedItem.id
                            ? 'DESEQUIPAR DE PIXEL'
                            : 'EQUIPAR EN PIXEL'}
                        </span>
                      </>
                    )}
                    {selectedItem.usableAction === 'inspect' && (
                      <>
                        <Compass className="w-3.5 h-3.5" />
                        <span>CONSULTAR PISTA DE USO</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Habilidades de exploración desbloqueadas */}
        <div className="pt-3 border-t-2 border-dashed border-white/20 space-y-2">
          <p className="text-[11px] font-mono tracking-wider text-[#00f3ff] uppercase font-bold">
            Habilidades de Exploración Activas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EXPLORATION_ABILITY_BADGES.map((ab) => {
              const unlocked =
                allUnlocked ||
                progressState.island70s.abilitiesUnlocked.includes(ab.id);
              return (
                <div
                  key={ab.id}
                  className={`border px-2.5 py-2 font-mono text-[11px] ${
                    unlocked
                      ? 'border-[#00f3ff]/60 bg-cyan-950/35 text-white'
                      : 'border-white/10 bg-black/35 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{ab.title}</span>
                    <span className="text-[10px] text-amber-300">
                      {unlocked ? `[${ab.hotkey}]` : 'BLOQ'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                    {unlocked ? ab.desc : 'Explora misiones y santuarios para obtenerla.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/15 font-mono text-xs">
          <span className="text-slate-300">
            Atajos: [I] Inventario · [L] Lámpara · [R] Escáner
          </span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-white px-4 py-1.5 font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            VOLVER [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}

export function RpgQuestsModal({
  progressState,
  allUnlocked,
  onClose,
}: {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onClose: () => void;
}) {
  const completedCount = RPG_QUESTS.filter(
    (q) =>
      allUnlocked ||
      progressState.rpg.questStates[q.id] === 'completed' ||
      q.steps.every((s) => s.isDone(progressState, allUnlocked))
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diario de Misiones de Pixel"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="gbc-retro-box max-w-3xl w-full p-5 sm:p-6 space-y-4 my-auto">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/25 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#f2c94c] uppercase">
              <ScrollText className="w-4 h-4 shrink-0" />
              <span>REGISTRO DE AVENTURA · MISIONES Y ENCARGOS</span>
            </div>
            <h2 className="font-mono text-lg sm:text-xl font-bold text-white mt-0.5">
              Misiones del Archipiélago ({completedCount} / {RPG_QUESTS.length} Completadas)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar Misiones"
            className="text-white hover:text-amber-300 cursor-pointer font-mono font-bold px-2 py-1"
          >
            [X]
          </button>
        </div>

        <div className="max-h-[54vh] overflow-y-auto pr-1 space-y-3">
          {RPG_QUESTS.map((quest) => {
            const allStepsDone = quest.steps.every((s) =>
              s.isDone(progressState, allUnlocked)
            );
            const isCompleted =
              allUnlocked ||
              progressState.rpg.questStates[quest.id] === 'completed' ||
              allStepsDone;
            const isDiscovered =
              isCompleted ||
              Boolean(progressState.rpg.questStates[quest.id]) ||
              quest.steps.some((s) => s.isDone(progressState, allUnlocked));

            return (
              <article
                key={quest.id}
                className={`border-2 p-3.5 space-y-2 font-mono ${
                  isCompleted
                    ? 'border-emerald-400/70 bg-emerald-950/25'
                    : isDiscovered
                    ? 'border-[#00f3ff]/65 bg-[#070d1f]'
                    : 'border-white/20 bg-black/45'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className="text-[10px] tracking-wider uppercase font-bold"
                      style={{ color: quest.accentHex }}
                    >
                      {quest.code} · {quest.decadeTag}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {quest.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 border font-bold ${
                      isCompleted
                        ? 'border-emerald-400 text-emerald-300 bg-emerald-950/60'
                        : isDiscovered
                        ? 'border-amber-300 text-amber-200 bg-amber-950/50'
                        : 'border-slate-500 text-slate-300'
                    }`}
                  >
                    {isCompleted ? 'COMPLETADA' : isDiscovered ? 'EN CURSO' : 'DISPONIBLE'}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{quest.summary}</p>

                <div className="space-y-1 pt-1">
                  {quest.steps.map((step, idx) => {
                    const done = step.isDone(progressState, allUnlocked);
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-[11px] text-slate-200"
                      >
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff14] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <span className={done ? 'text-emerald-200 line-through' : ''}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-1.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">Encargo de: {quest.giverName}</span>
                  <span className="text-amber-300 font-bold">
                    Recompensa: {quest.rewardSummary}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/15 font-mono text-xs">
          <span className="text-slate-300">
            Conversa con NPCs y explora interiores para avanzar misiones
          </span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-white px-4 py-1.5 font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            CERRAR [Q]
          </button>
        </div>
      </div>
    </div>
  );
}
