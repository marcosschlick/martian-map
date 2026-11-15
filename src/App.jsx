export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <h1 className="text-sm font-bold tracking-wider uppercase">
            Martian Map — Tuxonauts
          </h1>
        </div>
        <span className="font-mono text-xs text-slate-400">
          Jezero Crater · 18.38° N, 77.58° E
        </span>
      </header>

      <main className="relative flex-1 bg-slate-950">
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Leaflet Map Container (Jezero Crater)
        </div>
      </main>
    </div>
  )
}
