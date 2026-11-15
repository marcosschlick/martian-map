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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4">
        <div className="flex items-center gap-3">
          <img
            src="/astrotux.png"
            alt="Tuxonauts"
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          <h1 className="text-sm font-bold tracking-wider uppercase">
            MARTIAN MAP — TUXONAUTS
          </h1>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          Jezero Crater · 18.38° N, 77.58° E
        </span>
      </header>

      <main className="relative w-full flex-1 bg-slate-950">
        <div
          role="group"
          aria-label="Map data layer"
          className="absolute top-4 left-14 z-[1000] flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-sm"
        >
          {LAYER_OPTIONS.map(({ id, label }) => {
            const isActive = activeLayer === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveLayer(id)}
                className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold tracking-wider transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                  isActive
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-900 text-slate-400 hover:text-slate-50"
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
