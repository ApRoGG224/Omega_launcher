import React, { useEffect, useRef } from "react";
import { IconShirt } from "../../ui/icons";

interface SkinHeadPreviewProps {
  skinUrl: string | null | undefined;
  size?: number;
}

export const SkinHeadPreview: React.FC<SkinHeadPreviewProps> = ({
  skinUrl,
  size = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!skinUrl) {
      ctx.clearRect(0, 0, size, size);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      // Head base layer (x: 8, y: 8, w: 8, h: 8)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      // Head hat / accessory layer (x: 40, y: 8, w: 8, h: 8)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };
    img.src = skinUrl;
  }, [skinUrl, size]);

  if (!skinUrl) {
    return <IconShirt />;
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
