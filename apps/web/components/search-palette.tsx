"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, GraduationCap, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { OutreachState, PipelineTab } from "@rc/core";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useOutreachEvent } from "@/lib/queries";
import { Avatar, Badge, Button, Spinner, spring } from "./ui";

interface Result {
  id: string;
  version: number;
  state: OutreachState;
  tab: PipelineTab;
  isAlumni: boolean;
  contact: { id: string; fullName: string; currentTitle: string | null; linkedinUrl: string | null };
  company: { id: string; name: string };
  job: { id: string; title: string };
}

const STATUS: Record<OutreachState, { label: string; tone: "neutral" | "blue" | "green" | "orange" }> = {
  DISCOVERED: { label: "To connect", tone: "neutral" },
  CONNECTION_SENT: { label: "Request pending", tone: "orange" },
  ACCEPTED_MESSAGE_READY: { label: "Message ready", tone: "blue" },
  AWAITING_REPLY: { label: "Awaiting reply", tone: "neutral" },
  IN_CONVERSATION: { label: "In conversation", tone: "blue" },
  REFERRAL_RECEIVED: { label: "Referred you", tone: "green" },
  DECLINED: { label: "Declined", tone: "neutral" },
  NO_RESPONSE: { label: "No response", tone: "neutral" },
  DROPPED: { label: "Dropped", tone: "neutral" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
  WRONG_PERSON: { label: "Wrong person", tone: "neutral" },
  JOB_CLOSED: { label: "Job closed", tone: "neutral" },
  STOPPED: { label: "Stopped", tone: "neutral" },
};

const personHref = (r: Pick<Result, "id" | "tab" | "company" | "job">, tab: PipelineTab = r.tab) =>
  `/companies/${r.company.id}?job=${r.job.id}&tab=${tab}&person=${r.id}`;

/** Spotlight-style people search: find anyone across all jobs by name. */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const event = useOutreachEvent();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const query = q.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api<{ results: Result[] }>(`/search?q=${encodeURIComponent(query)}`).then((r) => r.results),
    enabled: open && query.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
  const results = query ? (data ?? []) : [];

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);

  const go = (r: Result, tab?: PipelineTab) => {
    onClose();
    router.push(personHref(r, tab));
  };

  const markAccepted = (r: Result) => {
    event.mutate({ person: r, type: "ACCEPTED" });
    // Their referral message is the next thing to do, so go straight to it.
    go(r, "message_ready");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-4 sm:pt-[12vh]">
          <motion.div className="fixed inset-0 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Search people"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={spring}
            className="relative w-full max-w-xl overflow-hidden rounded-sheet bg-canvas shadow-sheet"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="shrink-0 text-ink-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search people by name…"
                aria-label="Search people by name"
                className="h-14 w-full bg-transparent text-base text-ink placeholder:text-ink-3 focus:outline-none sm:text-[0.9375rem]"
              />
              {isFetching && <Spinner className="text-ink-3" />}
            </div>

            <div className="max-h-[55dvh] overflow-y-auto p-1.5 sm:max-h-[60vh]">
              {!query ? (
                <p className="px-3 py-6 text-center text-ink-3">Type a name, e.g. someone who just accepted your request on LinkedIn.</p>
              ) : results.length === 0 && !isFetching ? (
                <p className="px-3 py-6 text-center text-ink-3">No one called &ldquo;{query}&rdquo; in your jobs.</p>
              ) : (
                <ul role="listbox">
                  {results.map((r, i) => (
                    <li
                      key={r.id}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-card px-3 py-2.5", i === active && "bg-subtle")}
                    >
                      <Avatar name={r.contact.fullName} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink">{r.contact.fullName}</span>
                          {r.isAlumni && <GraduationCap size={13} className="shrink-0 text-accent" aria-label="Alum" />}
                        </div>
                        <p className="truncate text-caption text-ink-3">
                          {[r.contact.currentTitle, r.company.name, r.job.title].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {r.state === "CONNECTION_SENT" ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAccepted(r);
                          }}
                        >
                          Accepted
                        </Button>
                      ) : (
                        <Badge tone={STATUS[r.state].tone}>{STATUS[r.state].label}</Badge>
                      )}
                      {i === active && <CornerDownLeft size={14} className="hidden shrink-0 text-ink-3 sm:block" aria-hidden />}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-caption text-ink-3 sm:flex">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span>esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
