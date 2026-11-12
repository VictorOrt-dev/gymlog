import { Play } from './Icons';

/** Squelette d'un onglet : marges, zones sûres, place pour la barre d'onglets. */
export const Page = ({ children }) => (
  <div className="mx-auto min-h-dvh max-w-md px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</div>
);

/** Grand titre façon iOS. */
export const LargeTitle = ({ title, subtitle, right }) => (
  <header className="flex items-end justify-between gap-3 pt-2">
    <div className="min-w-0">
      {subtitle && <p className="text-[15px] font-medium text-muted first-letter:uppercase">{subtitle}</p>}
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
    </div>
    {right}
  </header>
);

/** Section façon Réglages iOS : titre, carte groupée, note en dessous. */
export const Group = ({ title, action, footer, footerClass = 'text-muted', className = 'mt-9', children }) => (
  <section className={className}>
    {(title || action) && (
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
        {action}
      </div>
    )}
    <div className="overflow-hidden rounded-2xl bg-card">{children}</div>
    {footer && <p className={`mt-2 px-4 text-[13px] ${footerClass}`}>{footer}</p>}
  </section>
);

export const PrimaryButton = ({ onClick, children, className = 'mt-5' }) => (
  <button onClick={onClick} className={`h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80 ${className}`}>
    {children}
  </button>
);

export const SecondaryButton = ({ onClick, children, className = 'mt-5' }) => (
  <button onClick={onClick} className={`h-[52px] w-full rounded-full bg-fill text-[17px] font-semibold text-white active:opacity-60 ${className}`}>
    {children}
  </button>
);

export const PlayButton = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink/15 text-pink active:opacity-60 disabled:opacity-30"
  >
    <Play className="h-4 w-4 translate-x-px" />
  </button>
);

export const Avatar = ({ name, className = 'h-9 w-9 bg-fill-hi text-[15px]' }) => (
  <span className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}>{(name || '?')[0].toUpperCase()}</span>
);

/** Petite tuile chiffre : libellé en dessous, valeur en gros. */
export const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-fill px-3 py-3">
    <div className="truncate font-num text-[20px] font-bold leading-tight">{value}</div>
    <div className="mt-0.5 text-[13px] text-muted">{label}</div>
  </div>
);
