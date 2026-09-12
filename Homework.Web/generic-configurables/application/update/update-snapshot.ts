import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { isRecord } from "../../utils";
import type { ApplicationStateScope } from "../types";
import type { UpdateSnapshot } from "./types";

const storageKey = "application-update-v1";

function viewElements() {
  const elements = new Map<string, HTMLElement | null>();
  const selector = "a,button,input,select,textarea,main,nav,form,section,[role],[tabindex],[id],[name],[aria-label]";
  for (const element of document.querySelectorAll(selector)) {
    if (!(element instanceof HTMLElement)) continue;
    const scope = element.parentElement?.closest("main,nav,form,[role=region],section[aria-label]");
    const name = element.getAttribute("name") || element.getAttribute("aria-label") || element.getAttribute("href") ||
      (element.matches("button,[role=button]") ? element.textContent?.trim().replace(/\s+/g, " ") : null) || (element.matches("main,nav,form") ? "" : element.id);
    const key = JSON.stringify([scope?.localName, scope?.getAttribute("role"), scope?.getAttribute("aria-label"), element.localName, element.getAttribute("role"), name]);
    elements.set(key, elements.has(key) ? null : element);
  }
  return elements;
}

function clearUpdateSnapshot() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

export function readUpdateSnapshot(): UpdateSnapshot | null {
  let valid = false;
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const snapshot: unknown = JSON.parse(stored);

    if (!isRecord(snapshot) || snapshot.schema !== 1 || snapshot.url !== location.href || typeof snapshot.savedAt !== "number" || !Number.isFinite(snapshot.savedAt)) return null;
    const age = Date.now() - snapshot.savedAt;
    if (age < 0 || age > 86_400_000) return null;

    const { states, queries, view } = snapshot;
    if (!isRecord(states) || !Object.values(states).every(isRecord) || !isRecord(view) || !isRecord(view.scroll) || !isRecord(queries)) return null;
    if (!Array.isArray(queries.queries) || !Array.isArray(queries.mutations) || queries.mutations.length) return null;
    if (view.focus !== null && typeof view.focus !== "string") return null;

    const { selection } = view;
    if (selection !== null && (!Array.isArray(selection) || selection.length !== 3 || !Number.isSafeInteger(selection[0]) || !Number.isSafeInteger(selection[1]) ||
      selection[0] < 0 || selection[1] < selection[0] || !["forward", "backward", "none"].includes(selection[2]))) return null;

    if (Object.values(view.scroll).some((position) => !Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite))) return null;
    if (queries.queries.some((query) => !isRecord(query) || !Array.isArray(query.queryKey) || typeof query.queryHash !== "string" || query.promise !== undefined ||
      !isRecord(query.state) || query.state.status !== "success" || typeof query.state.dataUpdatedAt !== "number" || !Number.isFinite(query.state.dataUpdatedAt))) return null;

    valid = true;
    return snapshot as UpdateSnapshot;
  } catch {
    return null;
  } finally {
    if (!valid) clearUpdateSnapshot();
  }
}

export function saveUpdateSnapshot(state: ApplicationStateScope, client: QueryClient) {
  try {
    const scroll: UpdateSnapshot["view"]["scroll"] = { window: [window.scrollX, window.scrollY] };
    const elements = viewElements();
    for (const [key, element] of elements) {
      if (element && (element.scrollTop || element.scrollLeft || element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)) {
        scroll[key] = [element.scrollLeft, element.scrollTop];
      }
    }
    const active = document.activeElement;
    const selection = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
    const snapshot: UpdateSnapshot = {
      schema: 1,
      url: location.href,
      savedAt: Date.now(),
      states: Object.fromEntries([...state.saved, ...[...state.readStates].map(([key, readState]) => [key, readState()])]),
      queries: dehydrate(client, { shouldDehydrateMutation: () => false }),
      view: {
        scroll,
        focus: [...elements].find(([, element]) => element === active)?.[0] ?? null,
        selection: selection?.selectionStart != null && selection.selectionEnd != null ?
          [selection.selectionStart, selection.selectionEnd, selection.selectionDirection ?? "none"] : null,
      },
    };
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function restoreUpdateQueries(client: QueryClient, snapshot: UpdateSnapshot) {
  hydrate(client, snapshot.queries);
  clearUpdateSnapshot();
}

export function restoreUpdateView(snapshot: UpdateSnapshot) {
  const lifetime = new window.AbortController();
  let frame = 0;
  const deadline = Date.now() + 5_000;
  const stop = () => {
    lifetime.abort();
    cancelAnimationFrame(frame);
  };
  const restore = () => {
    if (lifetime.signal.aborted || location.href !== snapshot.url) return stop();
    let complete = true;
    const elements = viewElements();
    const focused = snapshot.view.focus ? elements.get(snapshot.view.focus) : null;
    if (focused && !focused.closest("[inert], [hidden]")) {
      focused.focus({ preventScroll: true });
      if (snapshot.view.selection && (focused instanceof HTMLTextAreaElement || (focused instanceof HTMLInputElement && focused.selectionStart !== null))) {
        focused.setSelectionRange(...snapshot.view.selection);
      }
    } else if (snapshot.view.focus) {
      complete = false;
    }

    for (const [key, [left, top]] of Object.entries(snapshot.view.scroll)) {
      const element = elements.get(key);
      if (key === "window") {
        window.scrollTo({ left, top, behavior: "instant" });
        complete &&= Math.abs(window.scrollY - top) < 1 && Math.abs(window.scrollX - left) < 1;
      } else if (element) {
        element.scrollLeft = left;
        element.scrollTop = top;
        complete &&= Math.abs(element.scrollTop - top) < 1 && Math.abs(element.scrollLeft - left) < 1;
      } else {
        complete = false;
      }
    }

    if (complete || Date.now() >= deadline) stop();
    else frame = requestAnimationFrame(restore);
  };

  for (const event of ["pointerdown", "keydown", "touchstart", "wheel"]) window.addEventListener(event, stop, { capture: true, passive: true, signal: lifetime.signal });
  frame = requestAnimationFrame(restore);
  return stop;
}
