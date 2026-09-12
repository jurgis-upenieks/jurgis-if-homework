"use client";

import type { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "../query";
import { ApplicationTextTooltip } from "./application-text-tooltip";

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider>{children}<ApplicationTextTooltip /></QueryProvider>
    </ThemeProvider>
  );
}
