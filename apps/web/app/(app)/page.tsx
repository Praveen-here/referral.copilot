"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShell } from "@/components/app-shell";
import { OpeningRow } from "@/components/opening-row";
import { PersonRow } from "@/components/person-row";
import { Button, EmptyState, SectionHeader, Spinner, spring } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe, useOpenings, useRefreshPipeline, useSidebar, useToday } from "@/lib/queries";
import type { Person } from "@/lib/types";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function TodayPage() {
  const { data: me } = useMe();
  const { data: today, isLoading } = useToday();
  const { data: companies } = useSidebar();
  const { openNewJob } = useShell();

  const sections: { title: string; hint: string; items: Person[] }[] = today
    ? [
        { title: "Messages ready", hint: "They accepted. Copy the message and send it.", items: today.messageReady },
        { title: "Clean up", hint: "Old invites and quiet threads worth closing.", items: today.cleanup },
      ].filter((s) => s.items.length > 0)
    : [];
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const firstName = me?.user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-10 sm:pt-14 sm:pb-24">
      <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <p className="text-ink-3">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 text-display">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-[0.9375rem] text-ink-2">
          {isLoading ? " " : total === 0 ? "Nothing needs you right now." : `${total} ${total === 1 ? "thing needs" : "things need"} your attention.`}
        </p>
        {today && <BudgetBar sentToday={today.budget.sentToday} dailyCap={today.budget.dailyCap} sentWeek={today.budget.sentWeek} weeklyCap={today.budget.weeklyCap} />}
      </motion.header>

      {me && !me.onboarded && <OnboardingCard />}

      {isLoading ? (
        <div className="mt-16 flex justify-center text-ink-3">
          <Spinner />
        </div>
      ) : total > 0 ? (
        <div className="mt-10 flex flex-col gap-9">
          {sections.map((s) => (
            <section key={s.title}>
              <SectionHeader title={s.title} count={s.items.length} />
              <p className="-mt-1 mb-2 px-1 text-caption text-ink-3">{s.hint}</p>
              <ul className="-mx-3 flex flex-col divide-y divide-line sm:divide-y-0">
                {s.items.map((p) => (
                  <PersonRow key={p.id} person={p} companyName={p.job?.companyName ?? ""} showJob />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : companies && companies.length === 0 ? (
        <div className="mt-12 rounded-sheet border border-line">
          <EmptyState
            icon={<Sparkles size={20} />}
            title="Start with a job"
            body="Add an internship or job you want a referral for. The people most likely to refer you will show up here."
            action={
              <div className="flex flex-col items-center gap-3">
                <Button variant="primary" onClick={openNewJob}>
                  Add your first job
                </Button>
                <SampleDataButton />
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-12 rounded-sheet border border-line">
          <EmptyState icon={<Sun size={20} />} title="All caught up" body="Messages ready to send and old invites worth closing show up here." />
        </div>
      )}

      {!isLoading && <NewOpenings />}
    </div>
  );
}

/** The newest roles from company job boards; the full list lives on /openings. */
function NewOpenings() {
  const { data } = useOpenings();
  if (!data || (data.counts.all === 0 && !data.scanning)) return null;
  const fresh = data.items.filter((o) => o.isNew && o.level !== "UNSPECIFIED" && !o.jobId).slice(0, 3);
  return (
    <section className="mt-10">
      <SectionHeader title="New openings" count={data.counts.new}>
        <Link href="/openings" className="pressable flex items-center gap-1 rounded-control px-1.5 py-0.5 text-caption font-medium text-accent hover:bg-accent-soft">
          See all {data.counts.all} <ArrowRight size={13} />
        </Link>
      </SectionHeader>
      {fresh.length > 0 ? (
        <>
          <p className="-mt-1 mb-2 px-1 text-caption text-ink-3">Just posted. Referrals help most in a role&apos;s first days.</p>
          <ul className="-mx-3 flex flex-col">
            {fresh.map((o) => (
              <OpeningRow key={o.id} opening={o} />
            ))}
          </ul>
        </>
      ) : (
        <p className="px-1 text-caption text-ink-3">
          {data.scanning ? "Checking job boards for new roles…" : "Nothing new since the last check. Older openings are on the Openings page."}
        </p>
      )}
    </section>
  );
}

function BudgetBar({ sentToday, dailyCap, sentWeek, weeklyCap }: { sentToday: number; dailyCap: number; sentWeek: number; weeklyCap: number }) {
  const left = Math.max(0, Math.min(dailyCap - sentToday, weeklyCap - sentWeek));
  const pct = Math.min(100, (sentToday / dailyCap) * 100);
  return (
    <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-subtle sm:w-40">
        <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={spring} />
      </div>
      <span className="text-caption text-ink-3">
        {left} of {dailyCap} connection requests left today · {sentWeek}/{weeklyCap} this week
      </span>
    </div>
  );
}

function OnboardingCard() {
  return (
    <Link
      href="/profile"
      className="pressable group mt-8 flex items-center gap-4 rounded-card border border-line bg-canvas p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-subtle"
    >
      <div className="flex size-10 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
        <Sparkles size={18} />
      </div>
      <div className="flex-1">
        <p className="text-headline">Set up your profile first</p>
        <p className="text-ink-2">Your college and degree let the app spot alumni and personalize every message.</p>
      </div>
      <ArrowRight size={18} className="text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SampleDataButton() {
  const router = useRouter();
  const refresh = useRefreshPipeline();
  const load = useMutation({
    mutationFn: () => api<{ companyId: string; jobId: string }>("/sample-data", { method: "POST" }),
    onSuccess: async ({ companyId, jobId }) => {
      await refresh();
      router.push(`/companies/${companyId}?job=${jobId}`);
    },
  });
  return (
    <Button variant="ghost" size="sm" loading={load.isPending} onClick={() => load.mutate()}>
      Or explore with sample data
    </Button>
  );
}
