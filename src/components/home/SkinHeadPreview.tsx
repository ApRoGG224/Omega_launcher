import React, { useEffect, useRef, useState } from "react";

interface SkinHeadPreviewProps {
  skinUrl?: string | null | undefined;
  fallback?: "steve" | "alex";
  size?: number;
}

export const SteveHead: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 8 8"
    shapeRendering="crispEdges"
    style={{ display: "block", flexShrink: 0 }}
  >
    <rect x="0" y="0" width="8" height="2" fill="#493019" />
    <rect x="0" y="2" width="1" height="1" fill="#493019" />
    <rect x="7" y="2" width="1" height="1" fill="#493019" />
    <rect x="1" y="2" width="6" height="6" fill="#b98561" />
    <rect x="0" y="3" width="1" height="5" fill="#b98561" />
    <rect x="7" y="3" width="1" height="5" fill="#b98561" />
    <rect x="1" y="4" width="1" height="1" fill="#ffffff" />
    <rect x="2" y="4" width="1" height="1" fill="#383fa1" />
    <rect x="5" y="4" width="1" height="1" fill="#383fa1" />
    <rect x="6" y="4" width="1" height="1" fill="#ffffff" />
    <rect x="3" y="5" width="2" height="1" fill="#a06e4c" />
    <rect x="2" y="6" width="4" height="1" fill="#583822" />
    <rect x="3" y="6" width="2" height="1" fill="#75472e" />
  </svg>
);

export const AlexHead: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 8 8"
    shapeRendering="crispEdges"
    style={{ display: "block", flexShrink: 0 }}
  >
    <rect x="0" y="0" width="8" height="3" fill="#b85f2a" />
    <rect x="0" y="3" width="1" height="3" fill="#b85f2a" />
    <rect x="7" y="3" width="1" height="2" fill="#b85f2a" />
    <rect x="1" y="3" width="6" height="5" fill="#ddaf94" />
    <rect x="0" y="6" width="1" height="2" fill="#ddaf94" />
    <rect x="7" y="5" width="1" height="3" fill="#ddaf94" />
    <rect x="1" y="4" width="1" height="1" fill="#ffffff" />
    <rect x="2" y="4" width="1" height="1" fill="#3d8544" />
    <rect x="5" y="4" width="1" height="1" fill="#3d8544" />
    <rect x="6" y="4" width="1" height="1" fill="#ffffff" />
    <rect x="3" y="6" width="2" height="1" fill="#c47866" />
  </svg>
);

export const SkinHeadPreview: React.FC<SkinHeadPreviewProps> = ({
  skinUrl,
  fallback = "steve",
  size = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    if (!skinUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };
    img.onerror = () => {
      setLoadError(true);
    };
    img.src = skinUrl;
  }, [skinUrl, size]);

  if (!skinUrl || loadError) {
    return fallback === "alex" ? (
      <AlexHead size={size} />
    ) : (
      <SteveHead size={size} />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
};
