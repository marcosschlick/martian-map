export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { searchParams } = new URL(req.url, "http://localhost");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type") || "CME";

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Missing startDate or endDate." });
  }

  const upstream = new URL("https://api.nasa.gov/DONKI/notifications");
  upstream.search = new URLSearchParams({
    startDate,
    endDate,
    type,
    api_key: process.env.NASA_API_KEY || "DEMO_KEY",
  }).toString();

  try {
    const response = await fetch(upstream);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: "NASA DONKI request failed." });
  }
}
