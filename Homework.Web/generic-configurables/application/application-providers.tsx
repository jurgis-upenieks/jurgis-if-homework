"use client";

import type { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "../query";

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
