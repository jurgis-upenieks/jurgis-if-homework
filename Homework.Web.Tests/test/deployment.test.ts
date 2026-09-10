import { beforeAll, describe, expect, it } from "vitest";

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

  it("retrieves and renders product data on the server", () => {
    expect(page.title).toBe("Products | Homework");
    expect(page.querySelectorAll('ul[aria-label="Products"] > li').length).toBeGreaterThan(0);
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

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
