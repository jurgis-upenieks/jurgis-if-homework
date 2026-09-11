import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { environmentManager, useMutation, useQuery } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  getQueryClient().clear();
});

describe("Global remote activity overlay", () => {
  it("stays hidden when idle and during server rendering", () => {
    render(<QueryProvider><p>Page content</p></QueryProvider>);

    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("progressbar", { hidden: true }).getAttribute("data-loading")).toBe("false");
    expect(screen.getByText("Page content")).toBeTruthy();
    vi.spyOn(environmentManager, "isServer").mockReturnValue(true);
    const html = renderToString(<QueryProvider><p>Server content</p></QueryProvider>);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(document.body.textContent).toContain("Server content");
  });

  it("automatically shows indeterminate progress for ordinary queries and keeps its element mounted for both fades", async () => {
    const pending = Promise.withResolvers<string>();
    renderHook(() => useQuery({ queryKey: ["any-resource"], queryFn: () => pending.promise }), { wrapper: QueryProvider });

    const overlay = await screen.findByRole("progressbar", { name: "Loading" });
    expect(overlay.getAttribute("data-loading")).toBe("true");
    expect(overlay.getAttribute("aria-valuenow")).toBeNull();
    expect(overlay.getAttribute("aria-live")).toBe("polite");
    expect(overlay.textContent).toContain("Loading, please wait.");

    await act(async () => pending.resolve("Loaded"));
    await waitFor(() => expect(overlay.getAttribute("data-loading")).toBe("false"));

    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("progressbar", { hidden: true })).toBe(overlay);
  });

  it("waits for every overlapping query and mutation before hiding", async () => {
    const first = Promise.withResolvers<string>();
    const second = Promise.withResolvers<string>();
    const mutation = Promise.withResolvers<string>();
    const client = getQueryClient();
    const { result } = renderHook(() => useMutation({ mutationFn: () => mutation.promise }), { wrapper: QueryProvider });
    const firstRequest = client.query({ queryKey: ["first-resource"], queryFn: () => first.promise });
    const secondRequest = client.query({ queryKey: ["second-resource"], queryFn: () => second.promise });
    const update = result.current.mutateAsync();
    const overlay = await screen.findByRole("progressbar", { name: "Loading" });

    await act(async () => { first.resolve("First"); await firstRequest; });
    expect(overlay.getAttribute("data-loading")).toBe("true");
    await act(async () => { second.resolve("Second"); await secondRequest; });
    expect(overlay.getAttribute("data-loading")).toBe("true");
    await act(async () => { mutation.resolve("Updated"); await update; });
    await waitFor(() => expect(overlay.getAttribute("data-loading")).toBe("false"));
  });

  it("shows for background refreshes even while cached data remains available", async () => {
    const pending = Promise.withResolvers<string>();
    const client = getQueryClient();
    client.setQueryData(["resource"], "Cached");
    const { result } = renderHook(() => useQuery({ queryKey: ["resource"], queryFn: () => pending.promise }), { wrapper: QueryProvider });
    expect(result.current.data).toBe("Cached");
    expect(screen.queryByRole("progressbar")).toBeNull();

    const refresh = result.current.refetch();
    await screen.findByRole("progressbar", { name: "Loading" });
    expect(result.current.data).toBe("Cached");
    await act(async () => { pending.resolve("Updated"); await refresh; });

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(result.current.data).toBe("Updated");
  });

  it("hides when requests fail", async () => {
    const pending = Promise.withResolvers<string>();
    renderHook(() => useQuery({ queryKey: ["failure"], queryFn: () => pending.promise, retry: false }), { wrapper: QueryProvider });
    await screen.findByRole("progressbar", { name: "Loading" });

    await act(async () => pending.reject(new Error("Unavailable")));

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(getQueryClient().getQueryState(["failure"])?.status).toBe("error");
  });

  it("hides when mutations fail", async () => {
    const pending = Promise.withResolvers<string>();
    const { result } = renderHook(() => useMutation({ mutationFn: () => pending.promise }), { wrapper: QueryProvider });
    const mutation = result.current.mutateAsync().catch((error: unknown) => error);
    await screen.findByRole("progressbar", { name: "Loading" });

    await act(async () => { pending.reject(new Error("Unavailable")); await mutation; });

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(result.current.isError).toBe(true);
  });

  it("hides after cancellation without waiting for an obsolete response", async () => {
    const pending = Promise.withResolvers<string>();
    const client = getQueryClient();
    let requestSignal: AbortSignal | undefined;
    renderHook(() => useQuery({ queryKey: ["cancelled"], queryFn: ({ signal }) => { requestSignal = signal; return pending.promise; } }), { wrapper: QueryProvider });
    await screen.findByRole("progressbar", { name: "Loading" });

    await act(async () => client.cancelQueries({ queryKey: ["cancelled"] }));

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(requestSignal?.aborted).toBe(true);
    await act(async () => pending.resolve("Too late"));
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("remains visible throughout automatic retries", async () => {
    const pending = Promise.withResolvers<string>();
    const queryFn = vi.fn().mockRejectedValueOnce(new Error("Temporary failure")).mockImplementationOnce(() => pending.promise);
    renderHook(() => useQuery({ queryKey: ["retry"], queryFn, retry: 1, retryDelay: 1 }), { wrapper: QueryProvider });
    const overlay = await screen.findByRole("progressbar", { name: "Loading" });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    expect(overlay.getAttribute("data-loading")).toBe("true");

    await act(async () => pending.resolve("Recovered"));

    await waitFor(() => expect(overlay.getAttribute("data-loading")).toBe("false"));
  });

  it("moves focus into a non-dismissible modal while loading and restores the previous control afterward", async () => {
    const pending = Promise.withResolvers<string>();
    render(<QueryProvider><label>Search<input type="search" /></label></QueryProvider>);
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "Search" });
    input.focus();
    const request = getQueryClient().query({ queryKey: ["search"], queryFn: () => pending.promise });
    const dialog = await screen.findByRole("dialog", { name: "Loading" });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(screen.queryByRole("searchbox", { name: "Search" })).toBeNull();
    await waitFor(() => expect(document.body.style.overflowY).toBe("hidden"));

    expect(fireEvent.keyDown(dialog, { key: "Tab" })).toBe(false);
    expect(fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })).toBe(false);
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.pointerDown(document.body, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(document.body, { button: 0, pointerType: "mouse" });
    fireEvent.click(document.body);
    expect(screen.getByRole("dialog", { name: "Loading" })).toBe(dialog);
    expect(document.activeElement).toBe(dialog);
    await act(async () => { pending.resolve("Matches"); await request; });

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBe(input);
    await waitFor(() => expect(document.body.style.overflowY).not.toBe("hidden"));
  });

  it.each(["failure", "cancellation"])("restores focus and releases the page after request %s", async (outcome) => {
    const pending = Promise.withResolvers<string>();
    render(<QueryProvider><button>Continue</button></QueryProvider>);
    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Continue" });
    button.focus();
    const client = getQueryClient();
    const request = client.query({ queryKey: [outcome], queryFn: () => pending.promise, retry: false }).catch((error: unknown) => error);
    const dialog = await screen.findByRole("dialog", { name: "Loading" });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    await waitFor(() => expect(document.body.style.overflowY).toBe("hidden"));

    await act(async () => {
      if (outcome === "failure") pending.reject(new Error("Unavailable"));
      else await client.cancelQueries({ queryKey: [outcome] });
      await request;
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(screen.getByRole("button", { name: "Continue" })).toBe(button);
    await waitFor(() => expect(document.body.style.overflowY).not.toBe("hidden"));
  });

  it("releases the page if its provider unmounts during a pending request", async () => {
    const pending = Promise.withResolvers<string>();
    const { rerender } = render(<><button>Outside</button><QueryProvider><p>Content</p></QueryProvider></>);
    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Outside" });
    button.focus();
    const client = getQueryClient();
    const request = client.query({ queryKey: ["unmount"], queryFn: () => pending.promise }).catch((error: unknown) => error);
    const dialog = await screen.findByRole("dialog", { name: "Loading" });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    await waitFor(() => expect(document.body.style.overflowY).toBe("hidden"));

    rerender(<button>Outside</button>);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Outside" })).toBe(button);
    await waitFor(() => expect(document.body.style.overflowY).not.toBe("hidden"));
    await waitFor(() => expect(document.activeElement).toBe(button));
    await act(async () => { await client.cancelQueries({ queryKey: ["unmount"] }); await request; });
  });
});
