import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNotifications,
  getQueryPeriod,
  HISTORICAL_NOTIFICATION,
} from "./spaceWeather.js";

export function useSpaceWeather() {
  const [weather, setWeather] = useState(() => ({
    status: "loading",
    period: getQueryPeriod(),
    attemptedAt: null,
    notifications: [],
    rejectedCount: 0,
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
      rejectedCount: 0,
      error: null,
    });
    try {
      const { notifications, rejectedCount } = await fetchNotifications(
        period,
        controller,
      );
      if (mounted.current && activeRequest.current === controller) {
        setWeather({
          status: notifications.length ? "nasa" : "empty",
          period,
          attemptedAt,
          notifications,
          rejectedCount,
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
          rejectedCount: 0,
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

  return { weather, refresh };
}
