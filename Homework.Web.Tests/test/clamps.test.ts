import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const application = resolve(import.meta.dirname, "../../Homework.Web");
const theme = readFileSync(resolve(application, "generic-configurables/application/clamps.css"), "utf8");
const levels = [...theme.matchAll(/--spacing-clamp-(\d+): (clamp\([^;]+\));/g)].map(([, level, value]) => ({ level: Number(level), value }));

function pixels(value: string, width: number, height: number, rootSize = 16) {
  const units = { rem: rootSize, vw: width / 100, vh: height / 100 };
  const resolved = value.replace(/([\d.]+)(rem|vw|vh)/g, (_, amount: string, unit: keyof typeof units) => `${Number(amount) * units[unit]}px`);
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
      expect(pixels(value, widths[index], 3000)).toBeGreaterThan(pixels(value, widths[index - 1], 3000));
      expect(pixels(value, 4000, heights[index])).toBeGreaterThan(pixels(value, 4000, heights[index - 1]));
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

  it.each([[320, 568], [568, 320], [768, 1024], [1440, 360], [1440, 900], [2560, 1440]])(
    "keeps levels ordered, text readable, and controls usable at %i × %i",
    (width, height) => {
      const sizes = levels.map(({ value }) => pixels(value, width, height));
      expect(sizes).toEqual(sizes.toSorted((first, second) => first - second));
      expect(sizes[3]).toBeGreaterThanOrEqual(14);
      expect(sizes[4]).toBeGreaterThanOrEqual(16);
      expect(sizes[7]).toBeGreaterThanOrEqual(44);
    },
  );

  it("uses the same levels for text, radii, and spacing", () => {
    for (const { level } of levels) {
      expect(theme).toContain(`--text-clamp-${level}: var(--spacing-clamp-${level});`);
      expect(theme).toContain(`--radius-clamp-${level}: var(--spacing-clamp-${level});`);
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
