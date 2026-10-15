import React, { useCallback, useEffect, useRef } from "react";

export interface StartupScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

const PIXEL_SIZE = 20;

// Authentic matte Minecraft bedrock & obsidian tones matching --launcher-bg (#07080e)
// Strict rule: NO NEON.
const MATTE_PALETTE = [
  "#07080e",
  "#090c14",
  "#0c0f1b",
  "#0e1321",
  "#111626",
];

export const StartupScreen: React.FC<StartupScreenProps> = React.memo(
  ({ onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const completeCalledRef = useRef(false);

    const finish = useCallback(() => {
      if (completeCalledRef.current) return;
      completeCalledRef.current = true;
      onComplete();
    }, [onComplete]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        finish();
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback for headless environments or jsdom
        const timer = setTimeout(finish, 850);
        return () => clearTimeout(timer);
      }

      let animationFrameId: number;
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      const cols = Math.ceil(width / PIXEL_SIZE);
      const rows = Math.ceil(height / PIXEL_SIZE);
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDistance = Math.hypot(
        Math.max(centerX, width - centerX),
        Math.max(centerY, height - centerY),
      );

      interface PixelBlock {
        x: number;
        y: number;
        color: string;
        dist: number;
      }

      // Pre-compute block positions and distances from screen center
      const blocks: PixelBlock[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * PIXEL_SIZE;
          const y = r * PIXEL_SIZE;
          const dist = Math.hypot(
            x + PIXEL_SIZE / 2 - centerX,
            y + PIXEL_SIZE / 2 - centerY,
          );
          const color = MATTE_PALETTE[(r * 7 + c * 13) % MATTE_PALETTE.length];
          blocks.push({ x, y, color, dist });
        }
      }

      // Draw initial fully closed pixel mosaic curtain
      for (const b of blocks) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, PIXEL_SIZE, PIXEL_SIZE);
      }

      const DURATION = 850;
      const WAVE_WIDTH = maxDistance * 0.35;
      let startTime: number | null = null;
      let startDelayTimer: ReturnType<typeof setTimeout> | null = null;

      const renderFrame = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / DURATION);

        // Smooth cubic ease curve for measured opening
        const ease =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentFront = ease * (maxDistance + WAVE_WIDTH);

        ctx.clearRect(0, 0, width, height);

        let activeCount = 0;
        for (const b of blocks) {
          if (b.dist < currentFront - WAVE_WIDTH) {
            // Block completely dissolved
            continue;
          }

          let scale = 1;
          if (b.dist < currentFront) {
            const rawScale =
              (b.dist - (currentFront - WAVE_WIDTH)) / WAVE_WIDTH;
            // Discrete pixel stepping (1.0 -> 0.75 -> 0.5 -> 0.25 -> 0)
            scale = Math.floor(rawScale * 4) / 4;
          }

          if (scale > 0) {
            activeCount++;
            ctx.fillStyle = b.color;
            const size = PIXEL_SIZE * scale;
            const offset = (PIXEL_SIZE - size) / 2;
            ctx.fillRect(b.x + offset, b.y + offset, size, size);
          }
        }

        if (progress < 1 && activeCount > 0) {
          animationFrameId = requestAnimationFrame(renderFrame);
        } else {
          finish();
        }
      };

      // Brief hold before dissolving wave begins
      startDelayTimer = setTimeout(() => {
        animationFrameId = requestAnimationFrame(renderFrame);
      }, 140);

      const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };

      window.addEventListener("resize", handleResize);

      return () => {
        if (startDelayTimer) clearTimeout(startDelayTimer);
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
      };
    }, [finish]);

    useEffect(() => {
      const handleKeyDown = () => {
        finish();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [finish]);

    return (
      <div
        className="startup-pixel-mosaic-container"
        onClick={finish}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="startup-pixel-mosaic-canvas" />
      </div>
    );
  },
);
