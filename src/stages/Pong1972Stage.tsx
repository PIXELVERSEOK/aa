/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gabinete histórico PONG (Atari · 1972)
 * - Conserva el encuentro narrativo inicial de la pelota blanca y el destello CRT.
 * - Condición inmutable de victoria: alcanzar exactamente 3 puntos reales antes que la IA.
 * - Ceremonia «Memoria Desbloqueada» seguida de transformación de la paleta blanca en
 *   tabla voladora para desplazarse dentro de la misma Isla de los 70 (nunca a otra década).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

export type PongCabinetPhase = 'intro' | 'flash' | 'playing' | 'lost';

const PONG_WIN_SCORE = 3;

export function Pong1972Stage({
  skipIntro = false,
  alreadyRestoredBefore = false,
  onVictoryRecorded,
  onCeremonyCompleted,
  onReturnToIslandOnBoard,
  onBackToIsland,
}: {
  skipIntro?: boolean;
  alreadyRestoredBefore?: boolean;
  onVictoryRecorded: (finalScore: number) => void;
  onCeremonyCompleted: () => void;
  onReturnToIslandOnBoard: () => void;
  onBackToIsland: () => void;
}) {
  const [pongPhase, setPongPhase] = useState<PongCabinetPhase>(
    skipIntro ? 'playing' : 'intro'
  );
  const [matchKey, setMatchKey] = useState<number>(1);
  const [pongStarflight, setPongStarflight] = useState<boolean>(false);
  const [pongCeremonyOpen, setPongCeremonyOpen] = useState<boolean>(false);
  const [wasRestoredSnapshot, setWasRestoredSnapshot] = useState<boolean>(
    alreadyRestoredBefore
  );
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);

  const pongCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });
  const ceremonyGateRef = useRef<'none' | 'waiting' | 'approved'>('none');
  const victoryFiredRef = useRef<boolean>(false);

  const alreadyRestoredRef = useRef(alreadyRestoredBefore);
  alreadyRestoredRef.current = alreadyRestoredBefore;
  const onVictoryRecordedRef = useRef(onVictoryRecorded);
  onVictoryRecordedRef.current = onVictoryRecorded;
  const onCeremonyCompletedRef = useRef(onCeremonyCompleted);
  onCeremonyCompletedRef.current = onCeremonyCompleted;
  const onReturnToIslandOnBoardRef = useRef(onReturnToIslandOnBoard);
  onReturnToIslandOnBoardRef.current = onReturnToIslandOnBoard;

  useEffect(() => {
    setPongPhase(skipIntro ? 'playing' : 'intro');
    setP1Score(0);
    setP2Score(0);
    setPongStarflight(false);
    setPongCeremonyOpen(false);
    ceremonyGateRef.current = 'none';
    victoryFiredRef.current = false;
  }, [skipIntro]);

  useEffect(() => {
    if (pongPhase === 'intro') {
      const t = window.setTimeout(() => {
        retroAudio.flashBurst();
        setPongPhase('flash');
      }, 2200);
      return () => window.clearTimeout(t);
    }

    if (pongPhase === 'flash') {
      const t = window.setTimeout(() => {
        setPongPhase('playing');
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [pongPhase]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = true;
      if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = false;
      if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleCeremonyContinue = useCallback(() => {
    onCeremonyCompletedRef.current();
    setPongCeremonyOpen(false);
    ceremonyGateRef.current = 'approved';
    setPongStarflight(true);
  }, []);

  useEffect(() => {
    if (pongPhase !== 'playing') return;

    const canvas = pongCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const resolvedSkin =
      rootStyles.getPropertyValue('--avatar-skin').trim() || '#ffccaa';
    const resolvedHair =
      rootStyles.getPropertyValue('--avatar-hair').trim() || '#331100';
    const resolvedShirt =
      rootStyles.getPropertyValue('--avatar-shirt').trim() || '#00f3ff';

    const W = canvas.width;
    const H = canvas.height;
    const PADDLE_W = 10;
    const PADDLE_H = 80;
    const BALL_SIZE = 10;

    let p1Y = H / 2 - PADDLE_H / 2;
    let p2Y = H / 2 - PADDLE_H / 2;
    let ballX = W / 2 - BALL_SIZE / 2;
    let ballY = H / 2 - BALL_SIZE / 2;
    let ballVx = 295;
    let ballVy = 195;

    const ballTrail: { x: number; y: number }[] = [];
    const hitSparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    const warpStars = Array.from({ length: 65 }, (_, i) => ({
      x: (i * 83) % W,
      y: (i * 59) % H,
      speed: 140 + (i % 5) * 90,
      size: 1.5 + (i % 3),
    }));

    let score1 = 0;
    let score2 = 0;
    let serveDelay = 0.55;
    let victoryCutscene = false;
    let cutsceneElapsed = 0;
    let launchSfxPlayed = false;
    let anchorPaddleCy = H / 2;
    let cancelled = false;
    victoryFiredRef.current = false;

    const spawnPhosphorSparks = (sx: number, sy: number, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 115;
        hitSparks.push({
          x: sx,
          y: sy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.36,
        });
      }
    };

    const resetBall = (towardRight: boolean) => {
      ballX = W / 2 - BALL_SIZE / 2;
      ballY = H / 2 - BALL_SIZE / 2;
      ballVx = towardRight ? 295 : -295;
      ballVy = (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 90);
      ballTrail.length = 0;
      serveDelay = 0.6;
    };

    resetBall(true);

    let rafId = 0;
    let prevNow = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.04, (now - prevNow) / 1000);
      prevNow = now;

      if (!victoryCutscene) {
        const p1Speed = 350;
        if (keysRef.current.up) p1Y -= p1Speed * dt;
        if (keysRef.current.down) p1Y += p1Speed * dt;
        p1Y = Math.max(10, Math.min(H - PADDLE_H - 10, p1Y));

        const aiCenter = p2Y + PADDLE_H / 2;
        const targetY = ballVx > 0 ? ballY + BALL_SIZE / 2 : H / 2;
        const diff = targetY - aiCenter;
        const aiSpeed = 225;
        if (Math.abs(diff) > 8) {
          p2Y += Math.sign(diff) * Math.min(Math.abs(diff) * 4.2, aiSpeed) * dt;
        }
        p2Y = Math.max(10, Math.min(H - PADDLE_H - 10, p2Y));

        if (serveDelay > 0) {
          serveDelay -= dt;
        } else {
          ballTrail.push({ x: ballX, y: ballY });
          if (ballTrail.length > 8) ballTrail.shift();

          ballX += ballVx * dt;
          ballY += ballVy * dt;

          if (ballY <= 8) {
            ballY = 8;
            ballVy = Math.abs(ballVy);
            retroAudio.pongWall();
            spawnPhosphorSparks(ballX, ballY);
          } else if (ballY + BALL_SIZE >= H - 8) {
            ballY = H - 8 - BALL_SIZE;
            ballVy = -Math.abs(ballVy);
            retroAudio.pongWall();
            spawnPhosphorSparks(ballX, ballY);
          }

          if (
            ballVx < 0 &&
            ballX <= 30 &&
            ballX + BALL_SIZE >= 20 &&
            ballY + BALL_SIZE >= p1Y &&
            ballY <= p1Y + PADDLE_H
          ) {
            ballX = 30;
            const offset =
              (ballY + BALL_SIZE / 2 - (p1Y + PADDLE_H / 2)) / (PADDLE_H / 2);
            ballVx = Math.min(460, Math.abs(ballVx) * 1.07);
            ballVy = offset * 280;
            retroAudio.pongPaddle();
            spawnPhosphorSparks(30, ballY + BALL_SIZE / 2);
          }

          if (
            ballVx > 0 &&
            ballX + BALL_SIZE >= W - 30 &&
            ballX <= W - 20 &&
            ballY + BALL_SIZE >= p2Y &&
            ballY <= p2Y + PADDLE_H
          ) {
            ballX = W - 30 - BALL_SIZE;
            const offset =
              (ballY + BALL_SIZE / 2 - (p2Y + PADDLE_H / 2)) / (PADDLE_H / 2);
            ballVx = -Math.min(460, Math.abs(ballVx) * 1.05);
            ballVy = offset * 270;
            retroAudio.pongPaddle();
            spawnPhosphorSparks(W - 30, ballY + BALL_SIZE / 2);
          }

          if (ballX > W) {
            score1 += 1;
            setP1Score(score1);
            retroAudio.pongScore(true);
            if (score1 >= PONG_WIN_SCORE && !victoryFiredRef.current) {
              victoryFiredRef.current = true;
              victoryCutscene = true;
              cutsceneElapsed = 0;
              ballTrail.length = 0;
              anchorPaddleCy = Math.max(92, Math.min(H - 82, p1Y + PADDLE_H / 2));
              setWasRestoredSnapshot(alreadyRestoredRef.current);
              onVictoryRecordedRef.current(score1);
              ceremonyGateRef.current = 'waiting';
              setPongCeremonyOpen(true);
              retroAudio.portalVictory();
            } else {
              resetBall(false);
            }
          }

          if (!victoryCutscene && ballX + BALL_SIZE < 0) {
            score2 += 1;
            setP2Score(score2);
            retroAudio.pongScore(false);
            if (score2 >= PONG_WIN_SCORE) {
              cancelled = true;
              setPongPhase('lost');
              return;
            }
            resetBall(true);
          }
        }
      } else if (ceremonyGateRef.current === 'approved') {
        cutsceneElapsed += dt;
        if (cutsceneElapsed >= 0.78 && !launchSfxPlayed) {
          launchSfxPlayed = true;
          retroAudio.hoverboardLaunch();
          spawnPhosphorSparks(26, anchorPaddleCy, 18);
        }
        if (cutsceneElapsed >= 2.55) {
          cancelled = true;
          setPongStarflight(false);
          ceremonyGateRef.current = 'none';
          onReturnToIslandOnBoardRef.current();
          return;
        }
      }

      for (let i = hitSparks.length - 1; i >= 0; i--) {
        hitSparks[i].x += hitSparks[i].vx * dt;
        hitSparks[i].y += hitSparks[i].vy * dt;
        hitSparks[i].life -= dt;
        if (hitSparks[i].life <= 0) hitSparks.splice(i, 1);
      }

      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      const crtBg = ctx.createRadialGradient(
        W / 2,
        H / 2,
        20,
        W / 2,
        H / 2,
        W * 0.72
      );
      crtBg.addColorStop(0, victoryCutscene ? '#081226' : '#060d18');
      crtBg.addColorStop(0.75, '#02050a');
      crtBg.addColorStop(1, '#010204');
      ctx.fillStyle = crtBg;
      ctx.fillRect(0, 0, W, H);

      if (!victoryCutscene) {
        ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
        ctx.fillRect(12, 4, W - 24, 2);
        ctx.fillRect(12, H - 6, W - 24, 2);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (!victoryCutscene) {
        const rp1Y = Math.round(p1Y);
        const rp2Y = Math.round(p2Y);
        const rBallX = Math.round(ballX);
        const rBallY = Math.round(ballY);

        ctx.shadowBlur = 0;
        for (let t = 0; t < ballTrail.length; t++) {
          const ratio = (t + 1) / ballTrail.length;
          ctx.globalAlpha = ratio * 0.28;
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(
            Math.round(ballTrail[t].x),
            Math.round(ballTrail[t].y),
            BALL_SIZE,
            BALL_SIZE
          );
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 16;
        ctx.fillRect(20, rp1Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(W - 30, rp2Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(rBallX, rBallY, BALL_SIZE, BALL_SIZE);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
        for (let i = 10; i < H; i += 22) {
          ctx.fillRect(W / 2 - 2, i, 4, 11);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, rp1Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(W - 30, rp2Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(rBallX, rBallY, BALL_SIZE, BALL_SIZE);
      } else {
        const starAlpha = Math.min(1, cutsceneElapsed / 0.85);
        for (const ws of warpStars) {
          if (cutsceneElapsed > 0.78) {
            ws.x -= ws.speed * dt * 1.4;
            ws.y += ws.speed * dt * 0.35;
            if (ws.x < 0) ws.x += W;
            if (ws.y > H) ws.y -= H;
          }
          ctx.globalAlpha = starAlpha * 0.85;
          ctx.fillStyle = '#e0f2fe';
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 8;
          const streakW = cutsceneElapsed > 1.35 ? 14 : ws.size;
          ctx.fillRect(ws.x, ws.y, streakW, ws.size);
        }
        ctx.globalAlpha = 1;

        const courtFade = Math.max(0, 1 - cutsceneElapsed / 1.15);
        if (courtFade > 0.02) {
          ctx.globalAlpha = courtFade * 0.75;
          ctx.fillStyle = '#ffffff';
          for (let i = 10; i < H; i += 22) {
            ctx.fillRect(W / 2 - 2, i, 4, 11);
          }
          ctx.fillRect(W - 30, Math.round(p2Y), PADDLE_W, PADDLE_H);
          ctx.globalAlpha = 1;
        }

        let boardCx = 25;
        let boardCy = anchorPaddleCy;
        let boardAngle = 0;
        let avatarX = 25;
        let avatarBottomY = anchorPaddleCy - PADDLE_H / 2;

        if (cutsceneElapsed < 0.75) {
          const dropT = cutsceneElapsed / 0.75;
          const easeIn = dropT * dropT;
          avatarBottomY =
            -18 + (anchorPaddleCy - PADDLE_H / 2 + 18) * easeIn;
          p1Y += (anchorPaddleCy - PADDLE_H / 2 - p1Y) * Math.min(1, dt * 12);
          boardCy = p1Y + PADDLE_H / 2;
        } else if (cutsceneElapsed < 1.42) {
          const morphT = (cutsceneElapsed - 0.75) / 0.67;
          const smooth = morphT * morphT * (3 - 2 * morphT);
          boardCx = 25 + 88 * smooth;
          boardCy = anchorPaddleCy + (H * 0.58 - anchorPaddleCy) * smooth;
          boardAngle = (Math.PI / 2) * smooth;
          avatarX = boardCx;
          avatarBottomY =
            boardCy - ((1 - smooth) * (PADDLE_H / 2) + smooth * 6);
        } else {
          const flyT = (cutsceneElapsed - 1.42) / 1.13;
          const accel = flyT * flyT * 1.35 + flyT * 0.35;
          boardCx = 113 + accel * (W + 140);
          boardCy = H * 0.58 - accel * (H * 0.78);
          boardAngle = Math.PI / 2 - 0.24;
          avatarX = boardCx;
          avatarBottomY = boardCy - 6;

          const trailGrad = ctx.createLinearGradient(
            boardCx - 170,
            boardCy + 42,
            boardCx,
            boardCy
          );
          trailGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
          trailGrad.addColorStop(0.55, 'rgba(157, 0, 255, 0.65)');
          trailGrad.addColorStop(1, 'rgba(0, 243, 255, 0.98)');
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(boardCx - 165, boardCy + 40);
          ctx.lineTo(boardCx - 18, boardCy + 4);
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(boardCx, boardCy);
        ctx.rotate(boardAngle);
        ctx.shadowColor = cutsceneElapsed >= 0.75 ? '#00f3ff' : '#ffffff';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-PADDLE_W / 2, -PADDLE_H / 2, PADDLE_W, PADDLE_H);

        if (cutsceneElapsed >= 0.75) {
          ctx.fillStyle = '#00f3ff';
          ctx.fillRect(PADDLE_W / 2, -PADDLE_H * 0.35, 5, PADDLE_H * 0.7);
        }
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const avTilt = cutsceneElapsed >= 1.42 ? -0.22 : 0;
        ctx.translate(avatarX, avatarBottomY);
        ctx.rotate(avTilt);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = resolvedShirt;
        ctx.fillRect(-13, -36, 26, 36);
        ctx.restore();

        ctx.shadowBlur = 0;
        ctx.fillStyle = resolvedHair;
        ctx.fillRect(-10, -34, 20, 6);
        ctx.fillStyle = resolvedSkin;
        ctx.fillRect(-8, -28, 16, 10);
        ctx.fillStyle = '#05070f';
        ctx.fillRect(-3, -25, 3, 3);
        ctx.fillRect(4, -25, 3, 3);
        ctx.fillStyle = resolvedShirt;
        ctx.fillRect(-9, -18, 18, 11);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-9, -9, 18, 2);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-8, -7, 6, 7);
        ctx.fillRect(2, -7, 6, 7);
        ctx.restore();
      }

      for (const sp of hitSparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.36);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      ctx.font = '700 42px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 20;
      ctx.fillText(String(score1), W / 2 - 90, 54);
      ctx.fillText(String(score2), W / 2 + 90, 54);
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pongPhase, matchKey]);

  return (
    <>
      {pongPhase === 'intro' && (
        <div className="max-w-xl text-center flex flex-col items-center space-y-12 px-4">
          <div className="h-24 flex items-center justify-center">
            <div className="approaching-ball" />
          </div>
          <p className="font-mono-tabular text-lg sm:text-2xl text-white leading-relaxed">
            Una pequeña pelota blanca se acerca en la oscuridad... ¡Esquívala!
          </p>
        </div>
      )}

      {pongPhase === 'flash' && (
        <div className="fixed inset-0 z-50 bg-white white-flash-active pointer-events-none" />
      )}

      {(pongPhase === 'playing' || pongPhase === 'lost') && (
        <div
          id="arcade-cabinet"
          className="w-full max-w-[780px] arcade-cabinet-yellow px-6 sm:px-10 pt-6 pb-8 flex flex-col items-center space-y-4 select-none"
        >
          <div className="w-full flex items-baseline justify-between gap-3 px-2 border-b border-amber-950/25 pb-2">
            <div>
              <span className="block font-mono-tabular text-[10px] tracking-[0.24em] text-neutral-900/75 uppercase">
                ATARI · UP-RIGHT CABINET
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-widest text-neutral-950">
                PONG · 1972
              </h2>
            </div>
            <div className="text-right font-mono-tabular text-xs font-bold text-neutral-950">
              <span className="block">
                JUGADOR {p1Score} — {p2Score} IA
              </span>
              <span className="text-[10px] tracking-widest text-neutral-900/75">
                VICTORIA A LOS 3 PUNTOS
              </span>
            </div>
          </div>

          <div
            id="arcade-screen-bezel"
            className="relative w-full arcade-screen-bezel overflow-hidden"
          >
            <canvas
              id="pong-canvas"
              ref={pongCanvasRef}
              width={600}
              height={400}
              className="block w-full h-auto aspect-[3/2] bg-black crisp-arcade-canvas"
            />

            <div
              className="absolute inset-0 crt-glass-reflection pointer-events-none"
              aria-hidden="true"
            />

            {pongStarflight && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass-hud rounded px-4 py-1.5 text-xs font-mono-tabular text-[#00f3ff] pointer-events-none whitespace-nowrap">
                Paleta acoplada como tabla · Regresando a la Isla de los 70...
              </div>
            )}

            {pongPhase === 'lost' && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <p className="font-mono-tabular text-lg sm:text-xl font-bold text-white">
                  RONDA FINALIZADA ({p1Score} - {p2Score})
                </p>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-ui">
                  Alcanza 3 puntos antes que la máquina usando W y S para restaurar la memoria de 1972 y activar la tabla Pong en la isla.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setP1Score(0);
                    setP2Score(0);
                    setMatchKey((k) => k + 1);
                    setPongPhase('playing');
                  }}
                  className="btn-ui rounded px-6 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Reintentar Pong
                </button>
              </div>
            )}
          </div>

          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-bold text-neutral-950">
            <span className="font-mono-tabular">
              W / S · MOVER PALETA · META: 3 PUNTOS
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  onBackToIsland();
                }}
                className="px-3 py-1.5 bg-amber-200/75 text-neutral-950 hover:bg-amber-100 rounded border border-amber-900/30 cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                ← Isla 70s
              </button>
              <button
                type="button"
                onPointerDown={() => {
                  keysRef.current.up = true;
                }}
                onPointerUp={() => {
                  keysRef.current.up = false;
                }}
                onPointerLeave={() => {
                  keysRef.current.up = false;
                }}
                className="px-3.5 py-1.5 bg-neutral-950 text-amber-300 hover:bg-neutral-800 rounded cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                W · Subir
              </button>
              <button
                type="button"
                onPointerDown={() => {
                  keysRef.current.down = true;
                }}
                onPointerUp={() => {
                  keysRef.current.down = false;
                }}
                onPointerLeave={() => {
                  keysRef.current.down = false;
                }}
                className="px-3.5 py-1.5 bg-neutral-950 text-amber-300 hover:bg-neutral-800 rounded cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                S · Bajar
              </button>
            </div>
          </div>

          {pongCeremonyOpen && (
            <MemoryUnlockedModal
              entry={getHistoricalMemory('pong')}
              continueLabel="Volar en Tabla por la Isla de los 70"
              alreadyRestoredBefore={wasRestoredSnapshot}
              onContinue={handleCeremonyContinue}
            />
          )}
        </div>
      )}
    </>
  );
}
