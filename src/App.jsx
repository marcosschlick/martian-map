import { useState } from "react";
import MarsMap from "./MarsMap.jsx";

const LAYER_OPTIONS = [
  { id: "optical", label: "OPTICAL" },
  { id: "elevation", label: "ELEVATION" },
  { id: "blended", label: "BLENDED" },
];

export default function App() {
  const [activeLayer, setActiveLayer] = useState("optical");

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-50 select-none">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-3 backdrop-blur-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <img
            src="/astrotux.png"
            alt="Tuxonauts"
            className="h-8 w-8 shrink-0 rounded-full border border-slate-800 bg-slate-900 object-contain sm:h-9 sm:w-9"
          />
          <h1 className="truncate text-xs font-bold tracking-wider text-slate-50 uppercase sm:text-sm">
            MARTIAN MAP — TUXONAUTS
          </h1>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums sm:text-xs">
          <span className="hidden sm:inline">Jezero Crater · </span>
          18.38° N, 77.58° E
        </span>
      </header>

      <main className="relative min-h-0 w-full flex-1 overflow-hidden bg-slate-950">
        <div
          role="group"
          aria-label="Map data layer"
          className="absolute top-2.5 left-14 z-[1000] flex max-w-[calc(100vw-4.25rem)] items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-sm"
        >
          {LAYER_OPTIONS.map(({ id, label }) => {
            const isActive = activeLayer === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveLayer(id)}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold tracking-wider transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-500 active:scale-[0.97] sm:px-2.5 sm:text-xs ${
                  isActive
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-900 text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <MarsMap activeLayer={activeLayer} />
      </main>
    </div>
  );
}
