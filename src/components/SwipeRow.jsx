import { useRef, useState } from 'react';
import { Trash } from './Icons';

const ACTION_W = 92;

/**
 * Glisser vers la gauche pour supprimer, comme dans Mail ou Spotify :
 * - glissement court → le bouton « Supprimer » reste ouvert ;
 * - glissement long (plus de la moitié) → supprimé directement.
 * Le défilement vertical reste natif (touch-action: pan-y).
 */
export default function SwipeRow({ onDelete, children, className = '' }) {
  const [x, setX] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [gone, setGone] = useState(false);
  const rowRef = useRef(null);
  const xRef = useRef(0);
  const gesture = useRef(null);
  const swallowClick = useRef(false);

  const move = (v) => {
    xRef.current = v;
    setX(v);
  };

  const remove = () => {
    setAnimate(true);
    move(-(rowRef.current?.offsetWidth ?? 400));
    setGone(true);
    navigator.vibrate?.(10);
    setTimeout(onDelete, 200);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swallowClick.current = false;
    gesture.current = { x0: e.clientX, y0: e.clientY, base: xRef.current, axis: null, id: e.pointerId };
    setAnimate(false);
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (g.axis !== 'x') return;
    const w = rowRef.current.offsetWidth;
    move(Math.min(0, Math.max(-w, g.base + dx)));
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== 'x') return;
    swallowClick.current = true; // ce n'était pas un tap
    const w = rowRef.current.offsetWidth;
    if (xRef.current < -w * 0.5) return remove();
    setAnimate(true);
    move(xRef.current < -ACTION_W / 2 ? -ACTION_W : 0);
  };

  const onClickCapture = (e) => {
    if (swallowClick.current) {
      // le « clic » émis à la fin d'un glissement n'est pas un tap
      swallowClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    } else if (xRef.current !== 0) {
      // un vrai tap sur une ligne ouverte la referme
      e.stopPropagation();
      e.preventDefault();
      setAnimate(true);
      move(0);
    }
  };

  return (
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${gone ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} ${className}`}>
      <div ref={rowRef} className="relative min-h-0 overflow-hidden">
        <button
          type="button"
          onClick={remove}
          aria-label="Supprimer"
          tabIndex={x === 0 ? -1 : 0}
          style={{ width: Math.max(ACTION_W, -x) }}
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-pink text-[13px] font-semibold text-white"
        >
          <Trash className="h-5 w-5" />
          Supprimer
        </button>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          style={{ transform: `translateX(${x}px)` }}
          className={`relative touch-pan-y bg-card ${animate ? 'transition-transform duration-200 ease-out' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
