import { useEffect, useState } from "react";
import { SITE_HANDLE } from "../config/release";
import { useCountdown } from "../hooks/useCountdown";

export function ShareButton() {
  const r = useCountdown();
  const [tip, setTip] = useState(false);

  const text = `Only ${r.days} ${r.days === 1 ? "day" : "days"} until the legend returns. ⏳\n${SITE_HANDLE}`;
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  useEffect(() => {
    if (!tip) return;
    const t = window.setTimeout(() => setTip(false), 1800);
    return () => window.clearTimeout(t);
  }, [tip]);

  const onClick = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator).share({ title: SITE_HANDLE, text, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setTip(true);
    } catch {
      // fallback for restricted environments
      const ta = document.createElement("textarea");
      ta.value = `${text}\n${url}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setTip(true);
    }
  };

  return (
    <button className={`share ${tip ? "tooltip" : ""}`} onClick={onClick} aria-label="Share the wait">
      SHARE THE WAIT
    </button>
  );
}
