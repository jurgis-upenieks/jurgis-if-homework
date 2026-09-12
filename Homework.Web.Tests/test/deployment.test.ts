import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { catalog } from "@/app/catalog";
import type { CatalogData } from "@/generic-configurables/catalog/types";

const deploymentUrl = process.env.DEPLOYMENT_URL;

describe.runIf(deploymentUrl)("Deployed application", () => {
  let page: Document;

  beforeAll(async () => {
    const response = await fetch(new URL("/", deploymentUrl), { signal: AbortSignal.timeout(60_000) });
    expect(response.status).toBe(200);
    page = new DOMParser().parseFromString(await response.text(), "text/html");
  }, 65_000);

  it("serves the health endpoint", async () => {
    const response = await fetch(new URL("/health", deploymentUrl), { signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  }, 15_000);

  it("renders product data and the demo context in the initial HTML", () => {
    const heading = page.querySelector("main > header > h1");
    const note = page.querySelector("main > footer > small");
    const results = page.querySelector(`[role="region"][aria-label="${catalog.title}"]`);

    expect(page.title).toBe("Demo products | Homework");
    expect(heading?.textContent).toBe(catalog.title);
    expect(heading?.closest('[hidden], [aria-hidden="true"]')).toBeNull();
    expect(page.querySelectorAll(`ul[aria-label="${catalog.title}"] > li`).length).toBeGreaterThan(0);
    expect(page.querySelectorAll(`ul[aria-label="${catalog.title}"] > li`).length).toBeLessThanOrEqual(12);
    expect(note?.querySelector("strong")?.textContent).toBe(`${catalog.footerNote.label}:`);
    expect(note?.textContent).toBe(`${catalog.footerNote.label}: ${catalog.footerNote.text}`);
    expect(note?.textContent).toMatch(/sample data/i);
    expect(note?.textContent).toMatch(/no orders or payments/i);
    expect(note?.closest('[hidden], [aria-hidden="true"]')).toBeNull();
    expect(results?.contains(note)).toBe(false);
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it("serves the README documentation from the standalone package with both navigation destinations", async () => {
    const response = await fetch(new URL("/technical-details", deploymentUrl), { signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBe(200);
    const details = new DOMParser().parseFromString(await response.text(), "text/html");
    const readme = await readFile(resolve(import.meta.dirname, "../../README.md"), "utf8");

    expect(details.title).toBe("Technical details | Homework");
    expect(details.querySelector("h1")?.textContent).toBe("Technical details");
    const titles = [...readme.matchAll(/^# (?:\d+\.\s+)?(.+)$/gm)].map(([, title]) => title);
    expect([...details.querySelectorAll("main > div > ol > li > h2")].map((heading) => heading.textContent?.trim())).toEqual(titles);
    expect(details.querySelector('[data-slot="card"]')).toBeNull();
    expect([...details.querySelectorAll("main code")].map((code) => code.textContent)).toEqual([...readme.matchAll(/`([^`]+)`/g)].map(([, command]) => command));

    for (const document of [page, details]) {
      const links = [...document.querySelectorAll('nav[aria-label="Main navigation"] a')];
      expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([["Products", "/"], ["Technical details", "/technical-details"]]);
    }

    expect(details.querySelector('a[aria-current="page"]')?.textContent).toBe("Technical details");
  }, 15_000);

  it("serves later pages as uncached JSON containing only their own products", async () => {
    const response = await fetch(new URL("/api/products?page=2", deploymentUrl), { signal: AbortSignal.timeout(15_000) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data: CatalogData = await response.json();
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(12);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.length).toBeLessThanOrEqual(data.pageSize);
    expect(data.total).toBeGreaterThan(data.pageSize);
  }, 20_000);

  it("serves Technical details from the build cache without regenerating it", async () => {
    for (const path of ["/technical-details", "/technical-details?verify=static"]) {
      const response = await fetch(new URL(path, deploymentUrl), { signal: AbortSignal.timeout(10_000) });
      expect(response.status).toBe(200);
      expect(response.headers.get("x-nextjs-cache")).toBe("HIT");
    }
  }, 25_000);

  it("serves the JavaScript, styles, and fonts required by the browser", async () => {
    const assets = [...page.querySelectorAll("script[src], link[href]")]
      .map((element) => new URL(element.getAttribute("src") ?? element.getAttribute("href") ?? "", deploymentUrl))
      .filter((url) => url.pathname.startsWith("/_next/static/"));

    expect(assets.some((url) => url.pathname.endsWith(".js"))).toBe(true);
    expect(assets.some((url) => url.pathname.endsWith(".css"))).toBe(true);
    const assetUrls = new Set(assets.map(String));

    for (const url of assetUrls) {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      expect(response.status, url).toBe(200);
      expect(response.headers.get("content-type"), url).not.toContain("text/html");
      const content = await response.arrayBuffer();
      expect(content.byteLength, url).toBeGreaterThan(0);

      if (new URL(url).pathname.endsWith(".css")) {
        for (const match of new TextDecoder().decode(content).matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
          assetUrls.add(new URL(match[1], url).href);
        }
      }
    }

    expect([...assetUrls].some((url) => new URL(url).pathname.endsWith(".woff2"))).toBe(true);
  }, 60_000);

  it("serves the icon and returns a real 404 for missing routes", async () => {
    const icon = await fetch(new URL("/favicon.ico", deploymentUrl), { signal: AbortSignal.timeout(10_000) });
    expect(icon.status).toBe(200);
    expect(icon.headers.get("content-type")).toContain("image/");
    const missing = await fetch(new URL("/deployment-check-missing", deploymentUrl), { signal: AbortSignal.timeout(10_000) });
    expect(missing.status).toBe(404);
  }, 25_000);
});
