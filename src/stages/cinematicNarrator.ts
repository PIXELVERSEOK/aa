/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guion cronometrado, capítulos y dirección de voz en español para
 * la cinemática de apertura «Cuando el mundo olvidó jugar» (02:30 / 150s).
 */

import { Howler } from 'howler';
import { bgmEngine } from '../audio/bgmEngine';

export interface CinematicSceneChapter {
  index: number;
  id: string;
  numberLabel: string;
  title: string;
  startSec: number;
  endSec: number;
}

export interface CinematicNarrationBeat {
  id: string;
  sceneIndex: number;
  startSec: number;
  endSec: number;
  subtitle: string;
  speechText: string;
  rate?: number;
  pitch?: number;
}

export const TOTAL_CINEMATIC_DURATION_SEC = 150.0;

export const CINEMATIC_SCENE_CHAPTERS: CinematicSceneChapter[] = [
  {
    index: 0,
    id: 'silent-arcade',
    numberLabel: '01',
    title: 'El silencio después de la última partida',
    startSec: 0,
    endSec: 18,
  },
  {
    index: 1,
    id: 'human-memories',
    numberLabel: '02',
    title: 'Los recuerdos de la humanidad',
    startSec: 18,
    endSec: 42,
  },
  {
    index: 2,
    id: 'cosmic-echoes',
    numberLabel: '03',
    title: 'Los ecos de otras épocas',
    startSec: 42,
    endSec: 65,
  },
  {
    index: 3,
    id: 'pixelverse-discovery',
    numberLabel: '04',
    title: 'El descubrimiento de PIXELVERSE',
    startSec: 65,
    endSec: 88,
  },
  {
    index: 4,
    id: 'the-mission',
    numberLabel: '05',
    title: 'La misión · El Cronoscopio',
    startSec: 88,
    endSec: 112,
  },
  {
    index: 5,
    id: 'the-origins',
    numberLabel: '06',
    title: 'Los orígenes · 1970s',
    startSec: 112,
    endSec: 132,
  },
  {
    index: 6,
    id: 'glitch-trail',
    numberLabel: '07',
    title: 'El Sendero Glitch',
    startSec: 132,
    endSec: 144,
  },
  {
    index: 7,
    id: 'title-beginning',
    numberLabel: '08',
    title: 'El comienzo',
    startSec: 144,
    endSec: 150,
  },
];

export const CINEMATIC_NARRATION_BEATS: CinematicNarrationBeat[] = [
  // Escena 1 (00:00 - 00:18)
  {
    id: 'sc1-a',
    sceneIndex: 0,
    startSec: 6.6,
    endSec: 11.5,
    subtitle: 'Hubo un tiempo en que bastaba una pantalla…',
    speechText: 'Hubo un tiempo en que bastaba una pantalla...',
    rate: 0.87,
    pitch: 0.84,
  },
  {
    id: 'sc1-b',
    sceneIndex: 0,
    startSec: 12.7,
    endSec: 17.2,
    subtitle: '…para abrir un universo entero.',
    speechText: 'para abrir un universo entero.',
    rate: 0.86,
    pitch: 0.82,
  },

  // Escena 2 (00:18 - 00:42)
  {
    id: 'sc2-a',
    sceneIndex: 1,
    startSec: 19.0,
    endSec: 24.2,
    subtitle: 'Pero un día, los recuerdos comenzaron a desaparecer.',
    speechText: 'Pero un día, los recuerdos comenzaron a desaparecer.',
    rate: 0.88,
    pitch: 0.84,
  },
  {
    id: 'sc2-b',
    sceneIndex: 1,
    startSec: 25.1,
    endSec: 29.4,
    subtitle: 'Los juegos perdieron sus nombres.',
    speechText: 'Los juegos perdieron sus nombres.',
    rate: 0.87,
    pitch: 0.83,
  },
  {
    id: 'sc2-c',
    sceneIndex: 1,
    startSec: 30.3,
    endSec: 35.0,
    subtitle: 'Las máquinas olvidaron sus sonidos.',
    speechText: 'Las máquinas olvidaron sus sonidos.',
    rate: 0.87,
    pitch: 0.82,
  },
  {
    id: 'sc2-d',
    sceneIndex: 1,
    startSec: 36.1,
    endSec: 40.4,
    subtitle: 'Y el mundo olvidó cómo jugar.',
    speechText: 'Y el mundo olvidó cómo jugar.',
    rate: 0.83,
    pitch: 0.79,
  },

  // Escena 3 (00:42 - 01:05)
  {
    id: 'sc3-a',
    sceneIndex: 2,
    startSec: 47.6,
    endSec: 55.8,
    subtitle: 'Sin embargo… no todos los recuerdos se perdieron.',
    speechText: 'Sin embargo... no todos los recuerdos se perdieron.',
    rate: 0.87,
    pitch: 0.85,
  },

  // Escena 4 (01:05 - 01:28)
  {
    id: 'sc4-a',
    sceneIndex: 3,
    startSec: 68.4,
    endSec: 75.2,
    subtitle: 'En algún lugar, más allá de lo que el mundo recuerda…',
    speechText: 'En algún lugar, más allá de lo que el mundo recuerda...',
    rate: 0.88,
    pitch: 0.85,
  },
  {
    id: 'sc4-b',
    sceneIndex: 3,
    startSec: 76.8,
    endSec: 84.5,
    subtitle: '…las historias todavía esperan ser encontradas.',
    speechText: 'las historias todavía esperan ser encontradas.',
    rate: 0.87,
    pitch: 0.84,
  },

  // Escena 5 (01:28 - 01:52)
  {
    id: 'sc5-a',
    sceneIndex: 4,
    startSec: 91.2,
    endSec: 97.8,
    subtitle: 'No podemos recuperar lo que hemos olvidado…',
    speechText: 'No podemos recuperar lo que hemos olvidado...',
    rate: 0.87,
    pitch: 0.84,
  },
  {
    id: 'sc5-b',
    sceneIndex: 4,
    startSec: 99.6,
    endSec: 107.6,
    subtitle: '…si no nos atrevemos a volver a descubrirlo.',
    speechText: 'si no nos atrevemos a volver a descubrirlo.',
    rate: 0.86,
    pitch: 0.86,
  },

  // Escena 6 (01:52 - 02:12)
  {
    id: 'sc6-a',
    sceneIndex: 5,
    startSec: 114.0,
    endSec: 118.6,
    subtitle: 'Cada época guarda una historia.',
    speechText: 'Cada época guarda una historia.',
    rate: 0.89,
    pitch: 0.86,
  },
  {
    id: 'sc6-b',
    sceneIndex: 5,
    startSec: 119.5,
    endSec: 124.4,
    subtitle: 'Cada juego conserva una memoria.',
    speechText: 'Cada juego conserva una memoria.',
    rate: 0.89,
    pitch: 0.86,
  },
  {
    id: 'sc6-c',
    sceneIndex: 5,
    startSec: 125.4,
    endSec: 130.8,
    subtitle: 'Y cada memoria merece ser encontrada.',
    speechText: 'Y cada memoria merece ser encontrada.',
    rate: 0.87,
    pitch: 0.85,
  },

  // Escena 7 (02:12 - 02:24)
  {
    id: 'sc7-a',
    sceneIndex: 6,
    startSec: 134.2,
    endSec: 140.4,
    subtitle: 'La memoria no se recuperará sola.',
    speechText: 'La memoria no se recuperará sola.',
    rate: 0.88,
    pitch: 0.84,
  },
];

export function getChapterAtTime(elapsedSec: number): CinematicSceneChapter {
  for (let i = CINEMATIC_SCENE_CHAPTERS.length - 1; i >= 0; i--) {
    if (elapsedSec >= CINEMATIC_SCENE_CHAPTERS[i].startSec) {
      return CINEMATIC_SCENE_CHAPTERS[i];
    }
  }
  return CINEMATIC_SCENE_CHAPTERS[0];
}

export function getActiveSubtitleAtTime(elapsedSec: number): CinematicNarrationBeat | null {
  for (let i = 0; i < CINEMATIC_NARRATION_BEATS.length; i++) {
    const b = CINEMATIC_NARRATION_BEATS[i];
    if (elapsedSec >= b.startSec && elapsedSec <= b.endSec) {
      return b;
    }
  }
  return null;
}

class CinematicVoiceNarrator {
  private spokenBeatIds: Set<string> = new Set();
  private activeSpeaking = false;
  private speechFallbackTimer: number | null = null;
  private cachedVoice: SpeechSynthesisVoice | null = null;

  public preloadAll(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;
        this.cachedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('es') &&
              /natural|neural|alvaro|jorge|alonso|diego|pablo|google español/i.test(v.name)
          ) ||
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('es') &&
              /google|microsoft|apple|paulina|monica|mónica/i.test(v.name)
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('es')) ||
          null;
      };
      loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    } catch {
      // Continuar silenciosamente con subtítulos si el navegador restringe SpeechSynthesis
    }
  }

  public isAudioUnlocked(): boolean {
    if (typeof window === 'undefined') return true;
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
      .userActivation;
    if (ua && ua.hasBeenActive) return true;
    if (Howler.ctx && Howler.ctx.state === 'running') return true;
    return false;
  }

  public async unlockAudioContext(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        await Howler.ctx.resume();
      }
      this.preloadAll();
      return !Howler.ctx || Howler.ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public resetTimeline(fromSec = 0): void {
    this.stopCurrent();
    this.spokenBeatIds.clear();
    // Si el usuario adelanta en la línea de tiempo, marcar los beats previos como ya emitidos
    for (const beat of CINEMATIC_NARRATION_BEATS) {
      if (beat.endSec < fromSec) {
        this.spokenBeatIds.add(beat.id);
      }
    }
  }

  public syncTimeline(elapsedSec: number, isPaused: boolean): void {
    if (isPaused || bgmEngine.isMuted()) return;

    for (const beat of CINEMATIC_NARRATION_BEATS) {
      if (
        elapsedSec >= beat.startSec &&
        elapsedSec < beat.endSec - 0.6 &&
        !this.spokenBeatIds.has(beat.id)
      ) {
        this.spokenBeatIds.add(beat.id);
        this.speakBeat(beat);
        break;
      }
    }
  }

  private speakBeat(beat: CinematicNarrationBeat): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (bgmEngine.isMuted()) return;

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(beat.speechText);
      utter.lang = this.cachedVoice?.lang || 'es-ES';
      utter.rate = beat.rate ?? 0.87;
      utter.pitch = beat.pitch ?? 0.84;
      utter.volume = 0.95;

      if (!this.cachedVoice) {
        this.preloadAll();
      }
      if (this.cachedVoice) {
        utter.voice = this.cachedVoice;
      }

      this.activeSpeaking = true;

      const finish = () => {
        if (this.speechFallbackTimer !== null) {
          window.clearTimeout(this.speechFallbackTimer);
          this.speechFallbackTimer = null;
        }
        this.activeSpeaking = false;
      };

      utter.onend = finish;
      utter.onerror = finish;

      const maxMs = Math.max(2500, (beat.endSec - beat.startSec + 0.6) * 1000);
      this.speechFallbackTimer = window.setTimeout(finish, maxMs);

      window.speechSynthesis.speak(utter);
    } catch {
      this.activeSpeaking = false;
    }
  }

  public isSpeaking(): boolean {
    return this.activeSpeaking;
  }

  public stopCurrent(): void {
    this.activeSpeaking = false;
    if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechFallbackTimer);
      this.speechFallbackTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar errores de cancelación
      }
    }
  }
}

export const cinematicNarrator = new CinematicVoiceNarrator();
