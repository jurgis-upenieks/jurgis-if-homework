import type { Metadata } from "next";
import "./globals.css";

export { ApplicationLayout as default } from "@/generic-configurables/application";

export const metadata: Metadata = {
  title: "Demo products | Homework",
  description: "Job application homework demo using DummyJSON sample data to demonstrate product search and pagination. No products are offered for sale.",
  verification: { google: "4Mv7-v0DxEyVExMEXEOM7Ladhg1G93EODRpnWU6j0LM" },
};
