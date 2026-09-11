"use client";

import type { PropsWithChildren } from "react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import styles from "./application.module.css";

export function ApplicationScrollArea({ children }: PropsWithChildren) {
  return (
    <ScrollArea.Root className={styles.page}>
      {children}
      <ScrollArea.Scrollbar className={styles.scrollbar}>
        <ScrollArea.Thumb className={styles.scrollThumb} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

export const ApplicationScrollViewport = ScrollArea.Viewport;
export const ApplicationScrollContent = ScrollArea.Content;
