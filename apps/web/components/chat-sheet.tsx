"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { OutreachEvent } from "@rc/core";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { draftFor } from "@/lib/drafts";
import { useOutreachEvent, useRefreshPipeline } from "@/lib/queries";
import type { Person } from "@/lib/types";
import { MessageCard } from "./message-card";
import { Sheet } from "./sheet";
import { Button, Spinner, spring } from "./ui";

interface ThreadMessage {
  id: string;
  kind: string;
  status: "SENT" | "DRAFT";
  body: string;
  at: string;
  fromThem: boolean;
  source: string;
}

interface Reading {
  outcome: "REFERRED" | "WILL_REFER" | "RESUME_REQUESTED" | "QUESTION" | "DECLINED" | "NOT_NOW" | "OTHER";
  summary: string;
  suggestedEvent: OutreachEvent | null;
  draftId: string | null;
}

const OUTCOME: Record<Reading["outcome"], string> = {
  REFERRED: "They referred you 🎉",
  WILL_REFER: "They'll refer you",
  RESUME_REQUESTED: "They asked for your resume",
  QUESTION: "They asked a question",
  DECLINED: "They can't refer you",
  NOT_NOW: "Not right now",
  OTHER: "They replied",
};

const EVENT_LABEL: Partial<Record<OutreachEvent, string>> = {
  REFERRED: "Mark as referred",
  RESUME_REQUESTED: "Mark as asked for resume",
  DECLINED: "Mark as said no",
  REPLIED: "Mark as replied",
};

const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const sendKey = (id: string) => ["thread-send", id];

/**
 * One person's thread: what you sent, what they said, and the drafted answer.
 * Paste their reply at the bottom; the AI reads it and drafts your answer in place.
 * Nothing is sent from here: you copy the draft and send it on LinkedIn yourself.
 * Hosted by the app shell and loaded by id, so it stays open while the person moves between lists.
 */
export function ChatSheet({ outreachId, onClose }: { outreachId: string | null; onClose: () => void }) {
  // Keeps the last person on screen while the sheet animates out.
  const [shownId, setShownId] = useState(outreachId);
  const [reading, setReading] = useState<Reading | null>(null);
  if (outreachId && outreachId !== shownId) {
    setShownId(outreachId);
    setReading(null);
  }

  const { data } = useQuery({
    queryKey: ["thread", shownId],
    queryFn: () => api<{ person: Person; messages: ThreadMessage[] }>(`/outreach/${shownId}/messages`),
    enabled: Boolean(shownId),
  });
  const person = data?.person.id === shownId ? data.person : null;

  return (
    <Sheet
      open={outreachId !== null}
      onClose={onClose}
      title={person?.contact.fullName ?? "Conversation"}
      description={person ? [person.contact.currentTitle, person.job?.companyName].filter(Boolean).join(" · ") : undefined}
      className="h-[88dvh] sm:h-[78vh] sm:max-w-xl"
      footer={person && <Composer key={person.id} person={person} onRead={setReading} />}
    >
      {person && data ? (
        <Thread person={person} thread={data.messages} reading={reading} clearReading={() => setReading(null)} />
      ) : (
        <div className="flex h-full items-center justify-center text-ink-3">
          <Spinner />
        </div>
      )}
    </Sheet>
  );
}

/** Paste box at the bottom: their reply (the AI reads it) or, switched, what you sent yourself. */
function Composer({ person, onRead }: { person: Person; onRead: (r: Reading | null) => void }) {
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();
  const first = person.contact.fullName.split(" ")[0]!;
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"theirs" | "mine">("theirs");

  const send = useMutation({
    mutationKey: sendKey(person.id),
    mutationFn: () =>
      mode === "theirs"
        ? api<Reading>(`/outreach/${person.id}/reply`, { method: "POST", json: { text } })
        : api(`/outreach/${person.id}/messages`, { method: "POST", json: { text } }).then(() => null),
    onSuccess: async (r) => {
      setText("");
      setMode("theirs");
      onRead(r);
      // A new reply rewrites the open draft, so the card must fetch it again.
      qc.removeQueries({ queryKey: ["draft", person.id] });
      await refresh();
    },
  });

  return (
    <div className="flex w-full flex-col gap-2">
      {send.error && <p className="text-caption text-red">{send.error instanceof ApiError ? send.error.message : "Couldn't save that. Try again."}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send.mutate();
          }}
          rows={1}
          placeholder={mode === "theirs" ? `Paste ${first}'s reply` : "Paste what you sent on LinkedIn"}
          aria-label={mode === "theirs" ? `${first}'s reply` : "Your message"}
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-[20px] border border-line-strong bg-canvas px-4 py-2.5 text-base leading-snug text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none sm:min-h-9 sm:py-2 sm:text-sm"
        />
        <button
          aria-label={mode === "theirs" ? "Read reply" : "Add to conversation"}
          disabled={!text.trim() || send.isPending}
          onClick={() => send.mutate()}
          className="pressable flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-35 sm:size-9"
        >
          {send.isPending ? <Spinner /> : <ArrowUp size={18} strokeWidth={2.5} />}
        </button>
      </div>
      <button onClick={() => setMode((m) => (m === "theirs" ? "mine" : "theirs"))} className="self-start px-1 text-caption text-ink-3 hover:text-ink-2">
        {mode === "theirs" ? "I sent something else on LinkedIn" : `Back to pasting ${first}'s reply`}
      </button>
    </div>
  );
}

/** The messages, the AI's reading of the latest reply, and the drafted answer. */
function Thread({ person, thread, reading, clearReading }: { person: Person; thread: ThreadMessage[]; reading: Reading | null; clearReading: () => void }) {
  const refresh = useRefreshPipeline();
  const event = useOutreachEvent();
  const reduce = useReducedMotion();
  const first = person.contact.fullName.split(" ")[0]!;
  const working = useIsMutating({ mutationKey: sendKey(person.id) }) > 0;

  // Keep the newest message in view, like any chat.
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [thread, reading, working, person.draft?.id, reduce]);

  const sent = thread.filter((m) => m.status === "SENT");
  // The draft card follows the same rules as the row (what it is, and what "sent" means).
  const draft = draftFor(person, { inChat: true });

  return (
    <div className="flex min-h-full flex-col justify-end gap-2.5">
      {sent.length === 0 && <p className="py-8 text-center text-ink-3">Nothing here yet. Paste {first}&apos;s reply below.</p>}

      {sent.map((m, i) => (
        <div key={m.id} className="flex flex-col">
          {(i === 0 || when(m.at) !== when(sent[i - 1]!.at)) && <p className="my-2 text-center text-caption text-ink-3">{when(m.at)}</p>}
          <Bubble fromThem={m.fromThem} body={m.body} />
        </div>
      ))}

      <AnimatePresence initial={false}>
        {working && (
          <motion.p
            key="working"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 self-center py-2 text-caption text-ink-2"
          >
            <Sparkles size={13} className="animate-pulse text-accent" /> Saving and drafting your answer…
          </motion.p>
        )}
        {reading && !working && (
          <motion.div
            key="reading"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="my-1 flex flex-wrap items-center justify-center gap-2 rounded-card bg-subtle px-3 py-2.5 text-center"
          >
            <span className="text-[0.875rem] font-medium text-ink">{OUTCOME[reading.outcome]}</span>
            {reading.suggestedEvent && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  event.mutate({ person, type: reading.suggestedEvent! });
                  clearReading();
                }}
              >
                {EVENT_LABEL[reading.suggestedEvent] ?? "Update status"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearReading}>
              {reading.suggestedEvent ? "Keep status" : "OK"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {draft && !working && (
        <div className="mt-1 ml-6 sm:ml-12">
          <MessageCard
            key={person.draft?.id ?? draft.template}
            person={person}
            template={draft.template}
            companyName={person.job?.companyName ?? ""}
            optional={draft.optional}
            onSent={async (messageId) => {
              if (draft.sentEvent) event.mutate({ person, type: draft.sentEvent });
              else await api(`/messages/${messageId}/sent`, { method: "POST" }).then(refresh);
            }}
            onDismiss={(messageId) => api(`/messages/${messageId}/discard`, { method: "POST" }).then(refresh)}
          />
        </div>
      )}
      <div ref={bottom} />
    </div>
  );
}

function Bubble({ fromThem, body }: { fromThem: boolean; body: string }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-[18px] px-3.5 py-2 text-[0.9375rem] leading-snug break-words whitespace-pre-wrap sm:text-[0.875rem]",
        fromThem ? "self-start rounded-bl-[6px] bg-subtle text-ink" : "self-end rounded-br-[6px] bg-accent-soft text-ink",
      )}
    >
      {body}
    </div>
  );
}
