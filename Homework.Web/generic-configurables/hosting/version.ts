export function version(request: Request) {
  const version = process.env.NEXT_PUBLIC_APPLICATION_VERSION ?? "development";
  if (!request.headers.get("accept")?.includes("text/event-stream")) return Response.json({ version }, { headers: { "Cache-Control": "no-store" } });

  const encoder = new TextEncoder();
  let disconnect: VoidFunction;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": keepalive\n\n")), 25_000);
      const abort = () => { disconnect(); controller.close(); };
      disconnect = () => {
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", abort);
      };
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) return abort();
      controller.enqueue(encoder.encode(`retry: 3000\ndata: ${JSON.stringify(version)}\n\n`));
    },
    cancel() { disconnect(); },
  });

  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
