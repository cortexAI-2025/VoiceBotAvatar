"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Normalised frequency amplitudes (0–1) from WavStreamPlayer */
  frequencies: number[];
  /** Whether the agent is currently generating/playing a response */
  isActive: boolean;
  /** Agent display name */
  agentName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LocalAvatarDisplay({
  frequencies,
  isActive,
  agentName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    mouthOpen: 0,
    blinkT: 0,
    nextBlinkAt: 3000,
    blinkDuration: 120,
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    eyeTargetX: 0,
    eyeTargetY: 0,
    eyeTimer: 0,
    hue: 220, // avatar skin hue
  });
  const rafRef = useRef<number>(0);
  const freqRef = useRef<number[]>([]);

  // Keep latest frequencies accessible inside the animation loop
  useEffect(() => {
    freqRef.current = frequencies;
  }, [frequencies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    let lastTime = performance.now();

    function draw(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      const f = freqRef.current;
      const amplitude = avg(f); // 0..1

      // ── Mouth open ──────────────────────────────────────────────────
      const targetMouth = isActive ? Math.min(amplitude * 2.8, 1) : 0;
      state.mouthOpen = lerp(state.mouthOpen, targetMouth, 0.25);

      // ── Blink ────────────────────────────────────────────────────────
      state.blinkT += dt;
      if (state.blinkT >= state.nextBlinkAt + state.blinkDuration) {
        state.blinkT = 0;
        state.nextBlinkAt = 2000 + Math.random() * 4000;
      }
      const blinking =
        state.blinkT >= state.nextBlinkAt &&
        state.blinkT < state.nextBlinkAt + state.blinkDuration;
      const blinkProgress = blinking
        ? Math.sin(
            ((state.blinkT - state.nextBlinkAt) / state.blinkDuration) * Math.PI
          )
        : 0;

      // ── Eye wander ───────────────────────────────────────────────────
      state.eyeTimer += dt;
      if (state.eyeTimer > 1200 + Math.random() * 1800) {
        state.eyeTargetX = (Math.random() - 0.5) * 6;
        state.eyeTargetY = (Math.random() - 0.5) * 4;
        state.eyeTimer = 0;
      }
      state.eyeOffsetX = lerp(state.eyeOffsetX, state.eyeTargetX, 0.04);
      state.eyeOffsetY = lerp(state.eyeOffsetY, state.eyeTargetY, 0.04);

      // ────────────────────────────────────────────────────────────────
      // Draw
      // ────────────────────────────────────────────────────────────────
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2 - 10;
      const r = Math.min(W, H) * 0.36;

      // Ambient ring (speaking pulse)
      if (isActive && amplitude > 0.05) {
        const pulseR = r + 6 + amplitude * 14;
        const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, pulseR);
        grad.addColorStop(0, `hsla(${state.hue},80%,55%,0.35)`);
        grad.addColorStop(1, `hsla(${state.hue},80%,55%,0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Head shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      // Head
      const headGrad = ctx.createRadialGradient(
        cx - r * 0.2,
        cy - r * 0.2,
        r * 0.1,
        cx,
        cy,
        r
      );
      headGrad.addColorStop(0, `hsl(${state.hue},30%,88%)`);
      headGrad.addColorStop(1, `hsl(${state.hue},20%,72%)`);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();
      ctx.restore();

      // ── Eyes ────────────────────────────────────────────────────────
      const eyeY = cy - r * 0.18 + state.eyeOffsetY;
      const eyeSpacing = r * 0.38;
      const eyeRx = r * 0.13;
      const eyeRy = r * 0.17 * (1 - blinkProgress * 0.98);

      for (const side of [-1, 1]) {
        const ex = cx + side * eyeSpacing + state.eyeOffsetX;

        // White
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeRx, Math.max(eyeRy, 1), 0, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // Iris
        const irisR = eyeRx * 0.65;
        ctx.beginPath();
        ctx.arc(ex, eyeY, irisR, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${state.hue + 10},60%,35%)`;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(ex, eyeY, irisR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(ex - irisR * 0.25, eyeY - irisR * 0.25, irisR * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
      }

      // ── Nose ────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.12, r * 0.06, r * 0.04, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${state.hue},15%,60%,0.5)`;
      ctx.fill();

      // ── Mouth ───────────────────────────────────────────────────────
      const mouthY = cy + r * 0.38;
      const mouthW = r * 0.44;
      const openH = state.mouthOpen * r * 0.22;

      ctx.save();
      ctx.beginPath();
      // Outer lip shape
      ctx.ellipse(cx, mouthY, mouthW, r * 0.08 + openH * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${state.hue - 10},25%,55%)`;
      ctx.fill();

      // Inner mouth (dark opening)
      if (openH > 1) {
        ctx.beginPath();
        ctx.ellipse(cx, mouthY + openH * 0.15, mouthW * 0.72, openH * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#1a0a0a";
        ctx.fill();

        // Teeth hint
        ctx.beginPath();
        ctx.ellipse(cx, mouthY - openH * 0.05, mouthW * 0.55, openH * 0.3, 0, 0, Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
      }
      ctx.restore();

      // ── Cheek blush (active) ────────────────────────────────────────
      if (isActive) {
        for (const side of [-1, 1]) {
          const blushGrad = ctx.createRadialGradient(
            cx + side * r * 0.56,
            cy + r * 0.24,
            0,
            cx + side * r * 0.56,
            cy + r * 0.24,
            r * 0.22
          );
          blushGrad.addColorStop(0, `hsla(${state.hue - 60},80%,65%,${0.18 + amplitude * 0.12})`);
          blushGrad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.ellipse(
            cx + side * r * 0.56,
            cy + r * 0.24,
            r * 0.22,
            r * 0.15,
            0,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = blushGrad;
          ctx.fill();
        }
      }

      // ── Agent name label ────────────────────────────────────────────
      if (agentName) {
        ctx.font = `600 ${Math.round(r * 0.22)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#374151";
        ctx.fillText(agentName, cx, cy + r + r * 0.38);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, agentName]);

  return (
    <div className="flex flex-col items-center justify-center w-full py-4">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="w-full max-w-xs"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
