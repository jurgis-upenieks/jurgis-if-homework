import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const application = resolve(import.meta.dirname, "../../Homework.Web");
const theme = readFileSync(resolve(application, "generic-configurables/application/clamps.css"), "utf8");
const levels = [...theme.matchAll(/--spacing-clamp-(\d+): (clamp\([^;]+\));/g)].map(([, level, value]) => ({ level: Number(level), value }));

function pixels(value: string, width: number, height: number, rootSize = 16) {
  const units = { rem: rootSize, vw: width / 100, vh: height / 100, dvh: height / 100 };
  const resolved = value.replace(/([\d.]+)(rem|vw|vh|dvh)/g, (_, amount: string, unit: keyof typeof units) => `${Number(amount) * units[unit]}px`);
  const style = document.createElement("span").style;
  style.width = resolved;
  expect(style.width).toMatch(/^(?:calc\()?([\d.]+)px\)?$/);
  return Number(style.width.match(/[\d.]+/)?.[0]);
}

describe("Fluid sizing scale", () => {
  it("provides exactly eleven ordered levels with rem bounds and both viewport dimensions", () => {
    expect(levels.map(({ level }) => level)).toEqual(Array.from({ length: 11 }, (_, level) => level));

    for (const { value } of levels) {
      expect(value).toMatch(/^clamp\([\d.]+rem, min\([^,]+vw, [^,]+vh\), [\d.]+rem\)$/);
    }
  });

  it.each(levels)("level $level responds to width and height independently", ({ value }) => {
    const widths = [320, 390, 640, 960, 1440, 1920, 2560, 3840];
    const heights = [240, 320, 480, 600, 900, 1080, 1440, 2160];

    for (let index = 1; index < widths.length; index++) {
      expect(pixels(value, widths[index], 3000)).toBeGreaterThanOrEqual(pixels(value, widths[index - 1], 3000));
      expect(pixels(value, 4000, heights[index])).toBeGreaterThanOrEqual(pixels(value, 4000, heights[index - 1]));
    }
  });

  it.each(levels)("level $level changes noticeably across ordinary viewport widths and heights", ({ level, value }) => {
    const prominent = [2, 5, 6, 8, 9, 10].includes(level);
    expect(pixels(value, 1440, 900)).toBeGreaterThanOrEqual(pixels(value, 390, 900) * (prominent ? 1.35 : 1.1));
    expect(pixels(value, 1440, 900)).toBeGreaterThanOrEqual(pixels(value, 1440, 360) * (prominent ? 1.25 : 1.1));
  });

  it("limits maximum growth to a slight increase over the original scale", () => {
    const originalMaxima = [0.125, 0.25, 0.75, 1.25, 1.5, 2.5, 4, 4.5, 8, 28, 96];

    for (const { level, value } of levels) {
      const maximum = pixels(value, 100_000, 100_000);
      expect(maximum).toBeGreaterThan(originalMaxima[level] * 16);
      expect(maximum).toBeLessThanOrEqual(originalMaxima[level] * 16 * 1.025);
    }
  });

  it.each([
    { width: 1440, height: 900, original: [1.3375, 2.675, 8.025, 16.025, 18.7, 26.75, 42.8, 53.45, 85.6, 299.6, 1027.2] },
    { width: 1920, height: 1080, original: [1.405, 2.81, 8.43, 16.43, 19.24, 28.1, 44.96, 55.34, 89.92, 314.72, 1079.04] },
  ])("keeps rendered sizes close to the original scale at $width × $height", ({ width, height, original }) => {
    for (const { level, value } of levels) {
      expect(pixels(value, width, height)).toBeLessThanOrEqual(original[level] * 1.05);
    }
  });

  it.each(levels)("level $level stops at its bounds and respects the root font size", ({ value }) => {
    const minimum = Number(value.match(/^clamp\(([\d.]+)rem/)?.[1]);
    const maximum = Number(value.match(/([\d.]+)rem\)$/)?.[1]);

    expect(minimum).toBeLessThan(maximum);
    expect(pixels(value, 0, 0)).toBe(minimum * 16);
    expect(pixels(value, 100_000, 100_000)).toBe(maximum * 16);
    expect(pixels(value, 0, 0, 32)).toBe(minimum * 32);
    expect(pixels(value, 100_000, 100_000, 32)).toBe(maximum * 32);
  });

  it.each([[320, 240], [320, 568], [568, 320], [768, 1024], [1440, 360], [1440, 900], [2560, 1440], [3840, 2160]])(
    "keeps levels ordered, text readable, and controls usable at %i × %i",
    (width, height) => {
      for (const rootSize of [16, 32]) {
        const sizes = levels.map(({ value }) => pixels(value, width, height, rootSize));
        expect(sizes).toEqual(sizes.toSorted((first, second) => first - second));
        expect(sizes[3]).toBeGreaterThanOrEqual(rootSize * 0.875);
        expect(sizes[4]).toBeGreaterThanOrEqual(rootSize);
        expect(sizes[7]).toBeGreaterThanOrEqual(rootSize * 2.75);
      }
    },
  );

  it("uses the same levels for text, radii, and spacing", () => {
    for (const { level } of levels) {
      expect(theme).toContain(`--text-clamp-${level}: var(--spacing-clamp-${level});`);
      expect(theme).toContain(`--radius-clamp-${level}: var(--spacing-clamp-${level});`);
    }
  });

  it("compresses viewport gaps and bands on short screens while preserving the usual spacing on taller screens", () => {
    const viewportSizes = [...theme.matchAll(/--spacing-viewport-(gap|band): ([^;]+);/g)];
    expect(viewportSizes.map(([, name]) => name)).toEqual(["gap", "band"]);

    for (const [, name, value] of viewportSizes) {
      const expression = value.replace(/var\(--spacing-clamp-(\d+)\)/g, (_, level: string) => levels[Number(level)].value);
      const maximum = levels[name === "gap" ? 5 : 8].value;

      for (const width of [320, 568, 844, 1440]) {
        expect(pixels(expression, width, 320)).toBeLessThan(pixels(maximum, width, 320));
        expect(pixels(expression, width, 900)).toBe(pixels(maximum, width, 900));
        expect(pixels(expression, width, 320)).toBeLessThan(pixels(expression, width, 390));
        if (name === "gap") expect(pixels(expression, width, 320)).toBeLessThanOrEqual(pixels(maximum, width, 320) / 2);
      }

      expect(pixels(expression, 390, 844)).toBe(pixels(maximum, 390, 844));
      expect(pixels(expression, 320, 568)).toBe(pixels(maximum, 320, 568));
      expect(pixels(expression, 390, 844, 32)).toBeGreaterThan(pixels(expression, 390, 844));
    }
  });

  it("removes the default Tailwind dimension and breakpoint scales", () => {
    for (const namespace of ["spacing", "text", "radius", "shadow", "container", "breakpoint"]) {
      expect(theme).toContain(`--${namespace}-*: initial;`);
    }
    expect(theme).toContain("--spacing: initial;");
  });

  it("keeps authored sizes centralized and excludes breakpoint sizing and padding", () => {
    for (const directory of ["app", "components", "generic-configurables"]) {
      const root = resolve(application, directory);
      const filenames = readdirSync(root, { recursive: true, encoding: "utf8" });

      for (const filename of filenames.filter((filename) => /\.(css|tsx?)$/.test(filename) && !filename.endsWith("clamps.css"))) {
        const source = readFileSync(resolve(root, filename), "utf8");
        expect(source, filename).not.toMatch(/\b(?:clamp|calc)\(|\b\d+(?:\.\d+)?(?:px|rem|em|ch|ex|r?cap|r?lh|[dsl]?v[wh]|vmin|vmax|cq[whib])\b/);
        expect(source, filename).not.toMatch(/\b(?:sm|md|lg|xl|2xl):|@(media|container)\b|\bstyle\s*(?:=|:\s*\{)/);
        expect(source, filename).not.toMatch(/\b(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|size|leading)-(?:\d|\[|\()/);
        expect(source, filename).not.toMatch(/\btext-(?:xs|sm|base|lg|xl|\dxl)\b|\b(?:min-|max-)?[wh]-(?:[1-9]\d*|px)\b/);
        expect(source, filename).not.toMatch(/(?<![\w-])(?:border|ring|outline|inset|top|right|bottom|left|start|end|basis|rounded|tracking)-(?:[1-9]\d*|px)\b/);
        expect(source, filename).not.toMatch(/\b(?:justify|content)-(?:between|around|evenly)\b|\bflex-\[/);

        for (const [, level] of source.matchAll(/clamp-(\d+)/g)) {
          expect(levels.some((entry) => entry.level === Number(level)), filename).toBe(true);
        }
      }
    }
  });
});
