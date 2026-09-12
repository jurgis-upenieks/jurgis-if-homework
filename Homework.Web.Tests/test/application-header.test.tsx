import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { site } from "@/app/site";
import { ApplicationHeader } from "@/generic-configurables/application/application-header";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each(site.navigation)("exposes both destinations and marks only $label as the current page", ({ label, href }) => {
  vi.mocked(usePathname).mockReturnValue(href);
  render(<ApplicationHeader {...site} contentId="content" />);
  const navigation = screen.getByRole("navigation", { name: "Main navigation" });
  const links = within(navigation).getAllByRole("link");

  expect(screen.queryByRole("button", { name: "Menu", hidden: true })).toBeNull();
  expect(navigation.hasAttribute("aria-hidden")).toBe(false);
  expect(navigation.hasAttribute("inert")).toBe(false);
  expect(links.map((link) => ({ label: link.textContent, href: link.getAttribute("href") }))).toEqual(site.navigation.map(({ label, href }) => ({ label, href })));
  expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toEqual([within(navigation).getByRole("link", { name: label })]);
  expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#content");
  expect(screen.getByRole("link", { name: "Homework" }).getAttribute("href")).toBe("/");
});

it("does not mark an unrelated route as a current navigation destination", () => {
  vi.mocked(usePathname).mockReturnValue("/missing");
  render(<ApplicationHeader {...site} contentId="content" />);
  expect(document.querySelector("[aria-current]")).toBeNull();
});
