export const TONE_HEX = {
  available: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  accent: "#06B6D4",
  neutral: "#94A3B8",
};

export const TONE_TEXT = {
  available: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  accent: "text-cyan-500",
  neutral: "text-slate-400",
};

export const TONE_BG = {
  available: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  accent: "bg-cyan-500",
  neutral: "bg-slate-400",
};

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";

const HOVER = "[@media(hover:hover)_and_(pointer:fine)]";

export const BUTTON = `hud-control inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 text-xs font-medium whitespace-nowrap text-slate-50 transition-[background-color,border-color,color,opacity,transform] duration-150 ease-hud enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400 ${HOVER}:enabled:hover:border-cyan-500 ${HOVER}:enabled:hover:text-cyan-500 ${FOCUS_RING}`;

export const TOGGLE = `${BUTTON} aria-pressed:border-cyan-500 aria-pressed:bg-cyan-500 aria-pressed:text-slate-950 aria-pressed:shadow-[0_0_14px_rgb(6_182_212/0.35)] ${HOVER}:aria-pressed:hover:text-slate-950`;

export const LAYER_BUTTON = `hud-control inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-slate-900 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase transition-[background-color,color,box-shadow,transform] duration-150 ease-hud active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-500 aria-pressed:bg-cyan-500 aria-pressed:text-slate-950 aria-pressed:shadow-[0_0_14px_rgb(6_182_212/0.35)] sm:px-2.5 sm:text-xs ${HOVER}:hover:text-slate-50 ${HOVER}:aria-pressed:hover:text-slate-950`;

export const FLOATING_PANEL =
  "hud-panel rounded-lg border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 backdrop-blur-sm";

export const CARD =
  "hud-panel rounded-lg border border-slate-800 bg-slate-900/50 p-3 motion-safe:animate-hud-enter";

export const INSET = "rounded-md border border-slate-800 bg-slate-950/60 p-2.5";

export const LABEL = "text-[11px] text-slate-400";

export const VALUE =
  "mt-0.5 font-mono tabular-nums transition-colors duration-300";

export const SUMMARY = `hud-control group flex cursor-pointer list-none items-center gap-1 rounded transition-colors duration-150 [&::-webkit-details-marker]:hidden ${HOVER}:hover:text-slate-50 ${FOCUS_RING}`;

export const LINK = `rounded text-cyan-500 underline decoration-cyan-500/40 underline-offset-2 transition-colors duration-150 ${HOVER}:hover:text-slate-50 ${HOVER}:hover:decoration-slate-50 ${FOCUS_RING}`;

export const ALERT = {
  danger:
    "rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-500 motion-safe:animate-hud-enter",
  warning:
    "rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-500 motion-safe:animate-hud-enter",
};
