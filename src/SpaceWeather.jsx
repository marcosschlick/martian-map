import { CardHeader, Icon, StatusDot } from "./HudKit.jsx";
import {
  ALERT,
  BUTTON,
  CARD,
  FOCUS_RING,
  INSET,
  LABEL,
  LINK,
  SUMMARY,
} from "./hudStyles.js";

const BADGE_CONTENT = {
  loading: { label: "Checking NASA…" },
  nasa: { label: "NASA CME notice" },
  empty: { label: "No CME notices", detail: "In queried period" },
  historical: { label: "NASA unavailable", detail: "Historical example" },
};

const STATUS_TONE = {
  loading: "accent",
  nasa: "warning",
  empty: "neutral",
  historical: "warning",
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
        className={`hud-control flex min-h-10 items-center gap-2 rounded-md border bg-slate-900 px-2 transition-[border-color,background-color] duration-150 ease-hud [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500 ${FOCUS_RING} ${tone}`}
      >
        <StatusDot
          tone={STATUS_TONE[weather.status]}
          pulse={weather.status === "loading" || Boolean(latestNotice)}
        />
        <span className="flex flex-wrap items-baseline gap-x-2 min-[400px]:flex-col">
          <span
            key={weather.status}
            className="text-xs font-semibold motion-safe:animate-hud-fade"
          >
            {label}
          </span>
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
      aria-busy={loading}
      className={`${CARD} scroll-mt-3`}
      style={{ animationDelay: "180ms" }}
    >
      <CardHeader
        icon="sun"
        title="Space weather"
        id="space-weather-title"
        tabIndex={-1}
      >
        <button
          type="button"
          aria-disabled={loading}
          onClick={loading ? undefined : refresh}
          className={BUTTON}
        >
          <Icon
            name="refresh"
            className={`size-3.5 ${loading ? "motion-safe:animate-spin" : ""}`}
          />
          Refresh
        </button>
      </CardHeader>
      <p className={`mt-1 ${LABEL}`}>
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
        className={`mt-3 flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${historical ? "text-amber-500" : "text-slate-400"}`}
      >
        <StatusDot tone={STATUS_TONE[weather.status]} pulse={loading} />
        <span key={weather.status} className="motion-safe:animate-hud-fade">
          {loading
            ? "Loading NASA notifications"
            : historical
              ? "Historical demo"
              : weather.status === "empty"
                ? "No CME notifications in queried period"
                : "NASA response"}
        </span>
      </p>
      <p className={`mt-1 ${LABEL}`}>
        Source:{" "}
        <a
          href="https://ccmc.gsfc.nasa.gov/tools/DONKI/"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          NASA DONKI
        </a>
        {historical ? " · Historical example" : ""}
      </p>
      <dl
        className={`mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-400 ${INSET}`}
      >
        <div>
          <dt>Queried period (UTC)</dt>
          <dd
            id="space-weather-period"
            className="mt-0.5 font-mono text-slate-50 tabular-nums"
          >
            {weather.period.startDate} – {weather.period.endDate}
          </dd>
        </div>
        <div>
          <dt>Query attempt (UTC)</dt>
          <dd
            id="space-weather-attempt"
            className="mt-0.5 font-mono text-slate-50 tabular-nums"
          >
            {weather.attemptedAt
              ? utcTime(weather.attemptedAt, true)
              : "Pending initial query"}
          </dd>
        </div>
      </dl>
      {loading && (
        <div aria-hidden="true" className="mt-3 space-y-2">
          <div className="h-3 w-2/3 rounded bg-slate-800 motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-800 motion-safe:animate-pulse" />
        </div>
      )}
      {historical && (
        <p id="space-weather-error" className={`mt-3 ${ALERT.warning}`}>
          Current query unavailable. {weather.error} Displaying a historical
          NASA example, not a current event.
        </p>
      )}
      {weather.notifications.length > 0 && (
        <ol className="mt-3 space-y-2">
          {weather.notifications.map((notification, index) => (
            <li
              key={notification.messageID}
              className={`min-w-0 ${INSET} motion-safe:animate-hud-enter`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <a
                href={notification.messageURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 font-mono text-[11px] ${LINK}`}
                aria-label={`Open NASA notification ${notification.messageID}`}
              >
                {notification.messageID}
                <Icon name="external" className="size-3" />
              </a>
              <time
                dateTime={notification.messageIssueTime}
                className="mt-0.5 block font-mono text-[11px] text-slate-400 tabular-nums"
              >
                {utcTime(notification.messageIssueTime)}
              </time>
              <details className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                <summary className={SUMMARY}>
                  <Icon
                    name="chevron"
                    className="size-3 transition-transform duration-200 ease-hud group-open:rotate-90"
                  />
                  {historical ? "NASA message excerpt" : "NASA message text"}
                </summary>
                <p className="hud-scroll mt-1 max-h-48 overflow-y-auto pr-1 whitespace-pre-wrap [overflow-wrap:anywhere] select-text motion-safe:animate-hud-fade">
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
