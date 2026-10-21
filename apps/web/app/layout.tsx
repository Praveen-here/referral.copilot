import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Apple devices use SF Pro via -apple-system; Inter is the closest match elsewhere.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Referral Copilot",
  description: "Find the right people, send the right message, keep track of every referral.",
  // "Add to Home Screen" opens it like an app, without browser bars.
  appleWebApp: { capable: true, title: "Referral", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Lets content use the full screen on notched phones; layouts pad with safe-area insets.
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-canvas font-sans text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
