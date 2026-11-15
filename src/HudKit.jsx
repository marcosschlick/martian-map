import { TONE_BG } from "./hudStyles.js";

const ICONS = {
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3" />
      <path d="M3 3v5.3h5.3" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.6" />
      <path d="M20 3v5.6h-5.6" />
    </>
  ),
  oxygen: <path d="M3 8h10a3 3 0 1 0-3-3M3 16h13a3 3 0 1 1-3 3M3 12h17" />,
  battery: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2M6 10.5v3M10 10.5v3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="m12 14 4-5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  external: (
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  optical: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
    </>
  ),
  elevation: <path d="m3 19 6-11 4 6 2-3 6 8z" />,
  blended: (
    <>
      <path d="m12 4 9 5-9 5-9-5z" />
      <path d="m3 14 9 5 9-5" />
    </>
  ),
  glove: (
    <path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10M10 9.5V4a1.5 1.5 0 0 1 3 0v6M13 9.5V5a1.5 1.5 0 0 1 3 0v5.5M16 10V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4 15.2a1.6 1.6 0 0 1 2.4-2.1L7 14" />
  ),
  radiation: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 3a9 9 0 0 1 7.8 4.5L14 10.8M4.2 7.5A9 9 0 0 1 12 3M12 21a9 9 0 0 1-7.8-4.5L10 13.2M19.8 16.5A9 9 0 0 1 12 21" />
    </>
  ),
  ctx: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
};

export function Icon({ name, className = "size-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

export function StatusDot({ tone = "neutral", pulse = false }) {
  return (
    <span aria-hidden="true" className="relative inline-flex size-2 shrink-0">
      {pulse && (
        <span
          className={`absolute inset-0 rounded-full motion-safe:animate-hud-ping ${TONE_BG[tone]}`}
        />
      )}
      <span
        className={`relative size-2 rounded-full transition-colors duration-300 ${TONE_BG[tone]}`}
      />
    </span>
  );
}

export function Meter({ value, tone }) {
  const clamped = Math.min(1, Math.max(0, value || 0));
  return (
    <div
      aria-hidden="true"
      className="h-1.5 overflow-hidden rounded-full bg-slate-800"
    >
      <div
        className={`h-full origin-left rounded-full transition-[transform,background-color] duration-300 ease-hud ${TONE_BG[tone]}`}
        style={{ transform: `scaleX(${clamped})` }}
      />
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  id,
  as: Heading = "h3",
  tabIndex,
  children,
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
      <Heading
        id={id}
        tabIndex={tabIndex}
        className="flex scroll-mt-3 items-center gap-2 rounded text-xs font-semibold whitespace-nowrap text-slate-50 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      >
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-950 text-cyan-500">
          <Icon name={icon} />
        </span>
        {title}
      </Heading>
      {children}
    </div>
  );
}
