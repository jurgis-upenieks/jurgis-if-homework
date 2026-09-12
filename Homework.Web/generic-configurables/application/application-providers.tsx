"use client";

import type { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "../query";
import { ApplicationUpdate } from "./update";
import { ApplicationTextTooltip } from "./application-text-tooltip";

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider><ApplicationUpdate>{children}<ApplicationTextTooltip /></ApplicationUpdate></QueryProvider>
    </ThemeProvider>
  );
}
