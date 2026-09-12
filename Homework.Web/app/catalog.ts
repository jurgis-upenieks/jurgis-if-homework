import type { CatalogPageProps } from "@/generic-configurables/catalog";
import { site } from "./site";

export const catalog = {
  ...site,
  title: "Products",
  footerNote: {
    label: "Disclaimer",
    text: "This website is a job application homework with demo/dummy data only. This is not a real online store. Product information, prices and discounts are sample data from DummyJSON. Nothing is for sale; no orders or payments are accepted.",
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
