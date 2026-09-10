import { CatalogPage } from "@/generic-configurables/catalog";

export default function Home() {
  return (
    <CatalogPage
      name="Homework"
      title="Products"
      trendingLabel="Trending product"
      missingDetail="Brand unavailable"
      source={{
        url: "https://dummyjson.com/products?limit=0&select=title,brand,price,discountPercentage,rating",
        collection: "products",
        fields: { detail: "brand", amount: "price", rank: "rating" },
        minimum: { field: "discountPercentage", value: 10 },
      }}
    />
  );
}
