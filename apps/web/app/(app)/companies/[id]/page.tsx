"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Search, Trash2, UserPlus } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { PipelineTab } from "@rc/core";
import { AddPersonSheet } from "@/components/add-person-sheet";
import { DiscoveryPanel } from "@/components/discovery-panel";
import { PersonRow } from "@/components/person-row";
import { Badge, Button, EmptyState, Segmented, Spinner, spring } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, useJob, useRefreshPipeline } from "@/lib/queries";
import type { Job } from "@/lib/types";

const TABS: { value: PipelineTab; label: string; hint: string }[] = [
  { value: "to_connect", label: "To connect", hint: "Open their LinkedIn, send a connection request, then mark it sent." },
  { value: "pending", label: "Pending", hint: "Waiting for them to accept. Check their profile: a Message button means they accepted." },
  { value: "message_ready", label: "Message ready", hint: "They accepted. Copy the message, paste it in LinkedIn, then mark it sent." },
  { value: "awaiting_reply", label: "Awaiting reply", hint: "Open the chat on LinkedIn and record what happened." },
  { value: "done", label: "Done", hint: "Referrals, closed threads and people you skipped." },
];

export default function CompanyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Company />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-ink-3">
      <Spinner />
    </div>
  );
}

function Company() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();

  const { data: company } = useQuery({
    queryKey: keys.company(id),
    queryFn: () => api<{ id: string; name: string; isSample: boolean; jobs: Job[] }>(`/companies/${id}`),
  });
  const activeJobs = company?.jobs.filter((j) => j.status !== "ARCHIVED") ?? [];
  const jobId = search.get("job") ?? activeJobs[0]?.id ?? null;
  const { data: detail } = useJob(jobId);
  const [tab, setTab] = useState<PipelineTab>(() => (search.get("tab") as PipelineTab | null) ?? "to_connect");
  const [adding, setAdding] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Links from search (?tab=…&person=…) open the right tab and bring that person into view.
  const linkedTab = search.get("tab") as PipelineTab | null;
  const linkedPerson = search.get("person");
  useEffect(() => {
    if (linkedTab) setTab(linkedTab);
  }, [linkedTab]);
  const handledLink = useRef<string | null>(null);
  useEffect(() => {
    const key = `${linkedPerson}:${linkedTab}`;
    if (!linkedPerson || handledLink.current === key || !detail?.people.some((p) => p.id === linkedPerson)) return;
    handledLink.current = key; // once per link, not on every background refetch
    setHighlight(linkedPerson);
    const frame = requestAnimationFrame(() =>
      document.getElementById(`person-${linkedPerson}`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    const timer = setTimeout(() => setHighlight(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [linkedPerson, linkedTab, detail]);

  const remove = useMutation({
    mutationFn: () => api(company?.isSample ? "/sample-data" : `/companies/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refresh();
      router.replace("/");
    },
  });

  const setStatus = useMutation({
    mutationFn: (status: Job["status"]) => api(`/jobs/${jobId}`, { method: "PATCH", json: { status } }),
    onSuccess: () => Promise.all([refresh(), qc.invalidateQueries({ queryKey: keys.company(id) })]),
  });

  if (!company) return <Loading />;

  const job = detail?.job;
  const people = detail?.people.filter((p) => p.tab === tab && !(tab === "to_connect" && p.isReserve)) ?? [];
  const reserves = tab === "to_connect" ? (detail?.people.filter((p) => p.tab === "to_connect" && p.isReserve) ?? []) : [];
  const hint = TABS.find((t) => t.value === tab)!.hint;
  const name = company.name.replace(" (sample)", "");

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16 sm:px-10 sm:pt-12 sm:pb-24">
      <header className="flex items-start justify-between gap-3 sm:gap-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-line bg-subtle text-lg font-bold text-ink-2 sm:size-12">{name[0]}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-display break-words">{name}</h1>
              {company.isSample && <Badge>Sample</Badge>}
            </div>
            <p className="mt-0.5 text-ink-2">
              {activeJobs.length} {activeJobs.length === 1 ? "job" : "jobs"} · {detail?.people.filter((p) => !p.isReserve).length ?? 0} people
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          loading={remove.isPending}
          aria-label={company.isSample ? "Remove sample" : "Delete company"}
          onClick={() => {
            if (window.confirm(company.isSample ? "Remove the sample data?" : `Delete ${name} and everything tracked for it?`)) remove.mutate();
          }}
        >
          {/* Icon only on phones, where the title needs the width. */}
          <span className="hidden sm:inline">{company.isSample ? "Remove sample" : "Delete"}</span>
        </Button>
      </header>

      {activeJobs.length > 1 && (
        <div className="mt-8">
          <Segmented
            layoutId="job-switch"
            value={jobId ?? ""}
            onChange={(v) => router.replace(`/companies/${id}?job=${v}`)}
            options={activeJobs.map((j) => ({ value: j.id, label: j.title }))}
          />
        </div>
      )}

      {job && (
        <section className="mt-8 rounded-card border border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-title">{job.title}</h2>
              <p className="mt-0.5 text-ink-2">
                {[job.externalJobId && `Job ID ${job.externalJobId}`, job.location, `added ${new Date(job.createdAt).toLocaleDateString()}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {job.url && (
                <Button size="sm" variant="ghost" icon={<ExternalLink size={14} />} onClick={() => window.open(job.url!, "_blank", "noopener")}>
                  Posting
                </Button>
              )}
              <select
                aria-label="Job status"
                value={job.status}
                onChange={(e) => setStatus.mutate(e.target.value as Job["status"])}
                className="h-7 rounded-control border border-line-strong bg-canvas px-2 text-[0.8125rem] text-ink hover:bg-subtle"
              >
                <option value="ACTIVE">Active</option>
                <option value="APPLIED">Applied</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          {job.analysis && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-caption">
              <p className="text-ink-2">
                <span className="text-ink-3">Looking for </span>
                {job.analysis.recommendedContactTitles.join(" · ")}
              </p>
              {job.analysis.requiredSkills.length > 0 && (
                <p className="text-ink-2">
                  <span className="text-ink-3">Skills </span>
                  {job.analysis.requiredSkills.join(" · ")}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {job && !company.isSample && (
        <div className="mt-6">
          <DiscoveryPanel jobId={job.id} hasPeople={(detail?.people.length ?? 0) > 0} />
        </div>
      )}

      {detail && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              layoutId="pipeline-tab"
              value={tab}
              onChange={setTab}
              options={TABS.map((t) => ({ value: t.value, label: t.label, count: detail.counts[t.value] }))}
            />
            <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setAdding(true)}>
              Add person
            </Button>
          </div>
          <p className="mt-3 px-1 text-caption text-ink-3">{hint}</p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...spring, duration: 0.2 }}
              className="mt-3"
            >
              {people.length > 0 ? (
                <ul className="-mx-3 flex flex-col">
                  {people.map((p) => (
                    <PersonRow key={p.id} person={p} companyName={name} highlighted={highlight === p.id} />
                  ))}
                </ul>
              ) : tab === "to_connect" && detail.people.length === 0 ? (
                <div className="rounded-card border border-dashed border-line-strong">
                  <EmptyState
                    icon={<Search size={20} />}
                    title="No one here yet"
                    body="People appear here when the search finishes. You can also add someone you found yourself."
                    action={
                      <Button icon={<UserPlus size={14} />} onClick={() => setAdding(true)}>
                        Add a person
                      </Button>
                    }
                  />
                </div>
              ) : (
                <p className="rounded-card bg-subtle px-4 py-6 text-center text-ink-3">Nobody here right now.</p>
              )}

              {reserves.length > 0 && (
                <details className="group mt-6">
                  <summary className="cursor-pointer list-none px-1 text-caption font-semibold text-ink-3 hover:text-ink-2">
                    Reserves · {reserves.length}
                  </summary>
                  <ul className="-mx-3 mt-2 flex flex-col">
                    {reserves.map((p) => (
                      <PersonRow key={p.id} person={p} companyName={name} />
                    ))}
                  </ul>
                </details>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {jobId && <AddPersonSheet jobId={jobId} open={adding} onClose={() => setAdding(false)} />}
    </div>
  );
}
