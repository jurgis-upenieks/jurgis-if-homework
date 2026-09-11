import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueryClient } from "@/generic-configurables/query";
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
  it("fetches fresh source data and includes discounts of exactly 10%", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);

    const result = await loadCollection(source);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(source.url, { cache: "no-store", signal: expect.any(AbortSignal) });
    expect(result.items).toEqual([
      { id: 2, title: "Exact threshold", detail: "Second", amount: 10 },
      { id: 3, title: "Above threshold", detail: null, amount: 0 },
    ]);
    expect(result.trendingTitle).toBe("Below threshold");
    expect(result).toMatchObject({ total: 2, page: 1, pageSize: 12 });
  });

  it("finds the global highest rating beyond the default API page and resolves ties in source order", async () => {
    const rows = Array.from({ length: 40 }, (_, index) => ({ ...products[1], id: index, title: `Product ${index}`, rating: index >= 35 ? 5 : 3 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: rows })));

    const result = await loadCollection(source);

    expect(result.items).toHaveLength(12);
    expect(result.total).toBe(40);
    expect(result.trendingTitle).toBe("Product 35");
  });

  it("fetches again on every request and returns changes from the external service", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ products })).mockResolvedValueOnce(Response.json({ products: [] }));
    vi.stubGlobal("fetch", fetch);

    const first = await loadCollection(source);
    const second = await loadCollection(source);

    expect(first.total).toBe(2);
    expect(second).toEqual({ items: [], trendingTitle: null, total: 0, page: 1, pageSize: 12 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("handles empty collections and missing or blank optional details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ products: [] })).mockResolvedValueOnce(Response.json({ products: [{ ...products[1], brand: " " }] })));

    expect(await loadCollection(source)).toEqual({ items: [], trendingTitle: null, total: 0, page: 1, pageSize: 12 });
    expect((await loadCollection(source)).items[0].detail).toBeNull();
  });

  it("supports another collection with default field names and no minimum", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entries: [{ id: "entry", title: "Entry", detail: "Label", amount: 5, rank: 2 }] })));

    expect(await loadCollection({ url: "https://example.test/entries", collection: "entries" })).toEqual({
      items: [{ id: "entry", title: "Entry", detail: "Label", amount: 5 }],
      trendingTitle: "Entry",
      total: 1,
      page: 1,
      pageSize: 12,
    });
  });

  it("filters before pagination and returns only the requested page", async () => {
    const rows = Array.from({ length: 30 }, (_, id) => ({ ...products[1], id, title: `Product ${id}`, discountPercentage: id % 2 ? 10 : 0 }));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ products: rows })));

    const first = await loadCollection(source);
    const second = await loadCollection(source, { page: 2 });

    expect(first.items.map(({ id }) => id)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
    expect(second.items.map(({ id }) => id)).toEqual([25, 27, 29]);
    expect(second).toMatchObject({ total: 15, page: 2, pageSize: 12, trendingTitle: "Product 0" });
  });

  it("searches titles across all pages before slicing without changing the global ranking", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ products })));

    const result = await loadCollection(source, { search: "  THRESHOLD  ", page: 2, pageSize: 1 });

    expect(result.items.map(({ title }) => title)).toEqual(["Above threshold"]);
    expect(result).toMatchObject({ total: 2, page: 2, pageSize: 1, trendingTitle: "Below threshold" });
    expect((await loadCollection(source, { search: "Second" })).total).toBe(0);
    expect((await loadCollection(source, { search: "   " })).total).toBe(2);
  });

  it("clamps pages after the source shrinks and handles empty search results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ products })));

    expect(await loadCollection(source, { page: 10, pageSize: 1 })).toMatchObject({ page: 2, total: 2, items: [{ id: 3 }] });
    expect(await loadCollection(source, { page: 10, search: "absent" })).toMatchObject({ page: 1, total: 0, items: [] });
  });

  it.each(["  CAFE   BRULEE creme  ", "crème café brûlée", "BRUL CAF CREM", "cafe cafe brulee creme", "cafe\u0301\tcre\u0300me\u00a0bru\u0302le\u0301e"])(
    "matches every title token before pagination, regardless of spacing, order, case, or accents: %s",
    async (search) => {
      const rows = [
        { ...products[1], id: 1, title: "Crème Brûlée Café" },
        { ...products[1], id: 2, title: "Café Deluxe Crème Brûlée" },
        { ...products[1], id: 3, title: "Café", brand: "Crème Brûlée" },
        { ...products[1], id: 4, title: "Crème Brûlée" },
        { ...products[0], id: 5, title: "Crème Brûlée Café bestseller" },
      ];
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: rows })));

      const result = await loadCollection(source, { search, page: 2, pageSize: 1 });

      expect(result).toMatchObject({ total: 2, page: 2, pageSize: 1, trendingTitle: rows[4].title });
      expect(result.items).toEqual([{ id: 2, title: rows[1].title, detail: rows[1].brand, amount: rows[1].price }]);
    },
  );

  it.each([
    { title: "Ābolu Ķiršu Sula", search: "KIRSU ABOLU" },
    { title: "Abolu Kirsu Sula", search: "ĶIRŠU ĀBOLU" },
    { title: "ĀČĒĢĪĶĻŅŠŪŽ Dzēriens", search: "dzeriens acegiklnsuz" },
    { title: "Cafe\u0301 Cre\u0300me", search: "CREME CAFE" },
    { title: "Ca\u1ab0fe Drink", search: "cafe drink" },
    { title: "Ｃａｆｅ ﬂower", search: "flower cafe" },
    { title: "東京 紅茶", search: "紅 東京" },
    { title: "Crème Brûlée Café", search: " \t\u00a0 " },
  ])("normalizes international text without changing the displayed title: $title", async ({ title, search }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: [{ ...products[1], title }] })));

    const result = await loadCollection(source, { search });

    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe(title);
  });

  it.each([0, -2, 1.9, Infinity, NaN])("normalizes the configured page size %s", async (pageSize) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products })));

    expect((await loadCollection(source, { pageSize })).pageSize).toBe(Number.isFinite(pageSize) ? 1 : 12);
  });

  it("passes cancellation from the incoming request to the upstream fetch", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(async () => Response.json({ products }));
    vi.stubGlobal("fetch", fetch);
    await loadCollection(source, { signal: controller.signal });

    controller.abort();

    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
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
});
