

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { CartSync } from "@/components/store/cart-sync";
import { createClient } from "@/utils/supabase/server";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import PushInitializer from "@/components/PushInitializer"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"

const myBrandFont = localFont({
  src: "../public/fonts/Anders.ttf",
  variable: "--font-daciana",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// --- UPDATED METADATA ---
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstorewangkhei.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "THE MAKEUP STORE WANGKHEI | Authentic Makeup & Beauty Imphal",
    template: "%s | THE MAKEUP STORE WANGKHEI",
  },
  description: "Your ultimate destination for authentic international and luxury makeup brands in Imphal. Shop original products from Nars, Rare Beauty, Dior, and more at THE MAKEUP STORE WANGKHEI.",
  keywords: ["makeup store imphal", "authentic makeup manipur", "luxury beauty wangkhei", "international makeup brands imphal", "the makeup store wangkhei"],
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },

  // This is where your Google Verification goes:
  verification: {
    google: "hFyzbJnQoYlJqQAlHIZ-M58V4vsedlVBx6zL-dzu5Jw",
  },

  other: {
    "mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "THE MAKEUP STORE WANGKHEI",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "THE MAKEUP STORE WANGKHEI",
    title: "THE MAKEUP STORE WANGKHEI | Luxury Beauty Destination",
    description: "Authentic International Makeup & Beauty Brands at Wangkhei, Imphal.",
    url: baseUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "THE MAKEUP STORE WANGKHEI",
    description: "One Stop Destination For All Your Makeup Needs in Imphal.",
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

async function AuthCartSync() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <CartSync userId={user?.id || null} />;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="no-scrollbar" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${myBrandFont.variable} antialiased`}
      >
        <div id="app-scroller">
          <NextTopLoader color="#0f172a" showSpinner={false} />
          <Suspense fallback={<CartSync userId={null} />}>
            <AuthCartSync />
          </Suspense>
          <PushInitializer />

          <main>
            {children}
            <Analytics />
          </main>

          <Toaster position="top-right" />
        </div>
      </body>
    </html>
  );
}