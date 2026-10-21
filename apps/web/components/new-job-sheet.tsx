"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";
import type { Job } from "@/lib/types";
import { Sheet } from "./sheet";
import { Button, Field, Input, Spinner, Textarea } from "./ui";

const empty = { companyName: "", title: "", externalJobId: "", url: "", location: "", descriptionRaw: "" };

interface PostingDraft {
  companyName: string | null;
  title: string | null;
  externalJobId: string | null;
  location: string | null;
  descriptionRaw: string | null;
  needsPaste: boolean;
  source: "greenhouse" | "lever" | "linkedin" | "unknown";
}

export function NewJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [readState, setReadState] = useState<{ url: string; result: PostingDraft | null } | null>(null);
  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const read = useMutation({
    mutationFn: (url: string) => api<PostingDraft>("/jobs/read-url", { method: "POST", json: { url } }),
    onSuccess: (posting, url) => {
      setReadState({ url, result: posting });
      // Only fill fields the user hasn't typed into.
      setForm((f) => ({
        ...f,
        companyName: f.companyName || posting.companyName || "",
        title: f.title || posting.title || "",
        externalJobId: f.externalJobId || posting.externalJobId || "",
        location: f.location || posting.location || "",
        descriptionRaw: f.descriptionRaw || posting.descriptionRaw || "",
      }));
    },
  });

  const readUrl = () => {
    const url = form.url.trim();
    if (!/^https?:\/\//i.test(url) || readState?.url === url) return;
    read.mutate(url);
  };

  const create = useMutation({
    mutationFn: async () => {
      const job = await api<Job>("/jobs", { method: "POST", json: form });
      // Start finding people right away; if search isn't configured the job page explains why.
      await api(`/jobs/${job.id}/discover`, { method: "POST" }).catch(() => undefined);
      return job;
    },
    onSuccess: async (job) => {
      await qc.invalidateQueries({ queryKey: keys.sidebar });
      setForm(empty);
      setReadState(null);
      onClose();
      router.push(`/companies/${job.companyId}?job=${job.id}`);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  const posting = readState?.result;
  const urlHint = read.isPending ? (
    <span className="flex items-center gap-1.5">
      <Spinner /> Reading the posting…
    </span>
  ) : posting && !posting.needsPaste ? (
    <span className="flex items-center gap-1 text-green">
      <Check size={13} /> Filled in from the posting. Check it below.
    </span>
  ) : posting?.source === "linkedin" ? (
    "LinkedIn pages can't be read by the app. Paste the job description below."
  ) : posting ? (
    "Couldn't read this page. Fill in the details and paste the description."
  ) : (
    "Greenhouse and Lever links fill everything in automatically."
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New job"
      description="Add an opportunity. The app then finds the best people to ask for a referral."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-job" loading={create.isPending} disabled={!form.companyName || !form.title}>
            Add job & find people
          </Button>
        </>
      }
    >
      <form id="new-job" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Job link" hint={urlHint}>
          {(id) => (
            <Input
              id={id}
              type="url"
              autoFocus
              placeholder="Paste the job URL"
              value={form.url}
              onChange={set("url")}
              onBlur={readUrl}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                if (/^https?:\/\//i.test(pasted)) setTimeout(() => read.mutate(pasted), 0);
              }}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">{(id) => <Input id={id} placeholder="HPE" value={form.companyName} onChange={set("companyName")} />}</Field>
          <Field label="Role">{(id) => <Input id={id} placeholder="Software Engineer Intern" value={form.title} onChange={set("title")} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job ID" hint="Only from the company's application page">
            {(id) => <Input id={id} placeholder="Optional" value={form.externalJobId} onChange={set("externalJobId")} />}
          </Field>
          <Field label="Location">{(id) => <Input id={id} placeholder="Bengaluru" value={form.location} onChange={set("location")} />}</Field>
        </div>
        <Field label="Job description" hint="Helps the app look for people in the right team and skills.">
          {(id) => <Textarea id={id} placeholder="Paste the job description" value={form.descriptionRaw} onChange={set("descriptionRaw")} />}
        </Field>
        {create.error && <p className="text-caption text-red">{create.error instanceof ApiError ? create.error.message : "Could not add the job"}</p>}
      </form>
    </Sheet>
  );
}
