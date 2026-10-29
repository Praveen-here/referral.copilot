"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ExternalLink, GraduationCap, MessageCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OutreachEvent, TemplateKind } from "@rc/core";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { openInNewTab, profileLink } from "@/lib/linkedin";
import { useOutreachEvent, useRefreshPipeline } from "@/lib/queries";
import { CONVERSING, draftFor } from "@/lib/drafts";
import type { Person } from "@/lib/types";
import { useShell } from "./app-shell";
import { useFeedback } from "./feedback";
import { MessageCard } from "./message-card";
import { Avatar, Badge, Button, spring } from "./ui";

const daysAgo = (iso: string | null) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

const RESULT: Partial<Record<Person["state"], { label: string; tone: "green" | "neutral" }>> = {
  REFERRAL_RECEIVED: { label: "Referred you", tone: "green" },
  DECLINED: { label: "Declined", tone: "neutral" },
  NO_RESPONSE: { label: "No response", tone: "neutral" },
  DROPPED: { label: "Dropped", tone: "neutral" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
  WRONG_PERSON: { label: "Wrong person", tone: "neutral" },
  JOB_CLOSED: { label: "Job closed", tone: "neutral" },
  STOPPED: { label: "Stopped", tone: "neutral" },
};

export function PersonRow({
  person,
  companyName,
  showJob,
  highlighted,
}: {
  person: Person;
  companyName: string;
  showJob?: boolean;
  /** Briefly marks the row someone navigated to from search. */
  highlighted?: boolean;
}) {
  const event = useOutreachEvent();
  const refresh = useRefreshPipeline();
  const { askOnReturn } = useFeedback();
  const { openChat } = useShell();
  const [nudging, setNudging] = useState(false);
  const draft = draftFor(person, { nudging });
  const first = person.contact.fullName.split(" ")[0]!;
  const isSample = person.contact.source === "SAMPLE";

  const fire = (type: OutreachEvent) => event.mutate({ person, type });

  const openProfile = (afterReturn?: { question: string; confirmLabel: string; type: OutreachEvent }) => {
    openInNewTab(profileLink(person.contact, companyName));
    if (afterReturn) askOnReturn({ ...afterReturn, onConfirm: () => fire(afterReturn.type) });
  };

  const createDraft = (template: TemplateKind) => api(`/outreach/${person.id}/drafts`, { method: "POST", json: { template } }).then(refresh);

  const result = RESULT[person.state];
  const compactActions = person.state === "ACCEPTED_MESSAGE_READY" || Boolean(result);
  // An answer drafted in the chat is waiting to be sent.
  const answerReady = person.readyToSend && CONVERSING.includes(person.state);
  // Connection and school details only matter while deciding whom to contact.
  const reasons = person.reasons.filter(
    (r) => !r.endsWith(" alum") && (person.tab === "to_connect" || (r !== "Already connected" && r !== "School unknown")),
  );
  const meta = [statusLine(person), ...reasons].filter(Boolean).join(" · ");

  return (
    <motion.li
      id={`person-${person.id}`}
      layout="position"
      transition={spring}
      className={cn(
        "scroll-mt-24 rounded-card px-3 py-3 transition-[background-color,box-shadow] duration-500",
        highlighted ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgba(0,113,227,0.25)]" : "hover:bg-[#fafafa]",
      )}
    >
      {/* Wraps on phones: the action buttons drop to their own line under the name. */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2.5 sm:flex-nowrap">
        <Avatar name={person.contact.fullName} size={36} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-headline">{person.contact.fullName}</span>
            {person.isAlumni && (
              <Badge tone="blue">
                <GraduationCap size={12} strokeWidth={2.25} />
                Alum
              </Badge>
            )}
            {person.contact.isConnected && person.tab === "to_connect" && <Badge tone="green">Connected</Badge>}
            {person.matchScore !== null && person.tab === "to_connect" && (
              <span
                title="How likely this person is to be able and willing to refer you"
                className={cn("text-caption font-medium tabular-nums", person.matchScore >= 75 ? "text-accent" : "text-ink-3")}
              >
                {person.matchScore}% match
              </span>
            )}
            {result && <Badge tone={result.tone}>{result.label}</Badge>}
            {answerReady && <Badge tone="blue">Answer ready</Badge>}
          </div>
          <p className="truncate text-ink-2">
            {person.contact.currentTitle ?? "Role unknown"}
            {showJob && person.job && (
              <>
                {" · "}
                <Link href={`/companies/${person.job.companyId}?job=${person.job.id}`} className="hover:text-ink hover:underline">
                  {person.job.companyName}
                </Link>
              </>
            )}
          </p>
          {meta && <p className="mt-0.5 text-caption text-ink-3">{meta}</p>}
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-nowrap sm:pt-0.5 sm:pl-0",
            // A lone "⋯" or "Reopen" stays beside the name; full button sets get their own line on phones.
            compactActions ? "ml-auto" : "w-full pl-12",
          )}
        >
          <Actions
            person={person}
            first={first}
            busy={event.isPending}
            fire={fire}
            openProfile={openProfile}
            isSample={isSample}
            createDraft={createDraft}
            openChat={() => openChat(person.id)}
            answerReady={answerReady}
            nudge={!nudging && person.attention?.kind === "FOLLOWUP_DUE" && person.draft?.kind !== "FOLLOW_UP" ? () => setNudging(true) : undefined}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {draft && (
          <motion.div
            key={draft.template}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="pt-3 sm:pl-12">
              <MessageCard
                person={person}
                template={draft.template}
                companyName={companyName}
                optional={draft.optional}
                onSent={(messageId) => (draft.sentEvent ? fire(draft.sentEvent) : api(`/messages/${messageId}/sent`, { method: "POST" }).then(refresh))}
                onDismiss={(messageId) => {
                  setNudging(false);
                  void api(`/messages/${messageId}/discard`, { method: "POST" }).then(refresh);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function statusLine(p: Person): string | null {
  switch (p.state) {
    case "CONNECTION_SENT":
      return `Request sent ${daysAgo(p.stateChangedAt)}`;
    case "AWAITING_REPLY":
      if (p.lastReplyAt) return `You replied ${daysAgo(p.lastSentAt)}`;
      return `${p.followupCount ? `Follow-up ${p.followupCount} sent` : "Messaged"} ${daysAgo(p.lastSentAt)}`;
    case "IN_CONVERSATION":
      return p.lastReplyAt ? `Replied ${daysAgo(p.lastReplyAt)}` : "In conversation";
    case "ACCEPTED_MESSAGE_READY":
      return "Accepted · message ready";
    default:
      return null;
  }
}

type AfterReturn = { question: string; confirmLabel: string; type: OutreachEvent };

function Actions({
  person,
  first,
  busy,
  fire,
  openProfile,
  isSample,
  createDraft,
  openChat,
  answerReady,
  nudge,
}: {
  person: Person;
  first: string;
  busy: boolean;
  fire: (t: OutreachEvent) => void;
  openProfile: (afterReturn?: AfterReturn) => void;
  isSample: boolean;
  createDraft: (t: TemplateKind) => void;
  openChat: () => void;
  answerReady: boolean;
  /** Shown after 5 quiet days: opens a short template follow-up (no AI). */
  nudge?: () => void;
}) {
  const linkedIn = (after?: AfterReturn) => (
    <Button
      size="sm"
      variant="ghost"
      icon={<ExternalLink size={14} />}
      onClick={() => openProfile(after)}
      disabled={isSample}
      title={isSample ? "Sample person" : "Open LinkedIn in a new tab"}
    >
      LinkedIn
    </Button>
  );

  switch (person.state) {
    case "DISCOVERED":
      return (
        <>
          {linkedIn({ question: `Sent a connection request to ${first}?`, confirmLabel: "Yes, request sent", type: "REQUEST_SENT" })}
          <Button size="sm" icon={<Check size={14} />} onClick={() => fire(person.contact.isConnected ? "ALREADY_CONNECTED" : "REQUEST_SENT")} disabled={busy}>
            {person.contact.isConnected ? "Write message" : "Request sent"}
          </Button>
          <Menu
            items={[
              !person.contact.isConnected && { label: "Already connected", onClick: () => fire("ALREADY_CONNECTED") },
              { label: "Skip", onClick: () => fire("SKIP") },
              { label: "Wrong person / left company", onClick: () => fire("WRONG_PERSON"), danger: true },
            ]}
          />
        </>
      );
    case "CONNECTION_SENT":
      return (
        <>
          {linkedIn({ question: `Did ${first} accept?`, confirmLabel: "Yes, accepted", type: "ACCEPTED" })}
          <Button size="sm" variant="primary" onClick={() => fire("ACCEPTED")} disabled={busy}>
            Accepted
          </Button>
          <Menu
            items={[
              { label: "Not accepted yet", onClick: () => fire("NOT_ACCEPTED_YET") },
              { label: "Withdraw & drop", onClick: () => fire("WITHDRAW") },
              { label: "Wrong person / left company", onClick: () => fire("WRONG_PERSON"), danger: true },
            ]}
          />
        </>
      );
    case "ACCEPTED_MESSAGE_READY":
      return <Menu items={[{ label: "Skip", onClick: () => fire("SKIP") }]} />;
    case "AWAITING_REPLY":
    case "IN_CONVERSATION": {
      // Nothing to check: when they reply on LinkedIn, open the chat and paste it.
      const talking = person.state === "IN_CONVERSATION" || Boolean(person.lastReplyAt);
      return (
        <>
          {linkedIn()}
          {nudge && (
            <Button size="sm" variant="ghost" onClick={nudge} title="No reply for a few days: a short follow-up">
              Nudge
            </Button>
          )}
          {person.attention?.kind === "NO_RESPONSE_SUGGESTED" && (
            <Button size="sm" onClick={() => fire("NO_RESPONSE")} disabled={busy}>
              Close: no response
            </Button>
          )}
          {/* Blue chat icon marks the conversation; the "Answer ready" badge carries the urgency. */}
          <Button size="sm" icon={<MessageCircle size={14} className="text-accent" />} onClick={openChat}>
            {talking ? "Open chat" : "They replied"}
          </Button>
          <Menu
            items={[
              person.state === "IN_CONVERSATION" && { label: "I sent a reply", onClick: () => fire("MESSAGE_SENT") },
              person.state === "IN_CONVERSATION" && { label: "Draft: send my resume", onClick: () => createDraft("RESUME_SHARE") },
              person.state === "AWAITING_REPLY" && { label: "Asked for my resume", onClick: () => fire("RESUME_REQUESTED") },
              { label: "Referred me 🎉", onClick: () => fire("REFERRED") },
              { label: "Said no", onClick: () => fire("DECLINED") },
              person.state === "AWAITING_REPLY" && { label: "Close: no response", onClick: () => fire("NO_RESPONSE") },
            ]}
          />
        </>
      );
    }
    default:
      return ["SKIPPED", "DROPPED", "NO_RESPONSE", "STOPPED", "WRONG_PERSON"].includes(person.state) ? (
        <Button size="sm" variant="ghost" onClick={() => fire("REOPEN")} disabled={busy}>
          Reopen
        </Button>
      ) : null;
  }
}

type MenuItem = { label: string; onClick: () => void; danger?: boolean } | false;

function Menu({ items, label }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const [openLeft, setOpenLeft] = useState(true);
  const toggle = () => {
    // 220px ≈ menu width plus margin: open rightwards only if that fits on screen.
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setOpenLeft(rect.left + 220 > window.innerWidth);
    setOpen((v) => !v);
  };

  const visible = items.filter(Boolean) as Exclude<MenuItem, false>[];
  return (
    <div ref={ref} className="relative">
      {label ? (
        <Button size="sm" variant="primary" onClick={toggle} aria-expanded={open}>
          {label}
        </Button>
      ) : (
        <button
          aria-label="More actions"
          aria-expanded={open}
          onClick={toggle}
          className="pressable flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink sm:size-7"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ ...spring, duration: 0.25 }}
            // Opens towards whichever side has room (on phones the button may sit at either edge).
            className={cn(
              "absolute z-30 mt-1 min-w-52 rounded-card border border-line bg-canvas p-1 shadow-float",
              openLeft ? "right-0 origin-top-right" : "left-0 origin-top-left",
            )}
          >
            {visible.map((item) => (
              <MenuButton
                key={item.label}
                danger={item.danger}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </MenuButton>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center rounded-[6px] px-3 py-2.5 text-left text-[0.9375rem] hover:bg-hover sm:px-2.5 sm:py-1.5 sm:text-sm", danger ? "text-red" : "text-ink")}
    >
      {children}
    </button>
  );
}
