/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prólogo Cinematográfico 3D de PIXELVERSE:
 * «CUANDO EL MUNDO OLVIDÓ JUGAR» (02:30 / 150s · 8 Escenas Consecutivas).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FastForward,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';
import { cinematicAudio } from './cinematicAudio';
import {
  CINEMATIC_SCENE_CHAPTERS,
  cinematicNarrator,
  getActiveSubtitleAtTime,
  getChapterAtTime,
  TOTAL_CINEMATIC_DURATION_SEC,
} from './cinematicNarrator';
import { CinematicWorldController, createCinematicWorld3D } from './cinematicWorld3D';

function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_CINEMATIC_DURATION_SEC, Math.floor(sec)));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function EpicCinematicStage({
  runKey,
  onComplete,
}: {
  runKey: number;
  onComplete: () => void;
  onEnterPong?: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<CinematicWorldController | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [awaitingAudioUnlock, setAwaitingAudioUnlock] = useState<boolean>(
    () => !cinematicNarrator.isAudioUnlocked()
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => bgmEngine.isMuted());

  // Estado liviano sincronizado ~10 veces por segundo para subtítulos, capítulo y barra de tiempo
  const [uiTimeSec, setUiTimeSec] = useState<number>(0);

  const playbackRef = useRef<{
    elapsedSec: number;
    paused: boolean;
    awaitingUnlock: boolean;
    finished: boolean;
    lastUiSyncSec: number;
  }>({
    elapsedSec: 0,
    paused: false,
    awaitingUnlock: !cinematicNarrator.isAudioUnlocked(),
    finished: false,
    lastUiSyncSec: -1,
  });

  useEffect(() => {
    const unsub = bgmEngine.subscribe((muted) => {
      setIsMuted(muted);
      if (muted) {
        cinematicAudio.stopAll();
        cinematicNarrator.stopCurrent();
      }
    });
    return unsub;
  }, []);

  const finishCinematic = useCallback(() => {
    if (playbackRef.current.finished) return;
    playbackRef.current.finished = true;
    cinematicNarrator.stopCurrent();
    cinematicAudio.stopAll();
    bgmEngine.setDuckFactor(1.0);
    onCompleteRef.current();
  }, []);

  const handleBeginPrologue = useCallback(() => {
    retroAudio.unlock();
    cinematicAudio.unlock();
    void cinematicNarrator.unlockAudioContext();

    // Silenciar por completo el loop arcade de fondo mientras dura la partitura orquestal
    bgmEngine.setDuckFactor(0);

    playbackRef.current.awaitingUnlock = false;
    playbackRef.current.paused = false;
    playbackRef.current.elapsedSec = 0;
    playbackRef.current.finished = false;
    playbackRef.current.lastUiSyncSec = -1;

    cinematicAudio.resetTimeline(0);
    cinematicNarrator.resetTimeline(0);

    setAwaitingAudioUnlock(false);
    setIsPaused(false);
    setUiTimeSec(0);
  }, []);

  const handleSeekTo = useCallback((targetSec: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_CINEMATIC_DURATION_SEC - 0.2, targetSec));
    playbackRef.current.elapsedSec = clamped;
    playbackRef.current.lastUiSyncSec = clamped;
    cinematicAudio.resetTimeline(clamped);
    cinematicNarrator.resetTimeline(clamped);
    setUiTimeSec(clamped);
    if (worldRef.current) {
      worldRef.current.renderAtTime(clamped, 0.016);
    }
  }, []);

  const handleNextChapter = useCallback(() => {
    const cur = playbackRef.current.elapsedSec;
    const nextChap = CINEMATIC_SCENE_CHAPTERS.find((c) => c.startSec > cur + 0.4);
    if (nextChap) {
      handleSeekTo(nextChap.startSec);
    } else {
      finishCinematic();
    }
  }, [finishCinematic, handleSeekTo]);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      playbackRef.current.paused = next;
      if (next) {
        cinematicAudio.stopAll();
        cinematicNarrator.stopCurrent();
      } else {
        cinematicAudio.resetTimeline(playbackRef.current.elapsedSec);
        cinematicNarrator.resetTimeline(playbackRef.current.elapsedSec);
      }
      return next;
    });
  }, []);

  // Reinicio limpio cuando cambia runKey (inicio único o repetición desde el Selector Maestro)
  useEffect(() => {
    cinematicNarrator.preloadAll();
    bgmEngine.setDuckFactor(0);

    const unlocked = cinematicNarrator.isAudioUnlocked();
    playbackRef.current = {
      elapsedSec: 0,
      paused: false,
      awaitingUnlock: !unlocked,
      finished: false,
      lastUiSyncSec: -1,
    };
    setAwaitingAudioUnlock(!unlocked);
    setIsPaused(false);
    setUiTimeSec(0);

    cinematicAudio.resetTimeline(0);
    cinematicNarrator.resetTimeline(0);
    if (unlocked) {
      cinematicAudio.unlock();
    }

    return () => {
      cinematicNarrator.stopCurrent();
      cinematicAudio.stopAll();
      bgmEngine.setDuckFactor(1.0);
    };
  }, [runKey]);

  // Inicialización única del lienzo WebGL Three.js y bucle con cadencia afterDraw en Software GL
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const world = createCinematicWorld3D(mountEl);
    worldRef.current = world;

    let frameId = 0;
    let isTimeout = false;
    let disposed = false;
    let lastNow = performance.now();

    const onResize = () => {
      if (!mountEl || disposed) return;
      world.resize(mountEl.clientWidth || window.innerWidth, mountEl.clientHeight || window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = world.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            isTimeout = true;
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            isTimeout = true;
            frameId = window.setTimeout(cb, 80);
          }
        };
        isTimeout = true;
        frameId = window.setTimeout(poll, 5);
      } else {
        isTimeout = true;
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, Math.min(0.25, (now - lastNow) / 1000));
      lastNow = now;

      const pb = playbackRef.current;
      if (!pb.awaitingUnlock && !pb.paused && !pb.finished) {
        pb.elapsedSec += rawDt;

        cinematicAudio.syncTimeline(pb.elapsedSec, false);
        cinematicNarrator.syncTimeline(pb.elapsedSec, false);

        if (Math.abs(pb.elapsedSec - pb.lastUiSyncSec) >= 0.1) {
          pb.lastUiSyncSec = pb.elapsedSec;
          setUiTimeSec(pb.elapsedSec);
        }

        if (pb.elapsedSec >= TOTAL_CINEMATIC_DURATION_SEC) {
          world.renderAtTime(TOTAL_CINEMATIC_DURATION_SEC, rawDt);
          finishCinematic();
          return;
        }
      }

      world.renderAtTime(pb.elapsedSec, rawDt);

      if (world.isSoftwareGl) {
        afterDraw(tick);
      } else {
        isTimeout = false;
        frameId = requestAnimationFrame(tick);
      }
    }

    lastNow = performance.now();
    tick();

    return () => {
      disposed = true;
      if (isTimeout) {
        window.clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', onResize);
      worldRef.current = null;
      world.dispose();
    };
  }, [finishCinematic]);

  // Atajos de teclado cinematográficos (Esc = Omitir, Espacio = Pausa/Inicio, H = Modo Cine)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishCinematic();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (playbackRef.current.awaitingUnlock) {
          e.preventDefault();
          handleBeginPrologue();
        } else if (e.key === ' ') {
          e.preventDefault();
          handleTogglePause();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        setHudCollapsed((prev) => !prev);
      } else if (e.key === 'ArrowRight' && !playbackRef.current.awaitingUnlock) {
        handleNextChapter();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishCinematic, handleBeginPrologue, handleNextChapter, handleTogglePause]);

  const activeChapter = getChapterAtTime(uiTimeSec);
  const activeSubtitle = getActiveSubtitleAtTime(uiTimeSec);

  // Efectos ópticos puntuales de transición entre planos clave:
  // - 131.85s–132.45s: Fragmento digital que corta la imagen hacia El Sendero Glitch
  // - 143.85s–144.45s: Destello del fragmento final de luz hacia la oscuridad del título
  const isGlitchTransition = uiTimeSec >= 131.85 && uiTimeSec <= 132.45;
  const isFinalLightFlash = uiTimeSec >= 143.85 && uiTimeSec <= 144.5;
  const isScene8TitleVisible = uiTimeSec >= 144.35 && uiTimeSec <= 149.65;
  const isFinalBlackFade = uiTimeSec >= 149.2;

  const progressPct = Math.min(100, (uiTimeSec / TOTAL_CINEMATIC_DURATION_SEC) * 100);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#010206] select-none">
      {/* Contenedor dedicado y aislado para el lienzo WebGL Three.js */}
      <div
        ref={mountRef}
        id="pixelverse-cinematic-webgl"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Franjas panorámicas cinematográficas sutiles (Widescreen Scope) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[7vh] min-h-[28px] bg-gradient-to-b from-black via-black/90 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[11vh] min-h-[52px] bg-gradient-to-t from-black via-black/92 to-transparent z-10"
      />

      {/* Corte de fragmento digital hacia El Sendero Glitch (02:12) */}
      {isGlitchTransition && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-cyan-300/25 mix-blend-screen"
        />
      )}

      {/* Destello del fragmento de luz hacia la escena final (02:24) */}
      {isFinalLightFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-amber-100/75 transition-opacity duration-300"
        />
      )}

      {/* ESCENA 8 (02:24–02:30): Revelación Monumental del Logotipo y Subtítulo Final */}
      {isScene8TitleVisible && !awaitingAudioUnlock && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <h1
            className="font-display font-bold text-slate-50 tracking-[0.28em] uppercase drop-shadow-[0_6px_28px_rgba(56,189,248,0.45)]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5.25rem)', textWrap: 'balance' }}
          >
            PIXELVERSE
          </h1>
          <div className="w-24 h-px bg-amber-200/50 my-5" aria-hidden="true" />
          <p
            className="font-sans font-semibold text-amber-100/95 tracking-[0.18em] uppercase max-w-2xl leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
            style={{ fontSize: 'clamp(0.78rem, 1.35vw, 1.02rem)', textWrap: 'balance' }}
          >
            La memoria de los videojuegos está en tus manos.
          </p>
        </div>
      )}

      {/* Fundido final suave hacia la pantalla de título del juego */}
      {isFinalBlackFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-500"
        />
      )}

      {/* Subtítulos cinematográficos sobrios y legibles (sin cajas invasivas) */}
      {!awaitingAudioUnlock && activeSubtitle && !isScene8TitleVisible && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-6 transition-all duration-300 ${
            hudCollapsed ? 'bottom-10' : 'bottom-24'
          }`}
        >
          <p
            id="cinematic-subtitle"
            className="max-w-3xl text-center font-sans font-semibold text-slate-100 text-base sm:text-lg md:text-xl leading-relaxed tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.98)]"
            style={{ textWrap: 'balance' }}
          >
            «{activeSubtitle.subtitle}»
          </p>
        </div>
      )}

      {/* Telón inicial minimalista (solo cuando el navegador bloquea el inicio automático de audio) */}
      {awaitingAudioUnlock && (
        <div
          onClick={handleBeginPrologue}
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#010206] px-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-xl w-full text-center space-y-6 py-10 px-6 border border-slate-800/90 bg-[#050811]"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 tracking-widest uppercase">
              <span>PIXELVERSE</span>
              <span aria-hidden="true">·</span>
              <span>Prólogo Cinematográfico</span>
            </div>

            <div className="space-y-3">
              <h2
                className="font-display font-bold text-2xl sm:text-4xl text-slate-100 tracking-wide"
                style={{ textWrap: 'balance' }}
              >
                Cuando el mundo olvidó jugar
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                Activá el audio para escuchar la partitura orquestal original, los ecos
                históricos y la narración en español.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleBeginPrologue}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-300 hover:bg-amber-200 text-slate-950 font-sans font-semibold text-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar prólogo</span>
              </button>

              <button
                type="button"
                onClick={finishCinematic}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-sans font-semibold text-sm transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span>Omitir cinemática</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dock inferior unificado y plegable (Cero backdrop-filter sobre WebGL, cero obstrucción central) */}
      {!awaitingAudioUnlock && (
        <div
          id="cinematic-hud"
          className={`absolute left-1/2 -translate-x-1/2 bottom-3 w-[min(920px,94vw)] z-30 transition-transform duration-300 ${
            hudCollapsed ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
          }`}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setHudCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-sans text-slate-300 hover:text-white bg-[#070b14] border-t border-x border-slate-800 cursor-pointer"
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Controles (H)</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Modo cine (H)</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-[#070b14] border border-slate-800 px-4 py-2.5 flex flex-col gap-2">
            {/* Barra de tiempo interactiva */}
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-[11px] text-slate-300 shrink-0">
                {formatTimecode(uiTimeSec)}
              </span>

              <input
                type="range"
                min={0}
                max={TOTAL_CINEMATIC_DURATION_SEC}
                step={0.2}
                value={Math.min(TOTAL_CINEMATIC_DURATION_SEC, uiTimeSec)}
                onChange={(e) => handleSeekTo(Number(e.target.value))}
                aria-label="Línea de tiempo de la cinemática"
                className="w-full h-1.5 accent-amber-300 bg-slate-800 cursor-pointer"
              />

              <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                02:30
              </span>

              <span className="sr-only">{Math.round(progressPct)}%</span>
            </div>

            {/* Fila inferior de metadatos limpios (sin cápsulas) y controles reales */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                <span className="font-mono tabular-nums text-amber-200/90">
                  {activeChapter.numberLabel}.
                </span>
                <span className="truncate text-slate-200">{activeChapter.title}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition-colors"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Reanudar</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pausar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextChapter}
                  title="Avanzar a la siguiente escena (Flecha derecha)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition-colors"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Escena siguiente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    bgmEngine.toggleMute();
                  }}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-sans font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-amber-200" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={finishCinematic}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-semibold text-slate-950 bg-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Omitir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
