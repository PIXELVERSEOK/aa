/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { bgmEngine } from '../audio/bgmEngine';

export type CinematicCueId =
  | 'scene-0-mystery'
  | 'villain-bowser'
  | 'villain-eggman'
  | 'villain-dk-krool'
  | 'villain-pacman'
  | 'villain-legends'
  | 'scene-2-collapse'
  | 'scene-3-super-cupa'
  | 'scene-3-cut-0'
  | 'scene-3-cut-1'
  | 'scene-3-cut-2'
  | 'scene-3-cut-3'
  | 'scene-4-silence'
  | 'scene-4-pixel-birth'
  | 'scene-5-pong-link';

class CinematicAudioDirector {
  private ctx: AudioContext | null = null;
  private playedInCurrentRun: Set<CinematicCueId> = new Set();
  private activeNodes: AudioScheduledSourceNode[] = [];

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private trackSource(node: AudioScheduledSourceNode): void {
    this.activeNodes.push(node);
    node.onended = () => {
      const idx = this.activeNodes.indexOf(node);
      if (idx !== -1) this.activeNodes.splice(idx, 1);
    };
  }

  public resetRun(): void {
    this.playedInCurrentRun.clear();
    this.stopAll();
  }

  public stopAll(): void {
    const nodes = [...this.activeNodes];
    this.activeNodes.length = 0;
    for (const n of nodes) {
      try {
        n.stop();
        n.disconnect();
      } catch {
        // Nodo ya finalizado
      }
    }
  }

  public triggerCueOnce(cue: CinematicCueId): void {
    if (this.playedInCurrentRun.has(cue)) return;
    this.playedInCurrentRun.add(cue);

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (cue) {
        case 'scene-0-mystery': {
          // Misterio inicial CRT: acorde etéreo lento + destellos de píxeles
          const freqs = [196.0, 293.66, 440.0, 659.25];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i < 2 ? 'sine' : 'triangle';
            const t = now + i * 0.14;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.042, t + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 1.0);
          });
          break;
        }

        case 'villain-bowser': {
          // Bowser: acorde grave amenazante de castillo + rugido descendente
          const chord = [65.41, 77.78, 92.5];
          chord.forEach((f) => {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(520, now);
            filter.frequency.exponentialRampToValueAtTime(160, now + 0.85);
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.linearRampToValueAtTime(f * 0.92, now + 0.85);
            gain.gain.setValueAtTime(0.055, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(now);
            osc.stop(now + 0.92);
          });
          break;
        }

        case 'villain-eggman': {
          // Dr. Eggman: alerta tecnológica industrial y chispa de sobrecarga
          const notes = [440, 659.25, 466.16, 698.46, 880];
          notes.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const t = now + idx * 0.085;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.038, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 0.12);
          });
          break;
        }

        case 'villain-dk-krool': {
          // Universo Donkey Kong & King K. Rool: percusión tribal + fanfarria real grave
          const notes = [146.83, 174.61, 220.0, 207.65];
          notes.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + idx * 0.11;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.065, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 0.3);
          });
          break;
        }

        case 'villain-pacman': {
          // Fantasmas Pac-Man: sirena arcade ondulante clásica de 1980
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.linearRampToValueAtTime(430, now + 0.18);
          osc.frequency.linearRampToValueAtTime(280, now + 0.36);
          osc.frequency.linearRampToValueAtTime(450, now + 0.54);
          osc.frequency.linearRampToValueAtTime(290, now + 0.72);
          gain.gain.setValueAtTime(0.055, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.76);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.trackSource(osc);
          osc.start(now);
          osc.stop(now + 0.78);
          break;
        }

        case 'villain-legends': {
          // Bison, Dr. Wily y Ganondorf: acorde dramático dimensional
          const freqs = [164.81, 196.0, 246.94, 311.13];
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            const t = now + idx * 0.06;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.04, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 0.78);
          });
          break;
        }

        case 'scene-2-collapse': {
          // El Colapso: fractura descendente y desincronización de frecuencias
          [480, 360].forEach((startF, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(startF, now);
            osc.frequency.exponentialRampToValueAtTime(52 + idx * 14, now + 0.95);
            gain.gain.setValueAtTime(0.055, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(now);
            osc.stop(now + 1.02);
          });
          break;
        }

        case 'scene-3-super-cupa': {
          // SUPER CUPA: presencia soberana sub-grave + interferencia de código
          const drones = [49.0, 73.42, 98.0];
          drones.forEach((f) => {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(340, now);
            filter.frequency.linearRampToValueAtTime(780, now + 0.5);
            filter.frequency.exponentialRampToValueAtTime(140, now + 1.35);
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(now);
            osc.stop(now + 1.44);
          });
          break;
        }

        case 'scene-3-cut-0': {
          // Corte 1: Ojo - latido sordo + despertar metálico profundo
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.trackSource(osc);
          osc.start(now);
          osc.stop(now + 0.68);
          break;
        }

        case 'scene-3-cut-1': {
          // Corte 2: Irrupción Koopa - rugido bestial + distorsión glitch
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.exponentialRampToValueAtTime(120, now + 0.75);
          osc.frequency.setValueAtTime(130, now);
          osc.frequency.linearRampToValueAtTime(55, now + 0.75);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          this.trackSource(osc);
          osc.start(now);
          osc.stop(now + 0.82);
          break;
        }

        case 'scene-3-cut-2': {
          // Corte 3: Puño y matriz - impacto seco masivo + crujido digital
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.trackSource(osc);
          osc.start(now);
          osc.stop(now + 0.52);
          break;
        }

        case 'scene-3-cut-3': {
          // Corte 4: Perfil - zumbido de energía oscura + barrido chiptune
          const notes = [164.81, 220.0, 329.63, 440.0];
          notes.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + idx * 0.07;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 0.38);
          });
          break;
        }

        case 'scene-4-silence': {
          // Vacío previo al nacimiento de Pixel: latido grave que se extingue
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(82, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
          gain.gain.setValueAtTime(0.065, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
          osc.connect(gain);
          gain.connect(ctx.destination);
          this.trackSource(osc);
          osc.start(now);
          osc.stop(now + 0.78);
          break;
        }

        case 'scene-4-pixel-birth': {
          // Nacimiento de Pixel: destello cristalino ascendente de esperanza
          const notes = [523.25, 783.99, 1046.5, 1318.51, 1567.98];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.11;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.065, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(t);
            osc.stop(t + 0.88);
          });
          break;
        }

        case 'scene-5-pong-link': {
          // Conexión con Pong 1972: auténtico pulso cuadrado 490Hz -> 245Hz -> 490Hz
          const pings = [
            { t: 0.0, f: 490 },
            { t: 0.28, f: 245 },
            { t: 0.56, f: 490 },
          ];
          pings.forEach(({ t, f }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const start = now + t;
            osc.frequency.setValueAtTime(f, start);
            gain.gain.setValueAtTime(0.055, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.075);
            osc.connect(gain);
            gain.connect(ctx.destination);
            this.trackSource(osc);
            osc.start(start);
            osc.stop(start + 0.08);
          });
          break;
        }
      }
    } catch {
      // Continúa la cinemática sin interrupción si el navegador restringe Web Audio
    }
  }
}

export const cinematicAudio = new CinematicAudioDirector();
