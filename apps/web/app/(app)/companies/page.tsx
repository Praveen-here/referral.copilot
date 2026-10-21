"use client";

import { Building2, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useShell } from "@/components/app-shell";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { useSidebar } from "@/lib/queries";

/** All active companies: the phone's equivalent of the desktop sidebar list. */
export default function CompaniesPage() {
  const { data: companies } = useSidebar();
  const { openNewJob } = useShell();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-10 sm:pt-14">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-display">Companies</h1>
        <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={openNewJob}>
          New job
        </Button>
      </div>

      {!companies ? (
        <div className="mt-16 flex justify-center text-ink-3">
          <Spinner />
        </div>
      ) : companies.length === 0 ? (
        <div className="mt-10 rounded-sheet border border-line">
          <EmptyState icon={<Building2 size={20} />} title="No companies yet" body="Add a job and its company shows up here." />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col overflow-hidden rounded-card border border-line">
          {companies.map((c, i) => (
            <li key={c.id} className={i > 0 ? "border-t border-line" : undefined}>
              <Link href={`/companies/${c.id}`} className="pressable flex items-center gap-3 px-4 py-3.5 hover:bg-subtle active:bg-subtle">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-subtle font-bold text-ink-2">
                  {c.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-headline">
                    {c.name}
                    {c.isSample && <span className="text-caption font-normal text-ink-3">sample</span>}
                  </p>
                  <p className="truncate text-ink-2">{c.jobs.map((j) => j.title).join(" · ")}</p>
                </div>
                {c.attentionCount > 0 && (
                  <span className="min-w-6 rounded-full bg-accent px-2 text-center text-caption leading-6 font-semibold text-white tabular-nums">
                    {c.attentionCount}
                  </span>
                )}
                <ChevronRight size={18} className="shrink-0 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
