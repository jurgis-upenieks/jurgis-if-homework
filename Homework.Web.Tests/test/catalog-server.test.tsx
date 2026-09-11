import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/products/route";
import { catalog } from "@/app/catalog";
import { CatalogPage } from "@/generic-configurables/catalog/catalog-page";
import type { CatalogData } from "@/generic-configurables/catalog/types";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

const products = Array.from({ length: 26 }, (_, id) => ({ id, title: `Product ${id}`, brand: "Brand", price: id, discountPercentage: 10, rating: id }));

afterEach(() => {
  getQueryClient().clear();
  vi.unstubAllGlobals();
});

describe("Catalogue server rendering and JSON endpoint", () => {
  it("renders only the initial page and passes only that page's data to the browser", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);

    const content = await CatalogPage(catalog);
    const page = new DOMParser().parseFromString(renderToString(<QueryProvider>{content}</QueryProvider>), "text/html");

    expect(content.props.data.items).toHaveLength(12);
    expect(content.props.data).toMatchObject({ total: 26, page: 1, pageSize: 12 });
    expect(content.props.source).toBeUndefined();
    expect(page.querySelectorAll("li")).toHaveLength(12);
    expect(page.querySelector("li h2")?.textContent).toBe("Product 0");
    expect(page.querySelector('[role="status"]')?.textContent).toBe("1–12 of 26");
    expect(page.body.textContent).not.toContain("Product 12");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("renders a recoverable error when initial retrieval fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unavailable")));

    const content = await CatalogPage(catalog);
    const page = new DOMParser().parseFromString(renderToString(<QueryProvider>{content}</QueryProvider>), "text/html");

    expect(content.props.data).toBeUndefined();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain("We couldn’t load products.");
    expect(page.querySelector('[role="alert"] button')?.textContent).toBe("Try again");
  });

  it("returns uncached JSON for the requested page and uses the server's configured page size", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ products })));

    const first = await GET(new Request("http://localhost/api/products"));
    const second = await GET(new Request("http://localhost/api/products?page=2&pageSize=1000"));
    const firstPage: CatalogData = await first.json();
    const data: CatalogData = await second.json();

    expect(first.status).toBe(200);
    expect(firstPage.items.map(({ id }) => id)).toEqual(Array.from({ length: 12 }, (_, id) => id));
    expect(second.status).toBe(200);
    expect(second.headers.get("Content-Type")).toContain("application/json");
    expect(second.headers.get("Cache-Control")).toBe("no-store");
    expect(data).toMatchObject({ total: 26, page: 2, pageSize: 12, trendingTitle: "Product 25" });
    expect(data.items.map(({ id }) => id)).toEqual(Array.from({ length: 12 }, (_, id) => id + 12));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns searches across the full catalogue with fresh data on repeated requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ products })).mockResolvedValueOnce(Response.json({ products: [] })));
    const request = new Request("http://localhost/api/products?search=%20PRODUCT%2025%20");

    const first = await GET(request);
    const second = await GET(request);

    expect(await first.json()).toMatchObject({ items: [{ id: 25 }], total: 1, page: 1, trendingTitle: "Product 25" });
    expect(await second.json()).toMatchObject({ items: [], total: 0, page: 1, trendingTitle: null });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("applies unordered accent-insensitive tokens to direct API requests before pagination", async () => {
    const rows = products.map((product) => ({ ...product, title: `Ābolu Ķiršu Sula ${product.id}` }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: rows })));
    const url = new URL("http://localhost/api/products?page=2");
    url.searchParams.set("search", " KIRSU    ABOLU ");

    const response = await GET(new Request(url));
    const data: CatalogData = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(data).toMatchObject({ total: 26, page: 2, pageSize: 12, trendingTitle: rows[25].title });
    expect(data.items.map(({ title }) => title)).toEqual(rows.slice(12, 24).map(({ title }) => title));
  });

  it.each(["0", "-1", "1.5", "no", "Infinity", "9007199254740992", ""])("rejects invalid page %s without calling the external service", async (page) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(new Request(`http://localhost/api/products?page=${page}`));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Page must be a positive integer." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an uncached error without exposing upstream details and retries on the next request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Private upstream details")).mockResolvedValueOnce(Response.json({ products })));
    const request = new Request("http://localhost/api/products?page=2");

    const failed = await GET(request);
    const recovered = await GET(request);

    expect(failed.status).toBe(502);
    expect(failed.headers.get("Cache-Control")).toBe("no-store");
    expect(await failed.json()).toEqual({ error: "Catalogue is temporarily unavailable." });
    expect(recovered.status).toBe(200);
  });
});
