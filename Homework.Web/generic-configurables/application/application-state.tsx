"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { isRecord } from "../utils";
import type { ApplicationState, ApplicationStateRestorer, ApplicationStateScope } from "./types";

export const ApplicationStateContext = createContext<ApplicationStateScope | null>(null);

function restoreState(initial: ApplicationState[string], saved: ApplicationState[string] | undefined): ApplicationState[string] {
  if (saved === undefined || initial === null || saved === null || typeof initial !== typeof saved) return initial;

  if (Array.isArray(initial)) {
    if (!Array.isArray(saved)) return initial;
    return initial.length ? saved.map((value, index) => restoreState(initial[Math.min(index, initial.length - 1)], value)) : saved;
  }

  if (isRecord(initial)) {
    if (!isRecord(saved)) return initial;
    return Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, restoreState(value, saved[key])]));
  }

  return saved;
}

export function useApplicationState<T extends ApplicationState>(key: string, initialState: T, restore?: ApplicationStateRestorer<T>) {
  const scope = useContext(ApplicationStateContext);
  const [store] = useState(() => createStore(() => initialState));
  const state = useStore(store);

  useLayoutEffect(() => {
    if (!scope) return;

    scope.readStates.set(key, store.getState);
    const saved = scope.saved.get(key);
    const initial = store.getInitialState();

    if (saved) {
      const restored = restore ? restore(saved, initial) : restoreState(initial, saved);
      store.setState((restored ?? initial) as T, true);
      scope.saved.delete(key);
    }

    return () => { if (scope.readStates.get(key) === store.getState) scope.readStates.delete(key); };
  }, [key, scope, store, restore]);

  return [state, store.setState] as const;
}
