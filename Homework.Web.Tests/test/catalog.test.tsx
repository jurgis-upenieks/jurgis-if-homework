import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Catalog } from "@/generic-configurables/catalog/catalog";
import type { CatalogData } from "@/generic-configurables/catalog/types";

const data: CatalogData = {
  items: [
    { id: 1, title: "iPhone 9", detail: "Apple", amount: 549 },
    { id: 2, title: "Samsung Universe 9", detail: "Samsung", amount: 1249 },
    { id: 3, title: "iPhone X", detail: "Apple", amount: 899.99 },
    { id: 4, title: "Green Tea", detail: null, amount: 0 },
    { id: 5, title: "Laptop", detail: "iPhone accessories", amount: 100 },
  ],
  trendingTitle: "Highest rated item outside the current page",
};

let resizeHeader = vi.fn<() => void>();
const disconnect = vi.fn();

beforeEach(() => {
  disconnect.mockClear();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) {
      resizeHeader = vi.fn(() => callback([], this));
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = disconnect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function measureHeader(width: number) {
  const brand = screen.getByRole("link", { name: "Homework" });
  const frame = brand.parentElement;
  const menu = screen.getByText("Menu");
  const navigation = document.getElementById(menu.getAttribute("aria-controls") ?? "");

  if (!frame || !navigation) throw new Error("Header navigation was not rendered.");

  frame.style.columnGap = "24px";
  vi.spyOn(frame, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(brand, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ width: 200 }));
  vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ width: 64 }));
  act(() => resizeHeader());
  return { menu, navigation };
}

describe("Catalogue interaction", () => {
  it("shows cards with titles, brands, prices, and a global trending title", () => {
    render(<Catalog name="Homework" title="Products" trendingLabel="Trending product" data={data} />);

    const cards = within(screen.getByRole("list", { name: "Products" })).getAllByRole("listitem");
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

  it("filters titles across every page, ignoring case and surrounding whitespace, without fetching", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Catalog name="Homework" title="Products" data={data} pageSize={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  IPHON  " } });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "iPhone 9" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Laptop" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1–2 of 2 products");
    expect(screen.getByText(/Highest rated item/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("paginates without gaps or duplicates and disables the boundary controls", () => {
    render(<Catalog name="Homework" title="Products" data={data} pageSize={2} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((card) => within(card).getByRole("heading").textContent)).toEqual(["iPhone X", "Green Tea"]);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Laptop" })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("5–5 of 5 products");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("keeps pagination within the search results and resets it when clearing", () => {
    render(<Catalog name="Homework" title="Products" data={data} pageSize={1} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "iPhone" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("");
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    expect(screen.getByText("Page 1 of 5")).toBeTruthy();
  });

  it("announces no matches, treats whitespace as no filter, and prevents form navigation", () => {
    render(<Catalog name="Homework" title="Products" data={data} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "does not exist" } });
    expect(screen.getByRole("status").textContent).toBe("No products match “does not exist”.");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(fireEvent.submit(screen.getByRole("search"))).toBe(false);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } });
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("handles absent brands, zero prices, and an empty catalogue", () => {
    const { rerender } = render(<Catalog name="Homework" title="Products" missingDetail="Brand unavailable" data={data} />);
    expect(screen.getByText("Brand unavailable")).toBeTruthy();
    expect(screen.getByText(/^0\s*€/)).toBeTruthy();

    rerender(<Catalog name="Homework" title="Products" data={{ items: [], trendingTitle: null }} />);
    expect(screen.getByRole("status").textContent).toBe("No products available.");
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("provides loading and recoverable error states", () => {
    const { rerender } = render(<Catalog name="Homework" title="Products" />);
    expect(screen.getByRole("status").textContent).toBe("Loading products…");
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole<HTMLInputElement>("searchbox").disabled).toBe(true);

    rerender(<Catalog name="Homework" title="Products" failed />);
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t load products.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("false");
  });

  it("connects the mobile navigation toggle to its expanded state", () => {
    render(<Catalog name="Homework" title="Products" data={data} />);
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(menu.getAttribute("aria-controls") ?? "")).toBeTruthy();

    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });

  it("adapts navigation to measured content and clamp gaps without a screen breakpoint", () => {
    const { unmount } = render(<Catalog name="Homework" title="Products" data={data} />);
    const { menu, navigation } = measureHeader(280);
    expect(menu.hasAttribute("hidden")).toBe(false);
    expect(navigation.getAttribute("aria-hidden")).toBe("true");
    expect(navigation.hasAttribute("inert")).toBe(true);

    measureHeader(288);
    expect(menu.hasAttribute("hidden")).toBe(true);
    expect(navigation.getAttribute("aria-hidden")).toBe("false");
    expect(navigation.hasAttribute("inert")).toBe(false);

    const frame = screen.getByRole("link", { name: "Homework" }).parentElement;
    if (!frame) throw new Error("Header was not rendered.");
    frame.style.columnGap = "32px";
    act(() => resizeHeader());
    expect(menu.hasAttribute("hidden")).toBe(false);
    expect(navigation.getAttribute("aria-hidden")).toBe("true");

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("preserves keyboard focus when navigation expands or collapses after resizing", () => {
    render(<Catalog name="Homework" title="Products" data={data} />);
    const { menu, navigation } = measureHeader(280);
    menu.focus();

    measureHeader(400);
    const home = screen.getByRole("link", { name: "Home" });
    expect(document.activeElement).toBe(home);

    measureHeader(280);
    expect(document.activeElement).toBe(home);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(navigation.getAttribute("aria-hidden")).toBe("false");
    expect(navigation.hasAttribute("inert")).toBe(false);
  });

  it("clamps the page when the catalogue shrinks", () => {
    const { rerender } = render(<Catalog name="Homework" title="Products" data={data} pageSize={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    rerender(<Catalog name="Homework" title="Products" data={{ ...data, items: data.items.slice(0, 3) }} pageSize={2} />);
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeTruthy();
  });
});
