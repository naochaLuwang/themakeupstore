import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { CartSync } from "@/components/store/cart-sync";
import { createClient } from "@/utils/supabase/server";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import PushInitializer from "@/components/PushInitializer"

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



// 2. Full Metadata Configuration
export const metadata: Metadata = {
  title: {
    default: "THE MAKEUP STORE WANGKHEI",
    template: "%s | THE MAKEUP STORE WANGKHEI",
  },
  description: "One Stop Destination For All Your Makeup Needs.",
  manifest: "/manifest.webmanifest",
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
    title: "THE MAKEUP STORE WANGKHEI",
    description: "One Stop Destination For All Your Makeup Needs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "THE MAKEUP STORE WANGKHEI",
    description: "One Stop Destination For All Your Makeup Needs.",
  },
  icons: {
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();


  return (
    <html lang="en" className="no-scrollbar">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${myBrandFont.variable} antialiased`}
      >
        <NextTopLoader
          color="#0f172a" // Matches your slate-900
          showSpinner={false}
          shadow="0 0 10px #0f172a,0 0 5px #0f172a"
        />
        <CartSync userId={user?.id || null} />
        <PushInitializer />

        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
