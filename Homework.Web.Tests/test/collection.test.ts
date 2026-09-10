import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueryClient } from "@/lib/query-client";
import { loadCollection } from "@/generic-configurables/catalog/collection.server";
import type { CollectionSource } from "@/generic-configurables/catalog/types";

const source: CollectionSource = {
  url: "https://dummyjson.com/products?limit=0&select=title,brand,price,discountPercentage,rating",
  collection: "products",
  fields: { detail: "brand", amount: "price", rank: "rating" },
  minimum: { field: "discountPercentage", value: 10 },
};

const products = [
  { id: 1, title: "Below threshold", brand: "First", price: 20, discountPercentage: 9.99, rating: 5 },
  { id: 2, title: "Exact threshold", brand: "Second", price: 10, discountPercentage: 10, rating: 4 },
  { id: 3, title: "Above threshold", price: 0, discountPercentage: 10.01, rating: 3 },
];

afterEach(() => {
  getQueryClient().clear();
  vi.unstubAllGlobals();
});

describe("Server catalogue retrieval", () => {
  it("fetches the entire selected collection and includes discounts of exactly 10%", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);

    const result = await loadCollection(source);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(source.url, expect.objectContaining({ next: { revalidate: 300 }, signal: expect.any(AbortSignal) }));
    expect(result.items).toEqual([
      { id: 2, title: "Exact threshold", detail: "Second", amount: 10 },
      { id: 3, title: "Above threshold", detail: null, amount: 0 },
    ]);
    expect(result.trendingTitle).toBe("Below threshold");
  });

  it("finds the global highest rating beyond the default API page and resolves ties in source order", async () => {
    const rows = Array.from({ length: 40 }, (_, index) => ({ ...products[1], id: index, title: `Product ${index}`, rating: index >= 35 ? 5 : 3 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: rows })));

    const result = await loadCollection(source);

    expect(result.items).toHaveLength(40);
    expect(result.trendingTitle).toBe("Product 35");
  });

  it("shares fresh retrievals through the existing query client", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);

    const first = await loadCollection(source);
    const second = await loadCollection(source);

    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("handles empty collections and missing or blank optional details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ products: [] })).mockResolvedValueOnce(Response.json({ products: [{ ...products[1], brand: " " }] })));

    expect(await loadCollection(source)).toEqual({ items: [], trendingTitle: null });
    getQueryClient().clear();
    expect((await loadCollection(source)).items[0].detail).toBeNull();
  });

  it("supports another collection with default field names and no minimum", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entries: [{ id: "entry", title: "Entry", detail: "Label", amount: 5, rank: 2 }] })));

    expect(await loadCollection({ url: "https://example.test/entries", collection: "entries" })).toEqual({
      items: [{ id: "entry", title: "Entry", detail: "Label", amount: 5 }],
      trendingTitle: "Entry",
    });
  });

  it("rejects HTTP failures and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockRejectedValueOnce(new TypeError("Network unavailable")));

    await expect(loadCollection(source)).rejects.toThrow("Catalogue request failed (503).");
    await expect(loadCollection(source)).rejects.toThrow("Network unavailable");
  });

  it.each([
    null,
    { products: null },
    { products: [null] },
    { products: [{ ...products[1], title: "" }] },
    { products: [{ ...products[1], price: "10" }] },
    { products: [{ ...products[1], price: -1 }] },
    { products: [{ ...products[1], rating: null }] },
    { products: [{ ...products[1], discountPercentage: null }] },
    { products: [{ ...products[1], brand: {} }] },
    { products: [{ ...products[1], id: null }] },
    { products: [products[1], products[1]] },
  ])("rejects malformed responses: %j", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));

    await expect(loadCollection(source)).rejects.toThrow(/Catalogue/);
  });

  it("rejects invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json")));

    await expect(loadCollection(source)).rejects.toThrow();
  });
});
