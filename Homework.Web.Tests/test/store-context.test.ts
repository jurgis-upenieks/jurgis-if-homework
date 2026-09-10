import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { createStoreContext } from "@/generic-configurables/store";
import type { CounterState } from "./types";

const { StoreProvider, useStore: useCounterStore } = createStoreContext(() =>
  createStore<CounterState>()((set) => ({
    count: 0,
    note: "",
    increment: () => set((state) => ({ count: state.count + 1 })),
    setNote: (note) => set({ note }),
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

  it("only rerenders when selected state changes", () => {
    const renders = vi.fn();
    const { result } = renderHook(() => {
      const count = useCounterStore((state) => state.count);
      const increment = useCounterStore((state) => state.increment);
      const setNote = useCounterStore((state) => state.setNote);
      renders(count);
      return { count, increment, setNote };
    }, { wrapper: StoreProvider });

    act(() => result.current.setNote("Unrelated state"));

    expect(renders).toHaveBeenCalledTimes(1);

    act(() => result.current.increment());

    expect(result.current.count).toBe(1);
    expect(renders).toHaveBeenCalledTimes(2);
  });

  it("reports when a store hook is used outside its provider", () => {
    expect(() => renderHook(() => useCounterStore((state) => state.count)))
      .toThrow("Store hook must be used within its matching StoreProvider.");
  });
});
