const Icon = ({ d, className = 'h-6 w-6', strokeWidth = 2.25 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

export const Check = (p) => <Icon d="M5 12.5l4.5 4.5L19 7.5" {...p} />;
export const Back = (p) => <Icon d="M15 5l-7 7 7 7" {...p} />;
export const Plus = (p) => <Icon d="M12 5v14M5 12h14" {...p} />;
export const Minus = (p) => <Icon d="M5 12h14" {...p} />;
export const Close = (p) => <Icon d="M6 6l12 12M18 6L6 18" {...p} />;
export const Up = (p) => <Icon d="M12 19V5M6 11l6-6 6 6" {...p} />;
export const Search = (p) => <Icon d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l4.5 4.5" {...p} />;
export const Play = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);
export const ChevronRight = (p) => <Icon d="M9 5l7 7-7 7" {...p} />;
export const Trash = (p) => <Icon d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" {...p} />;
