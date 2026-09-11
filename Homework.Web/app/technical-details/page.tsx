import type { Metadata } from "next";
import { DocumentPage } from "@/generic-configurables/document";
import { site } from "../site";

export const dynamic = "force-static";
export const revalidate = false;

export const metadata = {
  title: "Technical details | Homework",
  description: "Project setup, architecture, deployment, and implementation notes from the repository README.",
} satisfies Metadata;

export default function TechnicalDetails() {
  return <DocumentPage {...site} title="Technical details" source="../README.md" />;
}
