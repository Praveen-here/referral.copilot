"use client";

import { motion } from "motion/react";
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Critically damped default spring (apple-design §4: damping 1.0, response ~0.35s).
export const spring = { type: "spring", bounce: 0, duration: 0.35 } as const;

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-canvas text-ink border border-line-strong hover:bg-subtle",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  danger: "text-red hover:bg-red-soft",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: ReactNode; loading?: boolean }
>(function Button({ variant = "secondary", size = "md", icon, loading, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "pressable inline-flex shrink-0 select-none items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-7 px-2.5 text-[0.8125rem]" : "h-9 px-3.5 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-70", className)}
    />
  );
}

const tones = {
  neutral: "bg-subtle text-ink-2",
  blue: "bg-accent-soft text-accent",
  green: "bg-green-soft text-green",
  orange: "bg-orange-soft text-orange",
  red: "bg-red-soft text-red",
  purple: "bg-purple-soft text-purple",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-caption font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

/** The paper-plane mark (public/logo.png, cut from docs/brand/logo-source.png). */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static asset; next/image adds nothing here
  return <img src="/logo.png" alt="Referral Copilot" width={size} height={size} className={cn("shrink-0 select-none", className)} draggable={false} />;
}

const avatarColors =["#e8eefb", "#e9f6ec", "#fdf1e3", "#f4ebfa", "#fbeaea", "#e6f4f6"];

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const color = avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink-2"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-caption text-red">{error}</p> : hint ? <div className="text-caption text-ink-3">{hint}</div> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-control border border-line-strong bg-canvas px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-[rgba(0,0,0,0.22)] focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent-soft";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, "min-h-24 resize-y py-2 leading-relaxed", className)} {...props} />;
});

/** iOS-style segmented control; the selection pill moves with a spring. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  layoutId: string;
}) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-subtle p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "pressable relative h-7 rounded-control px-3 text-[0.8125rem] font-medium whitespace-nowrap",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring}
                className="absolute inset-0 rounded-control bg-canvas shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)]"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && o.count > 0 && <span className={cn("tabular-nums", active ? "text-ink-2" : "text-ink-3")}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-subtle text-ink-2">{icon}</div>}
      <h3 className="text-headline">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-ink-2">
        {title}
        {count !== undefined && <span className="font-medium text-ink-3 tabular-nums">{count}</span>}
      </h2>
      {children}
    </div>
  );
}
