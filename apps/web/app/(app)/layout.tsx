"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
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

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
