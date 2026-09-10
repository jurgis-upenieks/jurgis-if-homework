import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { packageApplication } from "@/generic-configurables/hosting/package-application.mjs";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "homework-package-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function fixture(path: string, content = path) {
  const file = join(directory, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

it("packages the standalone runtime, hidden Next files, and browser assets without local settings or stale files", async () => {
  const files = ["server.js", "package.json", "node_modules/next/package.json", ".next/server/app/page.js", ".next/BUILD_ID"];
  for (const file of files) await fixture(`.next/standalone/${file}`, file);
  await fixture(".next/static/chunks/app.css", "styles");
  await fixture(".next/static/media/font.woff2", "font");
  await fixture("public/logo.svg", "logo");
  await fixture(".next/standalone/.env", "private");
  await fixture(".next/standalone/.env.production", "private");
  await fixture("public/.env.local", "private");
  await fixture("build/obsolete.js");

  await packageApplication(directory);

  for (const file of files) expect(await readFile(join(directory, "build", file), "utf8")).toBe(file);
  expect(await readFile(join(directory, "build/.next/static/chunks/app.css"), "utf8")).toBe("styles");
  expect(await readFile(join(directory, "build/.next/static/media/font.woff2"), "utf8")).toBe("font");
  expect(await readFile(join(directory, "build/public/logo.svg"), "utf8")).toBe("logo");
  for (const file of [".env", ".env.production", "public/.env.local", "obsolete.js"]) expect(existsSync(join(directory, "build", file))).toBe(false);
  expect(existsSync(join(directory, ".next/standalone/.env"))).toBe(true);
});

it("supports applications without a public directory", async () => {
  await fixture(".next/standalone/server.js");
  await fixture(".next/static/chunks/app.js");

  await packageApplication(directory);

  expect(existsSync(join(directory, "build/server.js"))).toBe(true);
  expect(existsSync(join(directory, "build/public"))).toBe(false);
});

it("rejects incomplete production builds", async () => {
  await expect(packageApplication(directory)).rejects.toThrow();
  await fixture(".next/standalone/server.js");
  await expect(packageApplication(directory)).rejects.toThrow();
  expect(existsSync(join(directory, "build"))).toBe(false);
});
