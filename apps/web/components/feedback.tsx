"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, spring } from "./ui";

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ReturnPrompt {
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface FeedbackApi {
  toast: (t: Omit<Toast, "id">) => void;
  /** Ask a question when the user comes back from another tab (e.g. after LinkedIn). */
  askOnReturn: (p: ReturnPrompt) => void;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prompt, setPrompt] = useState<ReturnPrompt | null>(null);
  const pending = useRef<ReturnPrompt | null>(null);
  const nextId = useRef(0);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++nextId.current;
    // One toast at a time, so "Undo" always refers to the latest action.
    setToasts([{ ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 7000);
  }, []);

  const askOnReturn = useCallback((p: ReturnPrompt) => {
    pending.current = p;
    setPrompt(null);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && pending.current) {
        setPrompt(pending.current);
        pending.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, askOnReturn }}>
      {children}
      {/* Above the phone tab bar; bottom corner on desktop. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-5">
        <AnimatePresence>
          {prompt && (
            <motion.div
              key="prompt"
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={spring}
              className="pointer-events-auto flex w-full max-w-md flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border border-line bg-canvas py-2.5 pr-2.5 pl-4 shadow-sheet sm:w-auto sm:max-w-none"
            >
              <span className="text-headline">{prompt.question}</span>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setPrompt(null)}>
                  Not yet
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  autoFocus
                  onClick={() => {
                    prompt.onConfirm();
                    setPrompt(null);
                  }}
                >
                  {prompt.confirmLabel}
                </Button>
              </div>
            </motion.div>
          )}
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={spring}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-[0.8125rem] text-white shadow-float"
            >
              <span>{t.message}</span>
              {t.action ? (
                <button
                  className="pressable rounded-full px-2.5 py-1 font-semibold text-[#64b5ff] hover:bg-white/10"
                  onClick={() => {
                    t.action!.onClick();
                    setToasts((all) => all.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              ) : (
                <span className="w-2" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FeedbackContext.Provider>
  );
}
