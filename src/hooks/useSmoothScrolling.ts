import { useEffect, useRef } from "react";

type PendingScroll = {
  target: number;
  frame: number | null;
};

function animateScroll(element: HTMLElement, pending: Map<HTMLElement, PendingScroll>) {
  const motion = pending.get(element);
  if (!motion) return;

  const distance = motion.target - element.scrollTop;
  if (Math.abs(distance) < 0.5) {
    element.scrollTop = motion.target;
    motion.frame = null;
    return;
  }

  element.scrollTop += distance * 0.24;
  motion.frame = window.requestAnimationFrame(() => animateScroll(element, pending));
}

function getScrollableElement(target: EventTarget | null, delta: number, pending: Map<HTMLElement, PendingScroll>) {
  const targetElement = target instanceof HTMLElement ? target : target instanceof Element ? target : null;

  let element = target instanceof HTMLElement ? target : target instanceof Element ? target.parentElement : null;

  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const maxScroll = element.scrollHeight - element.clientHeight;
    const currentTarget = pending.get(element)?.target ?? element.scrollTop;
    const canScroll = delta < 0 ? currentTarget > 0 : currentTarget < maxScroll;

    if ((style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowY === "overlay") && maxScroll > 1 && canScroll) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
}

export function useSmoothScrolling() {
  const pendingRef = useRef(new Map<HTMLElement, PendingScroll>());

  useEffect(() => {
    const pending = pendingRef.current;

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) return;

      const scrollable = getScrollableElement(event.target, event.deltaY, pending);
      if (!scrollable) return;

      event.preventDefault();

      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? scrollable.clientHeight
          : 1;
      const delta = Math.max(-240, Math.min(240, event.deltaY * multiplier));
      const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
      const motion = pending.get(scrollable) ?? { target: scrollable.scrollTop, frame: null };
      if (motion.frame === null) motion.target = scrollable.scrollTop;
      motion.target = Math.max(0, Math.min(maxScroll, motion.target + delta));
      pending.set(scrollable, motion);

      if (motion.frame !== null) return;
      motion.frame = window.requestAnimationFrame(() => animateScroll(scrollable, pending));
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
      pending.forEach((motion) => {
        if (motion.frame !== null) window.cancelAnimationFrame(motion.frame);
      });
      pending.clear();
    };
  }, []);
}
