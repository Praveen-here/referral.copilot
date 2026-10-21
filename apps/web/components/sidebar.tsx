"use client";

import { motion } from "motion/react";
import { CircleUserRound, LogOut, Plus, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useMe, useSidebar } from "@/lib/queries";
import { NewJobSheet } from "./new-job-sheet";
import { SearchPalette } from "./search-palette";
import { Avatar, Logo, spring } from "./ui";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: companies } = useSidebar();
  const { data: me } = useMe();
  const [newJob, setNewJob] = useState(false);
  const [searching, setSearching] = useState(false);

  // Ctrl/Cmd+K or "/" opens people search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Logo size={26} />
        <span className="text-headline">Referral Copilot</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        <button
          onClick={() => setSearching(true)}
          className="pressable flex h-8 items-center gap-2.5 rounded-control px-2.5 text-left text-ink-2 hover:bg-pressed hover:text-ink"
        >
          <Search size={16} className="w-4 text-ink-2" />
          <span className="flex-1">Search</span>
          <kbd className="rounded-[4px] border border-line-strong bg-canvas px-1.5 font-sans text-[0.6875rem] text-ink-3">Ctrl K</kbd>
        </button>
        <NavItem href="/" active={pathname === "/"} icon={<Sun size={16} />} label="Today" />
      </nav>

      <div className="mt-6 px-4 pb-1.5">
        <span className="text-caption font-semibold text-ink-3">Companies</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {companies?.map((c) => {
          const href = `/companies/${c.id}`;
          return (
            <NavItem
              key={c.id}
              href={href}
              active={pathname === href}
              icon={<CompanyMark name={c.name} />}
              label={c.name.replace(" (sample)", "")}
              trailing={
                c.attentionCount > 0 ? (
                  <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[0.6875rem] leading-5 font-semibold text-white tabular-nums">
                    {c.attentionCount}
                  </span>
                ) : c.isSample ? (
                  <span className="text-caption text-ink-3">sample</span>
                ) : null
              }
            />
          );
        })}
        {companies && companies.length === 0 && <p className="px-2.5 py-1.5 text-caption text-ink-3">No active jobs yet</p>}
        <button
          onClick={() => setNewJob(true)}
          className="pressable mt-1 flex h-8 items-center gap-2.5 rounded-control px-2.5 text-left text-ink-2 hover:bg-pressed hover:text-ink"
        >
          <Plus size={16} className="text-ink-3" />
          New job
        </button>
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line p-2">
        <NavItem href="/profile" active={pathname === "/profile"} icon={<CircleUserRound size={16} />} label="Profile" />
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          {me && <Avatar name={me.user.name} size={24} />}
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-2">{me?.user.email}</span>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={() => authClient.signOut().then(() => router.replace("/login"))}
            className="pressable rounded-[6px] p-1 text-ink-3 hover:bg-pressed hover:text-ink"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <NewJobSheet open={newJob} onClose={() => setNewJob(false)} />
      <SearchPalette open={searching} onClose={() => setSearching(false)} />
    </aside>
  );
}

function NavItem({ href, active, icon, label, trailing }: { href: string; active: boolean; icon: ReactNode; label: string; trailing?: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "pressable relative flex h-8 items-center gap-2.5 rounded-control px-2.5",
        active ? "font-medium text-ink" : "text-ink-2 hover:bg-pressed hover:text-ink",
      )}
    >
      {active && <motion.span layoutId="nav-active" transition={spring} className="absolute inset-0 rounded-control bg-pressed" />}
      <span className="relative flex w-4 justify-center text-ink-2">{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing && <span className="relative">{trailing}</span>}
    </Link>
  );
}

function CompanyMark({ name }: { name: string }) {
  return (
    <span className="flex size-4 items-center justify-center rounded-[4px] border border-line-strong bg-canvas text-[0.5625rem] font-bold text-ink-2">
      {name[0]?.toUpperCase()}
    </span>
  );
}
