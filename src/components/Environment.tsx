import { useEffect, useRef } from "react";
import type { Phase } from "../hooks/useCountdown";
import type { Remaining } from "../hooks/useCountdown";

type Props = {
  phase: Phase;
  remaining: Remaining;
  freezeActive: boolean;
  localHour: number;
  midnightBoost: number;
};

export function Environment({ phase, remaining, freezeActive, localHour, midnightBoost }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; r: number; a: number; phase: number }[]>([]);
  const shootingRef = useRef<{ x: number; y: number; vx: number; vy: number; t: number } | null>(null);
  const time = useRef(0);
  const live = useRef({ phase, remaining, freezeActive, localHour, midnightBoost });
  live.current = { phase, remaining, freezeActive, localHour, midnightBoost };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      const count = Math.round((window.innerWidth * window.innerHeight) / 22_000);
      const target = Math.max(40, Math.min(160, count));
      particles.current = Array.from({ length: target }, () => spawn(window.innerWidth, window.innerHeight));
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastShootingAt = performance.now();

    const tick = () => {
      time.current += 0.016;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.save();
      ctx.scale(dpr, dpr);

      // sky tint blends with local time + midnight boost
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const current = live.current;
      const base = skyBase(current.localHour);
      const boost = current.phase === "released" ? 0.05 : current.midnightBoost;
      const top = lerpColor(base.top, "#000000", boost * 0.6);
      const bot = lerpColor(base.bot, "#02030a", boost * 0.6);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // stars (more on released/lastHour/twentyFour + midnight boost)
      const starDensity =
        (current.phase === "released" ? 1 : current.phase === "lastHour" ? 0.9 : current.phase === "twentyFourHours" ? 0.7 : current.phase === "seventyTwoHours" ? 0.5 : current.phase === "sevenDays" ? 0.3 : 0.18)
        + (current.midnightBoost > 0 ? 0.4 : 0);
      drawStars(ctx, w, h, starDensity, time.current, reduced);

      // occasional shooting star
      const nowMs = performance.now();
      if (!reduced && nowMs - lastShootingAt > 22_000 + Math.random() * 38_000) {
        shootingRef.current = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.3, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, t: 0 };
        lastShootingAt = nowMs;
      }
      if (shootingRef.current) {
        const s = shootingRef.current;
        s.x += s.vx;
        s.y += s.vy;
        s.t += 1;
        const alpha = Math.max(0, 1 - s.t / 50);
        if (alpha <= 0 || s.x > w + 20) shootingRef.current = null;
        else {
          ctx.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
          ctx.stroke();
        }
      }

      // silhouette horizon — temple shows from 30 days, intensifies
      const templeAlpha = templeAlphaFor(current.phase);
      if (templeAlpha > 0) {
        drawTemple(ctx, w, h, templeAlpha);
        const swordAlpha = swordAlphaFor(current.phase);
        if (swordAlpha > 0) drawSword(ctx, w, h, swordAlpha);
      }

      // drifting particles (mist/embers)
      const flow = current.freezeActive ? -1 : 1;
      for (const p of particles.current) {
        p.x += (p.vx + (reduced ? 0 : Math.cos(time.current + p.phase) * 0.08)) * flow;
        p.y += (p.vy + (reduced ? 0 : Math.sin(time.current * 0.7 + p.phase) * 0.08)) * flow;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        const a = p.a * (0.6 + 0.4 * Math.sin(time.current * 0.6 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 215, 255, ${a * 0.55})`;
        ctx.fill();
      }

      // countdown pulses
      const pulse = pulseIntensity(current.phase, current.remaining, time.current);
      if (pulse > 0) {
        const cx = w / 2;
        const cy = h / 2;
        const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        radial.addColorStop(0, `rgba(180, 220, 255, ${0.18 * pulse})`);
        radial.addColorStop(1, "rgba(180, 220, 255, 0)");
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={`environment phase-${phase}`} aria-hidden="true">
      <canvas ref={ref} className="environment-canvas" />
      <div className="moon"><span /></div>
      <div className="clouds clouds-far" />
      <div className="clouds clouds-near" />
      <svg className="landscape" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="mountainFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#18283a" />
            <stop offset="1" stopColor="#07101b" />
          </linearGradient>
          <linearGradient id="mountainNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c1c27" />
            <stop offset="1" stopColor="#03080d" />
          </linearGradient>
          <radialGradient id="horizonLight" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#d49b54" stopOpacity=".42" />
            <stop offset=".45" stopColor="#91683c" stopOpacity=".13" />
            <stop offset="1" stopColor="#111827" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pathLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d6a563" stopOpacity=".24" />
            <stop offset="1" stopColor="#594a37" stopOpacity="0" />
          </linearGradient>
          <filter id="soften"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        <ellipse className="horizon-glow" cx="720" cy="603" rx="350" ry="150" fill="url(#horizonLight)" filter="url(#soften)" />
        <path className="ridge ridge-far" fill="url(#mountainFar)" d="M0 614L0 525L119 483L216 514L348 431L438 493L548 455L665 514L765 464L858 505L981 421L1085 492L1190 451L1298 505L1440 465L1440 900L0 900Z" />
        <path className="ridge ridge-mid" fill="url(#mountainNear)" d="M0 900V606C133 555 241 550 357 600C475 650 558 566 680 585C787 602 850 661 971 603C1093 545 1257 561 1440 636V900Z" />
        <g className="distant-ruins">
          <path d="M677 594V526H692V500H701V474H709V451H718V474H727V500H736V526H751V594Z" />
          <path d="M650 594V544H677V594ZM751 594V544H778V594Z" />
          <path className="ruin-door" d="M704 594V548C704 532 734 532 734 548V594Z" />
        </g>
        <path className="field" d="M0 657C164 604 318 632 474 690C615 742 757 676 899 653C1070 625 1235 657 1440 723V900H0Z" />
        <path className="path" fill="url(#pathLight)" d="M711 588C684 664 638 728 521 900H919C800 731 757 664 729 588Z" />
        <g className="grass grass-left">
          <path d="M0 900V754L19 807L31 731L48 813L67 746L73 826L97 770L101 836L130 777L133 849L166 793L158 858L204 808L187 876L244 829L221 900Z" />
        </g>
        <g className="grass grass-right">
          <path d="M1440 900V754L1421 807L1409 731L1392 813L1373 746L1367 826L1343 770L1339 836L1310 777L1307 849L1274 793L1282 858L1236 808L1253 876L1196 829L1219 900Z" />
        </g>
      </svg>
      <div className="ground-mist mist-one" />
      <div className="ground-mist mist-two" />
      <div className="vignette" />
    </div>
  );
}

function spawn(w: number, h: number) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.08 - 0.02,
    r: Math.random() * 1.4 + 0.4,
    a: Math.random() * 0.6 + 0.2,
    phase: Math.random() * Math.PI * 2,
  };
}

function skyBase(hour: number) {
  // night-ish by default, slight warmth at dawn/dusk.
  if (hour >= 5 && hour < 8) return { top: "#1a2238", bot: "#0a0a16" };
  if (hour >= 8 && hour < 17) return { top: "#0a1426", bot: "#040611" };
  if (hour >= 17 && hour < 20) return { top: "#1b162a", bot: "#0a0814" };
  return { top: "#06091a", bot: "#02030a" };
}

function lerpColor(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function templeAlphaFor(phase: Phase) {
  switch (phase) {
    case "thirtyDays": return 0.08;
    case "sevenDays":  return 0.18;
    case "seventyTwoHours": return 0.28;
    case "twentyFourHours": return 0.4;
    case "lastHour": return 0.55;
    case "released": return 0.5;
    default: return 0;
  }
}

function swordAlphaFor(phase: Phase) {
  switch (phase) {
    case "sevenDays":       return 0.18;
    case "seventyTwoHours": return 0.28;
    case "twentyFourHours": return 0.42;
    case "lastHour":        return 0.6;
    case "released":        return 0.5;
    default: return 0;
  }
}

function pulseIntensity(phase: Phase, remaining: Remaining, t: number) {
  if (phase === "released") return 0.6 + 0.4 * Math.sin(t * 0.8);
  if (phase === "lastHour") return 0.4 + 0.3 * Math.sin(t * 1.2);
  if (phase === "seventyTwoHours" && (remaining.hours % 3 === 0 && remaining.minutes < 2)) return 0.4;
  return 0;
}

function drawTemple(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const cx = w / 2;
  const baseY = h * 0.78;
  const wTemple = Math.min(420, w * 0.45);
  const hTemple = Math.min(220, h * 0.32);
  const top = baseY - hTemple;
  ctx.save();
  ctx.translate(cx, 0);
  // glow behind
  const glow = ctx.createRadialGradient(0, top + hTemple * 0.4, 0, 0, top + hTemple * 0.4, wTemple * 1.4);
  glow.addColorStop(0, `rgba(176, 220, 255, ${0.18 * alpha})`);
  glow.addColorStop(1, "rgba(176, 220, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-w, 0, w * 2, h);
  // silhouette body
  ctx.fillStyle = `rgba(2, 4, 10, ${0.85})`;
  ctx.beginPath();
  // step roof
  ctx.moveTo(-wTemple / 2, baseY);
  ctx.lineTo(-wTemple / 2, baseY - hTemple * 0.55);
  ctx.lineTo(-wTemple / 2 + 14, baseY - hTemple * 0.55);
  ctx.lineTo(-wTemple / 2 + 14, baseY - hTemple * 0.62);
  ctx.lineTo(wTemple / 2 - 14, baseY - hTemple * 0.62);
  ctx.lineTo(wTemple / 2 - 14, baseY - hTemple * 0.55);
  ctx.lineTo(wTemple / 2, baseY - hTemple * 0.55);
  ctx.lineTo(wTemple / 2, baseY);
  // pediment
  ctx.lineTo(wTemple / 2 - 30, baseY - hTemple * 0.55);
  ctx.lineTo(0, baseY - hTemple);
  ctx.lineTo(-wTemple / 2 + 30, baseY - hTemple * 0.55);
  ctx.closePath();
  ctx.fill();
  // columns highlight
  ctx.fillStyle = `rgba(176, 220, 255, ${0.06 * alpha})`;
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * (wTemple / 5) - 2, baseY - hTemple * 0.5, 4, hTemple * 0.5);
  }
  // doorway light crack
  ctx.fillStyle = `rgba(176, 220, 255, ${0.12 * alpha})`;
  ctx.fillRect(-2, baseY - hTemple * 0.5, 4, hTemple * 0.5);
  ctx.restore();
}

function drawSword(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const cx = w / 2;
  const baseY = h * 0.78 - 4;
  const tipY = h * 0.34;
  ctx.save();
  ctx.translate(cx, 0);
  const grad = ctx.createLinearGradient(0, tipY, 0, baseY);
  grad.addColorStop(0, `rgba(176, 220, 255, ${0.45 * alpha})`);
  grad.addColorStop(1, `rgba(176, 220, 255, ${0.05 * alpha})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-1.5, tipY);
  ctx.lineTo(1.5, tipY);
  ctx.lineTo(2.5, baseY - 8);
  ctx.lineTo(-2.5, baseY - 8);
  ctx.closePath();
  ctx.fill();
  // guard
  ctx.fillStyle = `rgba(176, 220, 255, ${0.18 * alpha})`;
  ctx.fillRect(-14, baseY - 8, 28, 2);
  // pommel
  ctx.beginPath();
  ctx.arc(0, baseY, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(176, 220, 255, ${0.4 * alpha})`;
  ctx.fill();
  ctx.restore();
}

const STAR_SEED = 1337;
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, density: number, t: number, reduced: boolean) {
  const r = rng(STAR_SEED);
  const baseCount = Math.round((w * h) / 14000);
  const count = Math.max(0, Math.floor(baseCount * density));
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h * 0.78;
    const tw = reduced ? 0.6 : 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + r() * 1.4) + i));
    const sz = 0.5 + r() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 235, 255, ${0.4 + 0.6 * tw})`;
    ctx.fill();
  }
}
