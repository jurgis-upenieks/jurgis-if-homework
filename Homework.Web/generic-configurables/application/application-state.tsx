"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { ApplicationState, ApplicationStateScope } from "./types";

export const ApplicationStateContext = createContext<ApplicationStateScope | null>(null);

export function useApplicationState<T extends ApplicationState>(key: string, initialState: T) {
  const scope = useContext(ApplicationStateContext);
  const [store] = useState(() => createStore(() => initialState));
  const state = useStore(store);

  useLayoutEffect(() => {
    if (!scope) return;

    scope.readStates.set(key, store.getState);
    const saved = scope.saved.get(key);
    const initial = store.getInitialState();
    const restored = { ...initial, ...saved };

    if (saved && Object.keys(initial).every((field) => typeof restored[field] === typeof initial[field])) {
      store.setState(restored);
      scope.saved.delete(key);
    }

    return () => { if (scope.readStates.get(key) === store.getState) scope.readStates.delete(key); };
  }, [key, scope, store]);

  return [state, store.setState] as const;
}
