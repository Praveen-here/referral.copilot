"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useRefreshPipeline } from "@/lib/queries";
import { Sheet } from "./sheet";
import { Button, Field, Input } from "./ui";

const empty = { fullName: "", currentTitle: "", linkedinUrl: "", school: "", isConnected: false, isRecruiter: false };

/** Manual add, until automatic discovery lands. */
export function AddPersonSheet({ jobId, open, onClose }: { jobId: string; open: boolean; onClose: () => void }) {
  const refresh = useRefreshPipeline();
  const [form, setForm] = useState(empty);
  const set = (key: "fullName" | "currentTitle" | "linkedinUrl" | "school") => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const add = useMutation({
    mutationFn: () => api(`/jobs/${jobId}/people`, { method: "POST", json: form }),
    onSuccess: async () => {
      await refresh();
      setForm(empty);
      onClose();
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a person"
      description="Someone you found yourself. Alumni are detected from their school."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-person" loading={add.isPending} disabled={form.fullName.trim().length < 2}>
            Add person
          </Button>
        </>
      }
    >
      <form id="add-person" onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">{(id) => <Input id={id} autoFocus placeholder="Full name" value={form.fullName} onChange={set("fullName")} />}</Field>
          <Field label="Role">{(id) => <Input id={id} placeholder="Software Engineer II" value={form.currentTitle} onChange={set("currentTitle")} />}</Field>
        </div>
        <Field label="LinkedIn profile">
          {(id) => <Input id={id} placeholder="https://www.linkedin.com/in/…" value={form.linkedinUrl} onChange={set("linkedinUrl")} />}
        </Field>
        <Field label="College" hint="Only if their profile shows it.">
          {(id) => <Input id={id} placeholder="PES University" value={form.school} onChange={set("school")} />}
        </Field>
        <div className="flex gap-5">
          <Check label="Already connected" checked={form.isConnected} onChange={(v) => setForm((f) => ({ ...f, isConnected: v }))} />
          <Check label="Recruiter" checked={form.isRecruiter} onChange={(v) => setForm((f) => ({ ...f, isRecruiter: v }))} />
        </div>
        {add.error && <p className="text-caption text-red">{add.error instanceof ApiError ? add.error.message : "Could not add this person"}</p>}
      </form>
    </Sheet>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}
