export function health() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
