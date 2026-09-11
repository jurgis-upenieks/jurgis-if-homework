import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createStoreContext } from "@/generic-configurables/store";
import type { CounterState } from "./types";

const { StoreProvider, useStore: useCounterStore } = createStoreContext(() =>
  createStore<CounterState>()((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  })),
);

afterEach(cleanup);

describe("Zustand store context", () => {
  it("isolates state between provider instances", () => {
    const first = renderHook(() => useCounterStore((state) => state), { wrapper: StoreProvider });
    const second = renderHook(() => useCounterStore((state) => state), { wrapper: StoreProvider });

    act(() => first.result.current.increment());

    expect(first.result.current.count).toBe(1);
    expect(second.result.current.count).toBe(0);
  });

  it("retains the store across provider rerenders", () => {
    const { result, rerender } = renderHook(() => useCounterStore((state) => state), { wrapper: StoreProvider });
    const increment = result.current.increment;

    act(() => increment());
    rerender();

    expect(result.current.count).toBe(1);
    expect(result.current.increment).toBe(increment);
  });

  it("reports when a store hook is used outside its provider", () => {
    expect(() => renderHook(() => useCounterStore((state) => state.count)))
      .toThrow("Store hook must be used within its matching StoreProvider.");
  });
});
