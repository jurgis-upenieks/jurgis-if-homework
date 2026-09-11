import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApplicationUpdate } from "@/generic-configurables/application/update";
import { useApplicationState } from "@/generic-configurables/application/application-state";
import { readUpdateSnapshot } from "@/generic-configurables/application/update/update-snapshot";
import { Catalog } from "@/generic-configurables/catalog/catalog";
import type { CatalogData } from "@/generic-configurables/catalog/types";

let client: QueryClient;
let announcedVersion: unknown;
let streams: ServerEvents[];
const reload = vi.fn();
const initialData: CatalogData = { items: [{ id: 1, title: "First item", detail: null, amount: 10 }], total: 3, page: 1, pageSize: 1, trendingTitle: "Popular" };

class ServerEvents extends EventTarget {
  static OPEN = 1;
  static CLOSED = 2;
  readyState = 1;
  close = vi.fn(() => { this.readyState = 2; });

  constructor(readonly url: string) {
    super();
    streams.push(this);
    queueMicrotask(() => this.publish(announcedVersion));
  }

  publish(version: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(version) }));
  }
}

function Draft() {
  const [{ text }, update] = useApplicationState("draft:v1", { text: "", revision: 1 });
  return <input aria-label="Draft" value={text} onChange={(event) => update({ text: event.target.value })} />;
}

function mount(children = <Draft />) {
  return render(<StrictMode><QueryClientProvider client={client}><ApplicationUpdate>{children}</ApplicationUpdate></QueryClientProvider></StrictMode>);
}

async function tick(milliseconds = 2_100) {
  await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "version-a");
  announcedVersion = "version-b";
  streams = [];
  vi.stubGlobal("EventSource", ServerEvents);
  vi.stubGlobal("location", { href: window.location.href, origin: window.location.origin, reload });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn((element: Element) => { element.getAnimations = vi.fn(() => []); });
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    if (String(input).includes("/api/products")) return Response.json({ ...initialData, page: 2, items: [{ ...initialData.items[0], id: 2, title: "Second item" }] });
    throw new Error(`Unexpected request: ${input}`);
  }));
  reload.mockClear();
  sessionStorage.clear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  cleanup();
  client.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("saves the latest draft and cursor before reloading, then restores them in the new version", async () => {
  const first = mount();
  const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Draft" });
  input.focus();
  fireEvent.change(input, { target: { value: "Unsaved draft" } });
  input.setSelectionRange(2, 7, "backward");
  await tick(1_400);
  expect(reload).not.toHaveBeenCalled();
  await tick(700);
  expect(reload).toHaveBeenCalledOnce();
  first.unmount();
  client.clear();
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "version-b");
  mount();
  await tick(50);

  const restored = screen.getByRole<HTMLInputElement>("textbox", { name: "Draft" });
  expect(restored.value).toBe("Unsaved draft");
  expect(document.activeElement).toBe(restored);
  expect([restored.selectionStart, restored.selectionEnd, restored.selectionDirection]).toEqual([2, 7, "backward"]);
  expect(reload).toHaveBeenCalledOnce();
  expect(readUpdateSnapshot()).toBeNull();
});

it.each([{ saved: "Existing draft", expected: "Existing draft" }, { saved: 123, expected: "" }])(
  "keeps new field defaults and restores only compatible saved state: $saved",
  async ({ saved, expected }) => {
    sessionStorage.setItem("application-update-v1", JSON.stringify({
      schema: 1, url: location.href, savedAt: Date.now(), states: { "draft:v1": { text: saved } },
      queries: { queries: [], mutations: [] }, view: { scroll: {}, focus: null, selection: null },
    }));
    mount();
    await tick(50);
    expect(screen.getByRole<HTMLInputElement>("textbox").value).toBe(expected);
    fireEvent.pageHide(window);
    expect(readUpdateSnapshot()?.states["draft:v1"]).toEqual({ text: expected, revision: 1 });
  },
);

it("restores catalogue pagination, exact results, equivalent search text, menu, scroll, and focus together", async () => {
  const first = mount(<Catalog name="Test" title="Products" endpoint="/api/products" data={initialData} />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await tick(100);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const results = screen.getByRole("region", { name: "Products" });
  results.scrollTop = 140;
  const input = screen.getByRole<HTMLInputElement>("searchbox");
  fireEvent.change(input, { target: { value: "   " } });
  input.focus();
  input.setSelectionRange(1, 2);
  await tick();
  expect(reload).toHaveBeenCalledOnce();
  first.unmount();
  client.clear();
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "version-b");
  mount(<Catalog name="Test" title="Products" endpoint="/api/products" data={{ ...initialData, total: 1 }} />);
  await tick(50);

  expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Second item" })).toBeTruthy();
  expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("   ");
  expect(screen.getByRole("region", { name: "Products" }).scrollTop).toBe(140);
  expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/api/products"))).toHaveLength(1);
});

it("keeps waiting during typing, composition, requests, and pending mutations", async () => {
  mount();
  const input = screen.getByRole("textbox");
  fireEvent.compositionStart(input);
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.change(input, { target: { value: "Final text" } });
  const pending = Promise.withResolvers<string>();
  const request = client.query({ queryKey: ["model"], queryFn: () => pending.promise });
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  await act(async () => { pending.resolve("complete"); await request; });
  const saved = Promise.withResolvers<string>();
  const mutation = client.getMutationCache().build(client, { mutationFn: () => saved.promise });
  const save = mutation.execute(undefined);
  await tick(2_000);
  expect(reload).not.toHaveBeenCalled();
  await act(async () => { saved.resolve("saved"); await save; });
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it("waits for a held pointer to be released", async () => {
  mount();
  fireEvent.pointerDown(screen.getByRole("textbox"), { pointerId: 1 });
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  fireEvent.pointerUp(screen.getByRole("textbox"), { pointerId: 1 });
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it("does not get stuck if the device loses focus before releasing a pointer", async () => {
  mount();
  fireEvent.pointerDown(screen.getByRole("textbox"), { pointerId: 1 });
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  fireEvent.blur(window);
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it("waits until selected upload files are cleared before reloading", async () => {
  mount(<input type="file" aria-label="Attachment" />);
  const input = screen.getByLabelText("Attachment");
  fireEvent.change(input, { target: { files: [new File(["draft"], "draft.txt")] } });
  await tick();
  expect(reload).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { files: [] } });
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it("defers updates while hidden or offline and resumes when the device is usable", async () => {
  const visible = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  mount();
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  visible.mockReturnValue("visible");
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  await tick(3_000);
  expect(reload).not.toHaveBeenCalled();
  online.mockReturnValue(true);
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it.each(["version-a", "development", "", null])("does not reload for an unchanged or invalid version: %s", async (version) => {
  announcedVersion = version;
  mount();
  await tick(32_000);
  expect(reload).not.toHaveBeenCalled();
});

it("waits for a server-pushed version without sending periodic version or document requests", async () => {
  announcedVersion = "version-a";
  mount();
  await tick(120_000);
  expect(reload).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(streams.filter((stream) => stream.readyState === ServerEvents.OPEN)).toHaveLength(1);
  expect(streams.at(-1)?.url).toBe("/api/version");
  streams.at(-1)?.publish("version-b");
  await tick();
  expect(reload).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
});

it("waits for the event stream to reconnect after a deployment interruption", async () => {
  mount();
  const stream = streams.at(-1)!;
  stream.readyState = 0;
  await tick(5_000);
  expect(reload).not.toHaveBeenCalled();
  stream.readyState = ServerEvents.OPEN;
  stream.publish("version-b");
  await tick();
  expect(reload).toHaveBeenCalledOnce();
});

it("reopens a failed stream after a deployment HTTP error without polling a healthy connection", async () => {
  mount();
  await tick(100);
  const stream = streams.at(-1)!;
  stream.readyState = ServerEvents.CLOSED;
  stream.dispatchEvent(new Event("error"));
  await tick(5_000);
  expect(streams.at(-1)).toBe(stream);
  expect(reload).not.toHaveBeenCalled();
  await tick(2_000);
  expect(streams.at(-1)).not.toBe(stream);
  expect(reload).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps the running app and its draft when snapshot storage fails", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  mount();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Keep this" } });
  await tick();
  expect(reload).not.toHaveBeenCalled();
  expect(screen.getByRole<HTMLInputElement>("textbox").value).toBe("Keep this");
});

it("throttles another reload when a load balancer returned the old build", async () => {
  const first = mount();
  await tick();
  first.unmount();
  client.clear();
  mount();
  await tick(59_000);
  expect(reload).toHaveBeenCalledOnce();
  await tick(2_000);
  expect(reload).toHaveBeenCalledTimes(2);
});

it("closes the event stream and cancels the pending update on unmount", async () => {
  const { unmount } = mount();
  unmount();
  expect(streams.every((stream) => stream.close.mock.calls.length > 0)).toBe(true);
  fireEvent.pageHide(window);
  expect(readUpdateSnapshot()).toBeNull();
  await tick();
  expect(reload).not.toHaveBeenCalled();
});

it("leaves development hot reload alone", async () => {
  vi.stubEnv("NEXT_PUBLIC_APPLICATION_VERSION", "development");
  mount();
  await tick(32_000);
  expect(fetch).not.toHaveBeenCalled();
  expect(streams).toHaveLength(0);
});
