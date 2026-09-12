import { renderToString } from "react-dom/server";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/products/route";
import { catalog } from "@/app/catalog";
import { CatalogPage } from "@/generic-configurables/catalog/catalog-page";
import type { CatalogData } from "@/generic-configurables/catalog/types";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

const products = Array.from({ length: 26 }, (_, id) => ({ id, title: `Product ${id}`, brand: "Brand", price: id, discountPercentage: 10, rating: id }));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn((element: Element) => { element.getAnimations = vi.fn(() => []); });
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
});

afterEach(() => {
  cleanup();
  getQueryClient().clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Catalogue server rendering and JSON endpoint", () => {
  it("renders only the initial page and passes only that page's data to the browser", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);

    const content = await CatalogPage(catalog);
    const page = new DOMParser().parseFromString(renderToString(<QueryProvider>{content}</QueryProvider>), "text/html");

    expect(content.props.state.queries).toHaveLength(1);
    expect(content.props.state.queries[0].state.data).toMatchObject({ total: 26, page: 1, pageSize: 12 });
    expect(content.props.children.props.source).toBeUndefined();
    expect(page.querySelectorAll("li")).toHaveLength(12);
    expect(page.querySelector("li h2")?.textContent).toBe("Product 0");
    expect(page.querySelectorAll("li s")).toHaveLength(12);
    expect(page.querySelectorAll("li")[10].textContent).toContain("Discount: −10%Discounted price: 9 €Original price: 10 €");
    expect(page.querySelector('[role="status"]')?.textContent).toBe("1–12 of 26");
    expect(catalog.footerNote).toEqual(expect.any(String));
    expect(page.querySelector("main > footer > nav + small")?.textContent).toBe(catalog.footerNote);
    expect(page.body.textContent).not.toContain("Product 12");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("renders a recoverable error when initial retrieval fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unavailable")));

    const content = await CatalogPage(catalog);
    const page = new DOMParser().parseFromString(renderToString(<QueryProvider>{content}</QueryProvider>), "text/html");

    expect(content.props.state.queries[0].state.data).toBeUndefined();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain("We couldn’t load products.");
    expect(page.querySelector('[role="alert"] button')?.textContent).toBe("Try again");
    expect(page.querySelector("main > footer > small")?.textContent).toBe(catalog.footerNote);
    expect(page.querySelector("main > footer > nav")).toBeNull();
  });

  it("replaces cached products with newer server data when the catalogue mounts again without fetching twice", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ products })).mockResolvedValueOnce(Response.json({ products: [{ ...products[0], title: "Updated product" }] }));
    vi.stubGlobal("fetch", fetch);
    const first = render(await CatalogPage(catalog), { wrapper: QueryProvider });
    expect(screen.getByRole("heading", { name: "Product 0" })).toBeTruthy();
    first.unmount();
    now.mockReturnValue(2_000);

    render(await CatalogPage(catalog), { wrapper: QueryProvider });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Updated product" })).toBeTruthy());
    expect(screen.queryByRole("heading", { name: "Product 0" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1–1 of 1");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.every(([url]) => url === catalog.source.url)).toBe(true);
  });

  it("recovers from an initial server failure when the next server render succeeds", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(Response.json({ products }));
    vi.stubGlobal("fetch", fetch);
    const first = render(await CatalogPage(catalog), { wrapper: QueryProvider });
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t load products.");
    first.unmount();

    render(await CatalogPage(catalog), { wrapper: QueryProvider });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Product 0" })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    { price: 19.99, percentage: 12.5, discounted: 17.49125, displayed: "Discount: −13%Discounted price: 17,49 €Original price: 19,99 €" },
    { price: 44.99, percentage: 11.47, discounted: 39.829647, displayed: "Discount: −11%Discounted price: 39,83 €Original price: 44,99 €" },
  ])("rounds the displayed discount while applying the full percentage to the source price: $percentage%", async ({ price, percentage, discounted, displayed }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ products: [{ ...products[0], price, discountPercentage: percentage }] })));

    const content = await CatalogPage(catalog);
    const page = new DOMParser().parseFromString(renderToString(<QueryProvider>{content}</QueryProvider>), "text/html");

    const data = content.props.state.queries[0].state.data as CatalogData;
    expect(data.items[0].amount).toBe(price);
    expect(data.items[0].discount?.percentage).toBe(percentage);
    expect(data.items[0].discount?.amount).toBeCloseTo(discounted, 6);
    expect(page.querySelector("li")?.textContent).toContain(displayed);
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
    expect(data.items[0]).toMatchObject({ amount: 12, discount: { percentage: 10, amount: 10.8 } });
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
