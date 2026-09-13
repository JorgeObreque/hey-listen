import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/global.css";
import { Environment } from "./components/Environment";
import { Navi } from "./components/Navi";
import { Countdown } from "./components/Countdown";
import { ShareButton } from "./components/ShareButton";
import { useCountdown, useGamePhase } from "./hooks/useCountdown";
import { RELEASED_LINES } from "./config/messages";
import { SUPPORT_URL, SOURCE_URL } from "./config/release";
import { createAudio } from "./lib/audio";

export function App() {
  const remaining = useCountdown();
  const phase = useGamePhase();
  const audio = useMemo(() => createAudio(), []);
  const [audioOn, setAudioOn] = useState(false);
  const [showTitle] = useState(true);
  const [showCountdown] = useState(true);
  const toggleAudio = async () => {
    if (!audio) return;
    if (audioOn) {
      setAudioOn(false);
      await audio.setAmbientEnabled(false);
      return;
    }
    setAudioOn(await audio.setAmbientEnabled(true));
  };
  useEffect(() => {
    if (!audio) return;
    let active = true;
    let attempt = 0;
    const removeFallback = () => {
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
    };
    const attemptStart = () => {
      const currentAttempt = ++attempt;
      void audio.setAmbientEnabled(true).then((started) => {
        if (active && currentAttempt === attempt) setAudioOn(started);
      });
    };
    const startMusic = () => {
      removeFallback();
      audio.unlock();
      attemptStart();
    };
    window.addEventListener("pointerdown", startMusic, { once: true });
    window.addEventListener("keydown", startMusic, { once: true });
    const initialAttempt = ++attempt;
    void audio.setAmbientEnabled(true).then((started) => {
      if (!active || initialAttempt !== attempt) return;
      setAudioOn(started);
      if (started) removeFallback();
    });
    return () => {
      active = false;
      removeFallback();
    };
  }, [audio]);

  const localHour = useMemo(() => new Date().getHours(), []);
  const [midnightBoost, setMidnightBoost] = useState(0);
  useEffect(() => {
    const h = new Date().getHours();
    if (h === 0 || h === 23) {
      setMidnightBoost(1);
      const t = window.setTimeout(() => setMidnightBoost(0), 5000);
      return () => window.clearTimeout(t);
    }
  }, [localHour]);

  const [glitchUntil, setGlitchUntil] = useState(0);
  const glitchActive = glitchUntil > Date.now();

  const clicksRef = useRef<number[]>([]);
  const onCountdownClick = () => {
    const now = performance.now();
    clicksRef.current = clicksRef.current.filter((t) => now - t < 2000);
    clicksRef.current.push(now);
    if (clicksRef.current.length >= 5) {
      clicksRef.current = [];
      setGlitchUntil(Date.now() + 2000);
    }
  };

  const [doorOpen, setDoorOpen] = useState(false);
  useEffect(() => {
    if (phase === "released") {
      const t = window.setTimeout(() => setDoorOpen(true), 1800);
      return () => window.clearTimeout(t);
    }
    setDoorOpen(false);
  }, [phase]);

  return (
    <div className="app">
      <Environment
        phase={phase}
        remaining={remaining}
        freezeActive={false}
        localHour={localHour}
        midnightBoost={midnightBoost}
      />
      <div className="navi-light-test" aria-hidden="true" />

      <div className="logo" aria-hidden="true">
        <img src="/images/logo.webp" alt="" />
      </div>

      <div className="content">
        {phase !== "released" && (
          <main className="hero">
            {showTitle && (
              <h1 className={`title ${showTitle ? "visible" : ""}`}>THE LEGEND RETURNS</h1>
            )}
            {showCountdown && (
              <div className="countdown-hit" onClick={onCountdownClick}>
                <Countdown
                  remaining={remaining}
                  phase={phase}
                  freezeOffsetSec={0}
                  glitchActive={glitchActive}
                />
              </div>
            )}
          </main>
        )}

        {phase === "released" && (
          <div className="released">
            <div className="headline">{RELEASED_LINES[0]}</div>
            <div className="sub">{RELEASED_LINES[1]}</div>
          </div>
        )}
      </div>

      {doorOpen && phase === "released" && <DoorScene />}

      <Navi onMovementStart={audio?.playNaviMovement} onInteraction={audio?.unlock} frozen={false} phase={phase} />

      <a
        className="support"
        href={SUPPORT_URL}
        onClick={() => {
          const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
          gtag?.("event", "cta_support_click", { event_category: "support", event_label: "buy_me_a_coffee" });
        }}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Support this independent fan project on Buy Me a Coffee"
      >
        <span className="support-rupee" aria-hidden="true">
          <img className="support-rupee-image" src="/images/rupia.webp" alt="" />
        </span>
        <span className="support-copy"><span>KEEP THE LIGHT</span><span>ALIVE</span></span>
      </a>
      <ShareButton />
      <a
        className="source-link"
        href={SOURCE_URL}
        onClick={() => {
          const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
          gtag?.("event", "github_source_click", { event_category: "source", event_label: "github_repo" });
        }}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <svg className="source-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.34-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.71 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.6.24 2.78.12 3.07.73.81 1.18 1.84 1.18 3.1 0 4.45-2.7 5.42-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
        </svg>
      </a>
      <button className={`audio-toggle ${audioOn ? "on" : ""}`} onPointerDown={() => audio?.unlock()} onClick={toggleAudio} aria-label={audioOn ? "Mute background music" : "Play background music"}>
        <span aria-hidden="true">♪</span>
      </button>

      <div className="bg-grain" />
    </div>
  );
}

function DoorScene() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!ref.current) return;
      const t = performance.now() / 1000;
      const v = Math.min(1, t / 6);
      const size = 40 + v * Math.min(window.innerWidth, window.innerHeight) * 0.7;
      ref.current.style.width = `${size}px`;
      ref.current.style.height = `${size}px`;
      ref.current.style.opacity = String(0.6 + 0.4 * Math.sin(t * 1.5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={ref} className="door" />;
}
