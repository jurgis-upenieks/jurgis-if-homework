import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { getQueryClient, QueryProvider } from "@/generic-configurables/query";
import { Input } from "@/generic-configurables/ui";

afterEach(() => {
  cleanup();
  getQueryClient().clear();
});

describe("Global remote activity overlay", () => {
  it.each(["success", "failure", "cancellation"])("preserves opted-in input focus and releases other controls after %s", async (outcome) => {
    const pending = Promise.withResolvers<string>();
    render(
      <QueryProvider>
        <label>Search<Input allowWhileLoading type="search" /></label>
        <button>Continue</button>
        <section inert><button>Unavailable</button></section>
      </QueryProvider>,
    );
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "Search" });
    const button = screen.getByRole("button", { name: "Continue" });
    input.focus();
    const client = getQueryClient();
    const request = client.query({ queryKey: [outcome], queryFn: () => pending.promise, retry: false }).catch((error: unknown) => error);
    const dialog = await screen.findByRole("dialog", { name: "Loading" });

    expect(document.activeElement).toBe(input);
    expect(input.closest("[inert], [aria-hidden=true]")).toBeNull();
    expect(button.hasAttribute("inert")).toBe(true);
    fireEvent.change(input, { target: { value: "Still typing" } });
    expect(input.value).toBe("Still typing");
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(dialog);
    expect(screen.getByRole("dialog", { name: "Loading" })).toBe(dialog);

    await act(async () => {
      if (outcome === "failure") pending.reject(new Error("Unavailable"));
      else if (outcome === "cancellation") await client.cancelQueries({ queryKey: [outcome] });
      else pending.resolve("Loaded");
      await request;
    });

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(document.activeElement).toBe(input);
    expect(button.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "Unavailable" }).closest("[inert]")).not.toBeNull();
  });

  it("blocks newly rendered controls during overlapping requests and restores them when the provider unmounts", async () => {
    const first = Promise.withResolvers<string>();
    const second = Promise.withResolvers<string>();
    const outside = document.createElement("button");
    document.body.append(outside);
    const { rerender, unmount } = render(<QueryProvider><Input allowWhileLoading aria-label="Search" /></QueryProvider>);
    const client = getQueryClient();
    const firstRequest = client.query({ queryKey: ["first"], queryFn: () => first.promise });
    const secondRequest = client.query({ queryKey: ["second"], queryFn: () => second.promise });
    await screen.findByRole("progressbar");
    expect(outside.hasAttribute("inert")).toBe(true);

    rerender(<QueryProvider><Input allowWhileLoading aria-label="Search" /><button>New action</button></QueryProvider>);
    const button = screen.getByRole("button", { name: "New action" });
    await waitFor(() => expect(button.hasAttribute("inert")).toBe(true));
    await act(async () => { first.resolve("First"); await firstRequest; });
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(button.hasAttribute("inert")).toBe(true);
    unmount();
    expect(outside.hasAttribute("inert")).toBe(false);
    outside.remove();
    await act(async () => { second.resolve("Second"); await secondRequest; });
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
    expect(screen.queryByRole("progressbar")).toBeNull();

    const refresh = result.current.refetch();
    await screen.findByRole("progressbar", { name: "Loading" });
    await act(async () => { pending.resolve("Updated"); await refresh; });

    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
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
  });
});
