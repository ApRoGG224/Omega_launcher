import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ToastData, ToastType } from "../types";
import { IconCheck, IconX } from "./icons";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const TOAST_DURATION = 3000;

interface ToastEntry extends ToastData {
  id: number;
}

export const ToastProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-notification ${toast.type === "success" ? "toast-success" : "toast-error"}`}
          >
            {toast.type === "success" ? <IconCheck /> : <IconX />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
});