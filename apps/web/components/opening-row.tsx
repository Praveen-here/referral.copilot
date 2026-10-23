"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { openInNewTab } from "@/lib/linkedin";
import { keys } from "@/lib/queries";
import type { Opening, Openings } from "@/lib/types";
import { useFeedback } from "./feedback";
import { Badge, Button, spring } from "./ui";

const SOURCE: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workday: "Workday",
  amazon: "amazon.jobs",
  debugwithshubham: "via debugwithshubham",
};

export function ago(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** One opening: what it is, how fresh, where it's from, and one click to start finding people there. */
export function OpeningRow({ opening }: { opening: Opening }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useFeedback();

  const add = useMutation({
    mutationFn: () => api<{ jobId: string; companyId: string }>(`/openings/${opening.id}/add`, { method: "POST" }),
    onSuccess: async ({ jobId, companyId }) => {
      await Promise.all([qc.invalidateQueries({ queryKey: keys.sidebar }), qc.invalidateQueries({ queryKey: keys.openings })]);
      router.push(`/companies/${companyId}?job=${jobId}`);
    },
    onError: (e) => toast({ message: e instanceof ApiError ? e.message : "Could not add this opening" }),
  });

  // Gone from the list on press; the server catches up, and Undo brings it back.
  const dismiss = () => {
    qc.setQueryData<Openings>(keys.openings, (o) => o && { ...o, items: o.items.filter((i) => i.id !== opening.id) });
    api(`/openings/${opening.id}/dismiss`, { method: "POST" }).catch(() => qc.invalidateQueries({ queryKey: keys.openings }));
    toast({
      message: `Hid ${opening.companyName}: ${opening.title}`,
      action: {
        label: "Undo",
        onClick: () => api(`/openings/${opening.id}/dismiss`, { method: "DELETE" }).then(() => qc.invalidateQueries({ queryKey: keys.openings })),
      },
    });
  };

  const when = opening.postedAt ? `Posted ${ago(opening.postedAt)}` : `Found ${ago(opening.firstSeenAt)}`;
  const facts = [opening.companyName, opening.location, opening.salary && `₹${opening.salary.replace(/^₹/, "")}`].filter(Boolean).join(" · ");

  return (
    <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring} className="flex flex-col gap-3 rounded-card px-3 py-3 hover:bg-hover sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-line-strong bg-canvas text-[0.8125rem] font-bold text-ink-2">
          {opening.companyName[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-ink">{opening.title}</p>
          <p className="truncate text-ink-2">{facts}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
            {opening.isNew && <Badge tone="blue">New</Badge>}
            {opening.level === "INTERN" ? <Badge tone="purple">Intern</Badge> : opening.level === "ENTRY" ? <Badge tone="green">Entry level</Badge> : null}
            {opening.jobId && <Badge tone="green">Added</Badge>}
            <span>
              {when} · {SOURCE[opening.source] ?? opening.source}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 pl-11 sm:pl-0">
        {!opening.jobId && (
          <Button size="sm" variant="primary" loading={add.isPending} onClick={() => add.mutate()}>
            Find people
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={<ExternalLink size={14} />} onClick={() => openInNewTab(opening.url)}>
          Apply page
        </Button>
        <Button size="sm" variant="ghost" aria-label="Hide this opening" title="Hide this opening" icon={<X size={15} />} onClick={dismiss} />
      </div>
    </motion.li>
  );
}
