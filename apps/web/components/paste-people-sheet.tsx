"use client";

import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { openInNewTab } from "@/lib/linkedin";
import { useMe, useRefreshPipeline } from "@/lib/queries";
import { useFeedback } from "./feedback";
import { Sheet } from "./sheet";
import { Button, Field, Textarea } from "./ui";

type Source = "COMPANY_PEOPLE_COLLEGE" | "COMPANY_PEOPLE" | "SEARCH";

interface Summary {
  added: number;
  alumni: number;
  alreadyOnList: number;
  skipped: Record<string, number>;
}

/**
 * Add people from a LinkedIn page the user opened and copied themselves. The app never
 * opens LinkedIn; it only reads what's pasted (plan §12).
 */
export function PastePeopleSheet({ jobId, companyName, open, onClose }: { jobId: string; companyName: string; open: boolean; onClose: () => void }) {
  const { data: me } = useMe();
  const college = me?.university ?? "your college";
  const refresh = useRefreshPipeline();
  const { toast } = useFeedback();
  // Safe default: the college option marks everyone as an alum, so it must be a deliberate choice.
  const [source, setSource] = useState<Source>("COMPANY_PEOPLE");
  const [text, setText] = useState("");

  const OPTIONS: { value: Source; title: string; body: string }[] = [
    { value: "COMPANY_PEOPLE", title: `People page at ${companyName}`, body: "Everyone listed works there." },
    {
      value: "COMPANY_PEOPLE_COLLEGE",
      title: `People page at ${companyName}, filtered for ${college}`,
      body: `Only if you searched or filtered that page for ${college}: everyone gets marked as an alum.`,
    },
    { value: "SEARCH", title: "LinkedIn search results", body: "The app checks each person's headline for the company." },
  ];

  const paste = useMutation({
    mutationFn: () => api<Summary>(`/jobs/${jobId}/paste-people`, { method: "POST", json: { text, source } }),
    onSuccess: async (s) => {
      await refresh();
      const skipped = Object.values(s.skipped).reduce((a, b) => a + b, 0);
      toast({
        message:
          s.added > 0
            ? `Added ${s.added} ${s.added === 1 ? "person" : "people"}${s.alumni ? ` (${s.alumni} ${s.alumni === 1 ? "alum" : "alumni"})` : ""}${s.alreadyOnList ? `, ${s.alreadyOnList} already on your list` : ""}`
            : s.alreadyOnList
              ? "Everyone here is already on your list"
              : `No one could be added${skipped ? `: ${skipped} didn't show ${companyName} as their employer` : ""}`,
      });
      setText("");
      onClose();
    },
  });

  const q = (s: string) => encodeURIComponent(s);
  const links = [
    { label: `Find ${companyName} on LinkedIn`, url: `https://www.linkedin.com/search/results/companies/?keywords=${q(companyName)}` },
    ...(me?.university
      ? [{ label: `Search "${companyName} ${me.university}"`, url: `https://www.linkedin.com/search/results/people/?keywords=${q(`${companyName} ${me.university}`)}` }]
      : []),
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add people from LinkedIn"
      description="LinkedIn's own filters find alumni that web search misses."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={paste.isPending} disabled={text.trim().length < 20} onClick={() => paste.mutate()}>
            {paste.isPending ? "Reading the page…" : "Add people"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>
            Open {companyName} on LinkedIn → <span className="font-medium text-ink">People</span> tab → search{" "}
            <span className="font-medium text-ink">{me?.university ?? "your college"}</span>.
          </li>
          <li>Scroll so everyone loads, then select all (Ctrl+A) and copy (Ctrl+C).</li>
          <li>Paste below. Repeat with other searches (e.g. &ldquo;software engineer&rdquo;) any time.</li>
        </ol>
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <Button key={l.url} size="sm" icon={<ExternalLink size={13} />} onClick={() => openInNewTab(l.url)}>
              {l.label}
            </Button>
          ))}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[0.8125rem] font-medium text-ink">What did you copy?</legend>
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5 transition-colors",
                source === o.value ? "border-accent bg-accent-soft" : "border-line hover:bg-subtle",
              )}
            >
              <input type="radio" name="paste-source" className="mt-1 accent-[var(--color-accent)]" checked={source === o.value} onChange={() => setSource(o.value)} />
              <span>
                <span className="block font-medium text-ink">{o.title}</span>
                <span className="block text-caption text-ink-2">{o.body}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <Field label="Pasted page" error={paste.error instanceof ApiError ? paste.error.message : paste.error ? "Couldn't read that page. Try again." : undefined}>
          {(id) => <Textarea id={id} placeholder="Paste the LinkedIn page here" value={text} onChange={(e) => setText(e.target.value)} className="min-h-32" />}
        </Field>
      </div>
    </Sheet>
  );
}
