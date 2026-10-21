"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MobileTabBar } from "./mobile-tab-bar";
import { NewJobSheet } from "./new-job-sheet";
import { SearchPalette } from "./search-palette";
import { Sidebar } from "./sidebar";

interface ShellActions {
  openSearch: () => void;
  openNewJob: () => void;
}

const ShellContext = createContext<ShellActions | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside AppShell");
  return ctx;
}

/**
 * Signed-in layout: sidebar on desktop, bottom tab bar on phones. Search and
 * "New job" live here so both navigations open the same sheets.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [searching, setSearching] = useState(false);
  const [newJob, setNewJob] = useState(false);

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

  const actions = { openSearch: () => setSearching(true), openNewJob: () => setNewJob(true) };

  return (
    <ShellContext.Provider value={actions}>
      <div className="flex h-full">
        <Sidebar />
        {/* On phones the tab bar floats over the bottom, so content gets matching bottom padding. */}
        <main className="min-w-0 flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pt-0 md:pb-0">
          {children}
        </main>
        <MobileTabBar />
      </div>
      <NewJobSheet open={newJob} onClose={() => setNewJob(false)} />
      <SearchPalette open={searching} onClose={() => setSearching(false)} />
    </ShellContext.Provider>
  );
}
