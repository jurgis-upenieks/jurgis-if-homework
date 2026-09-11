"use client";

import { useEffect, useLayoutEffect, useState, type PropsWithChildren } from "react";
import { IsRestoringProvider, useQueryClient } from "@tanstack/react-query";
import { ApplicationStateContext } from "../application-state";
import { readUpdateSnapshot, restoreUpdateQueries, restoreUpdateView, saveUpdateSnapshot } from "./update-snapshot";
import type { UpdateSession } from "./types";

export function ApplicationUpdate({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const version = process.env.NEXT_PUBLIC_APPLICATION_VERSION;
  const [session] = useState<UpdateSession>(() => {
    const snapshot = readUpdateSnapshot();
    return { snapshot, state: { saved: new Map(Object.entries(snapshot?.states ?? {})), readStates: new Map() } };
  });
  const [restoring, setRestoring] = useState(Boolean(session.snapshot));

  useLayoutEffect(() => {
    if (!session.snapshot) return;
    restoreUpdateQueries(client, session.snapshot);
    const stopRestoring = restoreUpdateView(session.snapshot);
    const frame = requestAnimationFrame(() => setRestoring(false));
    return () => { cancelAnimationFrame(frame); stopRestoring(); };
  }, [client, session]);

  useEffect(() => {
    const lifetime = new window.AbortController();
    window.addEventListener("pagehide", () => { saveUpdateSnapshot(session.state, client); }, { signal: lifetime.signal });
    return () => lifetime.abort();
  }, [client, session]);

  useEffect(() => {
    if (!version || version === "development") return;

    const lifetime = new window.AbortController();
    const listenerOptions = { capture: true, passive: true, signal: lifetime.signal };
    let lastInteraction = Date.now();
    let attemptedAt = session.snapshot?.savedAt ?? 0;
    let composing = false;
    let stopped = false;
    let target: unknown;
    let reconnectAt = 0;
    const pointers = new Set<number>();
    const connect = () => {
      const stream = new EventSource("/api/version");
      stream.addEventListener("message", (event) => {
        try { target = JSON.parse(event.data); } catch { target = undefined; }
      });
      stream.addEventListener("error", () => { target = undefined; reconnectAt = Date.now() + 5_000; });
      return stream;
    };
    let stream = connect();
    const interacted = () => { lastInteraction = Date.now(); };
    const pointerEnded = (event: PointerEvent) => { pointers.delete(event.pointerId); interacted(); };
    const ready = () => !composing && !pointers.size && document.visibilityState === "visible" && navigator.onLine && stream.readyState === EventSource.OPEN &&
      Date.now() - lastInteraction >= 1_500 &&
      Date.now() - attemptedAt >= 60_000 &&
      !client.getQueryCache().getAll().some((query) => query.state.fetchStatus !== "idle") &&
      !client.isMutating() &&
      ![...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].some((input) => input.files?.length);

    const update = () => {
      if (stopped) return;
      if (stream.readyState === EventSource.CLOSED && navigator.onLine && Date.now() >= reconnectAt) stream = connect();
      if (typeof target !== "string" || !target || target === version || target === "development" || !ready()) return;
      attemptedAt = Date.now();
      if (saveUpdateSnapshot(session.state, client)) {
        stopped = true;
        stream.close();
        location.reload();
      }
    };

    for (const event of ["pointermove", "keydown", "input", "change", "scroll", "touchstart", "touchend", "focusin"]) window.addEventListener(event, interacted, listenerOptions);
    window.addEventListener("compositionstart", () => { composing = true; interacted(); }, listenerOptions);
    window.addEventListener("compositionend", () => { composing = false; interacted(); }, listenerOptions);
    window.addEventListener("pointerdown", (event) => { pointers.add(event.pointerId); interacted(); }, listenerOptions);
    window.addEventListener("pointerup", pointerEnded, listenerOptions);
    window.addEventListener("pointercancel", pointerEnded, listenerOptions);
    window.addEventListener("blur", () => { pointers.clear(); composing = false; interacted(); }, { signal: lifetime.signal });
    const timer = setInterval(update, 1_000);
    return () => {
      stopped = true;
      lifetime.abort();
      stream.close();
      clearInterval(timer);
    };
  }, [client, session, version]);

  return <ApplicationStateContext value={session.state}><IsRestoringProvider value={restoring}>{children}</IsRestoringProvider></ApplicationStateContext>;
}
