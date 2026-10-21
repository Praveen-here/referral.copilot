"use client";

import { Building2, CircleUserRound, Plus, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/lib/queries";
import { useShell } from "./app-shell";

/**
 * Phone navigation: an iOS-style tab bar in thumb reach. One translucent layer
 * over the content (apple-design §12), clear of the home indicator.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { openSearch, openNewJob } = useShell();
  const { data: companies } = useSidebar();
  const attention = companies?.reduce((n, c) => n + c.attentionCount, 0) ?? 0;

  return (
    <nav
      aria-label="Main"
      // Denser than the default material: labels must stay legible over scrolling text.
      className="material fixed inset-x-0 bottom-0 z-40 border-t border-line !bg-[rgba(255,255,255,0.9)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2">
        <Tab href="/" label="Today" active={pathname === "/"} icon={<Sun size={22} />} />
        <Tab href="/companies" label="Companies" active={pathname.startsWith("/companies")} icon={<Building2 size={22} />} badge={attention} />
        <button onClick={openNewJob} aria-label="New job" className="pressable flex flex-1 items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_12px_rgba(0,113,227,0.35)]">
            <Plus size={22} strokeWidth={2.5} />
          </span>
        </button>
        <TabButton label="Search" onClick={openSearch} icon={<Search size={22} />} />
        <Tab href="/profile" label="Profile" active={pathname === "/profile"} icon={<CircleUserRound size={22} />} />
      </div>
    </nav>
  );
}

const tabClass = (active: boolean) =>
  cn("pressable relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-medium", active ? "text-accent" : "text-ink-3");

function Tab({ href, label, icon, active, badge }: { href: string; label: string; icon: ReactNode; active: boolean; badge?: number }) {
  return (
    <Link href={href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1 -right-2.5 min-w-4 rounded-full bg-red px-1 text-center text-[0.625rem] leading-4 font-semibold text-white tabular-nums">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

function TabButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={tabClass(false)}>
      {icon}
      {label}
    </button>
  );
}
