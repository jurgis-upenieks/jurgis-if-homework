import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApplicationTextTooltip } from "@/generic-configurables/application/application-text-tooltip";

const resizeCallbacks = new Set<ResizeObserverCallback>();

function measure(element: HTMLElement, scrollWidth = 300, scrollHeight = 24) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: 100 },
    scrollWidth: { configurable: true, value: scrollWidth },
    clientHeight: { configurable: true, value: 24 },
    scrollHeight: { configurable: true, value: scrollHeight },
  });
  element.getBoundingClientRect = () => DOMRect.fromRect({ x: 40, y: 40, width: 100, height: 24 });
}

async function tick(milliseconds = 20) {
  await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resizeCallbacks.add(callback); }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  const computedStyle = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = computedStyle(element);
    if (element.matches(".ellipsis")) {
      style.textOverflow = "ellipsis";
      style.overflowX = "hidden";
      style.whiteSpace = "nowrap";
    }
    if (element.matches(".clamped")) {
      style.webkitLineClamp = "2";
      style.overflowY = "hidden";
    }
    return style;
  });
});

afterEach(() => {
  cleanup();
  resizeCallbacks.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
});

it("implicitly enables only text with actual ellipsis overflow and preserves its heading semantics", async () => {
  render(<><h2 className="ellipsis">Long product title</h2><p className="ellipsis">Short title</p><p>Ordinary overflow</p><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading", { name: "Long product title" });
  const short = screen.getByText("Short title");
  const ordinary = screen.getByText("Ordinary overflow");
  measure(title);
  measure(short, 100);
  measure(ordinary);
  await tick();

  expect(title.tabIndex).toBe(0);
  expect(short.hasAttribute("tabindex")).toBe(false);
  expect(ordinary.hasAttribute("tabindex")).toBe(false);
  fireEvent.pointerOver(short);
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.pointerOver(ordinary);
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.pointerOver(title);
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Long product title");
  expect(title.getAttribute("aria-describedby")).toBe(screen.getByRole("tooltip").id);
});

it("keeps the full text visible while the pointer crosses the connecting tip onto the tooltip and dismisses after leaving", async () => {
  render(<><p className="ellipsis">A brand name that does not fit</p><ApplicationTextTooltip /></>);
  const brand = screen.getByText("A brand name that does not fit");
  measure(brand);
  await tick();
  fireEvent.pointerOver(brand);
  await tick();
  const popup = screen.getByRole("tooltip");
  const arrow = popup.querySelector<HTMLElement>('[aria-hidden="true"][data-side]');
  expect(arrow).not.toBeNull();
  fireEvent.pointerOut(brand, { relatedTarget: arrow });
  fireEvent.pointerOver(arrow!, { relatedTarget: brand });
  await tick(200);
  expect(screen.getByRole("tooltip")).toBe(popup);
  fireEvent.pointerOut(arrow!, { relatedTarget: popup });
  fireEvent.pointerOver(popup, { relatedTarget: arrow });
  await tick(200);
  expect(screen.getByRole("tooltip").textContent).toBe(brand.textContent);
  fireEvent.pointerOut(popup, { relatedTarget: document.body });
  await tick(200);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("keeps the pending pointer-leave dismissal during a document or resize refresh", async () => {
  const { rerender } = render(<><p className="ellipsis">Hover text</p><ApplicationTextTooltip /></>);
  const text = screen.getByText("Hover text");
  measure(text);
  await tick();
  fireEvent.pointerOver(text);
  await tick();
  fireEvent.pointerOut(text, { relatedTarget: document.body });
  rerender(<><p className="ellipsis">Hover text</p><ApplicationTextTooltip /><p>New content</p></>);
  await tick();
  for (const callback of resizeCallbacks) callback([], {} as ResizeObserver);
  await tick(200);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("does not rescan page text when scrolling updates only a thumb transform and scroll-area offsets", async () => {
  render(<><section><h2 className="ellipsis">Clipped heading</h2><div data-testid="thumb" /></section><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading");
  const thumb = screen.getByTestId("thumb");
  measure(title);
  await tick();
  expect(title.tabIndex).toBe(0);
  const scans = vi.spyOn(document.body, "querySelectorAll");

  thumb.style.transform = "translate3d(0, 30px, 0)";
  title.parentElement?.style.setProperty("--scroll-area-overflow-y-start", "30px");
  title.parentElement?.style.setProperty("--scroll-area-overflow-y-end", "70px");
  await tick();

  expect(scans).not.toHaveBeenCalled();
  expect(title.tabIndex).toBe(0);
});

it("discovers inline truncation and rechecks text when an ancestor's font style changes", async () => {
  render(<><section><h2>Full heading</h2></section><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading");
  measure(title);
  await tick();
  expect(title.hasAttribute("tabindex")).toBe(false);

  title.style.textOverflow = "ellipsis";
  title.style.overflowX = "hidden";
  await tick();
  expect(title.tabIndex).toBe(0);
  fireEvent.click(title);
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Full heading");

  measure(title, 100);
  title.parentElement?.style.setProperty("font-family", "monospace");
  await tick();
  expect(title.hasAttribute("tabindex")).toBe(false);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("keeps a hovered tooltip open when its clipped heading loses focus", async () => {
  render(<><h2 className="ellipsis">Full clipped heading</h2><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading");
  measure(title);
  await tick();
  act(() => title.focus());
  await tick();
  const popup = screen.getByRole("tooltip");
  fireEvent.pointerOver(popup);
  act(() => title.blur());
  await tick(200);
  expect(screen.getByRole("tooltip")).toBe(popup);
  fireEvent.pointerOut(popup, { relatedTarget: document.body });
  await tick(200);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("dismisses a truncated button label when its enclosing control loses focus or the window blurs", async () => {
  render(<><button><span className="ellipsis">Clipped button label</span></button><ApplicationTextTooltip /></>);
  const button = screen.getByRole("button");
  measure(screen.getByText("Clipped button label"));
  await tick();
  act(() => button.focus());
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Clipped button label");
  act(() => button.blur());
  await tick(200);
  expect(screen.queryByRole("tooltip")).toBeNull();
  act(() => button.focus());
  await tick();
  fireEvent.blur(window);
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("keeps clipped headings keyboard-accessible inside a focusable scrolling region without opening on the region itself", async () => {
  render(<><section role="region" aria-label="Products" tabIndex={0}><h2 className="ellipsis">Clipped heading</h2></section><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading");
  measure(title);
  await tick();
  expect(title.tabIndex).toBe(0);
  act(() => screen.getByRole("region").focus());
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
  act(() => title.focus());
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Clipped heading");
});

it("opens for keyboard focus, closes with Escape, and retains pre-existing descriptions", async () => {
  render(<><p id="existing">A separate description</p><h2 className="ellipsis" aria-describedby="existing">Full heading</h2><ApplicationTextTooltip /></>);
  const title = screen.getByRole("heading");
  measure(title);
  await tick();
  act(() => title.focus());
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Full heading");
  expect(title.getAttribute("aria-describedby")).toContain("existing ");
  fireEvent.keyDown(title, { key: "Escape" });
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(document.activeElement).toBe(title);
  expect(title.getAttribute("aria-describedby")).toBe("existing");
});

it("opens on tap, remains visible after pointer departure, and closes on an outside press", async () => {
  render(<><p className="ellipsis">Full brand</p><button>Outside</button><ApplicationTextTooltip /></>);
  const brand = screen.getByText("Full brand");
  measure(brand);
  await tick();
  const touchHover = new Event("pointerover", { bubbles: true });
  Object.defineProperty(touchHover, "pointerType", { value: "touch" });
  fireEvent(brand, touchHover);
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.click(brand);
  await tick();
  fireEvent.pointerOut(brand, { relatedTarget: document.body });
  await tick(200);
  expect(screen.getByRole("tooltip").textContent).toBe("Full brand");
  fireEvent.pointerDown(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("button"));
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("preserves existing button actions, tab stops, and accessible names for truncated descendants", async () => {
  const clicked = vi.fn();
  render(<><button onClick={clicked}><span className="ellipsis">Original button label</span></button><ApplicationTextTooltip /></>);
  const label = screen.getByText("Original button label");
  const button = screen.getByRole("button", { name: "Original button label" });
  measure(label);
  await tick();
  expect(label.hasAttribute("tabindex")).toBe(false);
  act(() => button.focus());
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Original button label");
  expect(button.getAttribute("aria-describedby")).toBe(screen.getByRole("tooltip").id);
  fireEvent.click(label);
  expect(clicked).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Original button label" })).toBe(button);
});

it("discovers new page content, refreshes open text, and removes stale tooltip state when the target disappears", async () => {
  const { rerender } = render(<><main /><ApplicationTextTooltip /></>);
  await tick();
  rerender(<><main><p className="ellipsis">Page two brand</p></main><ApplicationTextTooltip /></>);
  const brand = screen.getByText("Page two brand");
  measure(brand);
  await tick();
  expect(brand.tabIndex).toBe(0);
  fireEvent.click(brand);
  await tick();
  rerender(<><main><p className="ellipsis">Updated brand name</p></main><ApplicationTextTooltip /></>);
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe("Updated brand name");
  rerender(<><main /><ApplicationTextTooltip /></>);
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(brand.hasAttribute("tabindex")).toBe(false);
});

it("handles line clamps and removes focusability and the open popup when resizing reveals the full text", async () => {
  render(<><p className="clamped">Multiple lines of clipped text</p><ApplicationTextTooltip /></>);
  const text = screen.getByText("Multiple lines of clipped text");
  measure(text, 100, 72);
  await tick();
  fireEvent.click(text);
  await tick();
  expect(screen.getByRole("tooltip").textContent).toBe(text.textContent);
  measure(text, 100, 24);
  for (const callback of resizeCallbacks) callback([], {} as ResizeObserver);
  await tick();
  expect(text.hasAttribute("tabindex")).toBe(false);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it.each(["inert", "aria-busy"])("closes and disables clipped text when its surrounding content becomes %s", async (attribute) => {
  render(<><main><p className="ellipsis">Loading product</p></main><ApplicationTextTooltip /></>);
  const text = screen.getByText("Loading product");
  measure(text);
  await tick();
  fireEvent.click(text);
  await tick();
  screen.getByRole("main").setAttribute(attribute, "true");
  await tick();
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(text.hasAttribute("tabindex")).toBe(false);
});

it("cleans up implicit focus and descriptions under StrictMode without altering author-supplied tab order", async () => {
  const { unmount } = render(<StrictMode><p className="ellipsis">Implicit focus</p><p className="ellipsis" tabIndex={-1}>Explicit focus</p><ApplicationTextTooltip /></StrictMode>);
  const implicit = screen.getByText("Implicit focus");
  const explicit = screen.getByText("Explicit focus");
  measure(implicit);
  measure(explicit);
  await tick();
  fireEvent.click(implicit);
  await tick();
  unmount();
  expect(implicit.hasAttribute("tabindex")).toBe(false);
  expect(implicit.hasAttribute("aria-describedby")).toBe(false);
  expect(explicit.tabIndex).toBe(-1);
});
