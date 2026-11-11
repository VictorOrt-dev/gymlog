import { useCallback, useEffect, useState } from 'react';

export function useNow(ms = 1000, active = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms, active]);
  return now;
}

/** Garde l'écran allumé pendant la séance (sinon le téléphone se verrouille en plein repos). */
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock = null;
    let alive = true;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (alive) lock = l;
        else l.release();
      } catch {
        /* refusé (batterie faible, http…) : pas grave */
      }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

// ── Timer de repos ────────────────────────────────────────────────────────────
// Basé sur une heure de fin (et pas un compteur) : reste juste même si l'onglet dort.

const K_TIMER = 'gymlog:timer';
let audio;

function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    /* pas d'audio, on vibrera */
  }
}

function ring() {
  navigator.vibrate?.([250, 120, 250]);
  if (!audio) return;
  const t0 = audio.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'square'; // perce le bruit de la salle
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.16);
    o.connect(g).connect(audio.destination);
    o.start(t0 + d);
    o.stop(t0 + d + 0.18);
  });
}

function readTimer() {
  try {
    const t = JSON.parse(localStorage.getItem(K_TIMER));
    return t && t.endAt > Date.now() - 10 * 60e3 ? t : null;
  } catch {
    return null;
  }
}

export function useRestTimer() {
  const [state, setState] = useState(readTimer); // { endAt, total, rang }

  useEffect(() => {
    try {
      if (state) localStorage.setItem(K_TIMER, JSON.stringify(state));
      else localStorage.removeItem(K_TIMER);
    } catch {
      /* ignore */
    }
    if (!state || state.rang) return;
    const id = setTimeout(() => {
      ring();
      setState((t) => t && { ...t, rang: true });
    }, Math.max(0, state.endAt - Date.now()));
    return () => clearTimeout(id);
  }, [state]);

  const start = useCallback((sec) => {
    unlockAudio(); // appelé dans un geste utilisateur : débloque le son sur iOS
    setState({ endAt: Date.now() + sec * 1000, total: sec * 1000, rang: false });
  }, []);

  const add = useCallback(
    (sec) =>
      setState((t) => {
        if (!t) return t;
        const endAt = Math.max(Date.now(), t.endAt + sec * 1000);
        return { endAt, total: Math.max(1000, t.total + sec * 1000), rang: false };
      }),
    [],
  );

  const stop = useCallback(() => setState(null), []);

  return { state, start, add, stop };
}
