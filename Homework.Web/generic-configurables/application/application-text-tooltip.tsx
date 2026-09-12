"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ApplicationTextTooltipState } from "./types";
import styles from "./application-text-tooltip.module.css";

const unavailable = '[inert],[hidden],[aria-hidden="true"],[aria-busy="true"],[role="tooltip"],script,style,noscript,input,textarea,select,[contenteditable]:not([contenteditable="false"])';
const interactive = 'a[href],button,input,select,textarea,summary,[contenteditable="true"],[role="button"],[role="link"],[role="menuitem"]';

function truncationStyle(element: HTMLElement) {
  if (!element.textContent?.trim() || element.closest(unavailable)) return null;
  const style = getComputedStyle(element);
  return style.textOverflow.includes("ellipsis") || Number(style.webkitLineClamp) > 0 ? style : null;
}

function isTruncated(element: HTMLElement) {
  const style = truncationStyle(element);
  if (!style || !element.isConnected || !element.clientWidth || !element.clientHeight || style.visibility === "hidden") return false;
  return style.textOverflow.includes("ellipsis") && style.overflowX !== "visible" && element.scrollWidth > element.clientWidth ||
    Number(style.webkitLineClamp) > 0 && style.overflowY !== "visible" && element.scrollHeight > element.clientHeight;
}

export function ApplicationTextTooltip() {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const close = useRef(() => {});
  const [tooltip, setTooltip] = useState<ApplicationTextTooltipState | null>(null);

  useEffect(() => {
    const lifetime = new window.AbortController();
    const options = { capture: true, passive: true, signal: lifetime.signal };
    const candidates = new Set<HTMLElement>();
    const focusable = new Set<HTMLElement>();
    let active: HTMLElement | null = null;
    let described: HTMLElement | null = null;
    let hovered = false;
    let pinned = false;
    let frame = 0;
    let timer = 0;

    const removeDescription = () => {
      if (!described) return;
      const descriptions = described.getAttribute("aria-describedby")?.split(/\s+/).filter((value) => value !== id).join(" ");
      if (descriptions) described.setAttribute("aria-describedby", descriptions);
      else described.removeAttribute("aria-describedby");
      described = null;
    };
    const hide = () => {
      window.clearTimeout(timer);
      removeDescription();
      active = null;
      hovered = false;
      pinned = false;
      setTooltip(null);
    };
    close.current = hide;

    const show = (element: HTMLElement) => {
      if (!isTruncated(element)) return;
      window.clearTimeout(timer);
      if (active !== element) {
        removeDescription();
        active = element;
        hovered = false;
        pinned = false;
        described = element.closest<HTMLElement>(interactive) ?? element;
        described.setAttribute("aria-describedby", [described.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
      }
      const text = element.textContent?.trim() ?? "";
      setTooltip((previous) => previous?.anchor === element && previous.text === text ? previous : { anchor: element, text });
    };
    const leave = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!hovered && !pinned && !described?.contains(document.activeElement)) hide();
      }, 150);
    };
    const find = (target: EventTarget | null, descendants = false) => {
      if (!(target instanceof Element)) return null;
      for (let element: Element | null = target; element; element = element.parentElement) {
        if (element instanceof HTMLElement && candidates.has(element) && isTruncated(element)) return element;
      }
      return descendants && target.matches(interactive) ? [...candidates].find((element) => target.contains(element) && isTruncated(element)) ?? null : null;
    };
    const inside = (target: EventTarget | null) => target instanceof Node && Boolean(described?.contains(target) || popup.current?.contains(target));
    const releaseFocus = (element: HTMLElement) => {
      if (element.getAttribute("tabindex") === "0") element.removeAttribute("tabindex");
      element.removeAttribute("data-text-tooltip-focusable");
      focusable.delete(element);
    };
    const refresh = () => {
      frame = 0;
      const found = new Set<HTMLElement>();
      for (const element of document.body.querySelectorAll("*")) {
        if (!(element instanceof HTMLElement) || !truncationStyle(element)) continue;
        found.add(element);
        if (!candidates.has(element)) resize.observe(element);
        if (isTruncated(element)) {
          if (!element.hasAttribute("tabindex") && !element.closest(interactive)) {
            element.tabIndex = 0;
            element.setAttribute("data-text-tooltip-focusable", "");
            focusable.add(element);
          }
        } else if (focusable.has(element)) releaseFocus(element);
      }
      for (const element of candidates) {
        if (found.has(element)) continue;
        resize.unobserve(element);
        if (focusable.has(element)) releaseFocus(element);
      }
      candidates.clear();
      for (const element of found) candidates.add(element);
      if (active) {
        if (isTruncated(active)) {
          const text = active.textContent?.trim() ?? "";
          setTooltip((previous) => previous && previous.text !== text ? { ...previous, text } : previous);
        } else hide();
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
    const resize = new ResizeObserver(schedule);
    const previousStyle = document.createElement("span").style;
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => {
        if (popup.current?.parentElement?.contains(record.target)) return false;
        if (record.attributeName !== "style" || !(record.target instanceof HTMLElement)) return true;
        previousStyle.cssText = record.oldValue ?? "";
        const currentStyle = record.target.style;
        return [...new Set([...previousStyle, ...currentStyle])].some((property) => {
          if (property === "transform" || property.startsWith("--scroll-area-")) return false;
          return previousStyle.getPropertyValue(property) !== currentStyle.getPropertyValue(property) ||
            previousStyle.getPropertyPriority(property) !== currentStyle.getPropertyPriority(property);
        });
      })) schedule();
    });
    resize.observe(document.body);
    mutations.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true,
      attributeFilter: ["class", "style", "hidden", "inert", "aria-hidden", "aria-busy"],
    });
    window.addEventListener("resize", schedule, options);
    window.addEventListener("blur", hide, { signal: lifetime.signal });
    document.fonts?.addEventListener("loadingdone", schedule, options);
    document.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      if (event.target instanceof Node && popup.current?.contains(event.target)) {
        hovered = true;
        window.clearTimeout(timer);
        return;
      }
      const element = find(event.target);
      if (element) { show(element); hovered = true; }
    }, options);
    document.addEventListener("pointerout", (event) => {
      if (!inside(event.target) || inside(event.relatedTarget)) return;
      hovered = false;
      leave();
    }, options);
    document.addEventListener("focusin", (event) => {
      const element = find(event.target, true);
      if (element) show(element);
      else if (!inside(event.target)) hide();
    }, options);
    document.addEventListener("focusout", (event) => {
      if (!inside(event.target) || inside(event.relatedTarget)) return;
      pinned = false;
      leave();
    }, options);
    document.addEventListener("click", (event) => {
      const element = find(event.target);
      if (element) { show(element); pinned = true; }
      else if (!inside(event.target)) hide();
    }, options);
    schedule();

    return () => {
      lifetime.abort();
      mutations.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      removeDescription();
      for (const element of focusable) releaseFocus(element);
    };
  }, [id]);

  if (!tooltip) return null;

  return (
    <Tooltip.Root open onOpenChange={(open, details) => {
      if (open) return;
      if (details.reason === "trigger-hover" || details.reason === "outside-press" && details.event.target instanceof Node && tooltip.anchor.contains(details.event.target)) details.cancel();
      else close.current();
    }}>
      <Tooltip.Portal>
        <Tooltip.Positioner anchor={tooltip.anchor} positionMethod="fixed" className={styles.positioner}
          sideOffset={() => popup.current ? Number.parseFloat(getComputedStyle(popup.current).paddingInlineStart) / Math.SQRT2 || 0 : 0}>
          <Tooltip.Popup ref={popup} id={id} role="tooltip" className={styles.popup}>
            <Tooltip.Arrow className={styles.arrow} />
            <span>{tooltip.text}</span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
