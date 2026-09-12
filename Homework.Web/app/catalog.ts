import type { CatalogPageProps } from "@/generic-configurables/catalog";
import { site } from "./site";

export const catalog = {
  ...site,
  title: "Products",
  footerNote: "This website is a job application homework assignment. All products, prices and related information are sample data. This is not an online store; no products are offered for sale.",
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
