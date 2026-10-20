"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, spring } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/` });
    if (error) {
      setError(error.message ?? "Sign-in failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-full items-center justify-center bg-subtle px-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="w-full max-w-sm rounded-[20px] bg-canvas px-8 pt-10 pb-8 text-center shadow-float"
      >
        <Logo size={64} className="mx-auto mb-5" />
        <h1 className="text-display">Referral Copilot</h1>
        <p className="mx-auto mt-2 max-w-64 text-ink-2">Find the right people. Send the right message. Never lose track.</p>

        <button
          onClick={signIn}
          disabled={loading}
          className="pressable mt-8 flex h-11 w-full items-center justify-center gap-3 rounded-[10px] border border-line-strong bg-canvas font-medium text-ink hover:bg-subtle disabled:opacity-60"
        >
          <GoogleMark />
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && <p className="mt-3 text-caption text-red">{error}</p>}

        <p className="mt-6 text-caption text-ink-3">Only your name, email and photo are shared with the app.</p>
      </motion.div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
