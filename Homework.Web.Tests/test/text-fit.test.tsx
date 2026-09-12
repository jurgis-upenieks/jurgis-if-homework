import { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTextFit } from "@/generic-configurables/ui/use-text-fit";

const observers: ResizeObserverMock[] = [];
const supports = vi.fn(() => false);

class ResizeObserverMock implements ResizeObserver {
  readonly elements = new Set<Element>();
  constructor(readonly callback: ResizeObserverCallback) { observers.push(this); }
  observe(element: Element) { this.elements.add(element); }
  unobserve(element: Element) { this.elements.delete(element); }
  disconnect = vi.fn(() => this.elements.clear());
  notify() { this.callback([], this); }
}

function Prices({ children = "Current price" }: PropsWithChildren) {
  const fitText = useTextFit();
  return <section><strong ref={fitText}>{children}</strong><s ref={fitText}>Original price</s></section>;
}

function measure(element: HTMLElement, naturalWidth: () => number, availableWidth = () => 100) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, get: availableWidth },
    clientHeight: { configurable: true, value: 24 },
    scrollWidth: { configurable: true, get: () => Math.max(availableWidth(), Math.ceil(naturalWidth() * Number(element.dataset.textFit ?? 100) / 100)) },
  });
}

async function tick() {
  await act(async () => vi.advanceTimersByTimeAsync(20));
}

beforeEach(() => {
  vi.useFakeTimers();
  supports.mockReturnValue(false);
  vi.stubGlobal("CSS", { supports });
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  Object.defineProperty(document, "fonts", { configurable: true, value: new EventTarget() });
});

afterEach(() => {
  cleanup();
  observers.length = 0;
  Reflect.deleteProperty(document, "fonts");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("uses native text fitting without creating observers when the browser supports it", async () => {
  supports.mockReturnValue(true);
  render(<Prices />);
  const current = screen.getByText("Current price");
  measure(current, () => 200);
  fireEvent.resize(window);
  await tick();
  expect(observers).toHaveLength(0);
  expect(current.hasAttribute("data-text-fit")).toBe(false);
});

it("shrinks only overflowing text and restores its normal size when more space becomes available", async () => {
  render(<Prices />);
  const current = screen.getByText("Current price");
  const original = screen.getByText("Original price");
  let available = 100;
  measure(current, () => 200, () => available);
  measure(original, () => 60);
  observers[0].notify();
  await tick();
  expect(current.dataset.textFit).toBe("50");
  expect(original.hasAttribute("data-text-fit")).toBe(false);
  available = 240;
  observers[0].notify();
  await tick();
  expect(current.hasAttribute("data-text-fit")).toBe(false);
});

it("resets siblings together before measuring so previously reduced text does not distort their shared space", async () => {
  render(<Prices />);
  const current = screen.getByText("Current price");
  const original = screen.getByText("Original price");
  const items = [current, original];
  let available = 150;
  const intrinsic = (element: HTMLElement) => Number(element.dataset.textFit ?? 100) * 2;
  for (const element of items) {
    measure(element, () => 200, () => Math.min(intrinsic(element), available * intrinsic(element) / items.reduce((sum, item) => sum + intrinsic(item), 0)));
  }
  Object.defineProperty(current.parentElement, "clientWidth", { configurable: true, get: () => available });
  observers[0].notify();
  await tick();
  expect(items.map((element) => element.dataset.textFit)).toEqual(["30", "30"]);
  available = 400;
  observers[0].notify();
  await tick();
  expect(items.every((element) => !element.hasAttribute("data-text-fit"))).toBe(true);
});

it("ignores its own resize notification after settling", async () => {
  render(<Prices />);
  const naturalWidth = vi.fn(() => 200);
  measure(screen.getByText("Current price"), naturalWidth);
  observers[0].notify();
  await tick();
  const measurements = naturalWidth.mock.calls.length;
  observers[0].notify();
  await tick();
  expect(naturalWidth).toHaveBeenCalledTimes(measurements);
});

it("remeasures changed text and newly loaded fonts even when the available width stays constant", async () => {
  const { rerender } = render(<Prices />);
  const current = screen.getByText("Current price");
  let natural = 200;
  measure(current, () => natural);
  observers[0].notify();
  await tick();
  expect(current.dataset.textFit).toBe("50");
  natural = 100;
  rerender(<Prices>Shorter price</Prices>);
  await tick();
  expect(current.hasAttribute("data-text-fit")).toBe(false);
  natural = 400;
  document.fonts.dispatchEvent(new Event("loadingdone"));
  await tick();
  expect(current.dataset.textFit).toBe("20");
});

it("bounds fitting work and leaves hidden text at its normal size until revealed", async () => {
  render(<Prices />);
  const current = screen.getByText("Current price");
  const original = screen.getByText("Original price");
  let hiddenWidth = 0;
  measure(current, () => 10_000);
  measure(original, () => 200, () => hiddenWidth);
  observers[0].notify();
  await tick();
  expect(current.dataset.textFit).toBe("10");
  expect(original.hasAttribute("data-text-fit")).toBe(false);
  hiddenWidth = 100;
  observers[0].notify();
  await tick();
  expect(original.dataset.textFit).toBe("50");
});

it("cleans up observers, pending work, and fitted attributes through React ref cleanup and StrictMode", async () => {
  const { unmount } = render(<StrictMode><Prices /></StrictMode>);
  const current = screen.getByText("Current price");
  measure(current, () => 200);
  observers.at(-1)?.notify();
  await tick();
  expect(current.dataset.textFit).toBe("50");
  fireEvent.resize(window);
  unmount();
  await tick();
  expect(current.hasAttribute("data-text-fit")).toBe(false);
  expect(observers.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true);
});
