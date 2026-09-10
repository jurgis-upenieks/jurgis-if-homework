"use client";

import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
