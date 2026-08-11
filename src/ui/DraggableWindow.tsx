import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { AlignmentGuides, Point, ResizeDirection, WindowSize } from "../types";
import { getInitialWindowPosition, getInitialWindowSize } from "../services/storage";

let nextWindowZIndex = 1000;

const DraggableWindow = React.memo(({
  storageKey,
  className,
  defaultPosition,
  defaultSize,
  handleSelector = ".draggable-window-handle",
  children,
}: {
  storageKey: string;
  className: string;
  defaultPosition: Point;
  defaultSize?: WindowSize;
  handleSelector?: string;
  children: React.ReactNode;
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Point>(() => getInitialWindowPosition(storageKey, defaultPosition));
  const [size, setSize] = useState<WindowSize | undefined>(() => getInitialWindowSize(storageKey, defaultSize));
  const [zIndex, setZIndex] = useState(() => ++nextWindowZIndex);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({ vertical: null, horizontal: null });
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const resizeState = useRef<{
    pointerId: number;
    direction: ResizeDirection;
    startX: number;
    startY: number;
    position: Point;
    size: WindowSize;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey]);

  useEffect(() => {
    if (!size) return;
    localStorage.setItem(`${storageKey}:size`, JSON.stringify(size));
  }, [size, storageKey]);

  const persistSize = (nextSize: WindowSize) => {
    localStorage.setItem(`${storageKey}:size`, JSON.stringify(nextSize));
  };

  useEffect(() => {
    const element = windowRef.current;
    if (!element || !defaultSize) return;
    const observer = new ResizeObserver(() => {
      // offsetWidth/offsetHeight ignore the opening transform animation.
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      setSize((previous) => {
        if (previous && Math.round(previous.width) === Math.round(width) && Math.round(previous.height) === Math.round(height)) {
          return previous;
        }
        const nextSize = { width, height };
        persistSize(nextSize);
        return nextSize;
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [defaultSize]);

  useEffect(() => {
    const clampToViewport = () => {
      const rect = windowRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxX = Math.max(12, window.innerWidth - rect.width - 12);
      const maxY = Math.max(12, window.innerHeight - rect.height - 12);
      setPosition((prev) => ({
        x: Math.min(Math.max(prev.x, 12), maxX),
        y: Math.min(Math.max(prev.y, 12), maxY),
      }));
    };

    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setZIndex(++nextWindowZIndex);
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const resizeHandle = target.closest<HTMLElement>(".window-resize-handle");
    if (resizeHandle) {
      const rect = windowRef.current?.getBoundingClientRect();
      const direction = resizeHandle.dataset.direction as ResizeDirection | undefined;
      if (!rect || !direction) return;
      resizeState.current = {
        pointerId: e.pointerId,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        position: { x: rect.left, y: rect.top },
        size: { width: rect.width, height: rect.height },
      };
      setAlignmentGuides({ vertical: window.innerWidth / 2, horizontal: window.innerHeight / 2 });
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (target.closest("button, input, textarea, select, [role='button']")) return;
    if (!target.closest(handleSelector)) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setAlignmentGuides({ vertical: window.innerWidth / 2, horizontal: window.innerHeight / 2 });
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeState.current;
    if (resize?.pointerId === e.pointerId) {
      const deltaX = e.clientX - resize.startX;
      const deltaY = e.clientY - resize.startY;
      const minWidth = 260;
      const minHeight = 160;
      let nextX = resize.position.x;
      let nextY = resize.position.y;
      let nextWidth = resize.size.width;
      let nextHeight = resize.size.height;

      if (resize.direction.includes("e")) {
        nextWidth = Math.min(Math.max(minWidth, resize.size.width + deltaX), window.innerWidth - resize.position.x - 12);
      }
      if (resize.direction.includes("w")) {
        nextX = Math.min(Math.max(12, resize.position.x + deltaX), resize.position.x + resize.size.width - minWidth);
        nextWidth = resize.position.x + resize.size.width - nextX;
      }
      if (resize.direction.includes("s")) {
        nextHeight = Math.min(Math.max(minHeight, resize.size.height + deltaY), window.innerHeight - resize.position.y - 12);
      }
      if (resize.direction.includes("n")) {
        nextY = Math.min(Math.max(12, resize.position.y + deltaY), resize.position.y + resize.size.height - minHeight);
        nextHeight = resize.position.y + resize.size.height - nextY;
      }

      const otherWindows = Array.from(document.querySelectorAll<HTMLElement>(".draggable-window"))
        .filter((element) => element !== windowRef.current)
        .map((element) => element.getBoundingClientRect());
      const verticalCandidates = [window.innerWidth / 2, ...otherWindows.flatMap((item) => [item.left, item.left + item.width / 2, item.right])];
      const horizontalCandidates = [window.innerHeight / 2, ...otherWindows.flatMap((item) => [item.top, item.top + item.height / 2, item.bottom])];
      const findGuide = (value: number, candidates: number[]) => {
        let best: { guide: number; distance: number } | undefined;
        candidates.forEach((guide) => {
          const distance = Math.abs(value - guide);
          if (distance <= 10 && (!best || distance < best.distance)) best = { guide, distance };
        });
        return best?.guide;
      };
      const rightGuide = resize.direction.includes("e") ? findGuide(nextX + nextWidth, verticalCandidates) : undefined;
      const leftGuide = resize.direction.includes("w") ? findGuide(nextX, verticalCandidates) : undefined;
      const bottomGuide = resize.direction.includes("s") ? findGuide(nextY + nextHeight, horizontalCandidates) : undefined;
      const topGuide = resize.direction.includes("n") ? findGuide(nextY, horizontalCandidates) : undefined;
      if (rightGuide !== undefined && rightGuide - nextX >= minWidth) nextWidth = rightGuide - nextX;
      if (leftGuide !== undefined && resize.position.x + resize.size.width - leftGuide >= minWidth) {
        nextX = leftGuide;
        nextWidth = resize.position.x + resize.size.width - nextX;
      }
      if (bottomGuide !== undefined && bottomGuide - nextY >= minHeight) nextHeight = bottomGuide - nextY;
      if (topGuide !== undefined && resize.position.y + resize.size.height - topGuide >= minHeight) {
        nextY = topGuide;
        nextHeight = resize.position.y + resize.size.height - nextY;
      }

      const nextSize = { width: nextWidth, height: nextHeight };
      setPosition({ x: nextX, y: nextY });
      setSize(nextSize);
      persistSize(nextSize);
      setAlignmentGuides({
        vertical: rightGuide ?? leftGuide ?? window.innerWidth / 2,
        horizontal: bottomGuide ?? topGuide ?? window.innerHeight / 2,
      });
      return;
    }
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = Math.min(Math.max(e.clientX - dragState.current.offsetX, 12), Math.max(12, window.innerWidth - rect.width - 12));
    const rawY = Math.min(Math.max(e.clientY - dragState.current.offsetY, 12), Math.max(12, window.innerHeight - rect.height - 12));
    const otherWindows = Array.from(document.querySelectorAll<HTMLElement>(".draggable-window"))
      .filter((element) => element !== windowRef.current)
      .map((element) => element.getBoundingClientRect());
    const verticalCandidates = [window.innerWidth / 2, ...otherWindows.flatMap((item) => [item.left, item.left + item.width / 2, item.right])];
    const horizontalCandidates = [window.innerHeight / 2, ...otherWindows.flatMap((item) => [item.top, item.top + item.height / 2, item.bottom])];
    const snapAxis = (raw: number, extent: number, candidates: number[]): { position: number; guide: number; distance: number } | undefined => {
      const anchors = [0, -extent / 2, -extent];
      let best: { position: number; guide: number; distance: number } | undefined;
      candidates.forEach((guide) => anchors.forEach((anchor) => {
        const position = guide + anchor;
        const distance = Math.abs(raw - position);
        if (distance <= 10 && (!best || distance < best.distance)) best = { position, guide, distance };
      }));
      return best;
    };
    const verticalSnap = snapAxis(rawX, rect.width, verticalCandidates);
    const horizontalSnap = snapAxis(rawY, rect.height, horizontalCandidates);
    setPosition({
      x: verticalSnap ? Math.min(Math.max(verticalSnap.position, 12), Math.max(12, window.innerWidth - rect.width - 12)) : rawX,
      y: horizontalSnap ? Math.min(Math.max(horizontalSnap.position, 12), Math.max(12, window.innerHeight - rect.height - 12)) : rawY,
    });
    setAlignmentGuides({
      vertical: verticalSnap?.guide ?? window.innerWidth / 2,
      horizontal: horizontalSnap?.guide ?? window.innerHeight / 2,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const isResizing = resizeState.current?.pointerId === e.pointerId;
    const isDragging = dragState.current?.pointerId === e.pointerId;
    if (!isResizing && !isDragging) return;
    dragState.current = null;
    resizeState.current = null;
    setAlignmentGuides({ vertical: null, horizontal: null });
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors from stale pointer capture state.
    }
  };

  return (
    <>
      <div
        ref={windowRef}
        className={className}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex,
          ...(size ? { width: size.width, height: size.height } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
        {(["n", "e", "s", "w", "ne", "nw", "se", "sw"] as ResizeDirection[]).map((direction) => (
          <span key={direction} className={`window-resize-handle window-resize-${direction}`} data-direction={direction} aria-hidden="true" />
        ))}
      </div>
      {(alignmentGuides.vertical !== null || alignmentGuides.horizontal !== null) && createPortal(
        <>
          {alignmentGuides.vertical !== null && <div className="window-alignment-guide window-alignment-guide-vertical" style={{ left: alignmentGuides.vertical, zIndex: zIndex + 1 }} />}
          {alignmentGuides.horizontal !== null && <div className="window-alignment-guide window-alignment-guide-horizontal" style={{ top: alignmentGuides.horizontal, zIndex: zIndex + 1 }} />}
        </>,
        document.body,
      )}
    </>
  );
});

export default DraggableWindow;