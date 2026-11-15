export default function App() {
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
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
          Leaflet Map Container (Jezero Crater)
        </div>
      </main>
    </div>
  );
}
