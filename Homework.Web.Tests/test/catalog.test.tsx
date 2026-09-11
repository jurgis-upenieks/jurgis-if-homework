import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render as renderComponent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Catalog } from "@/generic-configurables/catalog/catalog";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";
import { createCollectionRoute } from "@/generic-configurables/catalog/collection.server";
import { getSearchTokens } from "@/generic-configurables/catalog/search";
import type { CatalogData } from "@/generic-configurables/catalog/types";

const endpoint = "/api/products";
const source = { url: "https://example.test/entries", collection: "entries" };
let getPage = createCollectionRoute({ source });

const data: CatalogData = {
  total: 5,
  page: 1,
  pageSize: 12,
  items: [
    { id: 1, title: "iPhone 9", detail: "Apple", amount: 549 },
    { id: 2, title: "Samsung Universe 9", detail: "Samsung", amount: 1249 },
    { id: 3, title: "iPhone X", detail: "Apple", amount: 899.99 },
    { id: 4, title: "Green Tea", detail: null, amount: 0 },
    { id: 5, title: "Laptop", detail: "iPhone accessories", amount: 100 },
  ],
  trendingTitle: "Highest rated item outside the current page",
};

beforeEach(() => {
  getPage = createCollectionRoute({ source });
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, options?: RequestInit) => {
    if (String(input) === source.url) {
      return Response.json({ entries: data.items.map((item, rank) => ({ ...item, rank })) });
    }
    return getPage(new Request(input, options));
  }));
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn((element: Element) => { element.getAnimations = vi.fn(() => []); });
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
});

afterEach(() => {
  cleanup();
  getQueryClient().clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render(element: ReactElement) {
  return renderComponent(element, { wrapper: QueryProvider });
}

function firstPage(pageSize: number) {
  getPage = createCollectionRoute({ source, pageSize });
  return { ...data, items: data.items.slice(0, pageSize), pageSize };
}

async function loaded() {
  await waitFor(() => {
    const search = getSearchTokens(screen.getByRole<HTMLInputElement>("searchbox", { hidden: true }).value).join(" ");
    expect(getQueryClient().getQueryCache().find({ queryKey: ["catalog", endpoint], exact: false, type: "active" })?.queryKey[3]).toBe(search);
  });
  await waitFor(() => expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("false"));
}

describe("Catalogue interaction", () => {
  it("submits pending search immediately, resets pagination, and cancels the obsolete debounce", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => {}));
    vi.useFakeTimers();
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    input.focus();
    fireEvent.change(input, { target: { value: "iPhone" } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(fetch).not.toHaveBeenCalled();

    expect(fireEvent.submit(screen.getByRole("search"))).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=1&search=iphone`, window.location.origin), expect.anything());
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(fetch).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("iPhone");
  });

  it("waits for 300 ms after the last keystroke before resetting the page and requesting the search", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => {}));
    vi.useFakeTimers();
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    fireEvent.change(input, { target: { value: "i" } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    fireEvent.change(input, { target: { value: "iPhone" } });
    await act(async () => vi.advanceTimersByTimeAsync(299));

    expect(input.value).toBe("iPhone");
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(1));

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=1&search=iphone`, window.location.origin), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("keeps typing focused during loading and replaces obsolete searches after the next debounce", async () => {
    const first = Promise.withResolvers<Response>();
    const second = Promise.withResolvers<Response>();
    vi.mocked(fetch).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={data} />);
    vi.useFakeTimers();
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    input.focus();
    fireEvent.change(input, { target: { value: "iPhone" } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => vi.advanceTimersByTimeAsync(50));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;

    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search products by title" })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.closest("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear" }).closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("list").closest("[inert]")).not.toBeNull();
    fireEvent.change(input, { target: { value: "iPhone X" } });
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(fetch).toHaveBeenCalledOnce();
    expect(input.value).toBe("iPhone X");
    expect(document.activeElement).toBe(input);
    await act(async () => vi.advanceTimersByTimeAsync(1));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      second.resolve(Response.json({ ...data, total: 1, items: [data.items[2]] }));
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      first.resolve(Response.json({ ...data, items: [] }));
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("1–1 of 1");
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("list").closest("[inert]")).toBeNull();
  });

  it("cancels a pending debounce when cleared or unmounted", async () => {
    const { unmount } = render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={data} />);
    vi.useFakeTimers();
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    fireEvent.change(input, { target: { value: "iPhone" } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(input.value).toBe("");
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "Tea" } });
    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("groups the page title, trending product, and accessible search in the main content header", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" trendingLabel="Trending product" data={data} />);
    const heading = screen.getByRole("heading", { name: "Products", level: 1 });
    const header = heading.closest("header");

    expect(header?.parentElement).toBe(screen.getByRole("main"));
    expect(screen.getByText("Trending product:").closest("header")).toBe(header);
    expect(screen.getByRole("search").closest("header")).toBe(header);
    expect(screen.getByRole("searchbox", { name: "Search products by title" }).closest("form")).toBe(screen.getByRole("search"));
    expect(screen.getByRole("link", { name: "Homework" }).closest("header")).not.toBe(header);
  });

  it("uses the server-rendered first page without fetching or prefetching other pages", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "iPhone X" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1–2 of 5");
    expect(getQueryClient().getQueryCache().getAll()).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the list and keyboard focus while fetching just the requested page", async () => {
    const pending = Promise.withResolvers<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    const next = screen.getByRole("button", { name: "Next" });
    const results = screen.getByRole("region", { name: "Products" });
    next.focus();
    fireEvent.click(next);

    expect(screen.getByRole("status").textContent).toBe("Loading products…");
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("region", { name: "Products" })).toBe(results);
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=2`, window.location.origin), { cache: "no-store", signal: expect.any(AbortSignal) });

    pending.resolve(Response.json({ ...data, items: data.items.slice(2, 4), page: 2, pageSize: 2 }));
    await loaded();

    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Products" })).toBe(results);
    expect(document.activeElement).toBe(next);
  });

  it("fetches fresh data when returning to a previously visited page", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...data, items: [{ ...data.items[0], title: "Updated title" }], total: 1 }));

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await loaded();

    expect(fetch).toHaveBeenLastCalledWith(new URL(`${endpoint}?page=1`, window.location.origin), expect.objectContaining({ cache: "no-store" }));
    expect(screen.getByRole("heading", { name: "Updated title" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("1–1 of 1");
  });

  it("retries failed page requests without a document reload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 502 }));
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t load products.");
    expect(fetch).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
  });

  it("cancels obsolete requests and ignores late responses when the search changes", async () => {
    const pending = Promise.withResolvers<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "iPhone" } });
    await loaded();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve(Response.json({ ...data, items: data.items.slice(2, 4), page: 2, pageSize: 2 })));

    expect(screen.getByRole("status").textContent).toBe("1–2 of 2");
    expect(screen.getAllByRole("listitem").map((item) => within(item).getByRole("heading").textContent)).toEqual(["iPhone 9", "iPhone X"]);
  });

  it("shows cards with titles, brands, prices, and a global trending title", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" trendingLabel="Trending product" data={data} />);

    const cards = within(screen.getByRole("region", { name: "Products" })).getAllByRole("listitem");
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(within(card).getByRole("article").getAttribute("data-slot")).toBe("card");
      expect(within(card).getAllByRole("heading", { level: 2 })).toHaveLength(1);
    }
    expect(within(cards[0]).getByRole("heading", { name: "iPhone 9" })).toBeTruthy();
    expect(within(cards[0]).getByText("Apple")).toBeTruthy();
    expect(within(cards[0]).getByText(/549\s*€/)).toBeTruthy();
    expect(within(cards[2]).getByText(/899,99\s*€/)).toBeTruthy();
    expect(screen.getByText("Trending product:").parentElement?.textContent).toContain(data.trendingTitle);
  });

  it("keeps numeric and string identifiers distinct when updating cards", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const items = [{ ...data.items[0], id: 1 }, { ...data.items[1], id: "1" }];
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={{ ...data, items, total: 2 }} />);
    act(() => getQueryClient().setQueryData(["catalog", endpoint, 1, ""], { ...data, items: items.toReversed(), total: 2 }));

    await waitFor(() => expect(screen.getAllByRole("listitem").map((item) => within(item).getByRole("heading").textContent)).toEqual(items.toReversed().map((item) => item.title)));
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/same key|unique.*key/);
  });

  it("requests title searches across every page, ignoring case and surrounding whitespace", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  IPHON  " } });
    await loaded();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "iPhone 9" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Laptop" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1–2 of 2");
    expect(screen.getByText("Trending item:").parentElement?.textContent).toContain("Laptop");
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=1&search=iphon`, window.location.origin), expect.objectContaining({ cache: "no-store" }));
  });

  it("searches with unordered title tokens and preserves the user's original text", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(1)} />);
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    input.focus();
    fireEvent.change(input, { target: { value: "  X   ÍPHÓN  " } });
    await loaded();

    expect(input.value).toBe("  X   ÍPHÓN  ");
    expect(document.activeElement).toBe(input);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("1–1 of 1");
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=1&search=iphon+x`, window.location.origin), expect.anything());
  });

  it("preserves pagination, scroll, and cached results when tokens only change order, case, accents, spacing, or repetition", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(1)} />);
    const input = screen.getByRole<HTMLInputElement>("searchbox");
    fireEvent.change(input, { target: { value: "ph i" } });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    const results = screen.getByRole("region", { name: "Products" });
    results.scrollTop = 120;
    const requests = vi.mocked(fetch).mock.calls.length;
    vi.useFakeTimers();
    input.focus();
    fireEvent.change(input, { target: { value: " Í   PH ph  " } });
    fireEvent.submit(screen.getByRole("search"));
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(fetch).toHaveBeenCalledTimes(requests);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(results.scrollTop).toBe(120);
    expect(document.activeElement).toBe(input);
  });

  it("paginates without gaps or duplicates and disables the boundary controls", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((card) => within(card).getByRole("heading").textContent)).toEqual(["iPhone X", "Green Tea"]);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Laptop" })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("5–5 of 5");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await loaded();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("makes the results keyboard-focusable and keeps the surrounding controls outside the scroll area", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    const results = screen.getByRole("region", { name: "Products" });

    expect(results.tabIndex).toBe(0);
    results.focus();
    expect(document.activeElement).toBe(results);
    expect(screen.getByRole("searchbox").getAttribute("aria-controls")).toBe(results.id);
    const footer = screen.getByRole("contentinfo");
    const count = screen.getByRole("status");
    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    expect(count.parentElement).toBe(footer);
    expect(pagination.parentElement).toBe(footer);
    expect(count.nextElementSibling).toBe(pagination);
    expect(footer.parentElement).toBe(screen.getByRole("main"));

    for (const element of [
      screen.getByRole("link", { name: "Homework" }).closest("header"),
      screen.getByRole("heading", { name: "Products" }),
      screen.getByRole("search"),
      screen.getByRole("status"),
      screen.getByRole("navigation", { name: "Pagination" }),
    ]) {
      expect(results.contains(element)).toBe(false);
    }
  });

  it("returns results to the top when paging, searching, or clearing without moving keyboard focus", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    const results = screen.getByRole("region", { name: "Products" });
    const next = screen.getByRole("button", { name: "Next" });
    const search = screen.getByRole("searchbox");

    results.scrollTop = 120;
    next.focus();
    fireEvent.click(next);
    await loaded();
    expect(results.scrollTop).toBe(0);
    expect(document.activeElement).toBe(next);

    results.scrollTop = 120;
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await loaded();
    expect(results.scrollTop).toBe(0);

    results.scrollTop = 120;
    search.focus();
    fireEvent.change(search, { target: { value: "iPhone" } });
    await loaded();
    expect(results.scrollTop).toBe(0);
    expect(document.activeElement).toBe(search);

    results.scrollTop = 120;
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await loaded();
    expect(results.scrollTop).toBe(0);
    expect(document.activeElement).toBe(search);
  });

  it("preserves the results scroll position when unrelated state or equivalent search text changes", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={data} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "iPhone" } });
    await loaded();
    const results = screen.getByRole("region", { name: "Products" });
    results.scrollTop = 120;

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(results.scrollTop).toBe(120);
    fireEvent.change(search, { target: { value: "  IPHONE  " } });
    await loaded();
    expect(results.scrollTop).toBe(120);
  });

  it("keeps pagination within the search results and resets it when clearing", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(1)} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "iPhone" } });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await loaded();
    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("");
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    expect(screen.getByText("Page 1 of 5")).toBeTruthy();
  });

  it("announces no matches, treats whitespace as no filter, and prevents form navigation", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={data} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "does not exist" } });
    await loaded();
    expect(screen.getByRole("status").textContent).toBe("No products match “does not exist”.");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(fireEvent.submit(screen.getByRole("search"))).toBe(false);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Still typing" } });
    expect(screen.getByRole("status").textContent).toBe("No products match “does not exist”.");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } });
    await loaded();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("handles absent brands and zero prices", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" missingDetail="Brand unavailable" data={data} />);
    expect(screen.getByText("Brand unavailable")).toBeTruthy();
    expect(screen.getByText(/^0\s*€/)).toBeTruthy();
  });

  it("handles an empty catalogue", () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={{ ...data, items: [], total: 0, trendingTitle: null }} />);
    expect(screen.getByRole("status").textContent).toBe("No products available.");
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("provides a loading state", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" />);
    expect(screen.getByRole("dialog", { name: "Loading" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeTruthy();
    expect(screen.getByRole("status", { hidden: true }).textContent).toBe("Loading products…");
    expect(screen.getByRole("main", { hidden: true }).getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole<HTMLInputElement>("searchbox", { hidden: true }).disabled).toBe(true);
    await loaded();
  });

  it("recovers from initial server errors by fetching JSON without reloading the page", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" failed />);
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t load products.");
    const viewport = screen.getByRole("region", { name: "Products" });
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.contains(screen.getByRole("alert"))).toBe(true);
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("false");
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(fetch).toHaveBeenCalledWith(new URL(`${endpoint}?page=1`, window.location.origin), expect.anything());
  });

  it("clamps the page when the catalogue shrinks on the server", async () => {
    render(<Catalog endpoint={endpoint} name="Homework" title="Products" data={firstPage(2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...data, items: data.items.slice(2, 3), total: 3, page: 2, pageSize: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await loaded();

    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("3–3 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await loaded();
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
  });
});
