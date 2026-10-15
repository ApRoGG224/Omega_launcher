import React, { useCallback, useEffect, useRef, useState } from "react";

export interface StartupScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

export const StartupScreen: React.FC<StartupScreenProps> = React.memo(
  ({ onComplete, isReady = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const completeCalledRef = useRef(false);

    const handleOpen = useCallback(() => {
      if (completeCalledRef.current) return;
      setIsOpen(true);

      const timer = setTimeout(() => {
        if (!completeCalledRef.current) {
          completeCalledRef.current = true;
          onComplete();
        }
      }, 650);

      return () => clearTimeout(timer);
    }, [onComplete]);

    useEffect(() => {
      // Small pause before opening shutters to ensure DOM/canvas readiness
      const openTimer = setTimeout(() => {
        handleOpen();
      }, 200);

      return () => clearTimeout(openTimer);
    }, [handleOpen, isReady]);

    useEffect(() => {
      const handleKeyDown = () => {
        handleOpen();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleOpen]);

    return (
      <div
        className={`startup-shutters-container ${isOpen ? "open" : ""}`}
        onClick={handleOpen}
        aria-hidden="true"
      >
        <div className="startup-shutter startup-shutter-left" />
        <div className="startup-shutter startup-shutter-right" />
      </div>
    );
  },
);
