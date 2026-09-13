// Background music and Navi movement effects use native playback for mobile compatibility.

export type AudioHandle = {
  enabled: boolean;
  setAmbientEnabled: (v: boolean) => Promise<boolean>;
  playNaviMovement: () => number;
  unlock: () => void;
};

export function createAudio(): AudioHandle | null {
  const music = new Audio("/music/theme.mp3");
  music.loop = true;
  music.preload = "auto";
  music.volume = 0;

  const naviMovements = [
    { audio: new Audio("/music/navi-movement-1.mp3"), durationMs: 705 },
    { audio: new Audio("/music/navi-movement-2.mp3"), durationMs: 993 },
  ];
  for (const movement of naviMovements) {
    movement.audio.preload = "auto";
    movement.audio.volume = 0.72;
  }
  let ambientEnabled = false;
  let fadeRaf = 0;
  let effectsUnlocked = false;
  let playRequest = 0;

  const fadeMusic = (target: number, durationMs: number, pauseAfter = false) => {
    cancelAnimationFrame(fadeRaf);
    const from = music.volume;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      music.volume = from + (target - from) * progress;
      if (progress < 1) fadeRaf = requestAnimationFrame(tick);
      else if (pauseAfter && !ambientEnabled) music.pause();
    };
    fadeRaf = requestAnimationFrame(tick);
  };

  const setAmbientEnabled = async (v: boolean) => {
    const request = ++playRequest;
    ambientEnabled = v;
    if (!v) {
      fadeMusic(0, 500, true);
      return false;
    }

    try {
      await music.play();
      if (request !== playRequest || !ambientEnabled) return false;
      fadeMusic(0.42, 1200);
      return true;
    } catch {
      if (request === playRequest) ambientEnabled = false;
      return false;
    }
  };

  const unlock = () => {
    if (effectsUnlocked) return;
    effectsUnlocked = true;
    for (const movement of naviMovements) {
      movement.audio.muted = true;
      void movement.audio.play().then(() => {
        movement.audio.pause();
        movement.audio.currentTime = 0;
        movement.audio.muted = false;
      }).catch(() => {
        movement.audio.muted = false;
        effectsUnlocked = false;
      });
    }
  };

  const playNaviMovement = () => {
    for (const movement of naviMovements) {
      movement.audio.pause();
      movement.audio.currentTime = 0;
    }
    const movement = naviMovements[Math.random() < 0.5 ? 0 : 1];
    void movement.audio.play().catch(() => {});
    return movement.durationMs;
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        music.pause();
      } else if (ambientEnabled) {
        void music.play().catch(() => {});
      }
    });
  }

  return {
    enabled: false,
    setAmbientEnabled,
    playNaviMovement,
    unlock,
  };
}
