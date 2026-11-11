import { useNow } from '../lib/hooks';
import { mmss } from '../lib/training';
import { Close } from './Icons';

const PRESETS = [60, 90, 120, 180, 240];
const WRAP = 'fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]';

/**
 * Toujours visible, toujours sous le pouce.
 * - Au repos : 1 tap sur une durée = chrono lancé (et mémorisé pour l'exercice ouvert).
 * - En cours : −15 / +15 / stop.
 * - Fini : barre verte + bip + vibration, et le dépassement s'affiche (+0:23).
 */
export default function RestTimer({ timer, current, onPreset }) {
  const { state: t, add, stop } = timer;
  const now = useNow(250, !!t);

  if (!t) {
    return (
      <div className={WRAP}>
        <div className="mx-auto flex max-w-md items-center gap-1 rounded-2xl bg-zinc-900/95 p-1.5 shadow-2xl ring-1 ring-zinc-800 backdrop-blur">
          <span className="eyebrow pl-2 pr-1">Repos</span>
          {PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onPreset(s)}
              className={`h-11 flex-1 rounded-xl text-sm font-bold tabular-nums ${s === current ? 'bg-zinc-100 text-black' : 'text-zinc-300 active:bg-zinc-800'}`}
            >
              {mmss(s)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const left = t.endAt - now;

  if (left <= 0) {
    return (
      <div className={WRAP}>
        <button
          onClick={stop}
          className={`mx-auto flex h-16 w-full max-w-md items-center justify-between rounded-2xl bg-acid px-5 text-black shadow-2xl ${-left < 10e3 ? 'animate-pulse' : ''}`}
        >
          <span className="text-lg font-black uppercase tracking-wide">Go, série suivante</span>
          <span className="font-bold tabular-nums">+{mmss(Math.floor(-left / 1000))}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={WRAP}>
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl bg-zinc-900/95 shadow-2xl ring-1 ring-zinc-800 backdrop-blur">
        <div className="absolute inset-y-0 left-0 bg-acid/20 transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (left / t.total) * 100)}%` }} />
        <div className="relative flex h-16 items-center gap-1 px-1.5">
          <button onClick={() => add(-15)} className="h-12 w-14 rounded-xl font-bold tabular-nums text-zinc-300 active:bg-zinc-800">−15</button>
          <div className="flex-1 text-center text-4xl font-black tabular-nums leading-none">{mmss(Math.ceil(left / 1000))}</div>
          <button onClick={() => add(15)} className="h-12 w-14 rounded-xl font-bold tabular-nums text-zinc-300 active:bg-zinc-800">+15</button>
          <button onClick={stop} aria-label="Arrêter le chrono" className="grid h-12 w-12 place-items-center rounded-xl text-zinc-400 active:bg-zinc-800">
            <Close />
          </button>
        </div>
      </div>
    </div>
  );
}
