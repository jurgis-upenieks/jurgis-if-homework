import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/health/route";

afterEach(() => vi.unstubAllGlobals());

it("reports server health without depending on the external catalogue or caching the result", async () => {
  const fetch = vi.fn().mockRejectedValue(new Error("External service unavailable"));
  vi.stubGlobal("fetch", fetch);

  const response = GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
  expect(fetch).not.toHaveBeenCalled();
});
