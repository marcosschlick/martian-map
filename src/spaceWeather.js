export const DONKI_ENDPOINT = "https://api.nasa.gov/DONKI/notifications";
export const DONKI_TIMEOUT_MS = 12000;

// Verified NASA record. This short excerpt retains the original issue time.
export const HISTORICAL_NOTIFICATION = {
  messageID: "20240510-AL-003",
  messageType: "CME",
  messageIssueTime: "2024-05-10T13:38Z",
  messageURL: "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30674/1",
  messageBody:
    "O-type CME detected by STEREO A / SOHO.\nStart time of the event: 2024-05-10T07:12Z.",
};

class DonkiError extends Error {}

export function getQueryPeriod(now = new Date()) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 6);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

function officialMessageUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new DonkiError("Unexpected NASA notification link.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !["ccmc.gsfc.nasa.gov", "kauai.ccmc.gsfc.nasa.gov"].includes(
      url.hostname,
    ) ||
    !url.pathname.startsWith("/DONKI/") ||
    url.username ||
    url.password ||
    url.port ||
    Array.from(url.searchParams.keys()).some((key) =>
      /key|token|password|secret/i.test(key),
    )
  ) {
    throw new DonkiError("Unexpected NASA notification link.");
  }
  // NASA's migrated host preserves the original DONKI page paths.
  url.protocol = "https:";
  url.hostname = "ccmc.gsfc.nasa.gov";
  return url.href;
}

function normalizeNotification(item, period) {
  if (
    !item ||
    typeof item !== "object" ||
    ![
      "messageID",
      "messageType",
      "messageIssueTime",
      "messageURL",
      "messageBody",
    ].every(
      (field) =>
        typeof item[field] === "string" && item[field].trim().length > 0,
    ) ||
    item.messageType.trim() !== "CME" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z$/.test(
      item.messageIssueTime,
    ) ||
    !Number.isFinite(Date.parse(item.messageIssueTime))
  ) {
    throw new DonkiError("Unexpected NASA notification data.");
  }
  const issueDate = new Date(item.messageIssueTime).toISOString();
  if (
    issueDate.slice(0, 16) !== item.messageIssueTime.slice(0, 16) ||
    issueDate.slice(0, 10) < period.startDate ||
    issueDate.slice(0, 10) > period.endDate
  ) {
    throw new DonkiError(
      "NASA notification date is outside the queried period or invalid.",
    );
  }
  return {
    messageID: item.messageID.trim(),
    messageType: "CME",
    messageIssueTime: item.messageIssueTime,
    messageURL: officialMessageUrl(item.messageURL),
    messageBody: item.messageBody.trim(),
  };
}

export function normalizeNotifications(payload, period) {
  if (!Array.isArray(payload))
    throw new DonkiError("Unexpected NASA response structure.");
  const unique = new Map();
  let firstError;
  let rejectedCount = 0;
  for (const item of payload) {
    let notification;
    try {
      notification = normalizeNotification(item, period);
    } catch (error) {
      if (!(error instanceof DonkiError)) throw error;
      firstError ??= error;
      rejectedCount += 1;
      continue;
    }
    const previous = unique.get(notification.messageID);
    if (
      !previous ||
      Date.parse(previous.messageIssueTime) <
        Date.parse(notification.messageIssueTime)
    ) {
      unique.set(notification.messageID, notification);
    }
  }
  if (!unique.size && firstError) throw firstError;
  const notifications = Array.from(unique.values())
    .sort(
      (a, b) =>
        Date.parse(b.messageIssueTime) - Date.parse(a.messageIssueTime) ||
        a.messageID.localeCompare(b.messageID),
    )
    .slice(0, 3);
  return { notifications, rejectedCount };
}

export async function fetchNotifications(period, controller) {
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DONKI_TIMEOUT_MS);
  try {
    const useProxy =
      import.meta.env.PROD || import.meta.env.DONKI_PROXY_ENABLED;
    const url = useProxy
      ? new URL("/api/donki", window.location.origin)
      : new URL(DONKI_ENDPOINT);
    const params = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate,
      type: "CME",
    });
    if (!useProxy) params.set("api_key", "DEMO_KEY");
    url.search = params.toString();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new DonkiError(
        response.status === 429
          ? "NASA request limit reached (HTTP 429)."
          : `NASA query unavailable (HTTP ${response.status}).`,
      );
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new DonkiError("NASA response was not valid JSON.");
    }
    return normalizeNotifications(payload, period);
  } catch (error) {
    if (timedOut)
      throw new DonkiError("NASA query timed out after 12 seconds.");
    if (error instanceof DonkiError) throw error;
    // Never expose native fetch errors, which can contain a credentialed URL.
    throw new DonkiError(
      controller.signal.aborted
        ? "NASA query cancelled."
        : "NASA query unavailable (network error).",
    );
  } finally {
    clearTimeout(timeout);
  }
}
