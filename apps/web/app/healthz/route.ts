// Uptime-monitor endpoint: proves the server is awake without touching the
// database, so Neon can still scale to zero between real requests.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
