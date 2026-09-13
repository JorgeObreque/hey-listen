import { useEffect, useRef } from "react";
import type { Phase } from "../hooks/useCountdown";

type Props = {
  onMovementStart?: () => number;
  onInteraction?: () => void;
  frozen: boolean;
  phase: Phase;
};

type Mode = "follow" | "orbit" | "wander" | "approaching" | "leaving";

type NaviState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  mode: Mode;
  modeUntil: number;
  motionSeed: number;
  orbitPhase: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  rotation: number;
  stillSince: number;
  movementArmed: boolean;
  burstUntil: number;
};

export function Navi({ onMovementStart, onInteraction, frozen, phase }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef<NaviState>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    mode: "wander",
    modeUntil: 0,
    motionSeed: Math.random() * Math.PI * 2,
    orbitPhase: Math.random() * Math.PI * 2,
    pointerOffsetX: 0.8,
    pointerOffsetY: -0.6,
    rotation: 0,
    stillSince: 0,
    movementArmed: false,
    burstUntil: 0,
  });
  const lastPointer = useRef<{ x: number; y: number; t: number; type: string } | null>(null);
  const touchActive = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const app = el.closest<HTMLElement>(".app");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.current.x = window.innerWidth * 0.5;
    state.current.y = window.innerHeight * 0.5;

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const pickWander = () => {
      const s = state.current;
      s.tx = 40 + Math.random() * (w() - 80);
      s.ty = 40 + Math.random() * (h() - 80);
    };
    pickWander();

    const setMode = (mode: Mode, durationMs: number) => {
      state.current.mode = mode;
      state.current.modeUntil = performance.now() + durationMs;
    };

    const onResize = () => {
      state.current.x = Math.min(state.current.x, w() - 40);
      state.current.y = Math.min(state.current.y, h() - 40);
    };
    window.addEventListener("resize", onResize);

    const speedBase = phase === "twentyFourHours" || phase === "released" ? 1.25 : 1;

    let raf = 0;
    let last = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min(60, now - last) / 1000;
      last = now;
      const s = state.current;
      const reduced = reduce || frozen;

      if (!reduced) {
        const followCursor = lastPointer.current !== null;
        const pointerMoving = followCursor && (now - lastPointer.current!.t) < 160;

        if (followCursor && lastPointer.current) {
          const lp = lastPointer.current;
          const dx = s.x - lp.x;
          const dy = s.y - lp.y;
          const dist = Math.hypot(dx, dy);

          if (!pointerMoving) {
            if (s.mode !== "follow") setMode("follow", 2500);
            if (now - lp.t > 500) s.movementArmed = true;

            const bob = Math.sin(now / 520 + s.motionSeed);
            s.tx = lp.x + s.pointerOffsetX * 42 + bob * 1.5;
            s.ty = lp.y + s.pointerOffsetY * 42 + bob * 4;
          } else if (now > s.modeUntil) {
            const r = Math.random();
            if (r < 0.88) setMode("follow", 5000 + Math.random() * 5000);
            else if (r < 0.96) setMode("orbit", 1000 + Math.random() * 1200);
            else setMode("leaving", 500 + Math.random() * 500);
          }

          if (pointerMoving && (s.mode === "follow" || s.mode === "approaching")) {
            const offsetMag = Math.min(55, 22 + Math.min(dist, 320) * 0.12);
            if (dist > 4) {
              s.pointerOffsetX = dx / dist;
              s.pointerOffsetY = dy / dist;
            }
            const wantX = lp.x + s.pointerOffsetX * offsetMag;
            const wantY = lp.y + s.pointerOffsetY * offsetMag;
            const jx = Math.sin(now / 380 + s.motionSeed) * 7;
            const jy = Math.cos(now / 460 + s.motionSeed) * 7;
            s.tx = wantX + jx;
            s.ty = wantY + jy;
          } else if (pointerMoving && s.mode === "orbit") {
            s.orbitPhase += dt * 1.6;
            const r = 55 + Math.sin(now / 700) * 10;
            s.tx = lp.x + Math.cos(s.orbitPhase) * r;
            s.ty = lp.y + Math.sin(s.orbitPhase) * r;
            if (now > s.modeUntil) setMode("follow", 2500);
          } else if (pointerMoving && s.mode === "leaving") {
            const ax = dx / Math.max(20, dist);
            const ay = dy / Math.max(20, dist);
            s.tx = s.x + ax * 220;
            s.ty = s.y + ay * 220;
            s.tx = Math.max(40, Math.min(w() - 40, s.tx));
            s.ty = Math.max(40, Math.min(h() - 40, s.ty));
            if (now > s.modeUntil) setMode("approaching", 1200);
          } else if (pointerMoving) {
            if (Math.hypot(s.tx - s.x, s.ty - s.y) < 30) pickWander();
          }
        } else {
          if (Math.hypot(s.tx - s.x, s.ty - s.y) < 30) pickWander();
        }

        s.tx = Math.max(40, Math.min(w() - 40, s.tx));
        s.ty = Math.max(40, Math.min(h() - 40, s.ty));

        const tdx = s.tx - s.x;
        const tdy = s.ty - s.y;
        const noiseX = Math.sin(now / 950 + s.motionSeed) * 0.05;
        const noiseY = Math.cos(now / 1190 + s.motionSeed) * 0.05;
        const bursting = now < s.burstUntil;
        const burstMultiplier = bursting ? 1.75 : 1;
        const accel = (followCursor ? (pointerMoving ? 0.022 : 0.008) : 0.0045) * speedBase * (bursting ? 1.35 : 1);
        s.vx += (tdx * accel + noiseX) * speedBase;
        s.vy += (tdy * accel + noiseY) * speedBase;
        const damping = followCursor && !pointerMoving ? 0.82 : 0.93;
        s.vx *= damping;
        s.vy *= damping;
        const maxV = (followCursor ? (pointerMoving ? 3.4 : 1) : 1.7) * speedBase * burstMultiplier;
        s.vx = Math.max(-maxV, Math.min(maxV, s.vx));
        s.vy = Math.max(-maxV, Math.min(maxV, s.vy));
        s.x += s.vx * (dt * 60);
        s.y += s.vy * (dt * 60);

        const speed = Math.hypot(s.vx, s.vy);
        if (speed < 0.16 && now >= s.burstUntil) {
          if (s.stillSince === 0) s.stillSince = now;
          if (now - s.stillSince > 500) s.movementArmed = true;
        } else {
          s.stillSince = 0;
          if (pointerMoving && s.movementArmed && speed > 0.75 && now >= s.burstUntil) {
            s.movementArmed = false;
            const burstDuration = onMovementStart?.() ?? 700;
            s.burstUntil = now + burstDuration;
            s.vx *= 1.45;
            s.vy *= 1.45;
          }
        }
      }

      s.x = Math.max(20, Math.min(w() - 20, s.x));
      s.y = Math.max(20, Math.min(h() - 20, s.y));

      const targetRotation = Math.max(-12, Math.min(12, s.vx * 3.2));
      s.rotation += (targetRotation - s.rotation) * Math.min(1, dt * 8);
      el.classList.toggle("is-dashing", now < s.burstUntil);
      el.style.transform = `translate3d(${s.x - 25}px, ${s.y - 25}px, 0) rotate(${s.rotation}deg)`;
      app?.style.setProperty("--navi-x", `${s.x}px`);
      app?.style.setProperty("--navi-y", `${s.y}px`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !touchActive.current) return;
      lastPointer.current = { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType };
    };
    const onPointerDown = (e: PointerEvent) => {
      onInteraction?.();
      if (e.pointerType !== "touch") return;
      touchActive.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touchActive.current = false;
      lastPointer.current = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now() - 160,
        type: e.pointerType,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [frozen, onInteraction, onMovementStart, phase]);

  return (
    <div
      ref={ref}
      className="navi"
      role="button"
      aria-label="A small glowing creature."
      tabIndex={-1}
    >
      <span className="navi-trail trail-one" />
      <span className="navi-trail trail-two" />
      <span className="navi-trail trail-three" />
      <span className="navi-visual">
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <defs>
            <radialGradient id="naviCore" cx="42%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#d9f3ff" />
              <stop offset="68%" stopColor="#75bdea" stopOpacity=".82" />
              <stop offset="100%" stopColor="#3d76a8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="naviAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a6ddff" stopOpacity=".72" />
              <stop offset="52%" stopColor="#5ba8dd" stopOpacity=".24" />
              <stop offset="100%" stopColor="#5ba8dd" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".94" />
              <stop offset=".48" stopColor="#c6ecff" stopOpacity=".58" />
              <stop offset="1" stopColor="#72b8e5" stopOpacity=".05" />
            </linearGradient>
            <filter id="wingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle className="navi-aura" cx="44" cy="44" r="42" fill="url(#naviAura)" />
          <g className="wing wing-left-top" filter="url(#wingGlow)"><path fill="url(#wing)" d="M38 39C25 32 10 18 12 10C22 8 37 20 43 36Z" /></g>
          <g className="wing wing-right-top" filter="url(#wingGlow)"><path fill="url(#wing)" d="M50 39C63 32 78 18 76 10C66 8 51 20 45 36Z" /></g>
          <g className="wing wing-left-bottom" filter="url(#wingGlow)"><path fill="url(#wing)" d="M38 48C27 53 16 65 18 73C28 74 39 63 43 51Z" /></g>
          <g className="wing wing-right-bottom" filter="url(#wingGlow)"><path fill="url(#wing)" d="M50 48C61 53 72 65 70 73C60 74 49 63 45 51Z" /></g>
          <circle className="navi-core" cx="44" cy="44" r="14" fill="url(#naviCore)" />
          <circle cx="40" cy="39" r="3.2" fill="#fff" opacity=".9" />
        </svg>
      </span>
    </div>
  );
}
