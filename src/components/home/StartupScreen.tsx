import React, { useCallback, useEffect, useRef } from "react";

export interface StartupScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

const PIXEL_SIZE = 24;

// Authentic matte Minecraft bedrock & obsidian tones matching --launcher-bg (#07080e)
// Strict design rule: NO NEON.
const MATTE_PALETTE = [
  "#07080e",
  "#090c14",
  "#0c0f1b",
  "#0e1321",
  "#111626",
];

interface PixelBlock {
  x: number;
  y: number;
  dist: number;
}

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

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        // Fallback for headless environments or jsdom
        const timer = setTimeout(finish, 850);
        return () => clearTimeout(timer);
      }

      let animationFrameId: number;
      let width = (canvas.width = window.innerWidth || 1280);
      let height = (canvas.height = window.innerHeight || 720);

      const cols = Math.ceil(width / PIXEL_SIZE);
      const rows = Math.ceil(height / PIXEL_SIZE);
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDistance = Math.hypot(
        Math.max(centerX, width - centerX),
        Math.max(centerY, height - centerY),
      );

      // Pre-allocate color buckets to eliminate canvas state changes (ctx.fillStyle)
      const buckets: PixelBlock[][] = Array.from(
        { length: MATTE_PALETTE.length },
        () => [],
      );

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * PIXEL_SIZE;
          const y = r * PIXEL_SIZE;
          const dist = Math.hypot(
            x + PIXEL_SIZE / 2 - centerX,
            y + PIXEL_SIZE / 2 - centerY,
          );
          const colorIndex = (r * 7 + c * 13) % MATTE_PALETTE.length;
          buckets[colorIndex].push({ x, y, dist });
        }
      }

      // Sort each bucket by distance ascending for O(1) amortized block culling
      for (let c = 0; c < MATTE_PALETTE.length; c++) {
        buckets[c].sort((a, b) => a.dist - b.dist);
      }

      // Track the first non-dissolved block index for each color bucket
      const startIndices = new Int32Array(MATTE_PALETTE.length);

      // Initial synchronous render: cover screen with opaque pixel blocks immediately
      for (let c = 0; c < MATTE_PALETTE.length; c++) {
        ctx.fillStyle = MATTE_PALETTE[c];
        const bucket = buckets[c];
        for (let i = 0; i < bucket.length; i++) {
          const b = bucket[i];
          ctx.fillRect(b.x, b.y, PIXEL_SIZE, PIXEL_SIZE);
        }
      }

      const DURATION = 850;
      const WAVE_WIDTH = maxDistance * 0.42;
      let startTime: number | null = null;
      let startDelayTimer: ReturnType<typeof setTimeout> | null = null;

      const renderFrame = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / DURATION);

        // Smooth cubic ease-out curve for fluid, responsive opening
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentFront = ease * (maxDistance + WAVE_WIDTH);
        const dissolveLimit = currentFront - WAVE_WIDTH;

        ctx.clearRect(0, 0, width, height);

        let remainingBlocks = 0;

        for (let c = 0; c < MATTE_PALETTE.length; c++) {
          const bucket = buckets[c];
          let start = startIndices[c];

          // Advance start index past all completely dissolved blocks
          while (start < bucket.length && bucket[start].dist < dissolveLimit) {
            start++;
          }
          startIndices[c] = start;

          if (start >= bucket.length) {
            continue;
          }

          remainingBlocks += bucket.length - start;
          // Set fillStyle only once per bucket (maximum 5 times per frame total)
          ctx.fillStyle = MATTE_PALETTE[c];

          for (let i = start; i < bucket.length; i++) {
            const b = bucket[i];

            if (b.dist <= currentFront) {
              // Within the active dissolving wave
              const rawScale = (b.dist - dissolveLimit) / WAVE_WIDTH;
              const size = Math.round(PIXEL_SIZE * rawScale);
              if (size > 0) {
                const offset = (PIXEL_SIZE - size) >> 1;
                ctx.fillRect(b.x + offset, b.y + offset, size, size);
              }
            } else {
              // Outer blocks not reached yet: draw full size
              ctx.fillRect(b.x, b.y, PIXEL_SIZE, PIXEL_SIZE);
            }
          }
        }

        if (progress < 1 && remainingBlocks > 0) {
          animationFrameId = requestAnimationFrame(renderFrame);
        } else {
          finish();
        }
      };

      // Brief hold to allow initial frame to stabilize
      startDelayTimer = setTimeout(() => {
        animationFrameId = requestAnimationFrame(renderFrame);
      }, 50);

      const handleResize = () => {
        width = canvas.width = window.innerWidth || 1280;
        height = canvas.height = window.innerHeight || 720;
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
