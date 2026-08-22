import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

// 3s gives enough time to actually read the message (2s was cutting off
// longer error messages before people could finish reading them).
const TOAST_DURATION = 3000;

// Minimal in-house toast system so we don't need to pull in a new
// dependency just for a handful of success/error messages.
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return { toasts, showToast, dismissToast };
}

function ToastItem({ toast, onDismiss }) {
  const isSuccess = toast.type === "success";
  const [isEntered, setIsEntered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(TOAST_DURATION);
  const startedAtRef = useRef(null);
  const timeoutRef = useRef(null);

  // Animate in on mount instead of just popping into place.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss, but pause the countdown while the person is hovering
  // (reading a longer message) so it doesn't vanish mid-read.
  useEffect(() => {
    if (isPaused) return;
    startedAtRef.current = Date.now();
    timeoutRef.current = setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timeoutRef.current);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    };
  }, [isPaused, toast.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative flex w-96 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border-l-4 bg-white py-4 pl-4 pr-9 shadow-lg transition-all duration-300 ease-out ${
        isSuccess ? "border-success" : "border-secondary"
      } ${isEntered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isSuccess ? "bg-success/10 text-success" : "bg-secondary/10 text-secondary"
        }`}
      >
        {isSuccess ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
      </div>

      <p className="pt-1 text-base font-medium leading-snug text-gray-700">{toast.message}</p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}