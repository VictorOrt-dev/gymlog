import { useMemo, useState } from 'react';
import { CUSTOM_GROUP, GROUPS } from '../lib/defaults';
import { LEVELS, SESSION_CAP, VOLUME_ZONE, calendarGrid, crowdedSessions, mondayOf, muscleOrder, stallingExercises, strengthLevel, volumeStatus, weekStreak, weeklyVolume } from '../lib/stats';
import { useStore } from '../lib/store';
import { ago, fmtW, isStalling, seriesFor } from '../lib/training';
import { Segmented } from './Charts';
import ProgressDetail from './ProgressDetail';
import ProgressSection from './ProgressSection';
import SessionDetail, { sessionStats } from './SessionDetail';
import SettingsSheet from './SettingsSheet';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { ChevronRight, TabProgress } from './Icons';
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

/** Un des 4 blocs de l'onglet : un titre, du contenu, de l'air. */
const Block = ({ title, right, children }) => (
  <section className="mt-10">
    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** 12 semaines, un carré par jour (lundi en haut) : la régularité se lit d'un regard. CSS pur, aucune librairie. */
function Calendar({ sessions, streak, children }) {
  const { cols, count } = useMemo(() => calendarGrid(sessions, 12), [sessions]);
  const first = new Date(cols[0][0].ts);
  return (
    <Block
      title="Régularité"
      right={
        // La série de semaines, seulement quand elle existe : jamais de « 0 » culpabilisant
        streak >= 1 ? (
          <span className="rounded-full bg-pink/12 px-2.5 py-1 text-[13px] font-semibold text-pink" aria-label={`${streak} semaine${streak > 1 ? 's' : ''} d’affilée au rendez-vous`}>
            🔥 {streak} semaine{streak > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-[13px] text-muted">12 semaines</span>
        )
      }
    >
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
      {children}
    </Block>
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
    <>
    <h3 className="mb-2 mt-6 px-1 text-[15px] font-semibold text-muted">Niveau de force</h3>
    <Group
      className=""
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
    </>
  );
}

/**
 * Onglet « Progrès » : quatre blocs, dans l'ordre où on les regarde.
 * 1. Force (cartes + niveau) · 2. Volume par muscle · 3. Régularité (+ décharge) · 4. Dernières séances.
 */
export default function ProgressTab() {
  const { state, deleteSession, restoreSession, setDeload, setExerciseGroup } = useStore();
  const notify = useToast();
  const pid = state.profileId;
  const [progressOf, setProgressOf] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [week, setWeek] = useState(null); // null = automatique (semaine dernière tant que celle-ci est vide)
  const [assigning, setAssigning] = useState(false);
  const [settings, setSettings] = useState(false);
  const profile = state.profiles.find((p) => p.id === pid) ?? state.profiles[0];

  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === pid), [state.sessions, pid]);
  const byId = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e])), [state.exercises]);
  const recent = mine.slice(-5).reverse();
  const templates = state.templates.filter((t) => t.profileId === pid);
  const perWeek = (state.plans[pid] ?? []).filter((id) => templates.some((t) => t.id === id)).length || 3;
  const { streak } = weekStreak(mine, perWeek);

  const thisMonday = mondayOf(Date.now());
  const volThis = useMemo(() => weeklyVolume(mine, byId, thisMonday), [mine, byId, thisMonday]);
  const volLast = useMemo(() => weeklyVolume(mine, byId, thisMonday - 7 * 864e5), [mine, byId, thisMonday]);
  const thisEmpty = !muscleOrder(volThis.byGroup).length && !volThis.unassigned;
  const shownWeek = week ?? (thisEmpty ? 'last' : 'this');
  const volume = shownWeek === 'this' ? volThis : volLast;
  const groups = muscleOrder(volume.byGroup);
  const crowded = useMemo(() => crowdedSessions(mine, byId, shownWeek === 'this' ? thisMonday : thisMonday - 7 * 864e5), [mine, byId, shownWeek, thisMonday]);
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
    notify('Décharge lancée : moitié des séries, −5 %, loin de l’échec');
  };

  return (
    <Page>
      <LargeTitle title="Progrès" subtitle={mine.length ? `${mine.length} séance${mine.length > 1 ? 's' : ''} enregistrée${mine.length > 1 ? 's' : ''}` : null} />

      {!mine.length ? (
        // État vide : une promesse claire plutôt que quatre blocs vides
        <div className="mt-8 flex flex-col items-center rounded-3xl bg-card px-6 pb-9 pt-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-pink/12 text-pink">
            <TabProgress className="h-8 w-8" />
          </span>
          <p className="mt-4 text-[22px] font-bold tracking-tight">Ta progression commence ici</p>
          <p className="mt-1.5 max-w-[17rem] text-[15px] leading-snug text-muted">Termine ta première séance : ta force, ton volume par muscle et ta régularité s’afficheront ici, semaine après semaine.</p>
        </div>
      ) : (
        <>
          {/* 1. Force */}
          <Block title="Force" right={<span className="text-[13px] text-muted">1RM estimé</span>}>
            <ProgressSection onOpen={setProgressOf} />
            <Strength sessions={mine} profile={profile} onSetup={() => setSettings(true)} />
          </Block>

          {/* 2. Volume par muscle (repli automatique sur la semaine dernière le lundi) */}
          <Block title="Volume" right={<span className="text-[13px] text-muted">séries / semaine</span>}>
            <Segmented
              label="Semaine"
              options={[
                ['this', 'Cette semaine'],
                ['last', 'Semaine dernière'],
              ]}
              value={shownWeek}
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
              {week == null && thisEmpty ? 'Rien encore cette semaine : voici la semaine dernière. ' : ''}
              Séries dures (jusqu’à 3 reps de l’échec) par muscle et par semaine. Repère : 10 à 20 (zone grisée) ; ½ pour les muscles secondaires et les drop sets.
            </p>
            {crowded.map((c) => (
              <p key={`${c.at}-${c.group}`} className="mt-2 rounded-xl bg-fill px-3.5 py-2.5 text-[13px] leading-snug">
                <span className="font-semibold text-white">
                  {c.group} : {fmtSets(c.sets)} séries dures en une séance ({c.name}, {new Date(c.at).toLocaleDateString('fr-FR', { weekday: 'long' })}).
                </span>{' '}
                <span className="text-muted">Au-delà de ~{SESSION_CAP}, chaque série rapporte de moins en moins : mieux vaut répartir sur 2 séances.</span>
              </p>
            ))}
            {volume.unassigned > 0 && (
              <button onClick={() => setAssigning(true)} className="mt-1 flex min-h-11 w-full items-center px-4 text-left text-[13px] text-pink active:opacity-60">
                {fmtSets(volume.unassigned)} série{volume.unassigned > 1 ? 's' : ''} d’exercices perso sans muscle : attribuer →
              </button>
            )}
          </Block>

          {/* 3. Régularité, et la décharge quand elle a du sens */}
          <Calendar sessions={mine} streak={streak}>
            {(deloadActive || stalling.length >= 2) && (
              <div className={`mt-2 rounded-2xl px-4 py-3.5 ${deloadActive ? 'bg-card' : 'bg-pink/12'}`}>
                <p className="text-[15px] font-semibold">
                  {deloadActive ? `Semaine de décharge jusqu’au ${new Date(deloadUntil).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}` : `${stalling.length} exercices stagnent`}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">
                  {deloadActive ? 'Moitié des séries, charge −5 %, arrête-toi à 3–4 reps de l’échec. On baisse le volume, pas l’intensité : tu récupères sans perdre tes charges.' : 'Une semaine allégée (moitié des séries, charge presque intacte) relance souvent la progression.'}
                </p>
                <button
                  onClick={deloadActive ? () => setDeload(null) : startDeload}
                  className={`mt-3 h-11 w-full rounded-full text-[15px] font-semibold active:opacity-80 ${deloadActive ? 'bg-fill text-pink' : 'bg-pink text-white'}`}
                >
                  {deloadActive ? 'Arrêter la décharge' : 'Lancer une semaine de décharge'}
                </button>
              </div>
            )}
          </Calendar>

          {/* 4. Dernières séances */}
          <Block title="Dernières séances">
            <div className="overflow-hidden rounded-2xl bg-card">
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
                    <span className="shrink-0 font-num text-[15px] text-muted">
                      {sets} série{sets > 1 ? 's' : ''}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 px-4 text-[13px] text-muted">Touche une séance pour la revoir, corriger une série ou changer sa date.</p>
          </Block>
        </>
      )}

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
