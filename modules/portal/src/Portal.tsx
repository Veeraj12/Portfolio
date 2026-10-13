"use client";

import React, { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
import type { PortalProps, PortalState } from "./types";

/**
 * Purely presentational portal visual. No interaction logic lives here —
 * see PortalTrigger for hover/focus/click wiring.
 *
 * V3 visual: a sparkler. A canvas draws hundreds of short, additive,
 * warm-white-to-orange streaks flying tangentially around a ring (denser and
 * longer on the bright side) with a dark swirling vortex carved out of the
 * centre — a closer match to the reference sparkler photo than the earlier
 * flat SVG rings. Intensity scales with the interaction state; reduced-motion
 * renders a single static frame instead of animating.
 */
export function Portal({ state, size = 220, className = "" }: PortalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<PortalState>(state);
  stateRef.current = state;
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const c = size / 2;
    const ringR = size * 0.3; // bright band radius
    const ringThick = size * 0.055;
    const squash = 0.94; // faint vertical flattening for a touch of 3D
    const maxSparks = 1500;

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      life0: number;
      heat: number;
      w: number;
    }

    const sparks: Spark[] = [];
    let raf = 0;
    let last = performance.now();
    let spawnAcc = 0;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const gauss = () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    // Density/brightness bias: the right-hand arc of the ring is the bright one.
    const sideBias = (a: number) => 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(a));

    const drawBase = (bright: number) => {
      const g = ctx.createRadialGradient(c, c, ringR * 0.45, c, c, ringR * 1.4);
      g.addColorStop(0, "rgba(255,170,90,0)");
      g.addColorStop(0.6, `rgba(255,160,80,${0.08 * bright})`);
      g.addColorStop(0.8, `rgba(255,205,140,${0.24 * bright})`);
      g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, ringR * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Extra white-hot hot-spot on the bright (right) side of the band.
      const hot = ctx.createRadialGradient(c + ringR * 0.85, c - ringR * 0.2, 0, c + ringR * 0.85, c - ringR * 0.2, ringR * 0.9);
      hot.addColorStop(0, `rgba(255,240,205,${0.28 * bright})`);
      hot.addColorStop(1, "rgba(255,180,90,0)");
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(c, c, ringR * 1.4, 0, Math.PI * 2);
      ctx.fill();
    };

    // Rotating swirl of drawn lines — the "tunnel" that makes the portal read
    // as a spinning vortex rather than a static sparkler. ~240 tangent
    // segments orbit the ring at staggered radii; inner ones spin faster so
    // the whole field shears, and lines brighten near the band and on the
    // bright (right) side.
    const SWIRL_LINES = 240;
    const drawSwirlLines = (t: number, bright: number) => {
      ctx.lineCap = "round";
      for (let i = 0; i < SWIRL_LINES; i++) {
        const f = ((i * 61) % SWIRL_LINES) / SWIRL_LINES; // stable pseudo-spread
        const r = ringR * (0.4 + 0.6 * f);
        const speed = 0.45 + 0.7 * (1 - f); // inner lines rotate faster
        const a0 = (i / SWIRL_LINES) * Math.PI * 2 + t * speed;
        const span = 0.3 + 0.4 * f; // longer near the outer edge
        const a1 = a0 + span;
        const edge = 1 - Math.abs(r - ringR) / (ringR * 0.62);
        const side = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(a0));
        const alpha = Math.max(0, edge) * side * 0.55 * bright;
        if (alpha < 0.02) continue;
        const x0 = c + Math.cos(a0) * r;
        const y0 = c + Math.sin(a0) * r * squash;
        const x1 = c + Math.cos(a1) * r;
        const y1 = c + Math.sin(a1) * r * squash;
        const g = Math.round(150 + 95 * f);
        ctx.strokeStyle = `rgba(255,${g},${70 + 120 * f},${alpha})`;
        ctx.lineWidth = 0.7 + f * 1.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    };

    const drawHole = (t: number) => {
      const g = ctx.createRadialGradient(c, c, ringR * 0.24, c, c, ringR * 0.98);
      g.addColorStop(0, "rgba(12,6,2,0.98)");
      g.addColorStop(0.66, "rgba(26,13,5,0.86)");
      g.addColorStop(1, "rgba(30,15,6,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, ringR * 0.98, 0, Math.PI * 2);
      ctx.fill();

      // Faint rotating swirl spiralling into the void.
      ctx.strokeStyle = "rgba(255,180,110,0.06)";
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(c, c, ringR * (0.32 + 0.16 * k), t * 0.6 + k, t * 0.6 + k + Math.PI * 0.9);
        ctx.stroke();
      }
    };

    const emit = (rate: number, speed: number, bright: number) => {
      const a = Math.random() * Math.PI * 2;
      if (Math.random() > sideBias(a)) return; // dimmer arc emits fewer sparks
      const r = ringR + gauss() * ringThick;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r * squash;
      // Strong, consistent tangential direction (one way round) so the sparks
      // visibly orbit the ring — that coherent rotation is what sells the
      // "portal", with only a few counter-spinning strays.
      const dir = Math.random() < 0.86 ? 1 : -1;
      const tangential = size * rnd(1.0, 2.3) * speed;
      const outward = Math.random() < 0.5;
      const radial = size * rnd(0.08, 0.5) * speed * (outward ? 1 : -0.5);
      const vx = -Math.sin(a) * tangential * dir + Math.cos(a) * radial;
      const vy = (Math.cos(a) * tangential * dir + Math.sin(a) * radial) * squash;
      const life0 = rnd(0.34, 0.95) * (0.85 + 0.3 * bright);
      const heat = rnd(0.5, 1);
      sparks.push({ x, y, vx, vy, life: life0, life0, heat, w: rnd(0.7, 1.9) });
      void rate;
    };

    const CONTROLS: Record<PortalState, { rate: number; speed: number; bright: number }> = {
      dormant: { rate: 520, speed: 0.95, bright: 0.8 },
      hover: { rate: 900, speed: 1.25, bright: 1.05 },
      active: { rate: 1600, speed: 1.65, bright: 1.35 },
      transitioning: { rate: 1250, speed: 1.45, bright: 1.2 },
    };

    const step = (dt: number, t: number) => {
      const { rate, speed, bright } = CONTROLS[stateRef.current] ?? CONTROLS.dormant;

      spawnAcc += rate * dt;
      while (spawnAcc >= 1 && sparks.length < maxSparks) {
        emit(rate, speed, bright);
        spawnAcc -= 1;
      }
      if (sparks.length >= maxSparks) spawnAcc = Math.min(spawnAcc, 4);

      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      drawBase(bright);
      drawSwirlLines(t, bright); // the rotating "tunnel" lines

      const drag = Math.exp(-2.6 * dt);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= drag;
        s.vy *= drag;

        const lifeN = s.life / s.life0;
        const alpha = 0.2 + 0.8 * lifeN;
        const tail = 0.11; // longer streak = more sparkler-like
        const tx = s.x - s.vx * tail;
        const ty = s.y - s.vy * tail;
        const g = Math.round(165 + 85 * s.heat);
        const b = Math.round(80 + 150 * s.heat * s.heat);
        ctx.strokeStyle = `rgba(255,${g},${b},${alpha})`;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        ctx.fillStyle = `rgba(255,246,224,${alpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.w * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      drawHole(t);
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      drawBase(0.75);
      drawSwirlLines(0, 0.8);
      for (let i = 0; i < 420; i++) {
        const a = Math.random() * Math.PI * 2;
        if (Math.random() > sideBias(a)) continue;
        const r = ringR + gauss() * ringThick;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r * squash;
        const dir = Math.random() < 0.78 ? 1 : -1;
        const len = size * rnd(0.03, 0.12);
        const tx = x - Math.sin(a) * len * dir;
        const ty = y + Math.cos(a) * len * dir * squash;
        const heat = Math.random();
        ctx.strokeStyle = `rgba(255,${Math.round(150 + 90 * heat)},${Math.round(60 + 130 * heat * heat)},${0.4 + 0.5 * heat})`;
        ctx.lineWidth = 0.8 + Math.random();
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      drawHole(0);
    };

    if (reducedMotion) {
      renderStatic();
      return () => {
        ctx.clearRect(0, 0, size, size);
      };
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [size, reducedMotion]);

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle, rgba(255,150,70,0.20) 0%, rgba(255,120,40,0.07) 42%, rgba(0,0,0,0) 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: "block",
          position: "relative",
        }}
      />
    </div>
  );
}
