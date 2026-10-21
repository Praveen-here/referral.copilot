"use client";

import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import type { TemplateKind } from "@rc/core";
import { api } from "@/lib/api";
import { openInNewTab, profileLink } from "@/lib/linkedin";
import { OUTREACH_EVENT_KEY } from "@/lib/queries";
import type { Person } from "@/lib/types";
import { useFeedback } from "./feedback";
import { Button, Spinner } from "./ui";

interface Draft {
  id: string;
  kind: string;
  body: string;
}

const TITLES: Record<TemplateKind, string> = {
  REFERRAL_REQUEST: "Referral message",
  FOLLOW_UP_1: "Follow-up",
  FOLLOW_UP_2: "Last follow-up",
  RESUME_SHARE: "Send your resume",
  THANK_YOU: "Say thank you",
  THANKS_ANYWAY: "Thank them anyway",
};

const MESSAGE_KIND: Record<TemplateKind, string> = {
  REFERRAL_REQUEST: "REFERRAL_REQUEST",
  FOLLOW_UP_1: "FOLLOW_UP",
  FOLLOW_UP_2: "FOLLOW_UP",
  RESUME_SHARE: "RESUME_SHARE",
  THANK_YOU: "THANK_YOU",
  THANKS_ANYWAY: "THANKS_ANYWAY",
};

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
  template: TemplateKind;
  companyName: string;
  optional?: boolean;
  onSent: (messageId: string) => void;
  onDismiss: (messageId: string) => void;
}) {
  const qc = useQueryClient();
  const { askOnReturn, toast } = useFeedback();
  const existing = person.draft?.kind === MESSAGE_KIND[template] ? person.draft : null;

  // While a status change is still saving, the server may be creating this
  // draft itself; wait so the two requests can't produce duplicates.
  const saving = useIsMutating({ mutationKey: OUTREACH_EVENT_KEY }) > 0;

  // The server returns the open draft of this kind, creating it if needed.
  const { data: draft } = useQuery({
    queryKey: ["draft", person.id, template],
    queryFn: () => api<Draft>(`/outreach/${person.id}/drafts`, { method: "POST", json: { template } }),
    initialData: existing ?? undefined,
    enabled: !saving,
    staleTime: Infinity,
  });

  const [text, setText] = useState(draft?.body ?? "");
  useEffect(() => {
    if (draft) setText(draft.body);
  }, [draft]);

  if (!draft) {
    return (
      <div className="flex items-center gap-2 rounded-card bg-subtle px-4 py-3 text-ink-2">
        <Spinner /> Preparing message…
      </div>
    );
  }

  const save = async () => {
    if (text.trim() === draft.body.trim()) return;
    const saved = await api<Draft>(`/messages/${draft.id}`, { method: "PATCH", json: { body: text } });
    qc.setQueryData(["draft", person.id, template], saved);
  };

  const first = person.contact.fullName.split(" ")[0];
  const isSample = person.contact.source === "SAMPLE";

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
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-caption font-semibold tracking-wide text-ink-2 uppercase">
          {TITLES[template]}
          {template === "REFERRAL_REQUEST" && person.isAlumni && <span className="font-medium text-accent normal-case"> · alumni version</span>}
        </span>
        <span className={count > 110 ? "text-caption text-orange" : "text-caption text-ink-3"}>{count} words</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        rows={3}
        className="field-sizing-content block max-h-96 w-full resize-none bg-transparent px-4 py-2 text-base leading-relaxed sm:text-[0.875rem] text-ink focus:outline-none"
        aria-label={`${TITLES[template]} for ${person.contact.fullName}`}
      />
      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-line px-3 py-2.5">
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
