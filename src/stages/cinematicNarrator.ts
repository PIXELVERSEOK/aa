/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Director de Narración por Voz para la Cinemática Inicial de PIXELVERSE.
 * Reproduce locución de estudio en español sincronizada con cada escena/plano,
 * gestiona el desbloqueo de audio del navegador y ofrece respaldo Web Speech API.
 */

import { Howl, Howler } from 'howler';
import { bgmEngine } from '../audio/bgmEngine';

export type NarrationClipId =
  | '01-arcade-universe'
  | '02a-bowser'
  | '02b-eggman'
  | '02c-dk-krool'
  | '02d-pacman'
  | '02e-legends'
  | '03-collapse'
  | '04-super-cupa'
  | '05-pixel-birth'
  | '06-pong-link';

const CLIP_FILES: Record<NarrationClipId, string> = {
  '01-arcade-universe': '/audio/intro/01-arcade-universe.mp3',
  '02a-bowser': '/audio/intro/02a-bowser.mp3',
  '02b-eggman': '/audio/intro/02b-eggman.mp3',
  '02c-dk-krool': '/audio/intro/02c-dk-krool.mp3',
  '02d-pacman': '/audio/intro/02d-pacman.mp3',
  '02e-legends': '/audio/intro/02e-legends.mp3',
  '03-collapse': '/audio/intro/03-collapse.mp3',
  '04-super-cupa': '/audio/intro/04-super-cupa.mp3',
  '05-pixel-birth': '/audio/intro/05-pixel-birth.mp3',
  '06-pong-link': '/audio/intro/06-pong-link.mp3',
};

class CinematicVoiceNarrator {
  private howls: Map<NarrationClipId, Howl> = new Map();
  private loadFailed: Set<NarrationClipId> = new Set();
  private currentClipId: NarrationClipId | null = null;
  private activeSpeaking = false;
  private speechFallbackTimer: number | null = null;
  private preloaded = false;

  public preloadAll(): void {
    if (typeof window === 'undefined' || this.preloaded) return;
    this.preloaded = true;

    (Object.keys(CLIP_FILES) as NarrationClipId[]).forEach((clipId) => {
      const howl = new Howl({
        src: [CLIP_FILES[clipId]],
        format: ['mp3'],
        volume: 0.96,
        preload: true,
        onloaderror: () => {
          this.loadFailed.add(clipId);
        },
      });
      this.howls.set(clipId, howl);
    });
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
      bgmEngine.ensurePlaying();
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        await Howler.ctx.resume();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
      return !Howler.ctx || Howler.ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public playClip(
    clipId: NarrationClipId,
    fallbackSpanishText: string,
    options?: {
      onAutoplayBlocked?: () => void;
      onEnded?: () => void;
    }
  ): void {
    this.preloadAll();
    this.stopCurrent();

    this.currentClipId = clipId;
    const howl = this.howls.get(clipId);

    if (!howl || this.loadFailed.has(clipId)) {
      this.playSpeechSynthesisFallback(fallbackSpanishText, options?.onEnded);
      return;
    }

    this.activeSpeaking = true;

    howl.off('end');
    howl.off('playerror');

    howl.once('end', () => {
      if (this.currentClipId === clipId) {
        this.activeSpeaking = false;
        options?.onEnded?.();
      }
    });

    howl.once('playerror', () => {
      if (this.currentClipId === clipId) {
        this.activeSpeaking = false;
        options?.onAutoplayBlocked?.();
      }
    });

    howl.stop();
    howl.play();
  }

  private playSpeechSynthesisFallback(
    text: string,
    onEnded?: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.activeSpeaking = false;
      onEnded?.();
      return;
    }

    if (bgmEngine.isMuted()) {
      this.activeSpeaking = false;
      onEnded?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'es-ES';
      utter.rate = 0.96;
      utter.pitch = 0.92;
      utter.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('es') && /google|natural|neural/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('es'));
      if (spanishVoice) {
        utter.voice = spanishVoice;
      }

      this.activeSpeaking = true;

      const finish = () => {
        if (this.speechFallbackTimer !== null) {
          window.clearTimeout(this.speechFallbackTimer);
          this.speechFallbackTimer = null;
        }
        this.activeSpeaking = false;
        onEnded?.();
      };

      utter.onend = finish;
      utter.onerror = finish;

      // Seguridad por si algún navegador no dispara onend
      const estimatedMs = Math.max(4000, text.length * 72);
      this.speechFallbackTimer = window.setTimeout(finish, estimatedMs);

      window.speechSynthesis.speak(utter);
    } catch {
      this.activeSpeaking = false;
      onEnded?.();
    }
  }

  public isSpeaking(): boolean {
    if (!this.activeSpeaking) return false;
    if (this.currentClipId) {
      const howl = this.howls.get(this.currentClipId);
      if (howl && !this.loadFailed.has(this.currentClipId)) {
        return howl.playing();
      }
    }
    return this.activeSpeaking;
  }

  public stopCurrent(): void {
    this.activeSpeaking = false;
    this.currentClipId = null;

    if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechFallbackTimer);
      this.speechFallbackTimer = null;
    }

    this.howls.forEach((h) => {
      if (h.playing()) {
        h.stop();
      }
    });

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
