import { afterEach, expect, it, vi } from "vitest";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { applicationConfig } from "@/generic-configurables/hosting/application-config";
import { GET } from "@/app/api/version/route";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

it("generates a different client and server version for each production build", () => {
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "");
  const first = applicationConfig(PHASE_PRODUCTION_BUILD);
  const second = applicationConfig(PHASE_PRODUCTION_BUILD);
  expect(first.output).toBe("standalone");
  expect(first.env?.NEXT_PUBLIC_APPLICATION_VERSION).toMatch(/^[\da-f-]{36}$/);
  expect(first.env?.NEXT_PUBLIC_APPLICATION_VERSION).not.toBe(second.env?.NEXT_PUBLIC_APPLICATION_VERSION);
  expect(applicationConfig(PHASE_DEVELOPMENT_SERVER).env?.NEXT_PUBLIC_APPLICATION_VERSION).toBe("development");
});

it("supports a build version supplied by deployment tooling", () => {
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "release-42");
  expect(applicationConfig(PHASE_PRODUCTION_BUILD).env?.NEXT_PUBLIC_APPLICATION_VERSION).toBe("release-42");
});

it("returns the compiled version without allowing browser or proxy caching", async () => {
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "release-42");
  const response = GET(new Request("http://localhost/api/version"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ version: "release-42" });
});

it("pushes the compiled version immediately and keeps the connection alive without repeated version messages", async () => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "release-42");
  const response = GET(new Request("http://localhost/api/version", { headers: { Accept: "text/event-stream" } }));
  expect(response.headers.get("content-type")).toBe("text/event-stream");
  expect(response.headers.get("cache-control")).toBe("no-store, no-transform");
  expect(response.headers.get("x-accel-buffering")).toBe("no");
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  expect(decoder.decode((await reader.read()).value)).toBe('retry: 3000\ndata: "release-42"\n\n');
  await vi.advanceTimersByTimeAsync(25_000);
  expect(decoder.decode((await reader.read()).value)).toBe(": keepalive\n\n");
  await reader.cancel();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([false, true])("releases streaming resources when the client disconnects, including before the response starts: %s", async (alreadyAborted) => {
  vi.useFakeTimers();
  const controller = new AbortController();
  if (alreadyAborted) controller.abort();
  const response = GET(new Request("http://localhost/api/version", { headers: { Accept: "text/event-stream" }, signal: controller.signal }));
  const reader = response.body!.getReader();
  if (!alreadyAborted) {
    await reader.read();
    controller.abort();
  }
  expect((await reader.read()).done).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
