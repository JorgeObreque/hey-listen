import { useEffect, useState } from "react";
import type { Phase, Remaining } from "../hooks/useCountdown";

type Props = {
  remaining: Remaining;
  phase: Phase;
  freezeOffsetSec: number;
  glitchActive: boolean;
};

export function Countdown({ remaining, phase, freezeOffsetSec, glitchActive }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  if (phase === "released") return null;

  const r = freezeOffsetSec > 0 ? adjustRemaining(remaining, freezeOffsetSec) : remaining;
  const days = r.days;

  return (
    <div className={`countdown ${glitchActive ? "glitch" : ""}`} aria-hidden={!show}>
      {phase === "normal" || phase === "thirtyDays" || phase === "sevenDays" ? (
        <>
          <div className="days" style={{ opacity: show ? 1 : 0, transition: "opacity 1.2s ease" }}>
            <span className="day-number">{phase === "sevenDays" && days === 0 ? 7 : days}</span>
            <span className="day-unit">{days === 1 ? "DAY" : "DAYS"}</span>
          </div>
          {show && (
            <TimeParts values={[r.hours, r.minutes, r.seconds]} labels={["HOURS", "MINUTES", "SECONDS"]} />
          )}
        </>
      ) : null}

      {phase === "seventyTwoHours" && (
        <>
          <div className="days" style={{ opacity: show ? 1 : 0, transition: "opacity 1.2s ease" }}>
            <span className="hour-number">{pad(r.hours)}</span><span className="sep">:</span><span className="hour-number">{pad(r.minutes)}</span><span className="sep">:</span><span className="hour-number">{pad(r.seconds)}</span>
          </div>
          {show && <div className="clock-labels"><span>HOURS</span><span>MINUTES</span><span>SECONDS</span></div>}
        </>
      )}

      {phase === "twentyFourHours" && (
        <>
          <div className="days" style={{ opacity: show ? 1 : 0, transition: "opacity 1.2s ease" }}>
            <span className="hour-number">{pad(r.hours)}</span><span className="sep">:</span><span className="hour-number">{pad(r.minutes)}</span><span className="sep">:</span><span className="hour-number">{pad(r.seconds)}</span>
          </div>
          {show && <div className="clock-labels"><span>HOURS</span><span>MINUTES</span><span>SECONDS</span></div>}
        </>
      )}

      {phase === "lastHour" && (
        <>
          <div className="days" style={{ opacity: show ? 1 : 0, transition: "opacity 1.2s ease" }}>
            <span className="hour-number">{pad(r.minutes)}</span><span className="sep">:</span><span className="hour-number">{pad(r.seconds)}</span>
          </div>
          {show && <div className="clock-labels two"><span>MINUTES</span><span>SECONDS</span></div>}
        </>
      )}
    </div>
  );
}

function TimeParts({ values, labels }: { values: number[]; labels: string[] }) {
  return (
    <div className="time" aria-label={`${values[0]} hours, ${values[1]} minutes, ${values[2]} seconds`}>
      {values.map((value, index) => (
        <div className="time-part" key={labels[index]}>
          <span className="num">{pad(value)}</span>
          <span className="time-label">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function adjustRemaining(r: Remaining, addSec: number): Remaining {
  const total = Math.max(0, r.totalMs + addSec * 1000);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return { totalMs: total, days, hours, minutes, seconds, released: r.released };
}
