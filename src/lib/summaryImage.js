import { fmtInt, fmtSet } from './training';

/**
 * Le récapitulatif en image (1080 × 1350, format portrait des réseaux), dessinée à la main sur un canvas :
 * noir pur, une seule couleur d'accent, typographie système. Aucune dépendance, aucun réseau.
 */
const W = 1080;
const H = 1350;
const PINK = '#ff3b80';
const MUTED = '#8e8e93';
const CARD = '#1c1c1e';
const FONT = (weight, size) => `${weight} ${size}px -apple-system, "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ellipsis = (ctx, text, max) => {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
};

export function drawSummary(canvas, { summary: s, athlete }, names) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const P = 72;

  // En-tête
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.arc(P + 36, P + 36, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(P + 20, P + 38);
  ctx.lineTo(P + 32, P + 50);
  ctx.lineTo(P + 54, P + 24);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = MUTED;
  ctx.font = FONT(500, 34);
  ctx.fillText(`${athlete ? `${athlete} · ` : ''}${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`, P, P + 136);
  ctx.fillStyle = '#fff';
  ctx.font = FONT(700, 92);
  ctx.fillText(ellipsis(ctx, s.name, W - 2 * P), P, P + 236);
  if (s.records) {
    ctx.fillStyle = PINK;
    ctx.font = FONT(600, 44);
    ctx.fillText(`${s.records} nouveau${s.records > 1 ? 'x' : ''} record${s.records > 1 ? 's' : ''} ★`, P, P + 306);
  }

  // Tuiles
  const tiles = [
    [`${s.minutes} min`, 'Durée'],
    [String(s.sets), 'Séries de travail'],
    [`${fmtInt(s.kg)} kg`, 'Tonnage effectif'],
  ];
  const tw = (W - 2 * P - 2 * 24) / 3;
  tiles.forEach(([v, l], i) => {
    const x = P + i * (tw + 24);
    const y = P + 360;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, tw, 170, 32);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(700, 58);
    ctx.fillText(ellipsis(ctx, v, tw - 56), x + 28, y + 88);
    ctx.fillStyle = MUTED;
    ctx.font = FONT(500, 30);
    ctx.fillText(ellipsis(ctx, l, tw - 56), x + 28, y + 136);
  });

  // Exercices
  let y = P + 620;
  const rowH = 96;
  const maxRows = Math.floor((H - y - 140) / rowH);
  const list = s.exercises.filter((e) => e.best).slice(0, maxRows);
  ctx.fillStyle = CARD;
  roundRect(ctx, P, y - 20, W - 2 * P, list.length * rowH + 20, 32);
  ctx.fill();
  list.forEach((e, i) => {
    const ry = y + i * rowH;
    if (i) {
      ctx.fillStyle = '#38383a';
      ctx.fillRect(P + 32, ry - 10, W - 2 * P - 32, 2);
    }
    ctx.fillStyle = '#fff';
    ctx.font = FONT(600, 38);
    ctx.fillText(ellipsis(ctx, names[e.exerciseId] ?? 'Exercice', W - 2 * P - 380), P + 32, ry + 48);
    ctx.textAlign = 'right';
    ctx.font = FONT(700, 38);
    ctx.fillText(fmtSet(e.best).replace(' × ', ' × '), W - P - 32 - (e.records ? 190 : 0), ry + 48);
    if (e.records) {
      ctx.fillStyle = PINK;
      roundRect(ctx, W - P - 32 - 170, ry + 12, 170, 50, 25);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(700, 28);
      ctx.textAlign = 'center';
      ctx.fillText('Record', W - P - 32 - 85, ry + 47);
    }
    ctx.textAlign = 'left';
  });

  // Signature
  ctx.fillStyle = MUTED;
  ctx.font = FONT(600, 32);
  ctx.fillText('GYM', P, H - P);
  const gw = ctx.measureText('GYM').width;
  ctx.fillStyle = PINK;
  ctx.fillText('LOG', P + gw, H - P);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
