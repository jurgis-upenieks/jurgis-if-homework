import type { CatalogPageProps } from "@/generic-configurables/catalog";
import { site } from "./site";

export const catalog = {
  ...site,
  title: "Demo products",
  footerNote: {
    label: "Disclaimer",
    text: "This website is a job application homework demo. Product information, prices and discounts are sample data from DummyJSON. Nothing is for sale; no orders or payments are accepted.",
  },
  trendingLabel: "Highest-rated sample",
  missingDetail: "Brand unavailable",
  endpoint: "/api/products",
  source: {
    url: "https://dummyjson.com/products?limit=0&select=title,brand,price,discountPercentage,rating",
    collection: "products",
    fields: { detail: "brand", amount: "price", rank: "rating" },
    minimum: { field: "discountPercentage", value: 10 },
  },
} satisfies CatalogPageProps;
