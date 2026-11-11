/** Panneau qui monte du bas : à portée de pouce, se ferme en touchant le fond. */
export default function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85dvh] w-full max-w-md animate-sheet overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-700" />
        {title && <h2 className="mb-3 text-xl font-black">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
