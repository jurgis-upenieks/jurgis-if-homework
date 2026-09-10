import { cleanup, renderHook } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { afterEach, expect, it, vi } from "vitest";
import { ApplicationProviders } from "@/generic-configurables/application/application-providers";
import { getQueryClient } from "@/generic-configurables/query";

afterEach(() => {
  cleanup();
  getQueryClient().clear();
  vi.unstubAllGlobals();
});

it("provides the shared query cache and existing theme defaults", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }));
  const { result, rerender } = renderHook(() => ({ queryClient: useQueryClient(), theme: useTheme() }), { wrapper: ApplicationProviders });
  const client = result.current.queryClient;

  expect(client).toBe(getQueryClient());
  expect(result.current.theme.theme).toBe("light");
  expect(result.current.theme.themes).toContain("system");

  rerender();

  expect(result.current.queryClient).toBe(client);
});
