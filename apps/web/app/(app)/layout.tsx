"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-ink-3">
        <Spinner />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
