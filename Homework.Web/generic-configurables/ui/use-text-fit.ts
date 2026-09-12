"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import "./text-fit.css";

export function useTextFit() {
  const elements = useRef(new Set<HTMLElement>());
  const requestFit = useRef(() => {});

  useLayoutEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports?.("text-fit", "shrink")) return;

    const observed = new Set<HTMLElement>();
    const dimensions = new WeakMap<HTMLElement, string>();
    const size = (element: HTMLElement) => `${element.clientWidth}:${element.clientHeight}`;
    let frame = 0;
    const fit = () => {
      frame = 0;
      const targets = [...elements.current].filter((element) => element.isConnected);
      const containers = new Set(targets.flatMap((element) => element.parentElement ? [element, element.parentElement] : [element]));
      for (const element of observed) {
        if (containers.has(element)) continue;
        resize.unobserve(element);
        observed.delete(element);
      }
      for (const element of containers) {
        if (!observed.has(element)) { resize.observe(element); observed.add(element); }
      }
      mutations.disconnect();
      for (const element of targets) {
        mutations.observe(element, { childList: true, characterData: true, subtree: true });
        element.removeAttribute("data-text-fit");
      }
      for (let percentage = 90; percentage >= 10; percentage -= 10) {
        const overflowing = targets.filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth);
        if (!overflowing.length) break;
        for (const element of overflowing) element.setAttribute("data-text-fit", String(percentage));
      }
      for (const element of observed) dimensions.set(element, size(element));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
    const resize = new ResizeObserver(() => {
      if ([...observed].some((element) => dimensions.get(element) !== size(element))) schedule();
    });
    const mutations = new MutationObserver(schedule);
    const lifetime = new window.AbortController();
    requestFit.current = schedule;
    window.addEventListener("resize", schedule, { signal: lifetime.signal });
    document.fonts?.addEventListener("loadingdone", schedule, { signal: lifetime.signal });
    fit();

    return () => {
      requestFit.current = () => {};
      lifetime.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, []);

  return useCallback((element: HTMLElement | null) => {
    if (!element) return;
    elements.current.add(element);
    requestFit.current();
    return () => {
      elements.current.delete(element);
      element.removeAttribute("data-text-fit");
      requestFit.current();
    };
  }, []);
}
