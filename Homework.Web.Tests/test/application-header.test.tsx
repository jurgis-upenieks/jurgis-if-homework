import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { site } from "@/app/site";
import { ApplicationHeader } from "@/generic-configurables/application/application-header";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

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

it.each(site.navigation)("exposes both destinations and marks only $label as the current page", ({ label, href }) => {
  vi.mocked(usePathname).mockReturnValue(href);
  render(<ApplicationHeader {...site} contentId="content" />);
  const menu = screen.getByRole("button", { name: "Menu" });
  expect(menu.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(menu);
  const navigation = screen.getByRole("navigation", { name: "Main navigation" });
  expect(menu.getAttribute("aria-expanded")).toBe("true");
  expect(menu.getAttribute("aria-controls")).toBe(navigation.id);
  const links = within(navigation).getAllByRole("link");

  expect(links.map((link) => ({ label: link.textContent, href: link.getAttribute("href") }))).toEqual(site.navigation.map(({ label, href }) => ({ label, href })));
  expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toEqual([within(navigation).getByRole("link", { name: label })]);
  expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#content");
  expect(screen.getByRole("link", { name: "Homework" }).getAttribute("href")).toBe("/");

  fireEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("false");
  expect(navigation.getAttribute("aria-hidden")).toBe("true");
  expect(navigation.hasAttribute("inert")).toBe(true);
  expect(screen.queryByRole("navigation", { name: "Main navigation" })).toBeNull();
});

it("does not mark an unrelated route as a current navigation destination", () => {
  vi.mocked(usePathname).mockReturnValue("/missing");
  render(<ApplicationHeader {...site} contentId="content" />);
  expect(document.querySelector("[aria-current]")).toBeNull();
});

function measureHeader(width: number, gap = "24px") {
  const brand = screen.getByRole("link", { name: site.name });
  const frame = brand.parentElement;
  const menu = screen.getByText("Menu");
  const navigation = document.getElementById(menu.getAttribute("aria-controls") ?? "");

  if (!frame || !navigation) throw new Error("Header navigation was not rendered.");

  frame.style.columnGap = gap;
  vi.spyOn(frame, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(brand, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ width: 200 }));
  vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ width: 64 }));
  act(() => resizeHeader());
  return { menu, navigation };
}

it("adapts navigation to measured content and clamp gaps without a screen breakpoint", () => {
  const { unmount } = render(<ApplicationHeader {...site} contentId="content" />);
  const { menu, navigation } = measureHeader(280);
  expect(menu.hasAttribute("hidden")).toBe(false);
  expect(navigation.getAttribute("aria-hidden")).toBe("true");
  expect(navigation.hasAttribute("inert")).toBe(true);

  measureHeader(288);
  expect(menu.hasAttribute("hidden")).toBe(true);
  expect(navigation.getAttribute("aria-hidden")).toBe("false");
  expect(navigation.hasAttribute("inert")).toBe(false);

  measureHeader(288, "32px");
  expect(menu.hasAttribute("hidden")).toBe(false);
  expect(navigation.getAttribute("aria-hidden")).toBe("true");

  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("preserves keyboard focus when navigation expands or collapses after resizing", () => {
  render(<ApplicationHeader {...site} contentId="content" />);
  const { menu, navigation } = measureHeader(280);
  menu.focus();

  measureHeader(400);
  const products = screen.getByRole("link", { name: "Products" });
  expect(document.activeElement).toBe(products);

  measureHeader(280);
  expect(document.activeElement).toBe(products);
  expect(menu.getAttribute("aria-expanded")).toBe("true");
  expect(navigation.getAttribute("aria-hidden")).toBe("false");
  expect(navigation.hasAttribute("inert")).toBe(false);
});
