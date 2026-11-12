import { useMemo, useState } from 'react';
import { CUSTOM_GROUP, GROUPS } from '../lib/defaults';
import { LEVELS, VOLUME_ZONE, calendarGrid, mondayOf, muscleOrder, stallingExercises, strengthLevel, volumeStatus, weekStreak, weeklyVolume } from '../lib/stats';
import { useStore } from '../lib/store';
import { ago, fmtW, isStalling, seriesFor } from '../lib/training';
import { Segmented } from './Charts';
import ProgressDetail from './ProgressDetail';
import ProgressSection from './ProgressSection';
import SessionDetail, { sessionStats } from './SessionDetail';
import SettingsSheet from './SettingsSheet';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { ChevronRight } from './Icons';
import { Group, LargeTitle, Page } from './ui';

const SCALE = 25; // séries : l'échelle des barres de volume
const STATUS = { low: 'Sous 10', ok: 'Dans la zone', high: 'Au-delà de 20' };
const fmtSets = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const endOfWeek = (ts) => mondayOf(ts) + 7 * 864e5 - 1;

/** Une ligne de volume : le muscle, sa barre (zone 10–20 en repère), le nombre de séries. */
function VolumeRow({ group, value }) {
  const st = volumeStatus(value);
  return (
    <div className="sep px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-semibold">{group}</span>
        <span className="text-right">
          <span className="font-num text-[17px] font-semibold tabular-nums">{fmtSets(value)}</span>
          <span className="ml-1.5 text-[13px] text-muted">{STATUS[st]}</span>
        </span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-fill" role="img" aria-label={`${group} : ${fmtSets(value)} séries, ${STATUS[st]}`}>
        <div className="absolute inset-y-0 bg-seg/70" style={{ left: `${(VOLUME_ZONE[0] / SCALE) * 100}%`, width: `${((VOLUME_ZONE[1] - VOLUME_ZONE[0]) / SCALE) * 100}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-pink" style={{ width: `${Math.min(100, (value / SCALE) * 100)}%` }} />
      </div>
    </div>
  );
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** 12 semaines, un carré par jour (lundi en haut) : la régularité se lit d'un regard. CSS pur, aucune librairie. */
function Calendar({ sessions }) {
  const { cols, count } = useMemo(() => calendarGrid(sessions, 12), [sessions]);
  const first = new Date(cols[0][0].ts);
  return (
    <section className="mt-9">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-bold tracking-tight">Régularité</h2>
        <span className="text-[13px] text-muted">12 semaines</span>
      </div>
      <div className="rounded-2xl bg-card p-4">
        <div
          role="img"
          aria-label={`${count} jour${count > 1 ? 's' : ''} d’entraînement sur les 12 dernières semaines`}
          className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]"
        >
          {cols.flat().map((d) => (
            <span
              key={d.ts}
              className={`aspect-square rounded-[4px] ${d.on ? 'bg-pink' : d.future ? 'bg-transparent' : 'bg-fill'} ${d.today ? 'ring-1 ring-pink ring-offset-1 ring-offset-card' : ''}`}
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between text-[13px] text-muted">
          <span>
            Depuis le {first.getDate()} {MONTHS[first.getMonth()]}
          </span>
          <span>
            <span className="font-num font-semibold text-white">{count}</span> jour{count > 1 ? 's' : ''} d’entraînement
          </span>
        </div>
      </div>
    </section>
  );
}

const REF_LIFTS = [
  ['squat', 'Squat'],
  ['developpe-couche', 'Développé couché'],
  ['souleve-de-terre', 'Soulevé de terre'],
  ['developpe-militaire', 'Développé militaire'],
];

/** Statut de force : meilleur 1RM estimé ÷ poids de corps sur les mouvements de référence. Indicatif, jamais un jugement. */
function Strength({ sessions, profile, onSetup }) {
  const sex = profile.sex ?? 'h';
  const rows = useMemo(
    () =>
      REF_LIFTS.flatMap(([id, name]) => {
        const { points, bw } = seriesFor(sessions, id);
        if (!points.length || bw) return [];
        const best = Math.max(...points.map((p) => p.value));
        const lvl = strengthLevel(best, profile.bw, id, sex);
        return lvl ? [{ id, name, best, lvl }] : [];
      }),
    [sessions, profile.bw, sex],
  );
  return (
    <Group
      title="Niveau de force"
      footer={
        profile.bw
          ? `Meilleur 1RM estimé ÷ ton poids de corps (${fmtW(profile.bw)} kg), repères ${sex === 'f' ? 'femmes' : 'hommes'}. Des ordres de grandeur pour te situer, pas une note.`
          : null
      }
    >
      {!profile.bw ? (
        <button onClick={onSetup} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-fill">
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Situe ta force</span>
            <span className="block text-[15px] text-muted">Indique ton poids de corps : Novice, Intermédiaire, Avancé ou Élite sur les mouvements de base.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
        </button>
      ) : !rows.length ? (
        <p className="px-4 py-4 text-[15px] text-muted">Fais un squat, un développé couché, un soulevé de terre ou un développé militaire pour situer ta force.</p>
      ) : (
        rows.map(({ id, name, best, lvl }) => (
          <div key={id} className="sep px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[17px] font-semibold leading-tight">{name}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${lvl.index >= 2 ? 'bg-pink text-white' : 'bg-fill text-white'}`}>{lvl.level}</span>
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              <span className="font-num">{fmtW(best)} kg</span> estimés · <span className="font-num">{lvl.ratio.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}×</span> ton poids
            </div>
            <div className="mt-2 flex gap-1" role="img" aria-label={`${lvl.level}${lvl.next ? `, ${Math.round(lvl.progress * 100)} % du chemin vers ${lvl.next.level}` : ''}`}>
              {LEVELS.map((l, i) => (
                <span key={l} className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
                  <span className="block h-full rounded-full bg-pink" style={{ width: `${i < lvl.index ? 100 : i === lvl.index ? Math.round(lvl.progress * 100) : 0}%` }} />
                </span>
              ))}
            </div>
            {lvl.next && (
              <div className="mt-1.5 text-[13px] text-muted">
                {lvl.next.level} à <span className="font-num font-semibold text-white">{fmtW(lvl.next.kg)} kg</span> estimés
              </div>
            )}
          </div>
        ))
      )}
    </Group>
  );
}

/** Onglet « Progrès » : régularité, récupération, volume par muscle, force par exercice, dernières séances. */
export default function ProgressTab() {
  const { state, deleteSession, restoreSession, setDeload, setExerciseGroup } = useStore();
  const notify = useToast();
  const pid = state.profileId;
  const [progressOf, setProgressOf] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [week, setWeek] = useState('this');
  const [assigning, setAssigning] = useState(false);
  const [settings, setSettings] = useState(false);
  const profile = state.profiles.find((p) => p.id === pid) ?? state.profiles[0];

  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === pid), [state.sessions, pid]);
  const byId = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e])), [state.exercises]);
  const recent = mine.slice(-5).reverse();
  const templates = state.templates.filter((t) => t.profileId === pid);
  const perWeek = (state.plans[pid] ?? []).filter((id) => templates.some((t) => t.id === id)).length || 3;
  const { streak, currentDone } = weekStreak(mine, perWeek);

  const thisMonday = mondayOf(Date.now());
  const volume = useMemo(() => weeklyVolume(mine, byId, week === 'this' ? thisMonday : thisMonday - 7 * 864e5), [mine, byId, week, thisMonday]);
  const groups = muscleOrder(volume.byGroup);
  const customUsed = state.exercises.filter((e) => e.group === CUSTOM_GROUP && mine.some((s) => s.items.some((i) => i.exerciseId === e.id)));

  const deloadUntil = state.deload?.[pid] ?? 0;
  const deloadActive = deloadUntil > Date.now();
  const stalling = useMemo(() => stallingExercises(mine, (id) => isStalling(seriesFor(mine, id).points.map((p) => p.value))), [mine]);

  const remove = (s) => {
    deleteSession(s.id);
    setDetailId(null);
    notify(`Séance « ${s.name} » supprimée`, () => restoreSession(s));
  };
  const startDeload = () => {
    setDeload(endOfWeek(Date.now() + 6 * 864e5)); // 7 jours, jusqu'à la fin de la semaine où ils tombent
    notify('Semaine de décharge lancée : objectifs à −10 %, une série de moins');
  };

  return (
    <Page>
      <LargeTitle title="Progrès" subtitle={mine.length ? `${mine.length} séance${mine.length > 1 ? 's' : ''} enregistrée${mine.length > 1 ? 's' : ''}` : null} />

      <ProgressSection onOpen={setProgressOf} />

      {mine.length > 0 && (
        <>
          {/* Volume hebdomadaire par muscle */}
          <section className="mt-9">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-[20px] font-bold tracking-tight">Volume par muscle</h2>
              <span className="text-[13px] text-muted">séries / semaine</span>
            </div>
            <Segmented
              label="Semaine"
              options={[
                ['this', 'Cette semaine'],
                ['last', 'Semaine dernière'],
              ]}
              value={week}
              onChange={setWeek}
              size="h-11 text-[13px]"
            />
            <div className="mt-2 overflow-hidden rounded-2xl bg-card">
              {groups.map((g) => (
                <VolumeRow key={g} group={g} value={volume.byGroup[g]} />
              ))}
              {!groups.length && <p className="px-4 py-4 text-[15px] text-muted">Aucune série de travail sur cette semaine.</p>}
            </div>
            <p className="mt-2 px-4 text-[13px] leading-snug text-muted">
              Repère hypertrophie : 10 à 20 séries de travail par muscle et par semaine (zone grisée). Un exercice compte ½ série pour ses muscles secondaires.
            </p>
            {volume.unassigned > 0 && (
              <button onClick={() => setAssigning(true)} className="mt-1 flex min-h-11 w-full items-center px-4 text-left text-[13px] text-pink active:opacity-60">
                {fmtSets(volume.unassigned)} série{volume.unassigned > 1 ? 's' : ''} d’exercices perso sans muscle : attribuer →
              </button>
            )}
          </section>

          {/* Régularité */}
          <Calendar sessions={mine} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className={`rounded-2xl px-3.5 py-3 ${streak >= 2 ? 'bg-pink text-white' : 'bg-card'}`}>
              <div className="font-num text-[24px] font-bold leading-tight">
                {streak} <span className="text-[15px] font-semibold">sem.</span>
              </div>
              <div className={`mt-0.5 text-[13px] ${streak >= 2 ? 'text-white/90' : 'text-muted'}`}>Semaines d’affilée au rendez-vous</div>
            </div>
            <div className="rounded-2xl bg-card px-3.5 py-3">
              <div className="font-num text-[24px] font-bold leading-tight">{perWeek} / sem.</div>
              <div className="mt-0.5 text-[13px] text-muted">{currentDone ? 'Objectif de la semaine atteint' : 'Ton objectif hebdo (planning)'}</div>
            </div>
          </div>

          {/* Récupération : décharge proposée quand plusieurs exercices stagnent */}
          {(deloadActive || stalling.length >= 2) && (
            <div className={`mt-3 rounded-2xl px-4 py-3.5 ${deloadActive ? 'bg-fill' : 'bg-pink/12'}`}>
              <p className="text-[15px] font-semibold">
                {deloadActive ? `Semaine de décharge jusqu’au ${new Date(deloadUntil).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}` : `${stalling.length} exercices stagnent`}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                {deloadActive ? 'Objectifs à −10 %, une série de moins. Le corps récupère, la force revient plus haut.' : 'Une semaine allégée (−10 %, une série de moins) relance souvent la progression.'}
              </p>
              <button
                onClick={deloadActive ? () => setDeload(null) : startDeload}
                className={`mt-3 h-11 w-full rounded-full text-[15px] font-semibold active:opacity-80 ${deloadActive ? 'bg-card text-pink' : 'bg-pink text-white'}`}
              >
                {deloadActive ? 'Arrêter la décharge' : 'Lancer une semaine de décharge'}
              </button>
            </div>
          )}

        </>
      )}

      {recent.length > 0 && (
        <Group title="Dernières séances" footer="Touche une séance pour revoir et corriger chaque série. L’historique complet d’un exercice est dans sa carte.">
          {recent.map((s) => {
            const { sets, minutes } = sessionStats(s);
            return (
              <button key={s.id} onClick={() => setDetailId(s.id)} className="sep flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left active:bg-fill">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">{s.name}</div>
                  <div className="text-[15px] text-muted first-letter:uppercase">
                    {ago(s.startedAt)} · {minutes} min
                  </div>
                </div>
                <span className="shrink-0 font-num text-[15px] text-muted">{sets} séries</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
              </button>
            );
          })}
        </Group>
      )}

      {mine.length > 0 && <Strength sessions={mine} profile={profile} onSetup={() => setSettings(true)} />}

      {/* Attribuer un muscle aux exercices perso (pour le volume) */}
      <Sheet open={assigning} onClose={() => setAssigning(false)} title="Muscle de tes exercices perso">
        <div className="space-y-4">
          {customUsed.map((e) => (
            <div key={e.id}>
              <p className="mb-1.5 px-1 text-[15px] font-semibold">{e.name}</p>
              <div className="flex flex-wrap gap-x-2">
                {GROUPS.map((g) => (
                  <button key={g} onClick={() => setExerciseGroup(e.id, g)} className="flex h-11 items-center">
                    <span className="rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold text-white/85 active:bg-fill-hi">{g}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!customUsed.length && <p className="text-[15px] text-muted">Tous tes exercices ont un muscle.</p>}
        </div>
      </Sheet>

      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      <ProgressDetail exerciseId={progressOf} onClose={() => setProgressOf(null)} />
      <SessionDetail session={mine.find((s) => s.id === detailId)} onClose={() => setDetailId(null)} onDelete={() => remove(mine.find((s) => s.id === detailId))} />
    </Page>
  );
}
