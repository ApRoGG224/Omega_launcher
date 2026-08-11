import React, { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ipc } from "../../services/ipc";

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
  const [resolved, setResolved] = useState<string>(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (src.startsWith("http")) {
      setResolved(src);
      ipc
        .cacheModIcon(src)
        .then((path) => {
          if (!cancelled) setResolved(convertFileSrc(path));
        })
        .catch(() => {
          // Keep the original remote URL.
        });
    } else {
      setResolved(src);
    }
    return () => {
      cancelled = true;
    };
  }, [src]);

  const current = failed && fallbackSrc ? fallbackSrc : resolved;
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
});