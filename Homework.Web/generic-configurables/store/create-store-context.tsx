"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";

export function createStoreContext<State>(initializeStore: () => StoreApi<State>) {
  const StoreContext = createContext<StoreApi<State> | null>(null);

  function StoreProvider({ children }: PropsWithChildren) {
    const [store] = useState(initializeStore);

    return <StoreContext value={store}>{children}</StoreContext>;
  }

  function useScopedStore<Selection>(selector: (state: State) => Selection) {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error("Store hook must be used within its matching StoreProvider.");
    }

    return useStore(store, selector);
  }

  return { StoreProvider, useStore: useScopedStore };
}
