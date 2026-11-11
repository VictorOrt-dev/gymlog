import { TabHistory, TabProgress, TabToday, TabWorkouts } from './Icons';

const TABS = [
  ['today', "Aujourd'hui", TabToday],
  ['templates', 'Séances', TabWorkouts],
  ['history', 'Historique', TabHistory],
  ['progress', 'Progrès', TabProgress],
];

export default function TabBar({ tab, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-[0.5px] border-line/70 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[54px] max-w-md grid-cols-4">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 ${tab === id ? 'text-pink' : 'text-muted active:opacity-60'}`}
          >
            <Icon className="h-[26px] w-[26px]" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
