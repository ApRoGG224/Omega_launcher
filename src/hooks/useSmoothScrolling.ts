import { useEffect, useRef } from "react";

type ScrollMotion = {
  position: number;
  target: number;
  frame: number | null;
};

function canScroll(element: HTMLElement, delta: number, motions: Map<HTMLElement, ScrollMotion>) {
  const maxScroll = element.scrollHeight - element.clientHeight;
  if (maxScroll <= 1) return false;

  const motion = motions.get(element);
  const position = motion?.target ?? element.scrollTop;
  return delta < 0 ? position > 0 : position < maxScroll;
}

function findScrollableElement(
  target: EventTarget | null,
  delta: number,
  motions: Map<HTMLElement, ScrollMotion>,
) {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== document.body) {
    const overflowY = window.getComputedStyle(element).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && canScroll(element, delta, motions)) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
}

export function useSmoothScrolling() {
  const motionsRef = useRef(new Map<HTMLElement, ScrollMotion>());

  useEffect(() => {
    const motions = motionsRef.current;

    const animate = (element: HTMLElement) => {
      const motion = motions.get(element);
      if (!motion) return;

      const distance = motion.target - motion.position;
      if (Math.abs(distance) < 0.5) {
        motion.position = motion.target;
        element.scrollTop = motion.position;
        motions.delete(element);
        return;
      }

      motion.position += distance * 0.2;
      element.scrollTop = motion.position;
      motion.frame = window.requestAnimationFrame(() => animate(element));
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) return;

      const scrollable = findScrollableElement(event.target, event.deltaY, motions);
      if (!scrollable) return;

      event.preventDefault();

      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? scrollable.clientHeight
          : 1;
      const delta = Math.max(-180, Math.min(180, event.deltaY * multiplier));
      const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
      const motion = motions.get(scrollable) ?? {
        position: scrollable.scrollTop,
        target: scrollable.scrollTop,
        frame: null,
      };
      motion.target = Math.max(0, Math.min(maxScroll, motion.target + delta));
      motions.set(scrollable, motion);

      if (motion.frame === null) {
        motion.frame = window.requestAnimationFrame(() => animate(scrollable));
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
      motions.forEach((motion) => {
        if (motion.frame !== null) window.cancelAnimationFrame(motion.frame);
      });
      motions.clear();
    };
  }, []);
}
