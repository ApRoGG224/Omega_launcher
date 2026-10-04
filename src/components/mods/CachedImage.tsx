import React, { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ipc } from "../../services/ipc";

const iconCache = new Map<string, Promise<string>>();

/**
 * Renders an image, first caching remote icons (Modrinth CDN) into the native
 * app_cache_dir via `cache_mod_icon`. Falls back to the original URL when the
 * Tauri backend is unavailable.
 */
export const CachedImage = React.memo(({
  src,
  alt,
  className,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [resolved, setResolved] = useState<string>(src);
  const [failed, setFailed] = useState(false);
  const [nearViewport, setNearViewport] = useState(!src.startsWith("http"));

  useEffect(() => {
    setFailed(false);
    setResolved(src);
    if (!src.startsWith("http")) {
      setNearViewport(true);
      return;
    }

    setNearViewport(false);
    const image = imageRef.current;
    if (!image || !("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "240px" },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (!nearViewport || !src.startsWith("http")) return;
    let cancelled = false;
    const cached = iconCache.get(src) ?? ipc.cacheModIcon(src);
    iconCache.set(src, cached);
    cached
      .then((path) => {
        if (!cancelled) setResolved(convertFileSrc(path));
      })
      .catch(() => {
        // Keep the original remote URL.
      });
    return () => {
      cancelled = true;
    };
  }, [nearViewport, src]);

  const current = nearViewport ? (failed && fallbackSrc ? fallbackSrc : resolved) : undefined;
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      ref={imageRef}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
});
