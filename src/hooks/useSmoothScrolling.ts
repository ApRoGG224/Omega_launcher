import { useEffect, useRef } from "react";

type PendingScroll = {
  target: number;
  frame: number | null;
};

function getScrollableElement(target: EventTarget | null, delta: number, pending: Map<HTMLElement, PendingScroll>) {
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
      motion.target = Math.max(0, Math.min(maxScroll, motion.target + delta));
      pending.set(scrollable, motion);

      if (motion.frame !== null) return;
      motion.frame = window.requestAnimationFrame(() => {
        const next = pending.get(scrollable);
        if (!next) return;
        next.frame = null;
        scrollable.scrollTo({ top: next.target, behavior: "smooth" });
      });
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
