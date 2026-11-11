/** Panneau qui monte du bas : à portée de pouce, se ferme en touchant le fond. */
export default function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88dvh] w-full max-w-md animate-sheet overflow-y-auto rounded-t-[28px] bg-card px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-faint" />
        {title && <h2 className="mb-4 text-[22px] font-bold tracking-tight">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
