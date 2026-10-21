"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, ClipboardPaste, GraduationCap, KeyRound, RefreshCw, Search, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useRefreshPipeline } from "@/lib/queries";
import { Button, Spinner, spring } from "./ui";

interface Run {
  id: string;
  status: "RUNNING" | "DONE" | "FAILED";
  progress: {
    step: string;
    added?: number;
    reserves?: number;
    alumniFound?: number;
    university?: string | null;
    rejections?: Record<string, number>;
  } | null;
  candidatesFound: number;
  candidatesVerified: number;
  error: string | null;
  createdAt: string;
}

const STEPS = [
  { key: "ANALYZING", label: "Reading the job" },
  { key: "SEARCHING", label: "Searching for people" },
  { key: "VERIFYING", label: "Checking each source" },
  { key: "RANKING", label: "Ranking who's most likely to refer" },
  { key: "SAVING", label: "Saving your top 15" },
];

export function useDiscovery(jobId: string) {
  return useQuery({
    queryKey: ["discovery", jobId],
    queryFn: () => api<{ run: Run | null; searchConfigured: boolean }>(`/jobs/${jobId}/discovery`),
    // Poll only while a search is running.
    refetchInterval: (q) => (q.state.data?.run?.status === "RUNNING" ? 1500 : false),
  });
}

export function useStartDiscovery(jobId: string) {
  const { refetch } = useDiscovery(jobId);
  return useMutation({
    mutationFn: () => api<Run>(`/jobs/${jobId}/discover`, { method: "POST" }),
    onSuccess: () => refetch(),
  });
}

export function DiscoveryPanel({
  jobId,
  hasPeople,
  companyName,
  onPaste,
}: {
  jobId: string;
  hasPeople: boolean;
  companyName: string;
  /** Opens the "Add people from LinkedIn" sheet. */
  onPaste: () => void;
}) {
  const { data } = useDiscovery(jobId);
  const start = useStartDiscovery(jobId);
  const refresh = useRefreshPipeline();
  const run = data?.run ?? null;
  const wasRunning = useRef(false);

  // When a run finishes, load the new people.
  useEffect(() => {
    if (run?.status === "RUNNING") wasRunning.current = true;
    else if (wasRunning.current) {
      wasRunning.current = false;
      void refresh();
    }
  }, [run?.status, refresh]);

  if (!data) return null;

  if (!data.searchConfigured) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <Icon tone="orange">
            <KeyRound size={18} />
          </Icon>
          <div>
            <p className="text-headline">People search isn&apos;t set up yet</p>
            <p className="mt-1 text-ink-2">
              Create a free key at <span className="font-medium text-ink">serper.dev</span> (2,500 free searches, no card), add it to your{" "}
              <code className="rounded bg-subtle px-1 text-[0.8125rem]">.env</code> as <code className="rounded bg-subtle px-1 text-[0.8125rem]">SERPER_API_KEY</code>, and restart the app.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const error = start.error instanceof ApiError ? start.error.message : run?.status === "FAILED" ? run.error : null;

  if (run?.status === "RUNNING" || start.isPending) {
    const current = Math.max(0, STEPS.findIndex((s) => s.key === run?.progress?.step));
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Icon tone="blue">
            <Sparkles size={18} />
          </Icon>
          <div>
            <p className="text-headline">Finding people who&apos;ll refer you</p>
            <p className="text-ink-2">This takes about a minute. You can keep using the app.</p>
          </div>
        </div>
        <ol className="mt-5 flex flex-col gap-2.5 pl-1">
          {STEPS.map((s, i) => (
            <li key={s.key} className={cn("flex items-center gap-3", i > current ? "text-ink-3" : "text-ink")}>
              <span className="flex size-5 items-center justify-center">
                {i < current ? <Check size={15} className="text-green" /> : i === current ? <Spinner className="text-accent" /> : <span className="size-1.5 rounded-full bg-line-strong" />}
              </span>
              {s.label}
              {s.key === "VERIFYING" && i < current && run && run.candidatesFound > 0 && (
                <span className="text-caption text-ink-3">
                  {run.candidatesVerified} of {run.candidatesFound} results confirmed
                </span>
              )}
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  if (!run || error) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Icon tone="blue">
            <Search size={18} />
          </Icon>
          <div className="min-w-0 flex-1">
            <p className="text-headline">{hasPeople ? "Find more people" : "Find the 15 best people to ask"}</p>
            <p className="text-ink-2">
              {error ?? "Alumni first, then engineers in the same area and campus recruiters. Every person is checked against a real search result."}
            </p>
          </div>
          <Button variant="primary" icon={<Sparkles size={15} />} loading={start.isPending} onClick={() => start.mutate()}>
            {error ? "Try again" : "Find people"}
          </Button>
        </div>
      </Card>
    );
  }

  const added = run.progress?.added ?? 0;
  const alumni = run.progress?.alumniFound;
  const college = run.progress?.university;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col gap-3">
        {college && alumni === 0 && (
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Icon tone="blue">
                <GraduationCap size={18} />
              </Icon>
              <div className="min-w-0 flex-1">
                <p className="text-headline">No {college} alumni found in web search</p>
                <p className="text-ink-2">
                  Either there are very few at {companyName}, or their profiles don&apos;t show it publicly. LinkedIn&apos;s own People filter is the most accurate way to check.
                </p>
              </div>
              <Button variant="primary" icon={<ClipboardPaste size={15} />} onClick={onPaste}>
                Check on LinkedIn
              </Button>
            </div>
          </Card>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-caption text-ink-3">
            {added > 0
              ? `Found ${added} people${alumni ? ` · ${alumni} alumni` : ""}${run.progress?.reserves ? ` (+${run.progress.reserves} in reserve)` : ""} from ${run.candidatesFound} search results · ${new Date(run.createdAt).toLocaleDateString()}`
              : `No new people found in ${run.candidatesFound} search results. Try adding from LinkedIn, the job description, or a different company name.`}
          </p>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => start.mutate()} loading={start.isPending}>
            Search again
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-card border border-line bg-canvas px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">{children}</section>;
}

function Icon({ tone, children }: { tone: "blue" | "orange"; children: React.ReactNode }) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", tone === "blue" ? "bg-accent-soft text-accent" : "bg-orange-soft text-orange")}>
      {children}
    </div>
  );
}
