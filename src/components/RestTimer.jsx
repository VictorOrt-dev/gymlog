import { useNow } from '../lib/hooks';
import { mmss } from '../lib/training';
import { Close } from './Icons';

const PRESETS = [60, 90, 120, 180, 240];
const WRAP = 'fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]';
const CAPSULE = 'mx-auto max-w-md rounded-full bg-card/90 shadow-[0_10px_40px_rgba(0,0,0,.7)] ring-[0.5px] ring-white/10 backdrop-blur-xl';

/**
 * Une capsule toujours sous le pouce.
 * - Au repos : 1 tap sur une durée = chrono lancé (et mémorisé pour l'exercice ouvert).
 * - En cours : −15 / +15 / stop.
 * - Fini : capsule rose + bip + vibration, et le dépassement s'affiche (+0:23).
 */
export default function RestTimer({ timer, current, onPreset }) {
  const { state: t, add, stop } = timer;
  const now = useNow(250, !!t);

  if (!t) {
    return (
      <div className={WRAP}>
        <div className={`${CAPSULE} flex h-14 items-center gap-0.5 px-1.5`}>
          <span className="pl-3 pr-1 text-[13px] font-medium text-muted max-[374px]:hidden">Repos</span>
          {PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onPreset(s)}
              className={`h-11 min-w-0 flex-1 rounded-full font-num text-[15px] font-semibold tabular-nums ${s === current ? 'bg-fill-hi text-white' : 'text-muted active:text-white'}`}
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
          className={`mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-full bg-pink px-6 text-white shadow-[0_10px_40px_rgba(255,59,128,.35)] ${-left < 10e3 ? 'animate-pulse' : ''}`}
        >
          <span className="text-[17px] font-semibold">C'est reparti</span>
          <span className="font-num text-[15px] font-semibold tabular-nums opacity-80">+{mmss(Math.floor(-left / 1000))}</span>
        </button>
      </div>
    );
  }

  const pct = Math.min(100, (left / t.total) * 100);
  const btn = 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fill font-num text-[13px] font-semibold active:opacity-50';

  return (
    <div className={WRAP}>
      <div className={`${CAPSULE} flex h-16 items-center gap-2 px-2.5`}>
        <button onClick={() => add(-15)} className={btn}>−15</button>
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-num text-[30px] font-bold leading-none tabular-nums">{mmss(Math.ceil(left / 1000))}</span>
          <span className="h-[3px] w-20 overflow-hidden rounded-full bg-fill">
            <span className="block h-full rounded-full bg-pink transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
          </span>
        </div>
        <button onClick={() => add(15)} className={btn}>+15</button>
        <button onClick={stop} aria-label="Arrêter le chrono" className={`${btn} text-muted`}>
          <Close className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
