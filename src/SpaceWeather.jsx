const BADGE_CONTENT = {
  loading: { label: "Checking NASA…" },
  nasa: { label: "NASA CME notice" },
  empty: { label: "No CME notices", detail: "In queried period" },
  historical: { label: "NASA unavailable", detail: "Historical example" },
};

const utcTime = (value, seconds = false) =>
  new Date(value)
    .toISOString()
    .slice(0, seconds ? 19 : 16)
    .replace("T", " ") + " UTC";

export function SpaceWeatherBadge({ weather }) {
  const { label, detail } = BADGE_CONTENT[weather.status];
  const latestNotice =
    weather.status === "nasa" ? weather.notifications[0] : null;
  const tone = latestNotice
    ? "border-amber-500/50 text-amber-500"
    : "border-slate-800 text-slate-50";

  return (
    <div role="status" className="col-span-2 min-[400px]:col-span-1">
      <a
        href="#space-weather-title"
        data-solar-notice={latestNotice ? true : undefined}
        className={`hud-control flex min-h-10 items-center rounded-md border bg-slate-900 px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500 ${tone}`}
      >
        <span className="flex flex-wrap items-baseline gap-x-2 min-[400px]:flex-col">
          <span className="text-xs font-semibold">{label}</span>
          {latestNotice && (
            <time
              dateTime={latestNotice.messageIssueTime}
              className="font-mono text-[10px] text-slate-400 tabular-nums"
            >
              {utcTime(latestNotice.messageIssueTime)}
            </time>
          )}
          {detail && (
            <span className="text-[10px] text-slate-400">{detail}</span>
          )}
        </span>
        <span className="sr-only">View space weather details</span>
      </a>
    </div>
  );
}

export default function SpaceWeather({ weather, refresh }) {
  const historical = weather.status === "historical";
  const loading = weather.status === "loading";
  return (
    <section
      aria-labelledby="space-weather-title"
      className="mt-3 border-t border-slate-800 pt-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id="space-weather-title"
          tabIndex={-1}
          className="scroll-mt-3 rounded text-xs font-semibold text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          Space weather
        </h3>
        <button
          type="button"
          aria-disabled={loading}
          onClick={loading ? undefined : refresh}
          className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Notices about coronal mass ejections (CMEs). Local radiation at Jezero
        remains unassessed.
      </p>
      {weather.rejectedCount > 0 && (
        <p className="mt-1 text-[11px] text-amber-500">
          {weather.rejectedCount === 1
            ? "1 invalid entry omitted"
            : `${weather.rejectedCount} invalid entries omitted`}
        </p>
      )}
      <p
        id="space-weather-status"
        className={`mt-2 text-xs ${historical ? "text-amber-500" : "text-slate-400"}`}
      >
        {loading
          ? "Loading NASA notifications"
          : historical
            ? "Historical demo"
            : weather.status === "empty"
              ? "No CME notifications in queried period"
              : "NASA response"}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Source:{" "}
        <a
          href="https://ccmc.gsfc.nasa.gov/tools/DONKI/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded text-cyan-500 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          NASA DONKI
        </a>
        {historical ? " · Historical example" : ""}
      </p>
      <dl className="mt-2 space-y-1 text-[11px] text-slate-400">
        <div>
          <dt>Queried period (UTC)</dt>
          <dd id="space-weather-period" className="text-slate-50">
            {weather.period.startDate} – {weather.period.endDate}
          </dd>
        </div>
        <div>
          <dt>Query attempt (UTC)</dt>
          <dd id="space-weather-attempt" className="text-slate-50">
            {weather.attemptedAt
              ? utcTime(weather.attemptedAt, true)
              : "Pending initial query"}
          </dd>
        </div>
      </dl>
      {historical && (
        <p id="space-weather-error" className="mt-2 text-[11px] text-amber-500">
          Current query unavailable. {weather.error} Displaying a historical
          NASA example, not a current event.
        </p>
      )}
      {weather.notifications.length > 0 && (
        <ol className="mt-3 space-y-3">
          {weather.notifications.map((notification) => (
            <li
              key={notification.messageID}
              className="min-w-0 border-t border-slate-800 pt-2"
            >
              <a
                href={notification.messageURL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-mono text-[11px] text-cyan-500 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                aria-label={`Open NASA notification ${notification.messageID}`}
              >
                {notification.messageID}
              </a>
              <time
                dateTime={notification.messageIssueTime}
                className="mt-0.5 block text-[11px] text-slate-400"
              >
                {utcTime(notification.messageIssueTime)}
              </time>
              <details className="mt-1 text-[11px] leading-relaxed text-slate-400">
                <summary className="hud-control cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                  {historical ? "NASA message excerpt" : "NASA message text"}
                </summary>
                <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] select-text">
                  {notification.messageBody}
                </p>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
