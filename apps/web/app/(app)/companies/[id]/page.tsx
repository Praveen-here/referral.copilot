"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardPaste, ExternalLink, Layers, Pencil, Search, Trash2, Unlink, UserPlus } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { conversationGroup, MAX_COMBINED_ROLES, type PipelineTab } from "@rc/core";
import { AddPersonSheet } from "@/components/add-person-sheet";
import { CombineRolesSheet } from "@/components/combine-roles-sheet";
import { EditRoleSheet } from "@/components/edit-role-sheet";
import { DiscoveryPanel } from "@/components/discovery-panel";
import { useFeedback } from "@/components/feedback";
import { PastePeopleSheet } from "@/components/paste-people-sheet";
import { PersonRow } from "@/components/person-row";
import { Badge, Button, EmptyState, SectionHeader, Segmented, Spinner, spring } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { keys, useJob, useRefreshPipeline } from "@/lib/queries";
import type { Job, Person, Role } from "@/lib/types";

const TABS: { value: PipelineTab; label: string; hint: string }[] = [
  { value: "to_connect", label: "To connect", hint: "Open their LinkedIn, send a connection request, then mark it sent." },
  { value: "pending", label: "Pending", hint: "Waiting for them to accept. Check their profile: a Message button means they accepted." },
  { value: "message_ready", label: "Message ready", hint: "They accepted. Copy the message, paste it in LinkedIn, then mark it sent." },
  { value: "awaiting_reply", label: "Awaiting reply", hint: "Nothing to check. When someone replies on LinkedIn, tap They replied and paste it." },
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
  // Combined roles show as their lead job; a link to a combined role opens the lead.
  const activeJobs = company?.jobs.filter((j) => j.status !== "ARCHIVED" && !j.mergedIntoId) ?? [];
  const linkedJob = search.get("job");
  const jobId = (linkedJob && company?.jobs.find((j) => j.id === linkedJob)?.mergedIntoId) || linkedJob || activeJobs[0]?.id || null;
  const combinedCount = (leadId: string) => 1 + (company?.jobs.filter((j) => j.mergedIntoId === leadId).length ?? 0);
  const { data: detail } = useJob(jobId);
  const [tab, setTab] = useState<PipelineTab>(() => (search.get("tab") as PipelineTab | null) ?? "to_connect");
  const [adding, setAdding] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [combining, setCombining] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const { toast } = useFeedback();
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

  const separate = useMutation({
    mutationFn: (leadId: string) => api<{ jobIds: string[] }>(`/jobs/${leadId}/separate`, { method: "POST" }),
    onSuccess: async ({ jobIds }, leadId) => {
      const reload = () => Promise.all([refresh(), qc.invalidateQueries({ queryKey: keys.company(id) })]);
      await reload();
      const others = jobIds.filter((j) => j !== leadId);
      toast({
        message: "Roles separated",
        action: { label: "Undo", onClick: () => api(`/jobs/${leadId}/combine`, { method: "POST", json: { jobIds: others } }).then(reload) },
      });
    },
  });

  const deleteRole = useMutation({
    mutationFn: (role: Role) => api(`/jobs/${role.id}`, { method: "DELETE" }),
    onSuccess: async (_d, role) => {
      const wasLast = (company?.jobs.length ?? 0) <= 1;
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: keys.company(id) })]);
      // The shown job is gone: go to the company's next job (a combined group keeps its other roles), or home.
      if (wasLast) router.replace("/");
      else if (role.id === jobId) router.replace(`/companies/${id}`);
      toast({ message: `Deleted ${role.title}` });
    },
    onError: (e) => toast({ message: e instanceof ApiError ? e.message : "Couldn't delete the role" }),
  });

  const confirmDelete = (role: Role) => {
    if (window.confirm(`Delete the ${role.title} role and the people found for it? This can't be undone.`)) deleteRole.mutate(role);
  };

  if (!company) return <Loading />;

  const job = detail?.job;
  const people = detail?.people.filter((p) => p.tab === tab && !(tab === "to_connect" && p.isReserve)) ?? [];
  const reserves = tab === "to_connect" ? (detail?.people.filter((p) => p.tab === "to_connect" && p.isReserve) ?? []) : [];
  const hint = TABS.find((t) => t.value === tab)!.hint;
  const name = company.name.replace(" (sample)", "");
  const roles: Role[] = detail?.roles ?? [];
  const isCombined = roles.length > 1;
  // Roles that could join this one: other open jobs here that aren't combined with anything.
  const combinable = activeJobs.filter((j) => j.id !== jobId && combinedCount(j.id) === 1 && j.status !== "CLOSED");
  const canCombine = Boolean(job) && combinable.length > 0 && roles.length < MAX_COMBINED_ROLES;

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
            options={activeJobs.map((j) => ({ value: j.id, label: combinedCount(j.id) > 1 ? `${j.title} +${combinedCount(j.id) - 1}` : j.title }))}
          />
        </div>
      )}

      {job && (
        <section className="mt-8 rounded-card border border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              {isCombined ? (
                <>
                  <h2 className="text-title">{roles.length} roles, one message</h2>
                  <p className="mt-0.5 text-ink-2">Everyone below is asked about all of them.</p>
                </>
              ) : (
                <>
                  <h2 className="text-title">{job.title}</h2>
                  <p className="mt-0.5 text-ink-2">
                    {[job.externalJobId && `Job ID ${job.externalJobId}`, job.location, `added ${new Date(job.createdAt).toLocaleDateString()}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {canCombine && (
                <Button size="sm" variant="ghost" icon={<Layers size={14} />} onClick={() => setCombining(true)}>
                  {isCombined ? "Add role" : "Combine roles"}
                </Button>
              )}
              {isCombined && (
                <Button size="sm" variant="ghost" icon={<Unlink size={14} />} loading={separate.isPending} onClick={() => separate.mutate(job.id)}>
                  Separate
                </Button>
              )}
              {!isCombined && job.url && (
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
              {!isCombined && <RoleActions role={job} onEdit={setEditing} onDelete={confirmDelete} deleting={deleteRole.isPending} />}
            </div>
          </div>
          {isCombined && (
            <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
              {roles.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{r.title}</p>
                    <p className="truncate text-caption text-ink-3">
                      {[r.externalJobId ? `Job ID ${r.externalJobId}` : "No job ID", r.location, r.status === "CLOSED" && "Closed, left out of new messages"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {r.url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ExternalLink size={14} />}
                        aria-label={`Open the ${r.title} posting`}
                        onClick={() => window.open(r.url!, "_blank", "noopener")}
                      >
                        <span className="hidden sm:inline">Posting</span>
                      </Button>
                    )}
                    <RoleActions role={r} onEdit={setEditing} onDelete={confirmDelete} deleting={deleteRole.isPending && deleteRole.variables?.id === r.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
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
          <DiscoveryPanel jobId={job.id} hasPeople={(detail?.people.length ?? 0) > 0} companyName={name} onPaste={() => setPasting(true)} />
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
            <div className="flex gap-1.5">
              {!company.isSample && (
                <Button size="sm" icon={<ClipboardPaste size={14} />} onClick={() => setPasting(true)}>
                  From LinkedIn
                </Button>
              )}
              <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setAdding(true)}>
                Add person
              </Button>
            </div>
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
              {people.length > 0 && tab === "awaiting_reply" ? (
                <Conversations people={people} companyName={name} highlight={highlight} />
              ) : people.length > 0 ? (
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

      <EditRoleSheet companyId={id} role={editing} onClose={() => setEditing(null)} />
      {job && (
        <CombineRolesSheet
          companyId={id}
          lead={job}
          current={roles.length ? roles : [job]}
          candidates={combinable}
          open={combining}
          onClose={() => setCombining(false)}
        />
      )}
      {jobId && <AddPersonSheet jobId={jobId} open={adding} onClose={() => setAdding(false)} />}
      {jobId && <PastePeopleSheet jobId={jobId} companyName={name} open={pasting} onClose={() => setPasting(false)} />}
    </div>
  );
}

/** Edit and delete for one role: quiet icon buttons, labelled for screen readers. */
function RoleActions({ role, onEdit, onDelete, deleting }: { role: Role; onEdit: (r: Role) => void; onDelete: (r: Role) => void; deleting: boolean }) {
  return (
    <>
      <Button size="sm" variant="ghost" icon={<Pencil size={14} />} aria-label={`Edit the ${role.title} role`} title="Edit role" onClick={() => onEdit(role)} />
      <Button
        size="sm"
        variant="ghost"
        icon={<Trash2 size={14} />}
        loading={deleting}
        aria-label={`Delete the ${role.title} role`}
        title="Delete role"
        onClick={() => onDelete(role)}
      />
    </>
  );
}

const lastActivity = (p: Person) => Math.max(p.lastSentAt ? Date.parse(p.lastSentAt) : 0, p.lastReplyAt ? Date.parse(p.lastReplyAt) : 0);

/**
 * Awaiting reply, grouped so nothing piles up: people who replied first, then those
 * we're waiting on, and threads silent for 2 weeks folded away (display only, state untouched).
 */
function Conversations({ people, companyName, highlight }: { people: Person[]; companyName: string; highlight: string | null }) {
  const now = new Date();
  const groups = { talking: [] as Person[], waiting: [] as Person[], quiet: [] as Person[] };
  for (const p of people) {
    const g = conversationGroup(
      { state: p.state, lastSentAt: p.lastSentAt ? new Date(p.lastSentAt) : null, lastReplyAt: p.lastReplyAt ? new Date(p.lastReplyAt) : null },
      now,
    );
    groups[g].push(p);
  }
  for (const list of Object.values(groups)) list.sort((a, b) => lastActivity(b) - lastActivity(a));

  const list = (items: Person[]) => (
    <ul className="-mx-3 flex flex-col">
      {items.map((p) => (
        <PersonRow key={p.id} person={p} companyName={companyName} highlighted={highlight === p.id} />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-7">
      {groups.talking.length > 0 && (
        <section>
          <SectionHeader title="Talking" count={groups.talking.length} />
          {list(groups.talking)}
        </section>
      )}
      {groups.waiting.length > 0 && (
        <section>
          <SectionHeader title="Waiting" count={groups.waiting.length} />
          {list(groups.waiting)}
        </section>
      )}
      {groups.quiet.length > 0 && (
        // A highlighted person (from search) opens the fold so they can be seen.
        <details className="group" open={groups.quiet.some((p) => p.id === highlight) || undefined}>
          <summary className="cursor-pointer list-none px-1 text-caption font-semibold text-ink-3 hover:text-ink-2">
            Gone quiet · {groups.quiet.length}
            <span className="ml-1.5 font-normal">No word for 2 weeks</span>
          </summary>
          <div className="mt-2">{list(groups.quiet)}</div>
        </details>
      )}
    </div>
  );
}
