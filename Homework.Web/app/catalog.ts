import type { CatalogPageProps } from "@/generic-configurables/catalog";
import { site } from "./site";

export const catalog = {
  ...site,
  title: "Products",
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
