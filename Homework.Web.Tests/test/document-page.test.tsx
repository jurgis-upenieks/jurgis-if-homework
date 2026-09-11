import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import TechnicalDetails, { dynamic, metadata, revalidate } from "@/app/technical-details/page";
import { site } from "@/app/site";
import { DocumentPage } from "@/generic-configurables/document";

vi.mock("next/navigation", () => ({ usePathname: () => "/technical-details" }));

let directory: string | undefined;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

it("renders every README section and list item directly from the source with a single page heading", async () => {
  const source = await readFile(resolve(import.meta.dirname, "../../README.md"), "utf8");
  const route = TechnicalDetails();
  const page = new DOMParser().parseFromString(renderToStaticMarkup(await DocumentPage(route.props)), "text/html");
  const plainText = (text: string) => text.replaceAll("`", "").replaceAll(/\s+/g, " ").trim();

  expect(dynamic).toBe("force-static");
  expect(revalidate).toBe(false);
  expect(metadata.title).toBe("Technical details | Homework");
  expect(page.querySelectorAll("h1")).toHaveLength(1);
  expect(page.querySelector("h1")?.textContent).toBe("Technical details");
  const titles = [...source.matchAll(/^# (?:\d+\.\s+)?(.+)$/gm)].map(([, title]) => title);
  expect([...page.querySelectorAll("h2")].map((heading) => heading.textContent?.trim())).toEqual(titles);
  expect(page.querySelectorAll("main > div > ol > li > h2")).toHaveLength(titles.length);
  expect(page.querySelector('[data-slot="card"]')).toBeNull();

  for (const [, content] of source.matchAll(/^\s*- (.+)$/gm)) {
    expect(plainText(page.querySelector("main")?.textContent ?? "")).toContain(plainText(content));
  }

  expect(page.querySelectorAll("main > div > ol ol li")).toHaveLength([...source.matchAll(/^\s*- /gm)].length);
  expect(page.querySelectorAll("main > div > ol ol ol > li")).toHaveLength([...source.matchAll(/^ {2,}- /gm)].length);
  expect(page.querySelectorAll("ul")).toHaveLength(0);
  expect([...page.querySelectorAll("code")].map((code) => code.textContent)).toEqual([...source.matchAll(/`([^`]+)`/g)].map(([, command]) => command));
  expect(page.querySelector('main a[href^="https://"]')?.textContent).toBe(page.querySelector('main a[href^="https://"]')?.getAttribute("href"));
  expect(page.querySelector('a[aria-current="page"]')?.textContent).toBe("Technical details");
  expect(page.querySelector('a[href="#document-content"]')).not.toBeNull();
  expect(page.querySelector("main")?.id).toBe("document-content");
  expect(page.querySelector("main")?.tabIndex).toBe(-1);
  expect(page.querySelector('main > [role="region"][aria-label="Technical details"]')?.getAttribute("tabindex")).toBe("0");
  expect(page.querySelector('main > [role="region"][data-id$="-viewport"] > ol')).not.toBeNull();
});

it("renders another local document with nested lists, wrapped paragraphs, code, safe text, and links", async () => {
  directory = await mkdtemp(join(tmpdir(), "homework-document-"));
  const source = join(directory, "document.md");
  await writeFile(source, [
    "# Setup", "First line", "continues here.", "", "- Parent", "  - Child `npm test`", "- Sibling", "", "## Reference",
    "Visit https://example.test/docs.", '<script>alert("unsafe")</script>', "",
  ].join("\r\n"));

  const page = new DOMParser().parseFromString(renderToStaticMarkup(await DocumentPage({ ...site, title: "Guide", source })), "text/html");
  expect(page.querySelector("h1")?.textContent).toBe("Guide");
  expect(page.querySelector("h2")?.textContent?.trim()).toBe("Setup");
  expect(page.querySelector("h3")?.textContent).toBe("Reference");
  expect(page.querySelector("p")?.textContent).toBe("First line continues here.");
  expect(page.querySelector("main > div > ol ol ol > li")?.textContent).toBe("Child npm test");
  expect(page.querySelector("code")?.textContent).toBe("npm test");
  expect(page.querySelector("main a")?.getAttribute("href")).toBe("https://example.test/docs");
  expect(page.querySelector("script")).toBeNull();
  expect(page.body.textContent).toContain('<script>alert("unsafe")</script>');
});
