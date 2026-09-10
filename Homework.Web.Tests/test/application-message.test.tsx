import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import NotFound, { metadata } from "@/app/not-found";
import { ApplicationError, ApplicationGlobalError } from "@/generic-configurables/application/application-error";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font-geist-sans" }) }));

afterEach(cleanup);

it("renders a semantic not-found page with a working home link", () => {
  expect(metadata.title).toBe("Page not found");
  render(<NotFound />);
  expect(document.title).toBe("Page not found");
  expect(screen.getByRole("main", { name: "Page not found" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Page not found", level: 1 })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to products" }).getAttribute("href")).toBe("/");
  expect(document.querySelector("[style]")).toBeNull();
});

it("announces unexpected errors and invokes Next's recovery callback", () => {
  const retry = vi.fn();
  render(<ApplicationError retry={retry} />);
  expect(document.title).toBe("Something went wrong");
  expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(document.querySelector("[style]")).toBeNull();
});

it("renders a complete global error document without depending on application providers", () => {
  const html = renderToStaticMarkup(<ApplicationGlobalError retry={vi.fn()} />);
  const page = new DOMParser().parseFromString(html, "text/html");
  expect(page.title).toBe("Something went wrong");
  expect(page.documentElement.lang).toBe("en");
  expect(page.documentElement.classList.contains("font-geist-sans")).toBe(true);
  expect(page.body.querySelector("main h1")?.textContent).toBe("Something went wrong");
  expect(page.querySelectorAll("html")).toHaveLength(1);
  expect(page.querySelectorAll("body")).toHaveLength(1);
  expect(page.querySelector("[style]")).toBeNull();
});
