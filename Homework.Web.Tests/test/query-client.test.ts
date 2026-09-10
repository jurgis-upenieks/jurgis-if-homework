import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { environmentManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";

afterEach(() => {
  cleanup();
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

  it("provides a stable query client across rerenders", () => {
    const { result, rerender } = renderHook(() => useQueryClient(), { wrapper: QueryProvider });
    const client = result.current;
    client.setQueryData(["saved-data"], "retained");

    rerender();

    expect(result.current).toBe(client);
    expect(result.current.getQueryData(["saved-data"])).toBe("retained");
  });

  it("shares fresh query results between consumers", async () => {
    const queryFn = vi.fn(async () => ["First item"]);
    const queryOptions = { queryKey: ["items"], queryFn };
    const first = renderHook(() => useQuery(queryOptions), { wrapper: QueryProvider });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useQuery(queryOptions), { wrapper: QueryProvider });

    expect(second.result.current.data).toEqual(["First item"]);
    expect(second.result.current.isFetching).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
