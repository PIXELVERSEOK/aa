/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banda sonora orquestal original y diseño sonoro diegético en Web Audio para
 * la cinemática de apertura «Cuando el mundo olvidó jugar» (00:00 – 02:30).
 *
 * Progresión musical y emocional:
 * - Escena 1 (00:00–00:18): Silencio de sala vacía, clic mecánico de botón arcade,
 *   nota aislada de piano íntimo y destello eléctrico CRT que se extingue.
 * - Escena 2 (00:18–00:42): Violonchelos graves, pulso analógico y coro lejano;
 *   extracción cristalina y corte a SILENCIO TOTAL en «Y el mundo olvidó cómo jugar».
 * - Escena 3 (00:42–01:05): Cristales de memoria extinguiéndose en el vacío cósmico,
 *   pulso cálido de los 70 y motivo ascendente de piano y cuerdas al formarse el glifo.
 * - Escena 4 (01:05–01:28): Expansión sinfónica con trompas, cuerdas y brisa oceánica
 *   al emerger sobre la Isla del Origen y el santuario de PIXELVERSE.
 * - Escena 5 (01:28–01:52): Engranajes del Cronoscopio, ignición del núcleo y tres
 *   pulsos luminosos secuenciales despertando gabinetes en la isla.
 * - Escena 6 (01:52–02:12): Cruce de portal dimensional, calidez años 70 con citas
 *   musicales auténticas de Pong (1972) y Space Invaders (1978) integradas en la orquesta.
 * - Escena 7 (02:12–02:24): Clímax híbrido orquestal + percusión electrónica en El Sendero Glitch.
 * - Escena 8 (02:24–02:30): Firma sonora original de PIXELVERSE y resolución suspendida.
 */

import { bgmEngine } from '../audio/bgmEngine';

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ScheduledScoreCue {
  id: string;
  timeSec: number;
  run: (engine: CinematicScoreDirector) => void;
}

class CinematicScoreDirector {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeSources: Set<AudioScheduledSourceNode> = new Set();
  private firedCues: Set<string> = new Set();
  private cues: ScheduledScoreCue[] = [];

  constructor() {
    this.buildScoreCueList();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        const ctx = new AudioCtx();
        this.ctx = ctx;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 18;
        comp.ratio.value = 3.5;
        comp.attack.value = 0.008;
        comp.release.value = 0.24;
        comp.connect(ctx.destination);

        const master = ctx.createGain();
        master.gain.value = 0.92;
        master.connect(comp);
        this.masterGain = master;

        const music = ctx.createGain();
        music.gain.value = 1.0;
        music.connect(master);
        this.musicBus = music;

        const sfx = ctx.createGain();
        sfx.gain.value = 1.0;
        sfx.connect(master);
        this.sfxBus = sfx;

        // Reverberación algorítmica de sala sinfónica / salón vacío (2.7s estéreo)
        const irLen = Math.floor(ctx.sampleRate * 2.7);
        const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
        let seed = 48271;
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuf.getChannelData(ch);
          let lp = 0;
          for (let i = 0; i < irLen; i++) {
            seed = (seed * 16807) % 2147483647;
            const white = (seed / 1073741824) - 1;
            const t = i / ctx.sampleRate;
            const early = i < ctx.sampleRate * 0.045 && i % 420 < 8 ? 0.55 : 1.0;
            const env = Math.pow(1 - t / 2.7, 2.65) * early;
            lp = lp * 0.72 + white * 0.28;
            data[i] = lp * env * 0.5;
          }
        }
        const conv = ctx.createConvolver();
        conv.buffer = irBuf;
        const wet = ctx.createGain();
        wet.gain.value = 0.38;
        conv.connect(wet);
        wet.connect(master);
        this.reverbConvolver = conv;
        this.reverbWet = wet;

        // Buffer reutilizable de ruido blanco (2.0s)
        const nLen = Math.floor(ctx.sampleRate * 2.0);
        const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nLen; i++) {
          seed = (seed * 16807) % 2147483647;
          nData[i] = (seed / 1073741824) - 1;
        }
        this.noiseBuffer = nBuf;
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock(): void {
    this.ensureContext();
  }

  private track(node: AudioScheduledSourceNode): void {
    this.activeSources.add(node);
    node.onended = () => {
      this.activeSources.delete(node);
    };
  }

  public resetTimeline(fromSec = 0): void {
    this.stopAll();
    this.firedCues.clear();
    for (const cue of this.cues) {
      if (cue.timeSec < fromSec - 0.12) {
        this.firedCues.add(cue.id);
      }
    }
    if (this.ctx && this.musicBus && this.masterGain) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(1.0, now);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.92, now);
    }
  }

  public stopAll(): void {
    const list = Array.from(this.activeSources);
    this.activeSources.clear();
    for (const src of list) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Fuente ya detenida
      }
    }
  }

  public syncTimeline(elapsedSec: number, isPaused: boolean): void {
    if (isPaused || bgmEngine.isMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    for (const cue of this.cues) {
      if (elapsedSec >= cue.timeSec && !this.firedCues.has(cue.id)) {
        this.firedCues.add(cue.id);
        // Evitar disparar cues muy atrasados si hubo salto brusco de pestaña
        if (elapsedSec - cue.timeSec <= 1.25) {
          cue.run(this);
        }
      }
    }
  }

  /* =========================================================================
     INSTRUMENTOS ORQUESTALES Y DISEÑO SONORO DIEGÉTICO
     ========================================================================= */

  public playFeltPiano(midi: number, dur: number, vel = 0.08, delay = 0, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, t0);
    panner.connect(this.musicBus);
    if (this.reverbConvolver) panner.connect(this.reverbConvolver);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + 0.016);
    env.gain.exponentialRampToValueAtTime(vel * 0.42, t0 + Math.min(0.45, dur * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(panner);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t0);
    osc1.connect(env);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t0);
    osc2.detune.setValueAtTime(2.5, t0);
    g2.gain.setValueAtTime(0.24, t0);
    g2.gain.exponentialRampToValueAtTime(0.01, t0 + dur * 0.55);
    osc2.connect(g2);
    g2.connect(env);

    this.track(osc1);
    this.track(osc2);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + dur + 0.05);
    osc2.stop(t0 + dur + 0.05);

    // Suave golpe de fieltro del macillo
    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(780, t0);
      bp.Q.value = 1.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vel * 0.22, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(panner);
      this.track(n);
      n.start(t0);
      n.stop(t0 + 0.032);
    }
  }

  public playStringChord(
    midis: number[],
    dur: number,
    vel = 0.045,
    attack = 1.1,
    delay = 0,
    brightness = 1350
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;

    midis.forEach((midi, idx) => {
      const freq = midiToHz(midi);
      const panVal = midis.length > 1 ? -0.45 + (idx / (midis.length - 1)) * 0.9 : 0;
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, t0);
      panner.connect(this.musicBus!);
      if (this.reverbConvolver) panner.connect(this.reverbConvolver);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(brightness * 0.45, t0);
      filter.frequency.linearRampToValueAtTime(brightness, t0 + attack);
      filter.frequency.exponentialRampToValueAtTime(brightness * 0.52, t0 + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(vel, t0 + attack);
      env.gain.setValueAtTime(vel * 0.88, Math.max(t0 + attack, t0 + dur * 0.68));
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      filter.connect(env);
      env.connect(panner);

      [-6, 6].forEach((det) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime(det, t0);
        osc.connect(filter);
        this.track(osc);
        osc.start(t0);
        osc.stop(t0 + dur + 0.06);
      });
    });
  }

  public playFrenchHorn(midi: number, dur: number, vel = 0.065, attack = 0.45, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(320, t0);
    filter.frequency.exponentialRampToValueAtTime(980, t0 + attack);
    filter.frequency.exponentialRampToValueAtTime(480, t0 + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    filter.connect(env);
    env.connect(this.musicBus);
    if (this.reverbConvolver) env.connect(this.reverbConvolver);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t0);
    osc1.connect(filter);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t0);
    osc2.detune.setValueAtTime(-4, t0);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    osc2.connect(g2);
    g2.connect(filter);

    this.track(osc1);
    this.track(osc2);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + dur + 0.05);
    osc2.stop(t0 + dur + 0.05);
  }

  public playChoirPad(midis: number[], dur: number, vel = 0.035, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;

    midis.forEach((midi, idx) => {
      const freq = midiToHz(midi);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(vel, t0 + dur * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      if (this.reverbConvolver) env.connect(this.reverbConvolver);
      env.connect(this.musicBus!);

      // Formantes vocales "Ahh / Ohh"
      [680, 1150].forEach((formantHz) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(formantHz, t0);
        bp.Q.value = 3.2;
        bp.connect(env);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 7, t0);
        osc.connect(bp);
        this.track(osc);
        osc.start(t0);
        osc.stop(t0 + dur + 0.08);
      });
    });
  }

  public playCelestaChime(midi: number, dur: number, vel = 0.05, delay = 0, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime + delay;
    const freq = midiToHz(midi);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, t0);
    panner.connect(this.musicBus);
    if (this.reverbConvolver) panner.connect(this.reverbConvolver);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vel, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(panner);

    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(freq, t0);
    o1.connect(env);

    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2.756, t0);
    g2.gain.setValueAtTime(0.22, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 0.25);
    o2.connect(g2);
    g2.connect(env);

    this.track(o1);
    this.track(o2);
    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + dur + 0.04);
    o2.stop(t0 + dur + 0.04);
  }

  public playTaikoImpact(vel = 0.16, subHz = 56, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(subHz * 1.9, t0);
    osc.frequency.exponentialRampToValueAtTime(subHz * 0.52, t0 + 0.65);
    g.gain.setValueAtTime(vel, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.15);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 1.2);

    if (this.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(340, t0);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vel * 0.55, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(this.sfxBus);
      this.track(n);
      n.start(t0);
      n.stop(t0 + 0.2);
    }
  }

  public playEmptyRoomHum(dur: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Zumbido eléctrico leve de transformador en sala vacía (60Hz + 120Hz muy sutil)
    [60, 120].forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t0);
      const peak = idx === 0 ? 0.018 : 0.008;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 1.4);
      g.gain.setValueAtTime(peak, t0 + dur - 1.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.sfxBus!);
      this.track(osc);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }

  public playArcadeButtonClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus || !this.noiseBuffer) return;
    const t0 = ctx.currentTime;

    // Microswitch arcade: clic de presión + retorno del resorte, con eco en la sala vacía
    [
      { dt: 0, bpHz: 1850, gain: 0.14 },
      { dt: 0.11, bpHz: 1320, gain: 0.075 },
    ].forEach(({ dt, bpHz, gain }) => {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer!;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(bpHz, t0 + dt);
      bp.Q.value = 4.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.032);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(n);
      n.start(t0 + dt);
      n.stop(t0 + dt + 0.04);
    });
  }

  public playCrtPixelExtinguish(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Breve chisporroteo de cátodo CRT y extinción del último píxel blanco
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3400, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.35);
    g.gain.setValueAtTime(0.026, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(g);
    g.connect(this.sfxBus);
    if (this.reverbConvolver) g.connect(this.reverbConvolver);
    this.track(osc);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }

  public playPortalSweep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    [220, 330, 440].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      filter.type = 'bandpass';
      filter.Q.value = 2.4;
      filter.frequency.setValueAtTime(300, t0);
      filter.frequency.exponentialRampToValueAtTime(1600, t0 + 0.85);
      filter.frequency.exponentialRampToValueAtTime(420, t0 + 1.8);
      osc.frequency.setValueAtTime(f * 0.85, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + 0.9);
      osc.frequency.exponentialRampToValueAtTime(f, t0 + 1.8);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.055, t0 + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.85);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(osc);
      osc.start(t0);
      osc.stop(t0 + 1.9);
    });
  }

  public playRetroArcadeEchoes(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime;

    // Cita auténtica y sutil de Pong (1972) bañada en reverberación de salón
    [
      { dt: 0.0, f: 490 },
      { dt: 0.42, f: 245 },
      { dt: 0.84, f: 490 },
      { dt: 1.24, f: 980 },
    ].forEach(({ dt, f }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.018, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.075);
      osc.connect(g);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      g.connect(this.sfxBus!);
      this.track(osc);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.085);
    });

    // Pulso descendente de Space Invaders (1978)
    [98.0, 87.31, 82.41, 73.42].forEach((f, idx) => {
      const dt = 2.1 + idx * 0.36;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(280, t0 + dt);
      osc.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.032, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.16);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbConvolver) g.connect(this.reverbConvolver);
      this.track(osc);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.18);
    });
  }

  public playPixelverseSignature(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const t0 = ctx.currentTime;

    // Firma sonora original de PIXELVERSE: cálida, analógica y cristalina (D5 - A5 - E6 - F#6)
    const signatureMidis = [74, 81, 88, 90];
    signatureMidis.forEach((m, idx) => {
      const dt = idx * 0.14;
      this.playCelestaChime(m, 3.6 - dt, 0.072, dt, (idx - 1.5) * 0.22);
      this.playFeltPiano(m - 12, 3.8 - dt, 0.055, dt, (1.5 - idx) * 0.15);
    });

    // Resolución orquestal con nota final suspendida llena de misterio (D2 + A2 + A3 + E4 + A4)
    this.playStringChord([38, 45, 57, 64, 69], 5.4, 0.052, 0.85, 0.25, 1650);
    this.playFrenchHorn(50, 4.8, 0.058, 0.65, 0.3);
    this.playChoirPad([62, 69, 76], 5.2, 0.032, 0.4);
  }

  public enforceTotalSilenceWindow(durationSec: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    this.musicBus.gain.setValueAtTime(0.0001, now + Math.max(0.5, durationSec - 0.25));
    this.musicBus.gain.linearRampToValueAtTime(1.0, now + durationSec + 0.35);
  }

  /* =========================================================================
     PARTITURA SINCRONIZADA DE 150 SEGUNDOS (00:00 – 02:30)
     ========================================================================= */

  private buildScoreCueList(): void {
    this.cues = [
      // --- ESCENA 1 (00:00 - 00:18): El silencio después de la última partida ---
      {
        id: 's1-hum',
        timeSec: 0.15,
        run: (e) => e.playEmptyRoomHum(17.2),
      },
      {
        id: 's1-button-click',
        timeSec: 2.35,
        run: (e) => e.playArcadeButtonClick(),
      },
      {
        id: 's1-piano-1',
        timeSec: 5.8,
        run: (e) => {
          e.playFeltPiano(62, 5.2, 0.075, 0, -0.12); // D4 solitario
          e.playFeltPiano(57, 4.8, 0.052, 2.2, 0.14); // A3 lejano
        },
      },
      {
        id: 's1-pixel-flicker',
        timeSec: 11.4,
        run: (e) => {
          e.playFeltPiano(65, 5.4, 0.068, 0.4, -0.08); // F4 melancólico
          e.playFeltPiano(64, 5.0, 0.058, 2.6, 0.1); // E4
        },
      },
      {
        id: 's1-crt-die',
        timeSec: 15.1,
        run: (e) => e.playCrtPixelExtinguish(),
      },

      // --- ESCENA 2 (00:18 - 00:42): Los recuerdos de la humanidad ---
      {
        id: 's2-low-strings-dm',
        timeSec: 18.0,
        run: (e) => {
          e.playStringChord([38, 45, 53, 57], 6.8, 0.046, 1.5, 0, 920); // Dm
          e.playFeltPiano(62, 3.8, 0.06, 0.8, -0.2);
          e.playFeltPiano(60, 3.8, 0.052, 3.2, 0.2);
        },
      },
      {
        id: 's2-choir-bb',
        timeSec: 24.5,
        run: (e) => {
          e.playStringChord([34, 46, 53, 58], 6.8, 0.048, 1.4, 0, 1080); // Bbmaj7
          e.playChoirPad([58, 62, 65], 6.4, 0.028, 0.4);
          // Pulsos electrónicos contenidos
          for (let i = 0; i < 8; i++) {
            e.playFeltPiano(46, 0.55, 0.026, i * 0.75, (i % 2 === 0 ? -1 : 1) * 0.3);
          }
        },
      },
      {
        id: 's2-particles-extract',
        timeSec: 31.0,
        run: (e) => {
          e.playStringChord([43, 50, 55, 58], 6.8, 0.048, 1.2, 0, 1150); // Gm7
          // Partículas de memoria ascendiendo
          [74, 77, 81, 86, 88].forEach((m, i) => {
            e.playCelestaChime(m, 2.2, 0.028, i * 0.65, -0.4 + i * 0.2);
          });
        },
      },
      {
        id: 's2-total-silence',
        timeSec: 38.6,
        // «Y el mundo olvidó cómo jugar.» -> Breve silencio total hasta 00:42
        run: (e) => e.enforceTotalSilenceWindow(3.35),
      },

      // --- ESCENA 3 (00:42 - 01:05): Los ecos de otras épocas ---
      {
        id: 's3-void-crystals',
        timeSec: 42.15,
        run: (e) => {
          e.playChoirPad([57, 64, 69], 8.5, 0.026, 0.2);
          // Cristales apagándose uno a uno en el vacío cósmico
          [81, 79, 76, 74, 72].forEach((m, i) => {
            e.playCelestaChime(m, 2.6, Math.max(0.015, 0.046 - i * 0.006), i * 1.45, (i - 2) * 0.28);
          });
        },
      },
      {
        id: 's3-70s-crystal-resists',
        timeSec: 51.0,
        run: (e) => {
          // El cristal de los 70 resiste con luz cálida: regresa el piano íntimo y cuerdas en Re Mayor / Lidio
          e.playStringChord([38, 45, 54, 62], 7.5, 0.048, 1.6, 0, 1420);
          [62, 66, 69, 71, 74].forEach((m, i) => {
            e.playFeltPiano(m, 3.8, 0.068, i * 1.15, -0.25 + i * 0.12);
          });
        },
      },
      {
        id: 's3-glyph-pulse',
        timeSec: 58.6,
        run: (e) => {
          e.playTaikoImpact(0.12, 52, 0);
          e.playStringChord([38, 50, 57, 66, 74], 6.6, 0.056, 0.9, 0.1, 1750);
          e.playFrenchHorn(57, 5.8, 0.058, 0.7, 0.2);
          e.playCelestaChime(86, 4.2, 0.06, 0.15, 0);
        },
      },

      // --- ESCENA 4 (01:05 - 01:28): El descubrimiento de PIXELVERSE ---
      {
        id: 's4-island-emerge',
        timeSec: 65.0,
        run: (e) => {
          e.playTaikoImpact(0.15, 49, 0);
          // Gran apertura sinfónica sobre el océano y las nubes volumétricas
          e.playStringChord([38, 45, 54, 62, 69], 8.2, 0.062, 1.3, 0, 1950);
          e.playFrenchHorn(50, 4.2, 0.068, 0.55, 0.2);
          e.playFrenchHorn(57, 4.4, 0.072, 0.55, 3.8);
          e.playChoirPad([62, 66, 69, 74], 8.0, 0.036, 0.5);
        },
      },
      {
        id: 's4-waterfall-ruins',
        timeSec: 73.2,
        run: (e) => {
          e.playStringChord([35, 47, 54, 62, 66], 7.4, 0.06, 1.2, 0, 1850); // Bm7
          [74, 73, 69, 66, 69, 74].forEach((m, i) => {
            e.playFeltPiano(m, 2.8, 0.062, i * 1.05, (i % 2 === 0 ? -1 : 1) * 0.22);
          });
        },
      },
      {
        id: 's4-sunbeam-sanctuary',
        timeSec: 80.6,
        run: (e) => {
          // Rayo de sol atraviesa las nubes e ilumina el emblema diegético PIXELVERSE
          e.playStringChord([43, 50, 59, 67, 74], 7.6, 0.065, 1.0, 0, 2100); // Gmaj7
          e.playFrenchHorn(55, 6.8, 0.072, 0.65, 0.15);
          e.playChoirPad([67, 71, 74, 78], 7.0, 0.038, 0.2);
          [79, 83, 86].forEach((m, i) => {
            e.playCelestaChime(m, 3.4, 0.055, 0.4 + i * 0.45, (i - 1) * 0.25);
          });
        },
      },

      // --- ESCENA 5 (01:28 - 01:52): La misión · El Cronoscopio ---
      {
        id: 's5-chamber-ticks',
        timeSec: 88.0,
        run: (e) => {
          e.playStringChord([45, 52, 57, 64], 8.2, 0.048, 1.5, 0, 1280);
          // Engranajes de bronce y anillos analógicos del Cronoscopio
          for (let i = 0; i < 10; i++) {
            e.playCelestaChime(i % 2 === 0 ? 76 : 69, 0.45, 0.025, i * 0.8, (i % 2 === 0 ? -1 : 1) * 0.35);
          }
        },
      },
      {
        id: 's5-core-ignition',
        timeSec: 96.4,
        run: (e) => {
          e.playTaikoImpact(0.16, 46, 0);
          // Tema principal ascendente mientras el núcleo proyecta la década de 1970
          e.playStringChord([38, 45, 57, 66, 74], 7.6, 0.066, 0.9, 0, 2150);
          [50, 54, 57, 62].forEach((m, i) => {
            e.playFrenchHorn(m, 2.2, 0.07, 0.32, i * 1.65);
          });
        },
      },
      {
        id: 's5-three-cabinets-awaken',
        timeSec: 104.0,
        run: (e) => {
          e.playStringChord([40, 47, 55, 64, 71], 8.0, 0.066, 0.85, 0, 2200);
          // Onda de energía encendiendo 1ª, 2ª y 3ª máquina arcade en la isla
          [
            { dt: 0.5, m: 74, pan: -0.55 },
            { dt: 2.9, m: 78, pan: 0.0 },
            { dt: 5.3, m: 81, pan: 0.55 },
          ].forEach(({ dt, m, pan }) => {
            e.playCelestaChime(m, 3.2, 0.075, dt, pan);
            e.playFeltPiano(m - 12, 3.0, 0.068, dt, pan);
          });
        },
      },

      // --- ESCENA 6 (01:52 - 02:12): Los orígenes · 1970s ---
      {
        id: 's6-portal-cross',
        timeSec: 112.0,
        run: (e) => {
          e.playPortalSweep();
          e.playStringChord([38, 45, 54, 62, 69], 9.8, 0.056, 1.1, 0.5, 1800);
        },
      },
      {
        id: 's6-pong-invaders-echoes',
        timeSec: 115.2,
        run: (e) => {
          e.playRetroArcadeEchoes();
        },
      },
      {
        id: 's6-island-vista-sweep',
        timeSec: 122.0,
        run: (e) => {
          e.playTaikoImpact(0.14, 50, 0);
          e.playStringChord([43, 50, 57, 66, 74], 10.0, 0.068, 1.0, 0, 2250);
          e.playFrenchHorn(57, 4.6, 0.074, 0.5, 0.2);
          e.playFrenchHorn(62, 4.8, 0.078, 0.5, 4.8);
          e.playChoirPad([62, 69, 74, 78], 9.5, 0.04, 0.3);
        },
      },

      // --- ESCENA 7 (02:12 - 02:24): El Sendero Glitch ---
      {
        id: 's7-glitch-climax',
        timeSec: 132.0,
        run: (e) => {
          e.playTaikoImpact(0.19, 44, 0);
          e.playStringChord([38, 45, 53, 62, 69], 6.2, 0.07, 0.35, 0, 2400);
          // Arpegiador electrónico + percusión sincronizada con los saltos del protagonista
          const arp = [62, 69, 74, 77, 81, 77, 74, 69];
          for (let step = 0; step < 24; step++) {
            const dt = step * 0.25;
            e.playCelestaChime(
              arp[step % arp.length],
              0.38,
              0.042,
              dt,
              (step % 2 === 0 ? -1 : 1) * 0.42
            );
            if (step % 4 === 0) {
              e.playTaikoImpact(0.11, 55, dt);
            }
          }
        },
      },
      {
        id: 's7-resonator-bridge',
        timeSec: 138.2,
        run: (e) => {
          e.playTaikoImpact(0.2, 42, 0);
          // Activación del resonador suspendido iluminando el puente hacia el santuario
          e.playStringChord([38, 50, 57, 66, 74, 81], 5.8, 0.075, 0.4, 0, 2600);
          e.playFrenchHorn(62, 5.2, 0.082, 0.35, 0.1);
          [74, 78, 81, 86, 90].forEach((m, i) => {
            e.playCelestaChime(m, 3.5, 0.068, 1.2 + i * 0.22, -0.3 + i * 0.15);
          });
        },
      },

      // --- ESCENA 8 (02:24 - 02:30): El título y el comienzo ---
      {
        id: 's8-signature-title',
        timeSec: 144.1,
        run: (e) => {
          e.playTaikoImpact(0.17, 45, 0);
          e.playPixelverseSignature();
        },
      },
    ];
  }
}

export const cinematicAudio = new CinematicScoreDirector();
