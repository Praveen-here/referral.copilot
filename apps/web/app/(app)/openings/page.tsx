"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Radar, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ago, OpeningRow } from "@/components/opening-row";
import { Button, EmptyState, Segmented, Spinner, spring } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, useOpenings } from "@/lib/queries";
import type { Opening } from "@/lib/types";

type Filter = "new" | "intern" | "entry" | "all";

const matches: Record<Filter, (o: Opening) => boolean> = {
  new: (o) => o.isNew && o.level !== "UNSPECIFIED",
  intern: (o) => o.level === "INTERN",
  entry: (o) => o.level === "ENTRY",
  all: () => true,
};

export default function OpeningsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useOpenings();
  const [filter, setFilter] = useState<Filter>("new");

  const scan = useMutation({
    mutationFn: () => api<{ scanning: boolean }>("/openings/scan", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.openings }),
  });

  const items = data?.items.filter(matches[filter]) ?? [];
  const status = data?.scanning ? (
    <span className="flex items-center gap-1.5">
      <Spinner /> Checking job boards…
    </span>
  ) : data?.lastScanAt ? (
    `Checked ${ago(data.lastScanAt)}`
  ) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-10 sm:pt-14 sm:pb-24">
      <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <h1 className="text-display">Openings</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-2">
          Intern and entry-level tech roles in India, straight from {data ? `${data.boardCount} company job boards` : "company job boards"}. Apply early, then ask for a
          referral.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Segmented
            layoutId="openings-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "new", label: "New", count: data?.counts.new },
              { value: "intern", label: "Interns", count: data?.counts.intern },
              { value: "entry", label: "Entry level", count: data?.counts.entry },
              { value: "all", label: "All", count: data?.counts.all },
            ]}
          />
          <span className="text-caption text-ink-3">{status}</span>
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={13} />}
            loading={scan.isPending}
            disabled={data?.scanning}
            onClick={() => scan.mutate()}
            className="ml-auto"
          >
            Check now
          </Button>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="mt-16 flex justify-center text-ink-3">
          <Spinner />
        </div>
      ) : items.length > 0 ? (
        <ul className="-mx-3 mt-6 flex flex-col">
          <AnimatePresence initial={false}>
            {items.map((o) => (
              <OpeningRow key={o.id} opening={o} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="mt-8 rounded-sheet border border-line">
          <EmptyState
            icon={<Radar size={20} />}
            title={data?.scanning && !data.lastScanAt ? "Checking job boards" : filter === "new" ? "Nothing new right now" : "No openings here yet"}
            body={
              data?.scanning && !data.lastScanAt
                ? "The first check reads every board and takes about a minute."
                : filter === "new"
                  ? "Roles posted in the last couple of days show up here. Look through interns and entry-level roles meanwhile."
                  : "New roles appear as companies post them. The app checks every couple of hours while you use it."
            }
            action={
              filter === "new" && data && data.counts.all > 0 ? (
                <Button onClick={() => setFilter(data.counts.intern > 0 ? "intern" : "all")}>See {data.counts.intern > 0 ? "interns" : "all openings"}</Button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
