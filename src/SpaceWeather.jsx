import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNotifications,
  getQueryPeriod,
  HISTORICAL_NOTIFICATION,
} from "./spaceWeather.js";

const utcTime = (value, seconds = false) =>
  new Date(value)
    .toISOString()
    .slice(0, seconds ? 19 : 16)
    .replace("T", " ") + " UTC";

export default function SpaceWeather() {
  const [weather, setWeather] = useState(() => ({
    status: "loading",
    period: getQueryPeriod(),
    attemptedAt: null,
    notifications: [],
    error: null,
  }));
  const activeRequest = useRef(null);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const now = new Date();
    const period = getQueryPeriod(now);
    const attemptedAt = now.toISOString();
    setWeather({
      status: "loading",
      period,
      attemptedAt,
      notifications: [],
      error: null,
    });
    try {
      const notifications = await fetchNotifications(period, controller);
      if (mounted.current && activeRequest.current === controller) {
        setWeather({
          status: notifications.length ? "nasa" : "empty",
          period,
          attemptedAt,
          notifications,
          error: null,
        });
      }
    } catch (error) {
      if (mounted.current && activeRequest.current === controller) {
        setWeather({
          status: "historical",
          period,
          attemptedAt,
          notifications: [HISTORICAL_NOTIFICATION],
          error: error.message,
        });
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // StrictMode's initial cleanup cancels the first scheduled start.
    const start = setTimeout(refresh, 0);
    return () => {
      mounted.current = false;
      clearTimeout(start);
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [refresh]);

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
          className="text-xs font-semibold text-slate-50"
        >
          Space weather
        </h3>
        <button
          type="button"
          disabled={loading}
          onClick={refresh}
          className="cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Solar event context · Mars surface radiation not evaluated.
      </p>
      <p
        id="space-weather-status"
        role="status"
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
                <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
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
