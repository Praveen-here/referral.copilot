"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useFeedback } from "@/components/feedback";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";

interface Form {
  university: string;
  degree: string;
  field: string;
  currentSemester: string;
  graduationYear: string;
  skills: string;
  fitReason: string;
  resumeUrl: string;
  linkedinUrl: string;
  signOffName: string;
}

export default function ProfilePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (!me || form) return;
    const p = me.profile;
    setForm({
      university: me.university ?? "",
      degree: p?.degree ?? "",
      field: p?.field ?? "",
      currentSemester: p?.currentSemester?.toString() ?? "",
      graduationYear: p?.graduationYear?.toString() ?? "",
      skills: p?.skills.join(", ") ?? "",
      fitReason: p?.projects[0]?.oneLiner ?? "",
      resumeUrl: p?.resumeUrl ?? "",
      linkedinUrl: p?.linkedinUrl ?? "",
      signOffName: p?.settings.signOffName ?? me.user.name.split(" ")[0] ?? "",
    });
  }, [me, form]);

  const save = useMutation({
    mutationFn: (f: Form) =>
      api("/me/profile", {
        method: "PUT",
        json: {
          ...f,
          currentSemester: f.currentSemester || null,
          graduationYear: f.graduationYear || null,
          skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.me });
      toast({ message: "Profile saved" });
    },
  });

  if (!form) {
    return (
      <div className="flex h-full items-center justify-center text-ink-3">
        <Spinner />
      </div>
    );
  }

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <div className="mx-auto max-w-2xl px-10 pt-14 pb-24">
      <h1 className="text-display">Profile</h1>
      <p className="mt-2 text-[0.9375rem] text-ink-2">Used to spot alumni and personalize messages. Nothing here is ever made up or added to.</p>

      <form onSubmit={submit} className="mt-10 flex flex-col gap-10">
        <Group title="Education" description="Alumni are matched on your college, including short forms like PESU or PESIT.">
          <Field label="College / University">{(id) => <Input id={id} placeholder="PES University" value={form.university} onChange={set("university")} />}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Degree">{(id) => <Input id={id} placeholder="MCA" value={form.degree} onChange={set("degree")} />}</Field>
            <Field label="Field">{(id) => <Input id={id} placeholder="Computer Applications" value={form.field} onChange={set("field")} />}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current semester">{(id) => <Input id={id} inputMode="numeric" placeholder="3" value={form.currentSemester} onChange={set("currentSemester")} />}</Field>
            <Field label="Graduation year">{(id) => <Input id={id} inputMode="numeric" placeholder="2027" value={form.graduationYear} onChange={set("graduationYear")} />}</Field>
          </div>
        </Group>

        <Group title="What makes you a fit" description="Messages quote this directly, so keep it true and specific.">
          <Field label="One line about your work" hint='Finishes the sentence "the role lines up well with…"'>
            {(id) => <Input id={id} placeholder="my backend work in Java and Spring Boot" value={form.fitReason} onChange={set("fitReason")} />}
          </Field>
          <Field label="Skills" hint="Comma separated">
            {(id) => <Input id={id} placeholder="Java, Spring Boot, SQL, React" value={form.skills} onChange={set("skills")} />}
          </Field>
        </Group>

        <Group title="Links & sign-off">
          <Field label="Resume link" hint="Shared when someone asks for your resume.">
            {(id) => <Input id={id} type="url" placeholder="https://drive.google.com/…" value={form.resumeUrl} onChange={set("resumeUrl")} />}
          </Field>
          <Field label="Your LinkedIn">{(id) => <Input id={id} type="url" placeholder="https://www.linkedin.com/in/…" value={form.linkedinUrl} onChange={set("linkedinUrl")} />}</Field>
          <Field label="Sign messages as">{(id) => <Input id={id} placeholder="Praveen" value={form.signOffName} onChange={set("signOffName")} />}</Field>
        </Group>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-6">
          {save.error && <p className="text-caption text-red">{save.error instanceof ApiError ? save.error.message : "Could not save"}</p>}
          <Button variant="primary" type="submit" icon={<Check size={15} />} loading={save.isPending} disabled={!form.university || !form.degree}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[180px_1fr] gap-8">
      <div>
        <h2 className="text-headline">{title}</h2>
        {description && <p className="mt-1 text-caption text-ink-3">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
