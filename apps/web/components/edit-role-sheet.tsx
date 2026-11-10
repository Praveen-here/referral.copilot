"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { linkedinPostingId } from "@rc/core";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { keys, useRefreshPipeline } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { Sheet } from "./sheet";
import { Button, Field, Input, Textarea } from "./ui";

const formOf = (r: Role) => ({
  title: r.title,
  externalJobId: r.externalJobId ?? "",
  url: r.url ?? "",
  location: r.location ?? "",
  descriptionRaw: r.descriptionRaw ?? "",
});

/** Fix a role's details, e.g. add the job ID the app couldn't read. Unsent messages pick up the change. */
export function EditRoleSheet({ companyId, role, onClose }: { companyId: string; role: Role | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(role)} onClose={onClose} title="Edit role" description="Unsent messages you haven't edited are rewritten with these details.">
      {/* Keyed by role, so the form starts from that role's saved values each time it opens. */}
      {role && <EditRoleForm key={role.id} companyId={companyId} role={role} onClose={onClose} />}
    </Sheet>
  );
}

function EditRoleForm({ companyId, role, onClose }: { companyId: string; role: Role; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = useRefreshPipeline();
  const [form, setForm] = useState(() => formOf(role));
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const original = formOf(role);
  // Only send what changed: a changed title or description makes the app re-read the job.
  const changes = Object.fromEntries(Object.entries(form).filter(([k, v]) => v.trim() !== original[k as keyof typeof form].trim()));

  const save = useMutation({
    mutationFn: () => api(`/jobs/${role.id}`, { method: "PATCH", json: changes }),
    onSuccess: async () => {
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: keys.company(companyId) })]);
      onClose();
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(changes).length) save.mutate();
    else onClose();
  };

  // LinkedIn's posting number isn't the company's job ID; messages would leave it out.
  const isLinkedinNumber = form.externalJobId.trim() !== "" && form.externalJobId.trim() === linkedinPostingId(form.url);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Role">{(id) => <Input id={id} value={form.title} onChange={set("title")} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Job ID"
          error={isLinkedinNumber ? "That's LinkedIn's posting number, not the company's job ID" : undefined}
          hint={isLinkedinNumber ? undefined : "From the company's application page"}
        >
          {(id) => <Input id={id} autoFocus={!role.externalJobId} placeholder="e.g. R-1211844" value={form.externalJobId} onChange={set("externalJobId")} />}
        </Field>
        <Field label="Location">{(id) => <Input id={id} placeholder="Bengaluru" value={form.location} onChange={set("location")} />}</Field>
      </div>
      <Field label="Job link">{(id) => <Input id={id} type="url" placeholder="https://…" value={form.url} onChange={set("url")} />}</Field>
      <Field label="Job description">{(id) => <Textarea id={id} value={form.descriptionRaw} onChange={set("descriptionRaw")} />}</Field>
      {save.error && <p className="text-caption text-red">{save.error instanceof ApiError ? save.error.message : "Couldn't save. Try again."}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={save.isPending} disabled={!form.title.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}
