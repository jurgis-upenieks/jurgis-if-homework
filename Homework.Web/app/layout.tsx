import type { Metadata } from "next";
import "./globals.css";

export { ApplicationLayout as default } from "@/generic-configurables/application";

export const metadata: Metadata = {
  title: "Products | Homework",
  description: "Browse products with discounts of at least 10%, search by title, and discover the highest-rated product.",
};
