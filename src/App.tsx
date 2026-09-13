import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/global.css";
import { Environment } from "./components/Environment";
import { Navi } from "./components/Navi";
import { Countdown } from "./components/Countdown";
import { ShareButton } from "./components/ShareButton";
import { useCountdown, useGamePhase } from "./hooks/useCountdown";
import { RELEASED_LINES } from "./config/messages";
import { SUPPORT_URL } from "./config/release";
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
