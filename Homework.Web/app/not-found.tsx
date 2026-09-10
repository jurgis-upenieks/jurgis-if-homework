import type { Metadata } from "next";
import { ApplicationMessage } from "@/generic-configurables/application";

export const metadata = { title: "Page not found" } satisfies Metadata;

export default function NotFound() {
  return <ApplicationMessage title={metadata.title} action={{ label: "Back to products", href: "/" }}>The page you requested does not exist.</ApplicationMessage>;
}
