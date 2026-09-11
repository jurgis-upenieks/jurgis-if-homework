import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { readUpdateSnapshot, restoreUpdateQueries, restoreUpdateView, saveUpdateSnapshot } from "@/generic-configurables/application/update/update-snapshot";
import type { ApplicationStateScope } from "@/generic-configurables/application/types";

let client: QueryClient;
let state: ApplicationStateScope;

beforeEach(() => {
  sessionStorage.clear();
  client = new QueryClient();
  state = { saved: new Map(), readStates: new Map([["model:v1", () => ({ draft: { rows: [1, 2], name: "Draft" }, open: true })]]) };
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  client.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("restores exact cached model data and timestamps over newer SSR data", () => {
  client.setQueryData(["models"], { rows: ["saved"] }, { updatedAt: 100 });
  const savedState = client.getQueryState(["models"]);
  expect(saveUpdateSnapshot(state, client)).toBe(true);
  const snapshot = readUpdateSnapshot();
  expect(snapshot?.states["model:v1"]).toEqual({ draft: { rows: [1, 2], name: "Draft" }, open: true });
  expect(snapshot?.queries.queries.map((query) => query.queryKey)).toEqual([["models"]]);
  if (!snapshot) throw new Error("Snapshot missing.");
  client.setQueryData(["models"], { rows: ["new SSR data"] });
  restoreUpdateQueries(client, snapshot);
  expect(client.getQueryData(["models"])).toEqual({ rows: ["saved"] });
  expect(client.getQueryState(["models"])).toEqual(savedState);
  expect(readUpdateSnapshot()).toBeNull();
});

it("ignores and removes corrupted, incompatible, expired, or differently addressed snapshots", () => {
  saveUpdateSnapshot(state, client);
  const valid = readUpdateSnapshot();
  if (!valid) throw new Error("Snapshot missing.");
  const invalid: unknown[] = [
    null, {}, { ...valid, schema: 2 }, { ...valid, url: `${valid.url}another-page` }, { ...valid, savedAt: Date.now() - 86_400_001 }, { ...valid, savedAt: Date.now() + 60_000 },
    { ...valid, states: [] }, { ...valid, queries: { ...valid.queries, mutations: [{}] } }, { ...valid, view: { ...valid.view, scroll: [] } },
    { ...valid, queries: { queries: [null] } }, { ...valid, view: { ...valid.view, scroll: { window: [0, "bad"] } } },
    { ...valid, view: { ...valid.view, selection: ["bad", 0, "none"] } },
    { ...valid, view: { ...valid.view, selection: [-1, 0, "none"] } }, { ...valid, view: { ...valid.view, selection: [2, 1, "none"] } },
  ];
  for (const value of invalid) {
    sessionStorage.setItem("application-update-v1", JSON.stringify(value));
    expect(readUpdateSnapshot()).toBeNull();
    expect(sessionStorage.getItem("application-update-v1")).toBeNull();
  }
  sessionStorage.setItem("application-update-v1", "broken JSON");
  expect(readUpdateSnapshot()).toBeNull();
});

it("does not lose a snapshot when React reads it more than once before committing hydration", () => {
  saveUpdateSnapshot(state, client);
  expect(readUpdateSnapshot()).toEqual(readUpdateSnapshot());
  expect(readUpdateSnapshot()?.states["model:v1"].open).toBe(true);
});

it("handles browsers that deny session storage access", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  expect(readUpdateSnapshot()).toBeNull();
});

it("restores delayed semantic scroll regions and stops repositioning when the user interacts", async () => {
  vi.useFakeTimers();
  const first = render(<section aria-label="Results" tabIndex={0} />);
  const original = screen.getByRole("region", { name: "Results" });
  original.scrollTop = 120;
  original.focus();
  saveUpdateSnapshot(state, client);
  const snapshot = readUpdateSnapshot();
  if (!snapshot) throw new Error("Snapshot missing.");
  first.unmount();
  const stop = restoreUpdateView(snapshot);
  await act(async () => vi.advanceTimersByTimeAsync(50));
  render(<section aria-label="Results" tabIndex={0} />);
  await act(async () => vi.advanceTimersByTimeAsync(50));
  const results = screen.getByRole("region", { name: "Results" });
  expect(results.scrollTop).toBe(120);
  expect(document.activeElement).toBe(results);
  stop();

  const second = restoreUpdateView(snapshot);
  fireEvent.wheel(results, { deltaY: 200 });
  results.scrollTop = 320;
  await act(async () => vi.advanceTimersByTimeAsync(100));
  expect(results.scrollTop).toBe(320);
  second();
});

it("lets the browser clamp scroll positions when updated content becomes shorter", async () => {
  vi.useFakeTimers();
  render(<section aria-label="Results" tabIndex={0} />);
  const results = screen.getByRole("region", { name: "Results" });
  results.scrollTop = 120;
  saveUpdateSnapshot(state, client);
  const snapshot = readUpdateSnapshot();
  if (!snapshot) throw new Error("Snapshot missing.");
  const position = vi.spyOn(results, "scrollTop", "get").mockReturnValue(40);
  const stop = restoreUpdateView(snapshot);
  await act(async () => vi.advanceTimersByTimeAsync(5_100));
  const reads = position.mock.calls.length;
  await act(async () => vi.advanceTimersByTimeAsync(100));
  expect(position).toHaveBeenCalledTimes(reads);
  stop();
});

it("distinguishes matching controls by their named form without update attributes", async () => {
  vi.useFakeTimers();
  const form = (label: string) => <form aria-label={label}><input name="title" aria-label={`${label} title`} /></form>;
  const first = render(<>{form("Primary")}{form("Secondary")}</>);
  screen.getByRole("textbox", { name: "Secondary title" }).focus();
  saveUpdateSnapshot(state, client);
  const snapshot = readUpdateSnapshot();
  if (!snapshot) throw new Error("Snapshot missing.");
  first.unmount();
  render(<>{form("Secondary")}{form("Primary")}</>);
  const stop = restoreUpdateView(snapshot);
  await act(async () => vi.advanceTimersByTimeAsync(50));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Secondary title" }));
  stop();
});

it("does not move focus to a different control when its identity becomes ambiguous", async () => {
  vi.useFakeTimers();
  const first = render(<button>Save</button>);
  screen.getByRole("button").focus();
  saveUpdateSnapshot(state, client);
  const snapshot = readUpdateSnapshot();
  if (!snapshot) throw new Error("Snapshot missing.");
  first.unmount();
  render(<><button>Save</button><button>Save</button></>);
  const stop = restoreUpdateView(snapshot);
  await act(async () => vi.advanceTimersByTimeAsync(50));
  expect(document.activeElement).toBe(document.body);
  expect(saveUpdateSnapshot(state, client)).toBe(true);
  expect(readUpdateSnapshot()?.view.focus).toBeNull();
  stop();
});
