"use client";

import { useMutation } from "@tanstack/react-query";
import { MessageSquareText, Sparkles } from "lucide-react";
import { useState } from "react";
import type { OutreachEvent } from "@rc/core";
import { api, ApiError } from "@/lib/api";
import { useOutreachEvent, useRefreshPipeline } from "@/lib/queries";
import type { Person } from "@/lib/types";
import { Sheet } from "./sheet";
import { Button, Field, Textarea } from "./ui";

interface Reading {
  outcome: "REFERRED" | "WILL_REFER" | "RESUME_REQUESTED" | "QUESTION" | "DECLINED" | "NOT_NOW" | "OTHER";
  summary: string;
  suggestedEvent: OutreachEvent | null;
  draftId: string | null;
  draftKind: string | null;
}

const OUTCOME: Record<Reading["outcome"], string> = {
  REFERRED: "They referred you 🎉",
  WILL_REFER: "They'll refer you",
  RESUME_REQUESTED: "They asked for your resume or details",
  QUESTION: "They asked a question",
  DECLINED: "They can't refer you",
  NOT_NOW: "Not right now",
  OTHER: "Something else",
};

const EVENT_LABEL: Partial<Record<OutreachEvent, string>> = {
  REFERRED: "Mark as referred",
  RESUME_REQUESTED: "Mark as asked for resume",
  DECLINED: "Mark as said no",
  REPLIED: "Mark as replied",
};

const CHOICES: OutreachEvent[] = ["REPLIED", "RESUME_REQUESTED", "REFERRED", "DECLINED"];

/** Paste what they wrote on LinkedIn; the AI reads it, suggests the status and drafts an answer. */
export function ReplySheet({ person, open, onClose }: { person: Person; open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const event = useOutreachEvent();
  const refresh = useRefreshPipeline();
  const first = person.contact.fullName.split(" ")[0];

  const read = useMutation({
    mutationFn: () => api<Reading>(`/outreach/${person.id}/reply`, { method: "POST", json: { text } }),
    onSuccess: (r) => {
      setReading(r);
      void refresh();
    },
  });

  const close = () => {
    setText("");
    setReading(null);
    read.reset();
    onClose();
  };

  const apply = (type: OutreachEvent | null) => {
    if (type) event.mutate({ person, type });
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={reading ? OUTCOME[reading.outcome] : `${first}'s reply`}
      description={reading ? reading.summary : `Copy their message from LinkedIn and paste it here. The app reads it and drafts your answer.`}
      footer={
        reading ? (
          <>
            <Button variant="ghost" onClick={() => apply(null)}>
              Keep status
            </Button>
            {reading.suggestedEvent && (
              <Button variant="primary" onClick={() => apply(reading.suggestedEvent)}>
                {EVENT_LABEL[reading.suggestedEvent] ?? "Update status"}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" icon={<Sparkles size={15} />} loading={read.isPending} disabled={!text.trim()} onClick={() => read.mutate()}>
              Read reply
            </Button>
          </>
        )
      }
    >
      {reading ? (
        <div className="flex flex-col gap-4">
          <blockquote className="rounded-card bg-subtle px-4 py-3 text-ink-2">
            <MessageSquareText size={14} className="mb-1.5 text-ink-3" />
            {text}
          </blockquote>
          {reading.draftId && <p className="text-ink-2">Your answer is drafted on {first}&apos;s row, ready to copy.</p>}
          <div>
            <p className="mb-2 text-caption font-semibold text-ink-3">Not quite right? Pick what happened:</p>
            <div className="flex flex-wrap gap-1.5">
              {CHOICES.filter((c) => c !== reading.suggestedEvent).map((c) => (
                <Button key={c} size="sm" onClick={() => apply(c)}>
                  {EVENT_LABEL[c]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Field label="Their message" error={read.error instanceof ApiError ? read.error.message : read.error ? "Couldn't read that. Try again." : undefined}>
          {(id) => <Textarea id={id} autoFocus placeholder="Paste their reply" value={text} onChange={(e) => setText(e.target.value)} className="min-h-32" />}
        </Field>
      )}
    </Sheet>
  );
}
