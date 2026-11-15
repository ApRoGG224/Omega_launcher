import React, { useEffect, useRef } from "react";

interface SkinHeadAvatarProps {
  skinUrl: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkinHeadAvatar: React.FC<SkinHeadAvatarProps> = ({
  skinUrl,
  size = 24,
  className = "",
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#85583b";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#3e2413";
    ctx.fillRect(0, 0, size, size * 0.35);

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = skinUrl;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };

    if (img.complete && img.naturalWidth !== 0) {
      render();
    } else {
      img.onload = () => {
        if (!isMounted) return;
        render();
      };
      img.onerror = () => {
        if (!isMounted) return;
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(0, 0, size, size);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [skinUrl, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: "pixelated",
        display: "block",
        borderRadius: 0,
        ...style,
      }}
      aria-label="Аватар скина игрока"
    />
  );
};
