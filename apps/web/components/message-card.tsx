"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TemplateKind } from "@rc/core";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { openInNewTab, profileLink } from "@/lib/linkedin";
import { OUTREACH_EVENT_KEY, useRefreshPipeline } from "@/lib/queries";
import type { Person } from "@/lib/types";
import { useFeedback } from "./feedback";
import { Button, Spinner, spring } from "./ui";

export type DraftKind = TemplateKind | "REPLY_RESPONSE";

interface Draft {
  id: string;
  kind: string;
  body: string;
  factsUsed?: { source?: string } | null;
  source?: string;
}

const TITLES: Record<DraftKind, string> = {
  REFERRAL_REQUEST: "Referral message",
  FOLLOW_UP_1: "Follow-up",
  FOLLOW_UP_2: "Last follow-up",
  RESUME_SHARE: "Send your resume",
  THANK_YOU: "Say thank you",
  THANKS_ANYWAY: "Thank them anyway",
  REPLY_RESPONSE: "Your reply",
};

export const MESSAGE_KIND: Record<DraftKind, string> = {
  REFERRAL_REQUEST: "REFERRAL_REQUEST",
  FOLLOW_UP_1: "FOLLOW_UP",
  FOLLOW_UP_2: "FOLLOW_UP",
  RESUME_SHARE: "RESUME_SHARE",
  THANK_YOU: "THANK_YOU",
  THANKS_ANYWAY: "THANKS_ANYWAY",
  REPLY_RESPONSE: "REPLY_RESPONSE",
};

const REWRITES = [
  { style: "shorter", label: "Shorter" },
  { style: "warmer", label: "Warmer" },
  { style: "formal", label: "More formal" },
  { style: "fresh", label: "Try another version" },
] as const;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function MessageCard({
  person,
  template,
  companyName,
  optional,
  onSent,
  onDismiss,
}: {
  person: Person;
  template: DraftKind;
  companyName: string;
  optional?: boolean;
  onSent: (messageId: string) => void;
  onDismiss: (messageId: string) => void;
}) {
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();
  const { askOnReturn, toast } = useFeedback();
  const existing = person.draft?.kind === MESSAGE_KIND[template] ? person.draft : null;
  const queryKey = ["draft", person.id, template];

  // While a status change is still saving, wait before asking for a draft so the
  // server never writes two at once.
  const saving = useIsMutating({ mutationKey: OUTREACH_EVENT_KEY }) > 0;

  // The server returns the open draft of this kind, AI-writing one if needed (a few seconds).
  const { data: draft, error } = useQuery<Draft>({
    queryKey,
    queryFn: () => api<Draft>(`/outreach/${person.id}/drafts`, { method: "POST", json: { template } }),
    initialData: existing ?? undefined,
    enabled: !saving,
    staleTime: Infinity,
    retry: 1,
  });

  const [text, setText] = useState(draft?.body ?? "");
  useEffect(() => {
    if (draft) setText(draft.body);
  }, [draft]);

  const rewrite = useMutation({
    mutationFn: (style: string) => api<Draft>(`/messages/${draft!.id}/rewrite`, { method: "POST", json: { style } }),
    onSuccess: (next) => {
      qc.setQueryData(queryKey, next);
      void refresh();
    },
    onError: (e) => toast({ message: e instanceof ApiError ? e.message : "Couldn't rewrite right now" }),
  });

  if (!draft) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-line bg-subtle/60 px-4 py-3.5 text-ink-2">
        {error ? (
          "Couldn't prepare this message. Try again in a moment."
        ) : (
          <>
            <Sparkles size={15} className="animate-pulse text-accent" /> Writing your message…
          </>
        )}
      </div>
    );
  }

  const save = async () => {
    if (text.trim() === draft.body.trim()) return;
    const saved = await api<Draft>(`/messages/${draft.id}`, { method: "PATCH", json: { body: text } });
    qc.setQueryData(queryKey, saved);
  };

  const first = person.contact.fullName.split(" ")[0];
  const isSample = person.contact.source === "SAMPLE";
  const source = draft.factsUsed?.source ?? draft.source;

  const copyAndOpen = async () => {
    await save();
    await navigator.clipboard.writeText(text);
    if (isSample) {
      toast({ message: "Copied. Sample people have no LinkedIn profile." });
      return;
    }
    openInNewTab(profileLink(person.contact, companyName));
    toast({ message: "Copied. Click Message on their profile, then paste." });
    askOnReturn({ question: `Sent the message to ${first}?`, confirmLabel: "Yes, sent", onConfirm: () => onSent(draft.id) });
  };

  const count = words(text);

  return (
    <div className="rounded-card border border-line bg-canvas shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="text-caption font-semibold tracking-wide text-ink-2 uppercase">
          {TITLES[template]}
          {template === "REFERRAL_REQUEST" && person.isAlumni && <span className="font-medium text-accent normal-case"> · alumni version</span>}
        </span>
        <span className="flex items-center gap-2 text-caption text-ink-3">
          {source === "ai" ? (
            <span className="flex items-center gap-1" title="Written by AI from your verified facts, then checked">
              <Sparkles size={11} /> AI draft
            </span>
          ) : (
            <span title="The AI was unavailable, so this uses a template">Template</span>
          )}
          <span className={count > 110 ? "text-orange" : undefined}>{count} words</span>
        </span>
      </div>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          rows={3}
          disabled={rewrite.isPending}
          className={cn(
            "field-sizing-content block max-h-96 w-full resize-none bg-transparent px-4 py-2 text-base leading-relaxed text-ink transition-opacity focus:outline-none sm:text-[0.875rem]",
            rewrite.isPending && "opacity-40",
          )}
          aria-label={`${TITLES[template]} for ${person.contact.fullName}`}
        />
        {rewrite.isPending && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-ink-2">
            <Spinner /> Rewriting…
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-line px-3 py-2.5">
        <RewriteMenu disabled={rewrite.isPending} onPick={(style) => rewrite.mutate(style)} />
        <span className="flex-1" />
        {optional && (
          <Button size="sm" variant="ghost" onClick={() => onDismiss(draft.id)}>
            Dismiss
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onSent(draft.id)}>
          Mark sent
        </Button>
        <Button size="sm" variant="primary" icon={<Copy size={14} />} onClick={copyAndOpen}>
          Copy & open LinkedIn
        </Button>
      </div>
    </div>
  );
}

function RewriteMenu({ onPick, disabled }: { onPick: (style: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="ghost" icon={<Sparkles size={14} />} disabled={disabled} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Rewrite
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ ...spring, duration: 0.25 }}
            className="absolute bottom-full left-0 z-30 mb-1 min-w-44 origin-bottom-left rounded-card border border-line bg-canvas p-1 shadow-float"
          >
            {REWRITES.map((r) => (
              <button
                key={r.style}
                onClick={() => {
                  setOpen(false);
                  onPick(r.style);
                }}
                className="flex w-full items-center rounded-[6px] px-3 py-2.5 text-left text-[0.9375rem] text-ink hover:bg-hover sm:px-2.5 sm:py-1.5 sm:text-sm"
              >
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
