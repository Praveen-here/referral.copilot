"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ExternalLink, GraduationCap, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OutreachEvent, TemplateKind } from "@rc/core";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { openInNewTab, profileLink } from "@/lib/linkedin";
import { useOutreachEvent, useRefreshPipeline } from "@/lib/queries";
import type { Person } from "@/lib/types";
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

const OPTIONAL_DRAFTS = ["THANK_YOU", "THANKS_ANYWAY", "RESUME_SHARE"] as const;

/** Which draft this person needs right now, and what "sent" means for it. */
function draftFor(p: Person): { template: TemplateKind; sentEvent: OutreachEvent | null; optional: boolean } | null {
  if (p.state === "ACCEPTED_MESSAGE_READY") return { template: "REFERRAL_REQUEST", sentEvent: "MESSAGE_SENT", optional: false };
  if (p.attention?.kind === "FOLLOWUP_DUE") {
    return { template: p.attention.followupNumber === 1 ? "FOLLOW_UP_1" : "FOLLOW_UP_2", sentEvent: "FOLLOWUP_SENT", optional: false };
  }
  const kind = p.draft?.kind as (typeof OPTIONAL_DRAFTS)[number] | undefined;
  if (kind && OPTIONAL_DRAFTS.includes(kind)) {
    // A resume reply moves the conversation forward; thank-yous don't change state.
    return { template: kind, sentEvent: kind === "RESUME_SHARE" ? "MESSAGE_SENT" : null, optional: true };
  }
  return null;
}

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
  const draft = draftFor(person);
  const first = person.contact.fullName.split(" ")[0]!;
  const isSample = person.contact.source === "SAMPLE";

  const fire = (type: OutreachEvent) => event.mutate({ person, type });

  const openProfile = (afterReturn?: { question: string; confirmLabel: string; type: OutreachEvent }) => {
    openInNewTab(profileLink(person.contact, companyName));
    if (afterReturn) askOnReturn({ ...afterReturn, onConfirm: () => fire(afterReturn.type) });
  };

  const createDraft = (template: TemplateKind) => api(`/outreach/${person.id}/drafts`, { method: "POST", json: { template } }).then(refresh);

  const result = RESULT[person.state];
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
      <div className="flex items-start gap-3">
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

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Actions person={person} first={first} busy={event.isPending} fire={fire} openProfile={openProfile} isSample={isSample} createDraft={createDraft} />
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
            <div className="pt-3 pl-12">
              <MessageCard
                person={person}
                template={draft.template}
                companyName={companyName}
                optional={draft.optional}
                onSent={(messageId) => (draft.sentEvent ? fire(draft.sentEvent) : api(`/messages/${messageId}/sent`, { method: "POST" }).then(refresh))}
                onDismiss={(messageId) => api(`/messages/${messageId}/discard`, { method: "POST" }).then(refresh)}
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
      return `${p.followupCount ? `Follow-up ${p.followupCount} sent` : "Messaged"} ${daysAgo(p.lastSentAt)}`;
    case "IN_CONVERSATION":
      return "In conversation";
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
}: {
  person: Person;
  first: string;
  busy: boolean;
  fire: (t: OutreachEvent) => void;
  openProfile: (afterReturn?: AfterReturn) => void;
  isSample: boolean;
  createDraft: (t: TemplateKind) => void;
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
      return (
        <>
          {linkedIn()}
          {person.attention?.kind === "NO_RESPONSE_SUGGESTED" ? (
            <Button size="sm" onClick={() => fire("NO_RESPONSE")} disabled={busy}>
              Close: no response
            </Button>
          ) : (
            <Button size="sm" onClick={() => fire("NO_REPLY_YET")} disabled={busy}>
              No reply yet
            </Button>
          )}
          <Menu
            label="Replied?"
            items={[
              { label: "Replied", onClick: () => fire("REPLIED") },
              { label: "Asked for my resume", onClick: () => fire("RESUME_REQUESTED") },
              { label: "Referred me 🎉", onClick: () => fire("REFERRED") },
              { label: "Said no", onClick: () => fire("DECLINED") },
              { label: "Close: no response", onClick: () => fire("NO_RESPONSE") },
            ]}
          />
        </>
      );
    case "IN_CONVERSATION":
      return (
        <>
          {linkedIn()}
          <Button size="sm" onClick={() => fire("MESSAGE_SENT")} disabled={busy}>
            I replied
          </Button>
          <Menu
            label="Update"
            items={[
              { label: "Draft: send my resume", onClick: () => createDraft("RESUME_SHARE") },
              { label: "Referred me 🎉", onClick: () => fire("REFERRED") },
              { label: "Said no", onClick: () => fire("DECLINED") },
            ]}
          />
        </>
      );
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

  const visible = items.filter(Boolean) as Exclude<MenuItem, false>[];
  return (
    <div ref={ref} className="relative">
      {label ? (
        <Button size="sm" variant="primary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {label}
        </Button>
      ) : (
        <button
          aria-label="More actions"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="pressable flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
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
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 z-30 mt-1 min-w-52 rounded-card border border-line bg-canvas p-1 shadow-float"
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
      className={cn("flex w-full items-center rounded-[6px] px-2.5 py-1.5 text-left text-sm hover:bg-hover", danger ? "text-red" : "text-ink")}
    >
      {children}
    </button>
  );
}
