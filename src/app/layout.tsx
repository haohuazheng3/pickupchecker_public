import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AlertBar } from "@/components/site/AlertBar";
import { THEME_BOOT } from "@/lib/theme";
import { Analytics } from "@/components/site/Analytics";
import { PwaBoot } from "@/components/pwa/PwaBoot";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "1";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "PickupChecker — iPhone pickup alerts, every US Apple Store", template: "%s · PickupChecker" },
  description:
    "A phone notification the moment an iPhone Duo, 18 Pro or 18 Pro Max is in stock for pickup at any US Apple Store. Checked every 20 seconds. From $5 a month.",
  applicationName: "PickupChecker",
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: "website", siteName: "PickupChecker", url: SITE },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PickupChecker", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f6f7f5", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs as the parser reaches it — before any paint — so a dark reader never sees a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          appearance={{ variables: { colorPrimary: "#0a7f49" } }}
          signInUrl="/?signin=1"
          signUpUrl="/?signin=1"
        >
          <div className="void-bg" aria-hidden="true" />
          <Header />
          <main className="flex-1 pb-24 sm:pb-28">{children}</main>
          <Footer />
          <AlertBar />
        </ClerkProvider>
        <Analytics />
        <PwaBoot />
      </body>
    </html>
  );
}
