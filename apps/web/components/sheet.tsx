"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { spring, useIsPhone } from "./ui";

/**
 * Modal sheet. A dimming scrim focuses the task (apple-design §12); the panel
 * materializes with a critically damped spring and is interruptible mid-flight.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra classes for the panel (the chat sheet is taller and a little wider). */
  className?: string;
}) {
  const reduce = useReducedMotion();
  const phone = useIsPhone();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        // Phones: bottom sheet in thumb reach. Desktop: centered dialog.
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:overflow-y-auto sm:px-4 sm:pt-[10vh] sm:pb-8">
          <motion.div
            className="fixed inset-0 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-sheet bg-canvas pb-[env(safe-area-inset-bottom)] shadow-sheet sm:max-h-none sm:rounded-sheet sm:pb-0",
              className,
            )}
            initial={reduce ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={spring}
          >
            <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong sm:hidden" />
            <div className="flex items-start justify-between gap-4 px-5 pt-3 sm:px-6 sm:pt-5">
              <div>
                <h2 className="text-title">{title}</h2>
                {description && <p className="mt-1 text-ink-2">{description}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="pressable -mr-2 rounded-full p-1.5 text-ink-3 hover:bg-hover hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className={cn("min-h-0 overflow-y-auto px-5 py-5 sm:px-6", className && "flex-1")}>{children}</div>
            {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3 sm:px-6 sm:py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
