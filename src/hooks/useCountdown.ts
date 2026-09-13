import { useEffect, useState } from "react";
import { RELEASE_DATE_ISO } from "../config/release";

export type Phase =
  | "released"
  | "lastHour"
  | "twentyFourHours"
  | "seventyTwoHours"
  | "sevenDays"
  | "thirtyDays"
  | "normal";

export type Remaining = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  released: boolean;
};

function compute(now: number, target: number): Remaining {
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { totalMs: diff, days, hours, minutes, seconds, released: diff <= 0 };
}

export function useCountdown(): Remaining {
  const target = new Date(RELEASE_DATE_ISO).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return compute(now, target);
}

export function useGamePhase(): Phase {
  const r = useCountdown();
  if (r.released) return "released";
  const hoursLeft = r.totalMs / 3_600_000;
  if (hoursLeft <= 1) return "lastHour";
  if (hoursLeft <= 24) return "twentyFourHours";
  if (hoursLeft <= 72) return "seventyTwoHours";
  if (r.days <= 7) return "sevenDays";
  if (r.days <= 30) return "thirtyDays";
  return "normal";
}
