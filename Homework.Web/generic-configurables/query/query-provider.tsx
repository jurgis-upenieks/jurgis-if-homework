"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type PropsWithChildren, type RefCallback } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Progress } from "@base-ui/react/progress";
import { QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";
import styles from "./query.module.css";

const LoadingInteractionContext = createContext<RefCallback<HTMLElement> | null>(null);

export function useLoadingInteraction() {
  const register = useContext(LoadingInteractionContext);
  return useCallback((element: HTMLElement | null) => element ? register?.(element) : undefined, [register]);
}

export function QueryProvider({ children }: PropsWithChildren) {
  const client = getQueryClient();
  const fetching = useIsFetching(undefined, client);
  const mutating = useIsMutating(undefined, client);
  const loading = fetching + mutating > 0;
  const overlay = useRef<HTMLDivElement>(null);
  const [interactiveElements, setInteractiveElements] = useState<HTMLElement[]>([]);
  const register = useCallback((element: HTMLElement) => {
    setInteractiveElements((elements) => [...elements, element]);
    return () => setInteractiveElements((elements) => elements.filter((item) => item !== element));
  }, []);
  const shouldMoveFocus = () => !interactiveElements.some((element) => element.contains(document.activeElement));

  useLayoutEffect(() => {
    if (!loading || !interactiveElements.length || !overlay.current) return;

    const allowed = [...interactiveElements.map((element) => element.closest("label") ?? element), overlay.current];
    const blocked = new Set<HTMLElement>();
    const blockOutsideElements = () => {
      for (const element of allowed) {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          for (const sibling of parent.children) {
            if (sibling instanceof HTMLElement && !sibling.hasAttribute("inert") && !allowed.some((item) => sibling.contains(item))) {
              sibling.setAttribute("inert", "");
              blocked.add(sibling);
            }
          }
        }
      }
    };

    blockOutsideElements();
    const observer = new MutationObserver(blockOutsideElements);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      for (const element of blocked) element.removeAttribute("inert");
    };
  }, [loading, interactiveElements]);

  return (
    <QueryClientProvider client={client}>
      <LoadingInteractionContext value={register}>{children}</LoadingInteractionContext>
      <Dialog.Root open={loading} modal={!interactiveElements.length} disablePointerDismissal onOpenChange={(_, details) => details.cancel()}>
        <Dialog.Portal keepMounted>
          <Dialog.Popup ref={overlay} aria-label="Loading" initialFocus={shouldMoveFocus} finalFocus={shouldMoveFocus} className={styles.overlay}>
            <Progress.Root value={null} aria-label="Loading" aria-live="polite" aria-hidden={!loading} data-loading={loading}>
              <span aria-hidden="true" className={`${styles.spinner} animate-spin`} />
              <span className={styles.visuallyHidden}>{loading ? "Loading, please wait." : null}</span>
            </Progress.Root>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </QueryClientProvider>
  );
}
