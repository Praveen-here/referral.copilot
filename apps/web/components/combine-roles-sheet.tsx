"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MAX_COMBINED_ROLES } from "@rc/core";
import { Check } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { keys, useRefreshPipeline } from "@/lib/queries";
import type { Job, Role } from "@/lib/types";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/**
 * Pick other roles at the same company to ask about in the same message
 * (the user's own HPE message: two openings, both job IDs, one ask).
 */
export function CombineRolesSheet({
  companyId,
  lead,
  current,
  candidates,
  open,
  onClose,
}: {
  companyId: string;
  lead: Job;
  /** Roles already in the group, lead included. */
  current: Role[];
  candidates: Job[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();
  const room = MAX_COMBINED_ROLES - current.length;
  // null = untouched: with a single other role, it starts ticked (one tap to combine).
  const [choice, setChoice] = useState<string[] | null>(null);
  const picked = choice ?? (candidates.length === 1 && room > 0 ? [candidates[0]!.id] : []);
  const close = () => {
    setChoice(null);
    onClose();
  };

  const combine = useMutation({
    mutationFn: () => api(`/jobs/${lead.id}/combine`, { method: "POST", json: { jobIds: picked } }),
    onSuccess: async () => {
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: keys.company(companyId) })]);
      close();
    },
  });

  const toggle = (id: string) => setChoice(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < room ? [...picked, id] : picked);

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Ask about several roles"
      description={`One message to each person, with every role's job ID and link. Up to ${MAX_COMBINED_ROLES} roles.`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" loading={combine.isPending} disabled={picked.length === 0} onClick={() => combine.mutate()}>
            Combine {picked.length + current.length} roles
          </Button>
        </>
      }
    >
      <p className="px-1 text-caption font-semibold text-ink-3">Already in the message</p>
      <ul className="mt-1.5 flex flex-col">
        {current.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-control px-3 py-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <Check size={12} strokeWidth={3} />
            </span>
            <RoleText role={r} />
          </li>
        ))}
      </ul>

      <p className="mt-5 px-1 text-caption font-semibold text-ink-3">Add</p>
      <ul className="mt-1.5 flex flex-col">
        {candidates.map((r) => {
          const on = picked.includes(r.id);
          const full = !on && picked.length >= room;
          return (
            <li key={r.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={full}
                onClick={() => toggle(r.id)}
                className="pressable flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left hover:bg-hover active:bg-pressed disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-100",
                    on ? "border-accent bg-accent text-white" : "border-line-strong bg-canvas",
                  )}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <RoleText role={r} />
              </button>
            </li>
          );
        })}
      </ul>

      {combine.error && (
        <p className="mt-4 px-1 text-caption text-red">{combine.error instanceof ApiError ? combine.error.message : "Couldn't combine them. Try again."}</p>
      )}
      <p className="mt-5 px-1 text-caption text-ink-3">
        People found for any of these roles show in one list. Messages you haven&apos;t edited are rewritten to ask about all of them. You can separate them again any time.
      </p>
    </Sheet>
  );
}

function RoleText({ role }: { role: Role }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-ink">{role.title}</span>
      <span className="block truncate text-caption text-ink-3">
        {[role.externalJobId && `Job ID ${role.externalJobId}`, role.location].filter(Boolean).join(" · ") || "No job ID"}
      </span>
    </span>
  );
}
