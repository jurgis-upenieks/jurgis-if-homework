import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { site } from "@/app/site";
import { ApplicationHeader } from "@/generic-configurables/application/application-header";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each(site.navigation)("exposes both destinations and marks only $label as the current page", ({ label, href }) => {
  vi.mocked(usePathname).mockReturnValue(href);
  render(<ApplicationHeader {...site} contentId="content" />);
  const menu = screen.getByRole("button", { name: "Menu" });
  fireEvent.click(menu);
  const navigation = screen.getByRole("navigation", { name: "Main navigation" });
  const links = within(navigation).getAllByRole("link");

  expect(links.map((link) => ({ label: link.textContent, href: link.getAttribute("href") }))).toEqual(site.navigation.map(({ label, href }) => ({ label, href })));
  expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toEqual([within(navigation).getByRole("link", { name: label })]);
  expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#content");
  expect(screen.getByRole("link", { name: "Homework" }).getAttribute("href")).toBe("/");

  fireEvent.click(menu);
  expect(navigation.getAttribute("aria-hidden")).toBe("true");
  expect(navigation.hasAttribute("inert")).toBe(true);
  expect(screen.queryByRole("navigation", { name: "Main navigation" })).toBeNull();
});

it("does not mark an unrelated route as a current navigation destination", () => {
  vi.mocked(usePathname).mockReturnValue("/missing");
  render(<ApplicationHeader {...site} contentId="content" />);
  expect(document.querySelector("[aria-current]")).toBeNull();
});
