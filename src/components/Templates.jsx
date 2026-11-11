import { useState } from 'react';
import { MODELS, uid } from '../lib/defaults';
import { useStore } from '../lib/store';
import SwipeRow from './SwipeRow';
import TemplateEditor from './TemplateEditor';
import { useToast } from './Toast';
import { Plus } from './Icons';
import { Group, LargeTitle, Page, PlayButton } from './ui';

/** Onglet « Séances » : tes séances (glisser pour supprimer), séance libre, modèles à ajouter. */
export default function Templates({ onOpenSession }) {
  const { state, startSession, saveTemplate, deleteTemplate, restoreTemplate, addTemplateFromModel } = useStore();
  const notify = useToast();
  const [editingId, setEditingId] = useState(null);

  const pid = state.profileId;
  const draft = state.drafts[pid];
  const templates = state.templates.filter((t) => t.profileId === pid);
  const exName = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const preview = (ids) => ids.map((id) => exName[id]).filter(Boolean).join(' · ');

  const start = (templateId) => {
    startSession(templateId);
    onOpenSession();
  };

  const create = () => {
    const t = { id: uid(), profileId: pid, name: 'Nouvelle séance', exerciseIds: [] };
    saveTemplate(t);
    setEditingId(t.id);
  };

  const remove = (t) => {
    const index = state.templates.findIndex((x) => x.id === t.id);
    const refs = Object.entries(state.plans).flatMap(([p, plan]) => plan.flatMap((x, day) => (x === t.id ? [[p, day]] : [])));
    deleteTemplate(t.id);
    notify(`« ${t.name || 'Séance'} » supprimée`, () => restoreTemplate({ tpl: t, index, refs }));
  };

  const addModel = (name) => {
    addTemplateFromModel(name);
    notify(`« ${name} » ajoutée à tes séances`);
  };

  return (
    <Page>
      <LargeTitle
        title="Séances"
        right={
          <button onClick={create} aria-label="Créer une séance" className="mb-1.5 grid h-10 w-10 place-items-center rounded-full bg-pink text-white active:opacity-80">
            <Plus className="h-6 w-6" />
          </button>
        }
      />

      <Group title="Mes séances" className="mt-5" footer={templates.length ? 'Touche une séance pour la modifier. Glisse-la vers la gauche pour la supprimer.' : null}>
        {templates.map((t) => (
          <SwipeRow key={t.id} className="sep" onDelete={() => remove(t)}>
            <div className="flex items-center gap-3 pr-3">
              <button onClick={() => setEditingId(t.id)} className="min-w-0 flex-1 py-3 pl-4 text-left">
                <div className="truncate text-[17px] font-semibold">{t.name || 'Sans nom'}</div>
                <div className="truncate text-[15px] text-muted">
                  {t.exerciseIds.length ? `${t.exerciseIds.length} exercices · ${preview(t.exerciseIds)}` : 'Touche pour ajouter des exercices'}
                </div>
              </button>
              <PlayButton label={`Démarrer ${t.name}`} onClick={() => start(t.id)} disabled={!!draft} />
            </div>
          </SwipeRow>
        ))}
        {!templates.length && <p className="px-4 py-4 text-[15px] text-muted">Aucune séance. Crée la tienne ou ajoute un modèle plus bas.</p>}
        <button onClick={create} className="sep flex h-12 w-full items-center gap-2 px-4 text-[17px] text-pink active:opacity-50">
          <Plus className="h-5 w-5" /> Créer une séance
        </button>
      </Group>

      <Group className="mt-4">
        <div className="flex items-center gap-3 py-3 pl-4 pr-3">
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold">Séance libre</div>
            <div className="text-[15px] text-muted">Sans programme, ajoute les exercices au fil de l’eau</div>
          </div>
          <PlayButton label="Démarrer une séance libre" onClick={() => start(null)} disabled={!!draft} />
        </div>
      </Group>
      {draft && <p className="mt-2 px-4 text-[13px] text-muted">Une séance est déjà en cours : termine-la depuis l’onglet Aujourd’hui.</p>}

      <Group title="Modèles" footer="Ajoute un modèle à tes séances, puis modifie-le comme tu veux.">
        {MODELS.map(([name, exercises]) => (
          <div key={name} className="sep flex items-center gap-3 py-3 pl-4 pr-3">
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-semibold">{name}</div>
              <div className="truncate text-[15px] text-muted">{exercises.join(' · ')}</div>
            </div>
            <button onClick={() => addModel(name)} className="h-8 shrink-0 rounded-full bg-fill-hi px-3.5 text-[15px] font-semibold text-pink active:opacity-60">
              Ajouter
            </button>
          </div>
        ))}
      </Group>

      <TemplateEditor template={templates.find((t) => t.id === editingId)} onClose={() => setEditingId(null)} />
    </Page>
  );
}
