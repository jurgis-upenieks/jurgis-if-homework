"use client";

import type { PropsWithChildren } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Progress } from "@base-ui/react/progress";
import { QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";
import styles from "./query.module.css";

export function QueryProvider({ children }: PropsWithChildren) {
  const client = getQueryClient();
  const fetching = useIsFetching(undefined, client);
  const mutating = useIsMutating(undefined, client);
  const loading = fetching + mutating > 0;

  return (
    <QueryClientProvider client={client}>
      {children}
      <Dialog.Root open={loading} onOpenChange={(_, details) => details.cancel()}>
        <Dialog.Portal keepMounted>
          <Dialog.Popup aria-label="Loading" className={styles.overlay}>
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
