import { randomUUID } from "node:crypto";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export function applicationConfig(phase: string): NextConfig {
  return {
    output: "standalone",
    env: { NEXT_PUBLIC_APPLICATION_VERSION: process.env.NEXT_PUBLIC_APPLICATION_VERSION || (phase === PHASE_PRODUCTION_BUILD ? randomUUID() : "development") },
  };
}
