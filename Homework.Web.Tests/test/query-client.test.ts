import { environmentManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueryClient } from "@/generic-configurables/query";

afterEach(() => {
  vi.restoreAllMocks();
  getQueryClient().clear();
});

describe("TanStack Query integration", () => {
  it("does not share cached data between server requests", () => {
    vi.spyOn(environmentManager, "isServer").mockReturnValue(true);
    const firstRequest = getQueryClient();
    const secondRequest = getQueryClient();

    firstRequest.setQueryData(["private-data"], { owner: "first-request" });

    expect(secondRequest).not.toBe(firstRequest);
    expect(secondRequest.getQueryData(["private-data"])).toBeUndefined();
    firstRequest.clear();
    secondRequest.clear();
  });

  it("reuses the browser cache without exposing it to server requests", () => {
    const serverEnvironment = vi.spyOn(environmentManager, "isServer").mockReturnValue(false);
    const browserClient = getQueryClient();
    browserClient.setQueryData(["browser-data"], "cached");

    expect(getQueryClient()).toBe(browserClient);

    serverEnvironment.mockReturnValue(true);
    const serverClient = getQueryClient();
    expect(serverClient.getQueryData(["browser-data"])).toBeUndefined();

    serverEnvironment.mockReturnValue(false);
    expect(getQueryClient().getQueryData(["browser-data"])).toBe("cached");
    serverClient.clear();
  });
});
