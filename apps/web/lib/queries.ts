"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { tabForState, transition, type OutreachEvent } from "@rc/core";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback";
import { api, ApiError } from "./api";
import { authClient } from "./auth-client";
import type { Budget, JobDetail, Me, Person, SidebarCompany, Today } from "./types";

export const keys = {
  me: ["me"] as const,
  sidebar: ["sidebar"] as const,
  today: ["today"] as const,
  company: (id: string) => ["company", id] as const,
  job: (id: string) => ["job", id] as const,
  budget: ["budget"] as const,
};

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<Me>("/me") });
export const useSidebar = () =>
  useQuery({ queryKey: keys.sidebar, queryFn: () => api<{ companies: SidebarCompany[] }>("/sidebar").then((r) => r.companies) });
export const useToday = () => useQuery({ queryKey: keys.today, queryFn: () => api<Today>("/today") });
export const useJob = (id: string | null) =>
  useQuery({ queryKey: keys.job(id ?? ""), queryFn: () => api<JobDetail>(`/jobs/${id}`), enabled: Boolean(id) });
export const useBudget = () => useQuery({ queryKey: keys.budget, queryFn: () => api<Budget>("/invite-budget") });

/** Invalidates every view that shows pipeline state. */
export function useRefreshPipeline() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["job"] }),
      qc.invalidateQueries({ queryKey: keys.today }),
      qc.invalidateQueries({ queryKey: keys.sidebar }),
      qc.invalidateQueries({ queryKey: keys.budget }),
    ]);
}

const DONE_LABEL: Partial<Record<OutreachEvent, string>> = {
  REQUEST_SENT: "Marked request sent",
  ALREADY_CONNECTED: "Marked as connected",
  ACCEPTED: "Accepted. Referral message is ready",
  NOT_ACCEPTED_YET: "Will remind you to check again",
  MESSAGE_SENT: "Marked message sent",
  NO_REPLY_YET: "Will remind you to check again",
  FOLLOWUP_SENT: "Marked follow-up sent",
  REPLIED: "Marked as replied",
  RESUME_REQUESTED: "Resume message is ready",
  REFERRED: "Referral received. Nice!",
  DECLINED: "Marked as declined",
  NO_RESPONSE: "Closed as no response",
  WITHDRAW: "Dropped",
  SKIP: "Skipped",
  WRONG_PERSON: "Removed",
  REOPEN: "Reopened",
};

/** Signs out and returns to the login page (sidebar on desktop, profile page on phones). */
export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();
  return () =>
    authClient.signOut().then(() => {
      qc.clear();
      router.replace("/login");
    });
}

export const OUTREACH_EVENT_KEY = ["outreach-event"] as const;

/** Moves a person to their next state in every cached view, before the server answers. */
function applyOptimistic(qc: QueryClient, personId: string, type: OutreachEvent) {
  const move = (p: Person): Person | null => {
    if (p.id !== personId) return p;
    const r = transition(
      {
        state: p.state,
        nextCheckAt: p.nextCheckAt ? new Date(p.nextCheckAt) : null,
        followupCount: p.followupCount,
        lastSentAt: p.lastSentAt ? new Date(p.lastSentAt) : null,
      },
      type,
    );
    if (!r.ok) return p;
    return {
      ...p,
      state: r.next.state,
      tab: tabForState(r.next.state),
      followupCount: r.next.followupCount,
      lastSentAt: r.next.lastSentAt?.toISOString() ?? null,
      nextCheckAt: r.next.nextCheckAt?.toISOString() ?? null,
      stateChangedAt: new Date().toISOString(),
      attention: r.next.state === "ACCEPTED_MESSAGE_READY" ? { kind: "MESSAGE_READY" } : null,
      draft: null,
    };
  };

  qc.setQueriesData<JobDetail>({ queryKey: ["job"] }, (detail) => {
    if (!detail) return detail;
    const people = detail.people.map((p) => move(p)!);
    const counts = { to_connect: 0, pending: 0, message_ready: 0, awaiting_reply: 0, done: 0 };
    for (const p of people) if (!p.isReserve || p.tab !== "to_connect") counts[p.tab]++;
    return { ...detail, people, counts };
  });
  // On Today the item has been dealt with; the refetch re-adds it if something new is due.
  qc.setQueryData<Today>(keys.today, (t) =>
    t && {
      ...t,
      messageReady: t.messageReady.filter((p) => p.id !== personId),
      followUps: t.followUps.filter((p) => p.id !== personId),
      checkReplies: t.checkReplies.filter((p) => p.id !== personId),
      checkAccepted: t.checkAccepted.filter((p) => p.id !== personId),
      cleanup: t.cleanup.filter((p) => p.id !== personId),
    },
  );
}

/**
 * Applies a pipeline event. The UI moves instantly (apple-design: respond on
 * press), the server confirms in the background, and an Undo toast offers
 * forgiveness instead of a confirmation dialog.
 */
export function useOutreachEvent() {
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();
  const { toast } = useFeedback();
  return useMutation({
    mutationKey: OUTREACH_EVENT_KEY,
    mutationFn: ({ person, type }: { person: { id: string; version: number; contact: { fullName: string } }; type: OutreachEvent }) =>
      api(`/outreach/${person.id}/events`, { method: "POST", json: { type, expectedVersion: person.version } }),
    onMutate: async ({ person, type }) => {
      await Promise.all([qc.cancelQueries({ queryKey: ["job"] }), qc.cancelQueries({ queryKey: keys.today })]);
      applyOptimistic(qc, person.id, type);
    },
    onSuccess: async (_data, { person, type }) => {
      await refresh();
      toast({
        message: `${person.contact.fullName.split(" ")[0]}: ${DONE_LABEL[type] ?? "Updated"}`,
        action: {
          label: "Undo",
          onClick: () => api(`/outreach/${person.id}/undo`, { method: "POST" }).then(refresh),
        },
      });
    },
    onError: async (error) => {
      await refresh();
      toast({ message: error instanceof ApiError ? error.message : "Something went wrong" });
    },
  });
}
