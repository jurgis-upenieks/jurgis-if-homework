import type { CatalogPageProps } from "@/generic-configurables/catalog";
import { site } from "./site";

export const catalog = {
  ...site,
  title: "Products",
  footerNote: {
    label: "Disclaimer",
    text: "This is not a real online store. This is a job application homework solution with dummy data only. Nothing is for sale; no orders or payments are possible nor accepted.",
  },
  trendingLabel: "Trending product",
  missingDetail: "Brand unavailable",
  endpoint: "/api/products",
  source: {
    url: "https://dummyjson.com/products?limit=0&select=title,brand,price,discountPercentage,rating",
    collection: "products",
    fields: { detail: "brand", amount: "price", rank: "rating" },
    minimum: { field: "discountPercentage", value: 10 },
  },
} satisfies CatalogPageProps;
