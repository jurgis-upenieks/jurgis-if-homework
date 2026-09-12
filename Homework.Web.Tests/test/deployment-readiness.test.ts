import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchDeployment } from "@/generic-configurables/hosting/deployment";

const url = new URL("https://example.test/");
let deadline: AbortController;

beforeEach(() => {
  vi.useFakeTimers();
  deadline = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => milliseconds === 180_000 ? deadline.signal : new AbortController().signal);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each(["previous-deployment", undefined])("waits for the expected deployment when the responding worker reports %s", async (deploymentId) => {
  const previous = new Response("Previous page", { headers: deploymentId ? { "x-deployment-id": deploymentId } : {} });
  const current = new Response("Current page", { headers: { "x-deployment-id": "current-deployment" } });
  const fetch = vi.fn().mockResolvedValueOnce(previous).mockResolvedValueOnce(current);
  vi.stubGlobal("fetch", fetch);

  const response = fetchDeployment(url, "current-deployment");
  await vi.advanceTimersByTimeAsync(4_999);

  expect(fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1);
  expect(await response).toBe(current);
  expect(await current.text()).toBe("Current page");
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("recovers when a restarting worker initially refuses the connection", async () => {
  const current = new Response("Current page", { headers: { "x-deployment-id": "current-deployment" } });
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("Connection refused")).mockResolvedValueOnce(current);
  vi.stubGlobal("fetch", fetch);

  const response = fetchDeployment(url, "current-deployment");
  await vi.advanceTimersByTimeAsync(5_000);

  expect(await response).toBe(current);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("cancels the stale response stream before requesting the new deployment", async () => {
  const cancel = vi.fn();
  const previous = new Response(new ReadableStream({ cancel }), { headers: { "x-deployment-id": "previous-deployment" } });
  const current = new Response(null, { headers: { "x-deployment-id": "current-deployment" } });
  const fetch = vi.fn().mockResolvedValueOnce(previous).mockResolvedValueOnce(current);
  vi.stubGlobal("fetch", fetch);

  const response = fetchDeployment(url, "current-deployment");
  await vi.advanceTimersByTimeAsync(0);

  expect(cancel).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(5_000);
  expect(await response).toBe(current);
});

it("returns failures from the expected deployment immediately so real application regressions remain visible", async () => {
  const failure = new Response("Rendering failed", { status: 500, headers: { "x-deployment-id": "current-deployment" } });
  const fetch = vi.fn().mockResolvedValue(failure);
  vi.stubGlobal("fetch", fetch);

  const response = await fetchDeployment(url, "current-deployment");

  expect(response).toBe(failure);
  expect(response.status).toBe(500);
  expect(await response.text()).toBe("Rendering failed");
  expect(fetch).toHaveBeenCalledOnce();
});

it("accepts the first uncached response when a deployment identity is not configured", async () => {
  const current = new Response("Local page");
  const fetch = vi.fn().mockResolvedValue(current);
  vi.stubGlobal("fetch", fetch);

  expect(await fetchDeployment(url)).toBe(current);
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledWith(url, { cache: "no-store", signal: expect.any(AbortSignal) });
});

it("stops retrying an old deployment when the total readiness deadline expires", async () => {
  const fetch = vi.fn().mockImplementation(async () => new Response("Previous page", { headers: { "x-deployment-id": "previous-deployment" } }));
  vi.stubGlobal("fetch", fetch);

  const response = fetchDeployment(url, "current-deployment");
  const rejected = expect(response).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(0);
  expect(fetch).toHaveBeenCalledOnce();

  deadline.abort(new DOMException("Deployment readiness timed out", "TimeoutError"));
  await vi.advanceTimersByTimeAsync(5_000);
  await rejected;
  const attempts = fetch.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetch).toHaveBeenCalledTimes(attempts);
});

it("aborts an in-flight request when the total readiness deadline expires", async () => {
  const fetch = vi.fn().mockImplementation((_url: URL, { signal }: RequestInit) => new Promise<Response>((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  vi.stubGlobal("fetch", fetch);

  const response = fetchDeployment(url, "current-deployment");
  const rejected = expect(response).rejects.toThrow("Deployment readiness timed out");
  await vi.advanceTimersByTimeAsync(0);
  deadline.abort(new DOMException("Deployment readiness timed out", "TimeoutError"));

  await rejected;
  expect(fetch).toHaveBeenCalledOnce();
});

it("stamps every route with the deployment identity captured when the build configuration loads", async () => {
  vi.stubEnv("DEPLOYMENT_ID", "built-deployment");
  vi.resetModules();
  const { default: configuration } = await import("@/next.config");

  vi.stubEnv("DEPLOYMENT_ID", "another-deployment");

  expect(await configuration.headers()).toEqual([{ source: "/:path*", headers: [{ key: "x-deployment-id", value: "built-deployment" }] }]);
});

it("omits the deployment header for local builds without a configured identity", async () => {
  vi.stubEnv("DEPLOYMENT_ID", undefined);
  vi.resetModules();
  const { default: configuration } = await import("@/next.config");

  expect(await configuration.headers()).toEqual([]);
});
